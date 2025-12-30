import type { AssetId } from "@state";
import { DYE_COLORS, getDyeRgb } from "./dyeColors";
import { allLeavesInSet, CAT_SKIN_IDS, DYE_COLOR_IDS, WOOD_TYPE_IDS } from "../entityVariants";
import type {
  EntityCompositeSchema,
  EntityFeatureControl,
  EntityFeatureStateView,
  EntityLayerDefinition,
} from "./types";
import {
  getLikelyBaseEntityAssetIdForLayer,
  isEntityFeatureLayerTextureAssetId,
} from "./layerDetection";

function stripNamespace(assetId: AssetId): string {
  const idx = assetId.indexOf(":");
  return idx >= 0 ? assetId.slice(idx + 1) : assetId;
}

function getEntityPath(assetId: AssetId): string | null {
  const path = stripNamespace(assetId);
  if (!path.startsWith("entity/")) return null;
  return path.slice("entity/".length);
}

function getEntityRoot(entityPath: string): string {
  return entityPath.split("/")[0] ?? entityPath;
}

function getDirAndLeaf(entityPath: string): { dir: string; leaf: string } {
  const parts = entityPath.split("/");
  const leaf = parts[parts.length - 1] ?? entityPath;
  const dir = parts.slice(0, -1).join("/");
  return { dir, leaf };
}

function stableUnique(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function titleLabel(value: string): string {
  return value
    .split("_")
    .map((word) => (word ? word[0]!.toUpperCase() + word.slice(1) : ""))
    .join(" ");
}

function getToggle(state: EntityFeatureStateView, id: string, def: boolean) {
  return state.toggles[id] ?? def;
}

function getSelect(state: EntityFeatureStateView, id: string, def: string) {
  return state.selects[id] ?? def;
}

function getDirectEntityDirAndLeaf(entityPath: string): { dir: string; leaf: string } | null {
  const parts = entityPath.split("/");
  if (parts.length !== 2) return null;
  const dir = parts[0] ?? "";
  const leaf = parts[1] ?? "";
  if (!dir || !leaf) return null;
  return { dir, leaf };
}

function isEntityVariantLeaf(dir: string, leaf: string): boolean {
  return leaf === dir || leaf.startsWith(`${dir}_`) || leaf.endsWith(`_${dir}`);
}

function getEntityVariantLabel(dir: string, leaf: string): string {
  if (leaf === dir) return "Default";
  if (leaf.startsWith(`${dir}_`)) return titleLabel(leaf.slice(dir.length + 1));
  if (leaf.endsWith(`_${dir}`)) return titleLabel(leaf.slice(0, -(dir.length + 1)));
  return titleLabel(leaf);
}

function sortByPreferredOrder(values: string[], preferredOrder: string[]): string[] {
  const order = new Map<string, number>();
  preferredOrder.forEach((id, idx) => order.set(id, idx));
  return [...values].sort((a, b) => {
    const ai = order.get(a);
    const bi = order.get(b);
    if (ai != null && bi != null) return ai - bi;
    if (ai != null) return -1;
    if (bi != null) return 1;
    return a.localeCompare(b);
  });
}

function findAssetId(
  ns: string,
  pathCandidates: string[],
  all: Set<AssetId>,
): AssetId | null {
  for (const path of pathCandidates) {
    const id = `${ns}:${path}` as AssetId;
    if (all.has(id)) return id;
  }
  return null;
}

function makeVillagerSelect(
  all: Set<AssetId>,
  ns: string,
  prefix: string,
  label: string,
  id: string,
  defaultValue: string,
  labelForValue?: (value: string) => string,
): Extract<EntityFeatureControl, { kind: "select" }> | null {
  const options: Array<{ value: string; label: string }> = [{ value: "none", label: "None" }];
  const values: string[] = [];
  for (const assetId of all) {
    if (!assetId.startsWith(`${ns}:${prefix}`)) continue;
    const path = stripNamespace(assetId);
    const leaf = path.split("/").pop();
    if (!leaf) continue;
    values.push(leaf);
  }
  for (const v of stableUnique(values)) {
    options.push({
      value: v,
      label:
        labelForValue?.(v) ??
        v.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()),
    });
  }
  if (options.length <= 1) return null;
  const hasDefault = options.some((o) => o.value === defaultValue);
  return {
    kind: "select",
    id,
    label,
    defaultValue: hasDefault ? defaultValue : options[1]?.value ?? "none",
    options,
  };
}

