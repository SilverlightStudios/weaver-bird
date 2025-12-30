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
  let baseAssetId = baseFromLayer ?? selectedAssetId;
  const ns = baseAssetId.includes(":") ? baseAssetId.split(":")[0] : "minecraft";

  // Treat decorated pot patterns as feature variants of the base pot.
  // This keeps feature state stable even if a user deep-links to a specific
  // pottery pattern texture.
  {
    const path = stripNamespace(baseAssetId);
    if (path.startsWith("entity/decorated_pot/") && !path.endsWith("/decorated_pot_base")) {
      const candidate = `${ns}:entity/decorated_pot/decorated_pot_base` as AssetId;
      if (all.has(candidate)) baseAssetId = candidate;
    }
  }

  // Canonicalize base entity textures for directories that represent variant families
  // so they render as a single resource card with selectors.
  {
    const entityPath = getEntityPath(baseAssetId);
    if (entityPath) {
      const direct = getDirectEntityDirAndLeaf(entityPath);
      // Generic "pure variant" directories (axolotl/frog/chicken/etc).
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
        const isDyeDir =
          uniqueLeavesRaw.length > 1 && allLeavesInSet(uniqueLeavesRaw, DYE_COLOR_IDS);
        const isWoodDir =
          uniqueLeavesRaw.length > 1 && allLeavesInSet(uniqueLeavesRaw, WOOD_TYPE_IDS);
        const isCatDir =
          direct.dir === "cat" &&
          uniqueLeavesRaw.length > 1 &&
          allLeavesInSet(uniqueLeavesRaw, CAT_SKIN_IDS);
        const isVariantDir = isPatternDir || isDyeDir || isWoodDir || isCatDir;

        if (isVariantDir) {
          const preferredDyeOrder = DYE_COLORS.map((d) => d.id);
          const preferredWoodOrder = Array.from(WOOD_TYPE_IDS);
          const preferredCatOrder = Array.from(CAT_SKIN_IDS);

          const canonicalLeaf = (() => {
            if (isDyeDir) {
              // Many vanilla dye-able entities default to red (beds, banners, etc).
              if (uniqueLeavesRaw.includes("red")) return "red";
              return (
                sortByPreferredOrder(uniqueLeavesRaw, preferredDyeOrder)[0] ??
                uniqueLeavesRaw[0] ??
                direct.leaf
              );
            }
            if (isWoodDir) {
              if (uniqueLeavesRaw.includes("oak")) return "oak";
              return (
                sortByPreferredOrder(uniqueLeavesRaw, preferredWoodOrder)[0] ??
                uniqueLeavesRaw[0] ??
                direct.leaf
              );
            }
            if (isCatDir) {
              if (uniqueLeavesRaw.includes("tabby")) return "tabby";
              return (
                sortByPreferredOrder(uniqueLeavesRaw, preferredCatOrder)[0] ??
                uniqueLeavesRaw[0] ??
                direct.leaf
              );
            }
            // Frog skins: prefer temperate when present.
            if (direct.dir === "frog" && uniqueLeavesRaw.includes("temperate_frog")) {
              return "temperate_frog";
            }
            // Prefer a leaf that matches the directory name when available.
            if (uniqueLeavesRaw.includes(direct.dir)) return direct.dir;
            return uniqueLeavesRaw[0] ?? direct.leaf;
          })();

          const canonical =
            findAssetId(
              ns,
              [
                `entity/${direct.dir}/${canonicalLeaf}`,
              ],
              all,
            ) ?? null;
          if (canonical) baseAssetId = canonical;
        }
      }

      // Fox textures are stored as multiple state variants in one directory
      // (snow + sleeping). Normalize to `fox` so we can render a single card.
      if (entityPath.startsWith("fox/")) {
        const canonical =
          findAssetId(ns, ["entity/fox/fox"], all) ?? null;
        if (canonical) baseAssetId = canonical;
      }

      // Llama skins are separate textures in the llama folder (creamy/white/etc).
      // Normalize to a stable default so we can expose a fur color selector.
      if (entityPath.startsWith("llama/")) {
        const leaves: string[] = [];
        for (const id of all) {
          if (isEntityFeatureLayerTextureAssetId(id)) continue;
          const p = getEntityPath(id);
          if (!p) continue;
          const d = getDirectEntityDirAndLeaf(p);
          if (!d) continue;
          if (d.dir !== "llama") continue;
          leaves.push(d.leaf);
        }
        const unique = stableUnique(leaves);
        const preferred = unique.includes("creamy")
          ? "creamy"
          : unique.includes("white")
            ? "white"
            : unique[0];
        const canonical =
          preferred ? findAssetId(ns, [`entity/llama/${preferred}`], all) : null;
        if (canonical) baseAssetId = canonical;
      }

      // Horse coats + markings share a folder. Normalize to a stable coat texture.
      if (entityPath.startsWith("horse/")) {
        const coats: string[] = [];
        for (const id of all) {
          if (isEntityFeatureLayerTextureAssetId(id)) continue;
          const p = getEntityPath(id);
          if (!p) continue;
          const d = getDirectEntityDirAndLeaf(p);
          if (!d) continue;
          if (d.dir !== "horse") continue;
          if (!d.leaf.startsWith("horse_")) continue;
          if (d.leaf.startsWith("horse_markings_")) continue;
          coats.push(d.leaf);
        }
        const unique = stableUnique(coats);
        const preferred = unique.includes("horse_brown")
          ? "horse_brown"
          : unique[0];
        const canonical =
          preferred ? findAssetId(ns, [`entity/horse/${preferred}`], all) : null;
        if (canonical) baseAssetId = canonical;
      }
    }
  }

  const entityPath = getEntityPath(baseAssetId);
  if (!entityPath) return null;
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
  let getPartTextureOverrides:
    | EntityCompositeSchema["getPartTextureOverrides"]
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
  if (direct && direct.dir !== "bee" && direct.dir !== "banner" && direct.dir !== "horse") {
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
  // Fox: consolidate snow/sleep variants into selectors.
  // -----------------------------------------------------------------------
  if (folderRoot === "fox") {
    const hasSnow = all.has(`${ns}:entity/fox/snow_fox` as AssetId);
    const hasFoxSleep = all.has(`${ns}:entity/fox/fox_sleep` as AssetId);
    const hasSnowSleep = all.has(`${ns}:entity/fox/snow_fox_sleep` as AssetId);

    if (hasSnow) {
      controls.push({
        kind: "select",
        id: "fox.type",
        label: "Type",
        defaultValue: "fox",
        options: [
          { value: "fox", label: "Red" },
          { value: "snow_fox", label: "Snow" },
        ],
      });
    }
    if (hasFoxSleep || hasSnowSleep) {
      controls.push({
        kind: "toggle",
        id: "fox.sleeping",
        label: "Sleeping",
        defaultValue: false,
      });
    }

    if (hasSnow || hasFoxSleep || hasSnowSleep) {
      getBaseTextureAssetId = (state) => {
        const type = getSelect(state, "fox.type", "fox");
        const sleeping = getToggle(state, "fox.sleeping", false);
        const baseLeaf = hasSnow && type === "snow_fox" ? "snow_fox" : "fox";
        const sleepLeaf = `${baseLeaf}_sleep`;
        const candidate = `${ns}:entity/fox/${sleeping ? sleepLeaf : baseLeaf}` as AssetId;
        return all.has(candidate) ? candidate : (`${ns}:entity/fox/${baseLeaf}` as AssetId);
      };
    }
  }

  // -----------------------------------------------------------------------
  // Llama: consolidate fur colors into a selector.
  // -----------------------------------------------------------------------
  if (folderRoot === "llama") {
    const furLeaves: string[] = [];
    for (const id of all) {
      if (isEntityFeatureLayerTextureAssetId(id)) continue;
      const p = getEntityPath(id);
      if (!p) continue;
      const d = getDirectEntityDirAndLeaf(p);
      if (!d) continue;
      if (d.dir !== "llama") continue;
      furLeaves.push(d.leaf);
    }
    const furColors = stableUnique(furLeaves);
    if (furColors.length > 1) {
      controls.push({
        kind: "select",
        id: "llama.fur_color",
        label: "Fur Color",
        defaultValue: furColors.includes("creamy")
          ? "creamy"
          : furColors.includes("white")
            ? "white"
            : furColors[0]!,
        options: furColors.map((c) => ({ value: c, label: titleLabel(c) })),
      });
      getBaseTextureAssetId = (state) => {
        const chosen = getSelect(state, "llama.fur_color", furColors[0]!);
        const candidate = `${ns}:entity/llama/${chosen}` as AssetId;
        return all.has(candidate) ? candidate : baseAssetId;
      };
    }
  }

  // -----------------------------------------------------------------------
  // Horse: coat + markings composition.
  // -----------------------------------------------------------------------
  if (folderRoot === "horse") {
    const coatLeaves: string[] = [];
    const markingsLeaves: string[] = [];
    for (const id of all) {
      if (isEntityFeatureLayerTextureAssetId(id)) continue;
      const p = getEntityPath(id);
      if (!p) continue;
      const d = getDirectEntityDirAndLeaf(p);
      if (!d) continue;
      if (d.dir !== "horse") continue;
      if (d.leaf.startsWith("horse_markings_")) markingsLeaves.push(d.leaf);
      else if (d.leaf.startsWith("horse_")) coatLeaves.push(d.leaf);
    }
    const coats = stableUnique(coatLeaves);
    const markings = stableUnique(markingsLeaves);
    if (coats.length > 1) {
      controls.push({
        kind: "select",
        id: "horse.coat",
        label: "Coat",
        defaultValue: coats.includes("horse_brown") ? "horse_brown" : coats[0]!,
        options: coats.map((c) => ({
          value: c,
          label: titleLabel(c.replace(/^horse_/, "")),
        })),
      });
      getBaseTextureAssetId = (state) => {
        const chosen = getSelect(state, "horse.coat", coats[0]!);
        const candidate = `${ns}:entity/horse/${chosen}` as AssetId;
        return all.has(candidate) ? candidate : baseAssetId;
      };
    }
    if (markings.length > 0) {
      controls.push({
        kind: "select",
        id: "horse.markings",
        label: "Markings",
        defaultValue: "none",
        options: [
          { value: "none", label: "None" },
          ...markings.map((m) => ({
            value: m,
            label: titleLabel(m.replace(/^horse_markings_/, "")),
          })),
        ],
      });
    }
  }

  // -----------------------------------------------------------------------
  // Decorated pot (block-entity style multi-texture rig)
  //
  // Vanilla stores a base pot texture plus many pottery pattern textures under
  // `entity/decorated_pot/*`. The model uses the base texture for the neck/top/bottom
  // and applies patterns only to the side faces. Expose a selector and apply
  // per-part texture overrides so the pot wraps correctly.
  // -----------------------------------------------------------------------
  if (folderRoot === "decorated_pot" || dir === "decorated_pot") {
    const basePotTexture =
      findAssetId(
        ns,
        [
          "entity/decorated_pot/decorated_pot_base",
          "entity/decorated_pot_base",
        ],
        all,
      ) ?? baseAssetId;
    const sidePotTexture =
      findAssetId(
        ns,
        [
          "entity/decorated_pot/decorated_pot_side",
          "entity/decorated_pot_side",
        ],
        all,
      ) ?? basePotTexture;

    const patternLeaves: string[] = [];
    for (const id of all) {
      const p = getEntityPath(id);
      if (!p) continue;
      if (!p.startsWith("decorated_pot/")) continue;
      const leafName = p.split("/").pop();
      if (!leafName) continue;
      if (leafName === "decorated_pot_base" || leafName === "decorated_pot_side")
        continue;
      patternLeaves.push(leafName);
    }

    const patterns = stableUnique(patternLeaves);
    controls.push({
      kind: "select",
      id: "decorated_pot.pattern",
      label: "Pottery Sherd",
      defaultValue: "none",
      options: [
        { value: "none", label: "None" },
        ...patterns.map((p) => ({
          value: p,
          label: titleLabel(p.replace(/_pottery_pattern$/, "")),
        })),
      ],
    });

    // Always use the base pot texture as the "main" texture so the neck/top/bottom
    // (and any un-patterned bits) wrap correctly. The selected pattern is applied
    // only to side parts via part texture overrides.
    getBaseTextureAssetId = () => basePotTexture;
    getCemEntityType = () => ({ entityType: "decorated_pot", parentEntity: null });

    getPartTextureOverrides = (state) => {
      const chosen = getSelect(state, "decorated_pot.pattern", "none");
      const patternCandidate =
        chosen === "none"
          ? null
          : (`${ns}:entity/decorated_pot/${chosen}` as AssetId);
      const patternTex =
        patternCandidate && all.has(patternCandidate)
          ? patternCandidate
          : sidePotTexture;

      // Default vanilla part names (from our vanilla JEM mocks).
      return {
        neck: basePotTexture,
        top: basePotTexture,
        bottom: basePotTexture,
        front: patternTex,
        back: patternTex,
        left: patternTex,
        right: patternTex,
      };
    };
  }

  // -----------------------------------------------------------------------
  // Equipment (armor) textures
  //
  // Vanilla stores armor/equipment textures under `entity/equipment/*`. These
  // textures are rendered on top of base rigs (player, armor stand, etc).
  //
  // For previews we map equipment textures to a display rig (see
  // `getEntityInfoFromAssetId`) and provide:
  // - slot selector (to show one armor piece at a time)
  // - optional underlay (player / armor stand), mutually exclusive
  // -----------------------------------------------------------------------
  const isEquipment = folderRoot === "equipment";
  let equipmentKind: string | null = null;
  let equipmentInfo:
    | null
    | {
        isHumanoid: boolean;
        isLayer1: boolean;
        isLayer2: boolean;
        armorTextureLayer1: AssetId | null;
        armorTextureLayer2: AssetId | null;
        buildLayer1Overrides?: (state: EntityFeatureStateView) => Record<string, { visible?: boolean }>;
        buildLayer2Overrides?: (state: EntityFeatureStateView) => Record<string, { visible?: boolean }>;
      } = null;
  if (isEquipment) {
    const parts = entityPath.split("/");
    equipmentKind = parts[1] ?? null;
    const kindLower = (equipmentKind ?? "").toLowerCase();

    const isHumanoid = kindLower.includes("humanoid");
    const isLeggings =
      kindLower.includes("humanoid_leggings") || kindLower.includes("leggings");
    const isLayer1 = isHumanoid && !isLeggings;
    const isLayer2 = isLeggings;

    // Only humanoid armor supports player/armor-stand underlays and piece toggles.
    const leggingsTexture = isLayer1
      ? findAssetId(ns, [`entity/equipment/humanoid_leggings/${leaf}`], all)
      : null;
    const hasLeggings = isLayer1 && !!leggingsTexture;

    if (isLayer1 || isLayer2) {
      if (isHumanoid) {
        controls.push({
          kind: "toggle",
          id: "equipment.add_player",
          label: "Show Player",
          defaultValue: false,
        });
        controls.push({
          kind: "toggle",
          id: "equipment.add_armor_stand",
          label: "Show Armor Stand",
          defaultValue: false,
        });
      }

      if (isLayer1) {
        controls.push({
          kind: "toggle",
          id: "equipment.show_helmet",
          label: "Helmet",
          defaultValue: true,
        });
        controls.push({
          kind: "toggle",
          id: "equipment.show_chestplate",
          label: "Chestplate",
          defaultValue: true,
        });
        if (hasLeggings) {
          controls.push({
            kind: "toggle",
            id: "equipment.show_leggings",
            label: "Leggings",
            defaultValue: true,
          });
        }
        controls.push({
          kind: "toggle",
          id: "equipment.show_boots",
          label: "Boots",
          defaultValue: true,
        });
      } else if (isLayer2) {
        controls.push({
          kind: "toggle",
          id: "equipment.show_leggings",
          label: "Leggings",
          defaultValue: true,
        });
      }

      // When showing a humanoid underlay, swap the base model + texture to the
      // underlay rig so the base can animate (walking/sprinting) while armor is
      // rendered as overlays.
      if (isHumanoid) {
        const armorStandTexture =
          findAssetId(
            ns,
            [
              // Modern vanilla path (textures/entity/armorstand/armorstand.png)
              "entity/armorstand/armorstand",
              // Some versions/packs use wood.png for armor stands.
              "entity/armorstand/wood",
              // Legacy/common naming (textures/entity/armor_stand.png)
              "entity/armor_stand",
              // Occasionally nested.
              "entity/armor_stand/armor_stand",
            ],
            all,
          ) ?? ("minecraft:entity/armor_stand" as AssetId);

        getBaseTextureAssetId = (state) => {
          const showPlayer = getToggle(state, "equipment.add_player", false);
          if (showPlayer) return "minecraft:entity/player/wide/steve";
          // Default to armor stand rig when not previewing on the player.
          return armorStandTexture;
        };

        getCemEntityType = (state) => {
          const showPlayer = getToggle(state, "equipment.add_player", false);
          if (showPlayer) return { entityType: "player", parentEntity: null };
          // Default base rig for humanoid equipment previews.
          return { entityType: "armor_stand", parentEntity: null };
        };
      }

      const buildArmorLayer1Overrides = (state: EntityFeatureStateView) => {
        const showHelmet = getToggle(state, "equipment.show_helmet", true);
        const showChest = getToggle(state, "equipment.show_chestplate", true);
        const showBoots = getToggle(state, "equipment.show_boots", true);
        if (showHelmet && showChest && showBoots) return { "*": { visible: true } };
        const overrides: Record<string, { visible?: boolean }> = { "*": { visible: false } };
        if (showHelmet) overrides.head = { visible: true };
        if (showChest) {
          overrides.body = { visible: true };
          overrides.left_arm = { visible: true };
          overrides.right_arm = { visible: true };
        }
        if (showBoots) {
          overrides.left_shoe = { visible: true };
          overrides.right_shoe = { visible: true };
        }
        return overrides;
      };

      const buildUnderlayBaseOverrides = (state: EntityFeatureStateView) => {
        const showPlayer = getToggle(state, "equipment.add_player", false);
        const showArmorStand = getToggle(
          state,
          "equipment.add_armor_stand",
          false,
        );
        // When neither is enabled, the armor stand rig still drives animation
        // but should not render (armor overlays are the focus).
        const showBase = showPlayer || showArmorStand;
        const overrides: Record<string, { visible?: boolean }> = {};
        if (!showBase) overrides["*"] = { visible: false };

        // Avoid hat/second-layer pixels poking through helmets in preview:
        // hide the *headwear* layer when a helmet is enabled, but keep the
        // head visible so alpha-cutout helmets (e.g. chainmail) can show the
        // face beneath.
        if (!isLayer1) return overrides;
        const showHelmet = getToggle(state, "equipment.show_helmet", true);
        if (!showHelmet) return overrides;
        return {
          ...overrides,
          headwear: { visible: false },
        };
      };

      const buildArmorLayer2Overrides = (state: EntityFeatureStateView) => {
        const showLeggings = getToggle(state, "equipment.show_leggings", true);
        return { "*": { visible: !!showLeggings } };
      };

      equipmentInfo = {
        isHumanoid,
        isLayer1,
        isLayer2,
        armorTextureLayer1: isLayer1 ? baseAssetId : null,
        armorTextureLayer2: isLayer2 ? baseAssetId : leggingsTexture,
        buildLayer1Overrides: isLayer1 ? buildArmorLayer1Overrides : undefined,
        buildLayer2Overrides: isLayer2 ? buildArmorLayer2Overrides : undefined,
      };

      const existing = getBoneRenderOverrides;
      getBoneRenderOverrides = (state) => {
        // Humanoid equipment base is always player or armor stand.
        const baseOverrides: Record<string, { visible?: boolean }> = {};
        if (isHumanoid) {
          Object.assign(baseOverrides, buildUnderlayBaseOverrides(state));
        } else {
          // Non-humanoid equipment falls back to rendering its own CEM rig as base.
          if (isLayer1) Object.assign(baseOverrides, buildArmorLayer1Overrides(state));
          if (isLayer2) Object.assign(baseOverrides, buildArmorLayer2Overrides(state));
        }

        return existing ? { ...existing(state), ...baseOverrides } : baseOverrides;
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
  // Breeze: optional wind entities (separate textures + CEM models).
  // -----------------------------------------------------------------------
  let breezeWindTexture: AssetId | null = null;
  let breezeWindChargeTexture: AssetId | null = null;
  if (folderRoot === "breeze") {
    breezeWindTexture = findAssetId(
      ns,
      [
        "entity/breeze/breeze_wind",
        "entity/breeze/wind",
        "entity/breeze/breeze_air",
      ],
      all,
    );
    breezeWindChargeTexture = findAssetId(
      ns,
      [
        "entity/breeze/breeze_wind_charge",
        "entity/breeze/wind_charge",
      ],
      all,
    );
    if (breezeWindTexture) {
      controls.push({
        kind: "toggle",
        id: "breeze.wind",
        label: "Wind",
        defaultValue: false,
      });
    }
    if (breezeWindChargeTexture) {
      controls.push({
        kind: "toggle",
        id: "breeze.wind_charge",
        label: "Wind Charge",
        defaultValue: false,
      });
    }
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
  // Armadillo curl-up pose (vanilla model includes both unrolled + rolled cube)
  // -----------------------------------------------------------------------
  if (folderRoot === "armadillo" || entityType === "armadillo" || entityType === "armadillo_baby") {
    controls.push({
      kind: "select",
      id: "armadillo.pose",
      label: "Pose",
      defaultValue: "unrolled",
      options: [
        { value: "unrolled", label: "Unrolled" },
        { value: "rolled", label: "Rolled Up" },
      ],
    });

    const existing = getBoneRenderOverrides;
    getBoneRenderOverrides = (state) => {
      const pose = getSelect(state, "armadillo.pose", "unrolled");
      const rolled = pose === "rolled";
      const overrides: Record<string, { visible?: boolean }> = {
        "*": { visible: !rolled },
        cube: { visible: rolled },
      };
      return existing ? { ...existing(state), ...overrides } : overrides;
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
  // Entity equipment overlays (saddles, armor, harnesses, decorations)
  // -----------------------------------------------------------------------
  const findEquipment = (path: string): AssetId | null =>
    findAssetId(ns, [`entity/equipment/${path}`], all);

  // Horse: armor select + saddle toggle.
  const horseSaddleTexture = findEquipment("horse_saddle/saddle");
  let horseArmorOptions: Array<{ value: string; label: string; assetId: AssetId }> = [];
  if (folderRoot === "horse") {
    for (const id of all) {
      if (!id.startsWith(`${ns}:entity/equipment/horse_body/`)) continue;
      const leafName = stripNamespace(id).split("/").pop();
      if (!leafName) continue;
      horseArmorOptions.push({ value: leafName, label: titleLabel(leafName), assetId: id });
    }
    horseArmorOptions = stableUnique(horseArmorOptions.map((o) => o.value)).map(
      (v) => horseArmorOptions.find((o) => o.value === v)!,
    );

    if (horseArmorOptions.length > 0) {
      controls.push({
        kind: "select",
        id: "horse.armor",
        label: "Horse Armor",
        defaultValue: "none",
        options: [{ value: "none", label: "None" }].concat(
          horseArmorOptions.map((o) => ({ value: o.value, label: o.label })),
        ),
      });
    }
    if (horseSaddleTexture) {
      controls.push({
        kind: "toggle",
        id: "horse.saddle",
        label: "Saddle",
        defaultValue: false,
      });
    }
  }

  // Camel: saddle toggle.
  const camelSaddleTexture = findEquipment("camel_saddle/saddle");
  if (folderRoot === "camel" && camelSaddleTexture) {
    controls.push({
      kind: "toggle",
      id: "camel.saddle",
      label: "Saddle",
      defaultValue: false,
    });
  }

  // Donkey: saddle toggle.
  const donkeySaddleTexture = findEquipment("donkey_saddle/saddle");
  if (folderRoot === "donkey" && donkeySaddleTexture) {
    controls.push({
      kind: "toggle",
      id: "donkey.saddle",
      label: "Saddle",
      defaultValue: false,
    });
  }
  // Donkey: chest toggle (model includes chest bones).
  if (folderRoot === "donkey") {
    controls.push({
      kind: "toggle",
      id: "donkey.chest",
      label: "Chest",
      defaultValue: false,
    });
  }

  // Happy ghast: harness toggle + color select.
  let happyGhastHarnessColors: string[] = [];
  if (folderRoot === "happy_ghast") {
    for (const id of all) {
      if (!id.startsWith(`${ns}:entity/equipment/happy_ghast_body/`)) continue;
      const leafName = stripNamespace(id).split("/").pop();
      if (!leafName || !leafName.endsWith("_harness")) continue;
      happyGhastHarnessColors.push(leafName.replace(/_harness$/, ""));
    }
    happyGhastHarnessColors = stableUnique(happyGhastHarnessColors);
    if (happyGhastHarnessColors.length > 0) {
      controls.push({
        kind: "toggle",
        id: "happy_ghast.harness",
        label: "Harness",
        defaultValue: false,
      });
      controls.push({
        kind: "select",
        id: "happy_ghast.harness_color",
        label: "Harness Color",
        defaultValue: happyGhastHarnessColors.includes("brown")
          ? "brown"
          : happyGhastHarnessColors[0]!,
        options: happyGhastHarnessColors.map((c) => ({
          value: c,
          label: titleLabel(c),
        })),
      });
    }
  }

  // Piglin / piglin brute: optional humanoid armor overlay.
  let humanoidArmorMaterials: string[] = [];
  const isPiglinLike =
    folderRoot === "piglin" &&
    (entityType === "piglin" || entityType === "piglin_brute");
  if (isPiglinLike) {
    for (const id of all) {
      if (!id.startsWith(`${ns}:entity/equipment/humanoid/`)) continue;
      const leafName = stripNamespace(id).split("/").pop();
      if (!leafName) continue;
      humanoidArmorMaterials.push(leafName);
    }
    humanoidArmorMaterials = stableUnique(humanoidArmorMaterials);
    if (humanoidArmorMaterials.length > 0) {
      controls.push({
        kind: "toggle",
        id: "mob_armor.enabled",
        label: "Armor",
        defaultValue: false,
      });
      controls.push({
        kind: "select",
        id: "mob_armor.material",
        label: "Armor Material",
        defaultValue: humanoidArmorMaterials.includes("diamond")
          ? "diamond"
          : humanoidArmorMaterials[0]!,
        options: humanoidArmorMaterials.map((m) => ({
          value: m,
          label: titleLabel(m),
        })),
      });
      controls.push({
        kind: "toggle",
        id: "mob_armor.show_helmet",
        label: "Helmet",
        defaultValue: true,
      });
      controls.push({
        kind: "toggle",
        id: "mob_armor.show_chestplate",
        label: "Chestplate",
        defaultValue: true,
      });
      controls.push({
        kind: "toggle",
        id: "mob_armor.show_leggings",
        label: "Leggings",
        defaultValue: true,
      });
      controls.push({
        kind: "toggle",
        id: "mob_armor.show_boots",
        label: "Boots",
        defaultValue: true,
      });
    }
  }

  // Llama decorations: toggle + color select.
  let llamaDecorColors: string[] = [];
  const isLlamaFamily = folderRoot === "llama" || folderRoot === "trader_llama";
  if (isLlamaFamily) {
    // Llamas can have side chests (model includes both).
    controls.push({
      kind: "toggle",
      id: "llama.chest",
      label: "Chest",
      defaultValue: false,
    });
    for (const id of all) {
      if (!id.startsWith(`${ns}:entity/equipment/llama_body/`)) continue;
      const leafName = stripNamespace(id).split("/").pop();
      if (!leafName) continue;
      llamaDecorColors.push(leafName);
    }
    llamaDecorColors = stableUnique(llamaDecorColors);
    if (llamaDecorColors.length > 0) {
      controls.push({
        kind: "toggle",
        id: "llama.decor",
        label: "Decor",
        defaultValue: false,
      });
      controls.push({
        kind: "select",
        id: "llama.decor_color",
        label: "Decor Color",
        defaultValue: llamaDecorColors.includes("white")
          ? "white"
          : llamaDecorColors[0]!,
        options: llamaDecorColors.map((c) => ({
          value: c,
          label: titleLabel(c),
        })),
      });
    }
  }

  // Hide optional chest bones by default unless enabled.
  if (folderRoot === "donkey" || isLlamaFamily) {
    const existing = getBoneRenderOverrides;
    getBoneRenderOverrides = (state) => {
      const base = (existing ? existing(state) : {}) as Record<
        string,
        { visible?: boolean }
      >;
      const overrides: Record<string, { visible?: boolean }> = { ...base };

      if (folderRoot === "donkey") {
        const hasChest = getToggle(state, "donkey.chest", false);
        if (!hasChest) {
          const donkeyChestBones = [
            "left_chest",
            "right_chest",
            "left_chest2",
            "right_chest2",
            "mule_left_chest",
            "mule_right_chest",
          ];
          for (const bone of donkeyChestBones) overrides[bone] = { visible: false };
        }
      }

      if (isLlamaFamily) {
        const hasChest = getToggle(state, "llama.chest", false);
        if (!hasChest) {
          const llamaChestBones = [
            "chest_left",
            "chest_right",
            "chest_left_rotation",
            "chest_right_rotation",
          ];
          for (const bone of llamaChestBones) overrides[bone] = { visible: false };
        }
      }

      return overrides;
    };
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

    if (folderRoot === "breeze") {
      if (breezeWindTexture && getToggle(state, "breeze.wind", false)) {
        layers.push({
          id: "breeze_wind",
          label: "Wind",
          kind: "cemModel",
          cemEntityTypeCandidates: ["breeze_wind", "breeze_air", "wind"],
          textureAssetId: breezeWindTexture,
          blend: "additive",
          zIndex: 170,
          opacity: 1,
          materialMode: { kind: "emissive", intensity: 0.9 },
        });
      }
      if (breezeWindChargeTexture && getToggle(state, "breeze.wind_charge", false)) {
        layers.push({
          id: "breeze_wind_charge",
          label: "Wind Charge",
          kind: "cemModel",
          cemEntityTypeCandidates: ["breeze_wind_charge", "wind_charge"],
          textureAssetId: breezeWindChargeTexture,
          blend: "additive",
          zIndex: 175,
          opacity: 1,
          materialMode: { kind: "emissive", intensity: 1 },
        });
      }
    }

    // Horse markings are rendered as a same-UV overlay on top of the coat.
    if (folderRoot === "horse") {
      const chosen = getSelect(state, "horse.markings", "none");
      if (chosen !== "none") {
        const tex = `${ns}:entity/horse/${chosen}` as AssetId;
        if (all.has(tex)) {
          layers.push({
            id: "horse_markings",
            label: "Markings",
            kind: "cloneTexture",
            textureAssetId: tex,
            blend: "normal",
            zIndex: 80,
            opacity: 1,
            materialMode: { kind: "default" },
          });
        }
      }
    }

    // Equipment armor: when an underlay is enabled, render armor as overlays so
    // the base rig can animate (walking/sprinting). Without an underlay, only
    // add the missing layer (leggings) as a supplemental overlay for layer-1 assets.
    if (equipmentInfo) {
      const usesUnderlayRig = equipmentInfo.isHumanoid;

      if (usesUnderlayRig) {
        if (equipmentInfo.isLayer1 && equipmentInfo.armorTextureLayer1) {
          const overrides = equipmentInfo.buildLayer1Overrides?.(state);
          const showPlayer = getToggle(state, "equipment.add_player", false);
          // Small nudge in Three.js units (pixels/16). Keep under 1px to avoid
          // visibly "floating" helmets while still preventing z-fighting.
          const helmetYOffset = 0.5 / 16;
          layers.push({
            id: "equipment_armor_layer_1",
            label: "Armor",
            kind: "cemModel",
            cemEntityTypeCandidates: ["armor_layer_1"],
            textureAssetId: equipmentInfo.armorTextureLayer1,
            blend: "normal",
            zIndex: 100,
            opacity: 1,
            materialMode: { kind: "default" },
            boneRenderOverrides: overrides,
            // On the player rig, the underlay head can z-fight with the helmet's
            // top face due to coplanar geometry. Nudge the helmet up slightly
            // to match in-game behavior without modifying vanilla JEM files.
            bonePositionOffsets: showPlayer
              ? { head: { x: 0, y: helmetYOffset, z: 0 } }
              : undefined,
            // Armor helmets can share coplanar faces with the underlay head in
            // OptiFine's vanilla `armor_layer_1` model, causing occasional
            // z-fighting/poking. Apply a tiny scale to the armor head bone to
            // keep it consistently outside the head without editing JEMs.
            boneScaleMultipliers: { head: { x: 1.01, y: 1.01, z: 1.01 } },
          });
        }

        // Leggings layer for either:
        // - layer-2 asset previews, or
        // - layer-1 assets that also have a matching leggings texture.
        if (equipmentInfo.armorTextureLayer2) {
          const overrides = equipmentInfo.buildLayer2Overrides?.(state) ?? {
            "*": { visible: getToggle(state, "equipment.show_leggings", true) },
          };
          layers.push({
            id: "equipment_armor_layer_2",
            label: "Leggings",
            kind: "cemModel",
            cemEntityTypeCandidates: ["armor_layer_2"],
            textureAssetId: equipmentInfo.armorTextureLayer2,
            blend: "normal",
            // Slightly behind layer 1 so boots can visually sit on top.
            zIndex: 90,
            opacity: 1,
            materialMode: { kind: "default" },
            boneRenderOverrides: overrides,
          });
        }
      } else {
        // No underlay: add matching leggings as an extra layer for layer-1 textures.
        if (
          equipmentInfo.isLayer1 &&
          equipmentInfo.armorTextureLayer2 &&
          getToggle(state, "equipment.show_leggings", true)
        ) {
          layers.push({
            id: "equipment_armor_layer_2",
            label: "Leggings",
            kind: "cemModel",
            cemEntityTypeCandidates: ["armor_layer_2"],
            textureAssetId: equipmentInfo.armorTextureLayer2,
            blend: "normal",
            zIndex: 90,
            opacity: 1,
            materialMode: { kind: "default" },
          });
        }
      }
    }

    // Horse equipment
    if (folderRoot === "horse") {
      const armor = getSelect(state, "horse.armor", "none");
      if (armor !== "none") {
        const opt = horseArmorOptions.find((o) => o.value === armor);
        if (opt) {
          layers.push({
            id: "horse_armor",
            label: "Armor",
            kind: "cemModel",
            cemEntityTypeCandidates: ["horse_armor"],
            textureAssetId: opt.assetId,
            blend: "normal",
            zIndex: 140,
            opacity: 1,
            materialMode: { kind: "default" },
          });
        }
      }

      if (horseSaddleTexture && getToggle(state, "horse.saddle", false)) {
        layers.push({
          id: "horse_saddle",
          label: "Saddle",
          kind: "cemModel",
          cemEntityTypeCandidates: ["horse_saddle"],
          textureAssetId: horseSaddleTexture,
          blend: "normal",
          zIndex: 135,
          opacity: 1,
          materialMode: { kind: "default" },
          boneAliasMap: {
            headpiece: "head",
            noseband: "head",
            left_bit: "head",
            right_bit: "head",
            left_rein: "head",
            right_rein: "head",
            saddle: "body",
          },
        });
      }
    }

    // Camel equipment
    if (folderRoot === "camel" && camelSaddleTexture) {
      if (getToggle(state, "camel.saddle", false)) {
        layers.push({
          id: "camel_saddle",
          label: "Saddle",
          kind: "cemModel",
          cemEntityTypeCandidates: ["camel_saddle"],
          textureAssetId: camelSaddleTexture,
          blend: "normal",
          zIndex: 135,
          opacity: 1,
          materialMode: { kind: "default" },
          boneAliasMap: {
            saddle: "body",
            bridle: "head",
            reins: "head",
          },
        });
      }
    }

    // Donkey equipment
    if (folderRoot === "donkey" && donkeySaddleTexture) {
      if (getToggle(state, "donkey.saddle", false)) {
        layers.push({
          id: "donkey_saddle",
          label: "Saddle",
          kind: "cemModel",
          cemEntityTypeCandidates: ["donkey_saddle"],
          textureAssetId: donkeySaddleTexture,
          blend: "normal",
          zIndex: 135,
          opacity: 1,
          materialMode: { kind: "default" },
          boneAliasMap: {
            headpiece: "head",
            noseband: "head",
            left_bit: "head",
            right_bit: "head",
            left_rein: "head",
            right_rein: "head",
            saddle: "body",
          },
        });
      }
    }

    // Happy ghast harness
    if (folderRoot === "happy_ghast" && happyGhastHarnessColors.length > 0) {
      const enabled = getToggle(state, "happy_ghast.harness", false);
      if (enabled) {
        const color = getSelect(
          state,
          "happy_ghast.harness_color",
          happyGhastHarnessColors[0]!,
        );
        const tex = findEquipment(`happy_ghast_body/${color}_harness`);
        if (tex) {
          layers.push({
            id: "happy_ghast_harness",
            label: "Harness",
            kind: "cemModel",
            cemEntityTypeCandidates: ["happy_ghast_harness"],
            textureAssetId: tex,
            blend: "normal",
            zIndex: 140,
            opacity: 1,
            materialMode: { kind: "default" },
            boneAliasMap: { goggles: "body", harness: "body" },
          });
        }
      }
    }

    // Piglin wearable armor
    if (isPiglinLike && humanoidArmorMaterials.length > 0) {
      const enabled = getToggle(state, "mob_armor.enabled", false);
      if (enabled) {
        const material = getSelect(
          state,
          "mob_armor.material",
          humanoidArmorMaterials[0]!,
        );
        const layer1Tex = findAssetId(ns, [`entity/equipment/humanoid/${material}`], all);
        const layer2Tex = findAssetId(
          ns,
          [`entity/equipment/humanoid_leggings/${material}`],
          all,
        );

        const showHelmet = getToggle(state, "mob_armor.show_helmet", true);
        const showChest = getToggle(state, "mob_armor.show_chestplate", true);
        const showBoots = getToggle(state, "mob_armor.show_boots", true);
        const showLeggings = getToggle(state, "mob_armor.show_leggings", true);

        const layer1Overrides: Record<string, { visible?: boolean }> =
          showHelmet && showChest && showBoots
            ? { "*": { visible: true } }
            : {
                "*": { visible: false },
                ...(showHelmet ? { head: { visible: true } } : {}),
                ...(showChest
                  ? {
                      body: { visible: true },
                      left_arm: { visible: true },
                      right_arm: { visible: true },
                    }
                  : {}),
                ...(showBoots
                  ? { left_shoe: { visible: true }, right_shoe: { visible: true } }
                  : {}),
              };

        if (layer1Tex) {
          layers.push({
            id: "mob_armor_layer_1",
            label: "Armor",
            kind: "cemModel",
            cemEntityTypeCandidates: ["armor_layer_1"],
            textureAssetId: layer1Tex,
            blend: "normal",
            zIndex: 130,
            opacity: 1,
            materialMode: { kind: "default" },
            boneRenderOverrides: layer1Overrides,
            boneScaleMultipliers: { head: { x: 1.01, y: 1.01, z: 1.01 } },
          });
        }
        if (layer2Tex) {
          layers.push({
            id: "mob_armor_layer_2",
            label: "Leggings",
            kind: "cemModel",
            cemEntityTypeCandidates: ["armor_layer_2"],
            textureAssetId: layer2Tex,
            blend: "normal",
            zIndex: 125,
            opacity: 1,
            materialMode: { kind: "default" },
            boneRenderOverrides: { "*": { visible: !!showLeggings } },
          });
        }
      }
    }

    // Llama decorations
    if (isLlamaFamily && llamaDecorColors.length > 0) {
      const enabled = getToggle(state, "llama.decor", false);
      if (enabled) {
        const color = getSelect(state, "llama.decor_color", llamaDecorColors[0]!);
        const tex = findEquipment(`llama_body/${color}`);
        if (tex) {
          layers.push({
            id: "llama_decor",
            label: "Decor",
            kind: "cemModel",
            cemEntityTypeCandidates: ["llama_decor"],
            textureAssetId: tex,
            blend: "normal",
            zIndex: 130,
            opacity: 1,
            materialMode: { kind: "default" },
          });
        }
      }
    }

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
          materialMode: {
            kind: "energySwirl",
            intensity: 1,
            repeat: 2,
            // Vanilla energy swirl offset is ~0.01 per tick (~0.2 per second).
            scroll: { uPerSec: 0.2, vPerSec: 0.2 },
          },
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
    ...(getPartTextureOverrides ? { getPartTextureOverrides } : {}),
    getActiveLayers,
  };
}