export function resolveEntityCompositeSchema(
  selectedAssetId: AssetId,
  allAssetIds: AssetId[],
): EntityCompositeSchema | null {
  const all = new Set(allAssetIds);
  const baseFromLayer = getLikelyBaseEntityAssetIdForLayer(
    selectedAssetId,
    allAssetIds,
  );
  const baseAssetId = baseFromLayer ?? selectedAssetId;

  const entityPath = getEntityPath(baseAssetId);
  if (!entityPath) return null;

  const ns = baseAssetId.includes(":") ? baseAssetId.split(":")[0] : "minecraft";
  const folderRoot = getEntityRoot(entityPath);
  const { dir, leaf } = getDirAndLeaf(entityPath);
  const entityType = leaf;

  const controls: EntityFeatureControl[] = [];
  let getBaseTextureAssetId:
    | EntityCompositeSchema["getBaseTextureAssetId"]
    | undefined;
  let getCemEntityType:
    | EntityCompositeSchema["getCemEntityType"]
    | undefined;
  let getRootTransform:
    | EntityCompositeSchema["getRootTransform"]
    | undefined;
  let getBoneRenderOverrides:
    | EntityCompositeSchema["getBoneRenderOverrides"]
    | undefined;
  let getBoneInputOverrides:
    | EntityCompositeSchema["getBoneInputOverrides"]
    | undefined;

  // -----------------------------------------------------------------------
  // Base texture variants (axolotl/frog-style directories)
  //
  // Some entities store multiple base skins in a single directory. When the
  // directory is "pure" (every direct child texture is `<dir>_*` or `*_<dir>`
  // or equal `<dir>`), expose a Variant selector that swaps the base texture
  // while keeping geometry tied to the selected entity.
  // -----------------------------------------------------------------------
  const direct = getDirectEntityDirAndLeaf(entityPath);
  if (direct && direct.dir !== "bee" && direct.dir !== "banner") {
    const variantLeaves: string[] = [];
    for (const id of all) {
      if (isEntityFeatureLayerTextureAssetId(id)) continue;
      const p = getEntityPath(id);
      if (!p) continue;
      const d = getDirectEntityDirAndLeaf(p);
      if (!d) continue;
      if (d.dir !== direct.dir) continue;
      variantLeaves.push(d.leaf);
    }

    const uniqueLeavesRaw = stableUnique(variantLeaves);
    const isPatternDir =
      uniqueLeavesRaw.length > 1 &&
      uniqueLeavesRaw.every((l) => isEntityVariantLeaf(direct.dir, l));
    const isDyeDir = uniqueLeavesRaw.length > 1 && allLeavesInSet(uniqueLeavesRaw, DYE_COLOR_IDS);
    const isWoodDir =
      uniqueLeavesRaw.length > 1 && allLeavesInSet(uniqueLeavesRaw, WOOD_TYPE_IDS);
    const isCatDir =
      direct.dir === "cat" &&
      uniqueLeavesRaw.length > 1 &&
      allLeavesInSet(uniqueLeavesRaw, CAT_SKIN_IDS);

    const isVariantDir = isPatternDir || isDyeDir || isWoodDir || isCatDir;

    if (isVariantDir) {
      const label = isDyeDir
        ? "Color"
        : isWoodDir
          ? "Wood Type"
          : isCatDir
            ? "Cat Type"
            : "Variant";

      const uniqueLeaves = isDyeDir
        ? sortByPreferredOrder(uniqueLeavesRaw, DYE_COLORS.map((d) => d.id))
        : uniqueLeavesRaw;

      controls.push({
        kind: "select",
        id: "entity.variant",
        label,
        defaultValue: uniqueLeaves.includes(direct.leaf) ? direct.leaf : uniqueLeaves[0]!,
        options: uniqueLeaves.map((v) => ({
          value: v,
          label: isDyeDir
            ? (DYE_COLORS.find((d) => d.id === v)?.label ?? titleLabel(v))
            : getEntityVariantLabel(direct.dir, v),
        })),
      });

      getBaseTextureAssetId = (state) => {
        const chosen = getSelect(state, "entity.variant", direct.leaf);
        const candidate = `${ns}:entity/${direct.dir}/${chosen}` as AssetId;
        return all.has(candidate) ? candidate : baseAssetId;
      };
    }
  }

  // -----------------------------------------------------------------------
  // Glowing eyes (generic `_eyes` overlay in same folder)
  // -----------------------------------------------------------------------
  const eyesTexture = findAssetId(
    ns,
    [
      dir ? `entity/${dir}/${leaf}_eyes` : `entity/${leaf}_eyes`,
      dir ? `entity/${dir}/${entityType}_eyes` : `entity/${entityType}_eyes`,
      `entity/${folderRoot}/${folderRoot}_eyes`,
    ],
    all,
  );
  const hasEyes = !!eyesTexture;
  if (hasEyes && eyesTexture) {
    controls.push({
      kind: "toggle",
      id: "feature.glowing_eyes",
      label: "Glowing Eyes",
      defaultValue: true,
    });
  }

  // -----------------------------------------------------------------------
  // Creeper charge overlay (generic `_armor` texture + optional charge JEM)
  // -----------------------------------------------------------------------
  let creeperArmor: AssetId | null = null;
  if (entityType === "creeper") {
    creeperArmor = findAssetId(
      ns,
      [
        dir ? `entity/${dir}/${leaf}_armor` : `entity/${leaf}_armor`,
        `entity/creeper/creeper_armor`,
        `entity/creeper_armor`,
      ],
      all,
    );
    if (creeperArmor) {
      controls.push({
        kind: "toggle",
        id: "creeper.charge",
        label: "Charged",
        defaultValue: false,
      });
    }
  }

  // -----------------------------------------------------------------------
  // Generic "outer layer" skin (e.g. drowned_outer_layer) + optional `_outer` CEM.
  // -----------------------------------------------------------------------
  const outerLayerTexture = findAssetId(
    ns,
    [
      dir ? `entity/${dir}/${leaf}_outer_layer` : `entity/${leaf}_outer_layer`,
      dir ? `entity/${dir}/${leaf}_outer` : `entity/${leaf}_outer`,
      `entity/${folderRoot}/${leaf}_outer_layer`,
    ],
    all,
  );
  if (outerLayerTexture) {
    controls.push({
      kind: "toggle",
      id: "feature.outer_layer",
      label: "Outer Layer",
      defaultValue: true,
    });
  }

  // -----------------------------------------------------------------------
  // Generic crackiness overlays (iron golem damage states)
  // -----------------------------------------------------------------------
  const crackinessValues = ["low", "medium", "high"] as const;
  const availableCrackiness = crackinessValues.filter((v) =>
    findAssetId(
      ns,
      [
        dir
          ? `entity/${dir}/${leaf}_crackiness_${v}`
          : `entity/${leaf}_crackiness_${v}`,
        `entity/${folderRoot}/${leaf}_crackiness_${v}`,
      ],
      all,
    ),
  );
  if (availableCrackiness.length > 0) {
    controls.push({
      kind: "select",
      id: "feature.crackiness",
      label: "Cracks",
      defaultValue: "none",
      options: [
        { value: "none", label: "None" },
        ...availableCrackiness.map((v) => ({
          value: v,
          label: v.replace(/^\w/, (c) => c.toUpperCase()),
        })),
      ],
    });
  }

  // -----------------------------------------------------------------------
  // Bee angry/nectar state textures (base texture swap) + stinger geometry toggle
  // -----------------------------------------------------------------------
  if (entityType === "bee") {
    const find = (leafName: string) =>
      findAssetId(ns, [`entity/${dir}/${leafName}`], all);

    const beeBase = find("bee");
    const beeAngry = find("bee_angry");
    const beeNectar = find("bee_nectar");
    const beeAngryNectar = find("bee_angry_nectar");
    const hasStateTextures = !!beeAngry || !!beeNectar || !!beeAngryNectar;

    if (hasStateTextures) {
      controls.push({
        kind: "toggle",
        id: "bee.angry",
        label: "Angry",
        defaultValue: false,
      });
      controls.push({
        kind: "toggle",
        id: "bee.nectar",
        label: "Nectar",
        defaultValue: false,
      });

      const tryPick = (candidates: Array<AssetId | null | undefined>) => {
        for (const c of candidates) if (c) return c;
        return null;
      };

      getBaseTextureAssetId = (state) => {
        const angry = getToggle(state, "bee.angry", false);
        const nectar = getToggle(state, "bee.nectar", false);

        if (angry && nectar) {
          return (
            tryPick([beeAngryNectar, beeAngry, beeNectar, beeBase, baseAssetId]) ??
            baseAssetId
          );
        }
        if (angry) {
          return (tryPick([beeAngry, beeBase, baseAssetId]) ?? baseAssetId) as AssetId;
        }
        if (nectar) {
          return (tryPick([beeNectar, beeBase, baseAssetId]) ?? baseAssetId) as AssetId;
        }

        return (beeBase ?? baseAssetId) as AssetId;
      };
    }

    // Stinger is geometry (a model part), not a texture swap. Default is present.
    controls.push({
      kind: "toggle",
      id: "bee.has_stinger",
      label: "Stinger",
      defaultValue: true,
    });

    const existing = getBoneInputOverrides;
    getBoneInputOverrides = (state) => {
      const hasStinger = getToggle(state, "bee.has_stinger", true);
      const v = hasStinger ? 1 : 0;
      const overrides: Record<string, Record<string, number>> = {
        stinger: { visible: v },
        stinger2: { visible: v },
      };
      return existing
        ? { ...existing(state), ...overrides }
        : overrides;
    };
  }

  // -----------------------------------------------------------------------
  // Sheep wool/coat overlay + color
  // -----------------------------------------------------------------------
  let sheepWoolTexture: AssetId | null = null;
  let sheepUndercoatTexture: AssetId | null = null;
  if (entityType === "sheep") {
    sheepWoolTexture = findAssetId(
      ns,
      [
        dir ? `entity/${dir}/${leaf}_wool` : `entity/${leaf}_wool`,
        dir ? `entity/${dir}/${leaf}_fur` : `entity/${leaf}_fur`,
        `entity/sheep/sheep_fur`,
      ],
      all,
    );

    sheepUndercoatTexture =
      findAssetId(
        ns,
        [
          dir
            ? `entity/${dir}/${leaf}_wool_undercoat`
            : `entity/${leaf}_wool_undercoat`,
          dir ? `entity/${dir}/${leaf}_undercoat` : `entity/${leaf}_undercoat`,
        ],
        all,
      ) ?? sheepWoolTexture;

    const dyeOptions = DYE_COLORS.map((d) => ({ value: d.id, label: d.label }));
    controls.push({
      kind: "select",
      id: "sheep.coat_state",
      label: "Coat",
      defaultValue: "full",
      options: [
        { value: "full", label: "Full" },
        { value: "sheared", label: "Sheared" },
        { value: "bare", label: "Bare" },
      ],
    });
    controls.push({
      kind: "select",
      id: "sheep.color",
      label: "Wool Color",
      defaultValue: "white",
      options: dyeOptions,
    });
  }

  // -----------------------------------------------------------------------
  // Villager outfits (type + profession overlays)
  // -----------------------------------------------------------------------
  const isVillagerFamily = folderRoot === "villager";
  const isZombieVillagerFamily = folderRoot === "zombie_villager";
  let villagerTypeDefault = "none";
  let villagerProfessionDefault = "none";
  let villagerLevelDefault = "none";
  let zombieVillagerTypeDefault = "none";
  let zombieVillagerProfessionDefault = "none";
  let zombieVillagerLevelDefault = "none";

  const villagerLevelLabel = (value: string): string => {
    const map: Record<string, string> = {
      novice: "Stone",
      apprentice: "Iron",
      journeyman: "Gold",
      expert: "Emerald",
      master: "Diamond",
      stone: "Stone",
      iron: "Iron",
      gold: "Gold",
      emerald: "Emerald",
      diamond: "Diamond",
    };
    return map[value] ?? value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
  };

  if (isVillagerFamily) {
    const typeSelect = makeVillagerSelect(
      all,
      ns,
      "entity/villager/type/",
      "Villager Type",
      "villager.type",
      "plains",
    );
    if (typeSelect) {
      villagerTypeDefault = typeSelect.defaultValue;
      controls.push(typeSelect);
    }
    const profSelect = makeVillagerSelect(
      all,
      ns,
      "entity/villager/profession/",
      "Profession",
      "villager.profession",
      "none",
    );
    if (profSelect) {
      villagerProfessionDefault = profSelect.defaultValue;
      controls.push(profSelect);
    }

    const levelSelect = makeVillagerSelect(
      all,
      ns,
      "entity/villager/profession_level/",
      "Level",
      "villager.level",
      "none",
      villagerLevelLabel,
    );
    if (levelSelect) {
      villagerLevelDefault = levelSelect.defaultValue;
      controls.push(levelSelect);
    }
  }

  if (isZombieVillagerFamily) {
    const typeSelect = makeVillagerSelect(
      all,
      ns,
      "entity/zombie_villager/type/",
      "Villager Type",
      "zombie_villager.type",
      "plains",
    );
    if (typeSelect) {
      zombieVillagerTypeDefault = typeSelect.defaultValue;
      controls.push(typeSelect);
    }
    const profSelect = makeVillagerSelect(
      all,
      ns,
      "entity/zombie_villager/profession/",
      "Profession",
      "zombie_villager.profession",
      "none",
    );
    if (profSelect) {
      zombieVillagerProfessionDefault = profSelect.defaultValue;
      controls.push(profSelect);
    }

    const levelSelect = makeVillagerSelect(
      all,
      ns,
      "entity/zombie_villager/profession_level/",
      "Level",
      "zombie_villager.level",
      "none",
      villagerLevelLabel,
    );
    if (levelSelect) {
      zombieVillagerLevelDefault = levelSelect.defaultValue;
      controls.push(levelSelect);
    }
  }

  // -----------------------------------------------------------------------
  // Banner patterns (single select) + base + pattern colors
  // -----------------------------------------------------------------------
  const bannerPatternPrefix = `${ns}:entity/banner/`;
  const bannerPatterns = allAssetIds
    .filter((id) => id.startsWith(bannerPatternPrefix))
    .map((id) => id as AssetId);

  const shouldOfferBannerPatterns =
    bannerPatterns.length > 0 &&
    (entityType === "banner" ||
      entityType === "banner_base" ||
      stripNamespace(baseAssetId).startsWith("entity/banner"));

  if (shouldOfferBannerPatterns) {
    const bannerFullTexture =
      findAssetId(ns, ["entity/banner_base"], all) ??
      findAssetId(ns, ["entity/banner/base", "entity/banner/banner_base"], all);

    controls.push({
      kind: "select",
      id: "banner.placement",
      label: "Placement",
      defaultValue: "standing",
      options: [
        { value: "standing", label: "Standing" },
        { value: "wall", label: "Wall" },
      ],
    });
    controls.push({
      kind: "select",
      id: "banner.facing",
      label: "Facing",
      defaultValue: "0",
      options: Array.from({ length: 16 }, (_, i) => ({
        value: String(i),
        label: `${i}`,
      })),
    });

    controls.push({
      kind: "select",
      id: "banner.base_color",
      label: "Base Color",
      defaultValue: "white",
      options: DYE_COLORS.map((d) => ({ value: d.id, label: d.label })),
    });

    const patternOptions: Array<{ value: string; label: string }> = [
      { value: "none", label: "None" },
    ];

    for (const pat of stableUnique(bannerPatterns)) {
      const leafName = stripNamespace(pat).split("/").pop() ?? "";
      if (!leafName) continue;
      if (leafName === "base" || leafName === "banner_base") continue;
      patternOptions.push({ value: leafName, label: titleLabel(leafName) });
    }

    if (patternOptions.length > 1) {
      controls.push({
        kind: "select",
        id: "banner.pattern",
        label: "Pattern",
        defaultValue: "none",
        options: patternOptions,
      });

      controls.push({
        kind: "select",
        id: "banner.pattern_color",
        label: "Pattern Color",
        defaultValue: "black",
        options: DYE_COLORS.map((d) => ({ value: d.id, label: d.label })),
      });
    }

    if (bannerFullTexture) {
      getBaseTextureAssetId = () => bannerFullTexture;
    }

    getCemEntityType = () => {
      return { entityType: "banner", parentEntity: null };
    };

    getRootTransform = (state) => {
      const rot = parseInt(getSelect(state, "banner.facing", "0"), 10);
      const idx = Number.isFinite(rot) ? rot : 0;
      return { rotation: { x: 0, y: -idx * (Math.PI / 8), z: 0 } };
    };

    // Hide the standing pole when placed on a wall.
    getBoneRenderOverrides = (state) => {
      const placement = getSelect(state, "banner.placement", "standing");
      if (placement !== "wall") return {};
      return { stand: { visible: false } };
    };
  }

  // If nothing is discoverable, don't show a schema.
  const hasNonBannerControls = controls.some((c) => !c.id.startsWith("banner."));
  const hasAnyControls = controls.length > 0;
  if (!hasAnyControls || (!hasNonBannerControls && !shouldOfferBannerPatterns)) {
    return null;
  }

  const getActiveLayers = (state: EntityFeatureStateView): EntityLayerDefinition[] => {
    const layers: EntityLayerDefinition[] = [];

    if (hasEyes && eyesTexture) {
      if (getToggle(state, "feature.glowing_eyes", true)) {
        layers.push({
          id: "glowing_eyes",
          label: "Glowing Eyes",
          kind: "cloneTexture",
          textureAssetId: eyesTexture,
          blend: "additive",
          zIndex: 200,
          opacity: 1,
          materialMode: { kind: "emissive", intensity: 1 },
        });
      }
    }

    if (entityType === "creeper" && creeperArmor) {
      if (getToggle(state, "creeper.charge", false)) {
        layers.push({
          id: "creeper_charge",
          label: "Charge",
          kind: "cemModel",
          cemEntityTypeCandidates: ["creeper_charge", "creeper_armor"],
          textureAssetId: creeperArmor,
          blend: "additive",
          zIndex: 180,
          opacity: 0.85,
          materialMode: { kind: "emissive", intensity: 0.8 },
        });
      }
    }

    if (outerLayerTexture && getToggle(state, "feature.outer_layer", true)) {
      layers.push({
        id: "outer_layer",
        label: "Outer Layer",
        kind: "cemModel",
        cemEntityTypeCandidates: [`${entityType}_outer`, `${leaf}_outer`],
        textureAssetId: outerLayerTexture,
        blend: "normal",
        zIndex: 110,
        opacity: 1,
        materialMode: { kind: "default" },
      });
    }

    // Crackiness overlays (iron golem)
    const crackiness = getSelect(state, "feature.crackiness", "none");
    if (crackiness !== "none") {
      const tex = findAssetId(
        ns,
        [
          dir
            ? `entity/${dir}/${leaf}_crackiness_${crackiness}`
            : `entity/${leaf}_crackiness_${crackiness}`,
          `entity/${folderRoot}/${leaf}_crackiness_${crackiness}`,
        ],
        all,
      );
      if (tex) {
        layers.push({
          id: "crackiness",
          label: "Cracks",
          kind: "cloneTexture",
          textureAssetId: tex,
          blend: "normal",
          zIndex: 115,
          opacity: 1,
          materialMode: { kind: "default" },
        });
      }
    }

    if (entityType === "sheep" && (sheepWoolTexture || sheepUndercoatTexture)) {
      const coatState = getSelect(state, "sheep.coat_state", "full");
      const dyeId = getSelect(state, "sheep.color", "white");
      const rgb = getDyeRgb(dyeId);

      const wantUndercoat = coatState === "full" || coatState === "sheared";
      const wantOuterCoat = coatState === "full";

      if (wantUndercoat && sheepUndercoatTexture) {
        layers.push({
          id: "sheep_undercoat",
          label: "Undercoat",
          kind: "cemModel",
          cemEntityTypeCandidates: [
            "sheep_wool_undercoat",
            "sheep_fur",
            "sheep_wool",
          ],
          textureAssetId: sheepUndercoatTexture,
          blend: "normal",
          zIndex: 120,
          opacity: 1,
          materialMode: { kind: "tint", color: rgb },
        });
      }

      if (wantOuterCoat && sheepWoolTexture) {
        layers.push({
          id: "sheep_wool",
          label: "Wool",
          kind: "cemModel",
          cemEntityTypeCandidates: ["sheep_wool", "sheep_fur"],
          textureAssetId: sheepWoolTexture,
          blend: "normal",
          zIndex: 130,
          opacity: 1,
          materialMode: { kind: "tint", color: rgb },
        });
      }
    }

    if (isVillagerFamily) {
      const type = getSelect(state, "villager.type", villagerTypeDefault);
      if (type !== "none") {
        const tex = `${ns}:entity/villager/type/${type}` as AssetId;
        if (all.has(tex)) {
          layers.push({
            id: "villager_type",
            label: "Villager Type",
            kind: "cloneTexture",
            textureAssetId: tex,
            blend: "normal",
            zIndex: 80,
            opacity: 1,
            materialMode: { kind: "default" },
          });
        }
      }

      const prof = getSelect(state, "villager.profession", villagerProfessionDefault);
      if (prof !== "none") {
        const tex = `${ns}:entity/villager/profession/${prof}` as AssetId;
        if (all.has(tex)) {
          layers.push({
            id: "villager_profession",
            label: "Profession",
            kind: "cloneTexture",
            textureAssetId: tex,
            blend: "normal",
            zIndex: 90,
            opacity: 1,
            materialMode: { kind: "default" },
          });
        }
      }

      const level = getSelect(state, "villager.level", villagerLevelDefault);
      if (level !== "none") {
        const tex = `${ns}:entity/villager/profession_level/${level}` as AssetId;
        if (all.has(tex)) {
          layers.push({
            id: "villager_level",
            label: "Level",
            kind: "cloneTexture",
            textureAssetId: tex,
            blend: "normal",
            zIndex: 95,
            opacity: 1,
            materialMode: { kind: "default" },
          });
        }
      }
    }

    if (isZombieVillagerFamily) {
      const type = getSelect(state, "zombie_villager.type", zombieVillagerTypeDefault);
      if (type !== "none") {
        const tex = `${ns}:entity/zombie_villager/type/${type}` as AssetId;
        if (all.has(tex)) {
          layers.push({
            id: "zombie_villager_type",
            label: "Villager Type",
            kind: "cloneTexture",
            textureAssetId: tex,
            blend: "normal",
            zIndex: 80,
            opacity: 1,
            materialMode: { kind: "default" },
          });
        }
      }

      const prof = getSelect(
        state,
        "zombie_villager.profession",
        zombieVillagerProfessionDefault,
      );
      if (prof !== "none") {
        const tex = `${ns}:entity/zombie_villager/profession/${prof}` as AssetId;
        if (all.has(tex)) {
          layers.push({
            id: "zombie_villager_profession",
            label: "Profession",
            kind: "cloneTexture",
            textureAssetId: tex,
            blend: "normal",
            zIndex: 90,
            opacity: 1,
            materialMode: { kind: "default" },
          });
        }
      }

      const level = getSelect(state, "zombie_villager.level", zombieVillagerLevelDefault);
      if (level !== "none") {
        const tex = `${ns}:entity/zombie_villager/profession_level/${level}` as AssetId;
        if (all.has(tex)) {
          layers.push({
            id: "zombie_villager_level",
            label: "Level",
            kind: "cloneTexture",
            textureAssetId: tex,
            blend: "normal",
            zIndex: 95,
            opacity: 1,
            materialMode: { kind: "default" },
          });
        }
      }
    }

    if (shouldOfferBannerPatterns) {
      const bannerFullTexture =
        findAssetId(ns, ["entity/banner_base"], all) ??
        findAssetId(ns, ["entity/banner/base", "entity/banner/banner_base"], all);
      const bannerMaskTexture =
        findAssetId(ns, ["entity/banner/base", "entity/banner/banner_base"], all) ??
        bannerFullTexture;

      const baseDyeId = getSelect(state, "banner.base_color", "white");
      const baseRgb = getDyeRgb(baseDyeId);

      if (bannerMaskTexture && baseDyeId !== "white") {
        layers.push({
          id: "banner_base_tint",
          label: "Base Color",
          kind: "cloneTexture",
          textureAssetId: bannerMaskTexture,
          blend: "normal",
          zIndex: 50,
          opacity: 1,
          materialMode: { kind: "tint", color: baseRgb },
        });
      }

      const chosen = getSelect(state, "banner.pattern", "none");
      if (chosen !== "none") {
        const patAsset = `${ns}:entity/banner/${chosen}` as AssetId;
        if (all.has(patAsset)) {
          const patDyeId = getSelect(state, "banner.pattern_color", "black");
          const patRgb = getDyeRgb(patDyeId);
          layers.push({
            id: "banner_pattern",
            label: "Pattern",
            kind: "cloneTexture",
            textureAssetId: patAsset,
            blend: "normal",
            zIndex: 60,
            opacity: 1,
            materialMode: { kind: "tint", color: patRgb },
          });
        }
      }
    }

    return layers.sort((a, b) => a.zIndex - b.zIndex);
  };

  return {
    baseAssetId,
    entityRoot: entityType,
    controls,
    ...(getBaseTextureAssetId ? { getBaseTextureAssetId } : {}),
    ...(getCemEntityType ? { getCemEntityType } : {}),
    ...(getRootTransform ? { getRootTransform } : {}),
    ...(getBoneRenderOverrides ? { getBoneRenderOverrides } : {}),
    ...(getBoneInputOverrides ? { getBoneInputOverrides } : {}),
    getActiveLayers,
  };
}
