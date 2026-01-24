import type { AssetId } from "@state";
import type { EntityHandler, EntityHandlerResult } from "./types";
import {
  getToggle,
  getSelect,
  getEntityPath,
  getDirectEntityDirAndLeaf,
  stableUnique,
  titleLabel,
  stripNamespace,
} from "./utils";
import { isEntityFeatureLayerTextureAssetId } from "../layerDetection";

function isHorseCoatLeaf(leaf: string): boolean {
  if (!leaf.startsWith("horse_")) return false;
  if (leaf.startsWith("horse_markings_")) return false;
  if (leaf.includes("skeleton") || leaf.includes("zombie")) return false;
  return true;
}

function extractHorseTextures(all: Set<AssetId>) {
  const coatLeaves: string[] = [];
  const markingsLeaves: string[] = [];

  for (const id of all) {
    const p = getEntityPath(id);
    if (!p) continue;
    const d = getDirectEntityDirAndLeaf(p);
    if (!d || d.dir !== "horse") continue;

    const isMarkings = d.leaf.startsWith("horse_markings_");
    if (isEntityFeatureLayerTextureAssetId(id) && !isMarkings) continue;

    if (isMarkings) markingsLeaves.push(d.leaf);
    else if (isHorseCoatLeaf(d.leaf)) coatLeaves.push(d.leaf);
  }

  return {
    coats: stableUnique(coatLeaves),
    markings: stableUnique(markingsLeaves),
  };
}

function extractHorseArmorOptions(all: Set<AssetId>, ns: string) {
  const options: Array<{ value: string; label: string; assetId: AssetId }> = [];

  for (const id of all) {
    if (!id.startsWith(`${ns}:entity/equipment/horse_body/`)) continue;
    const leafName = stripNamespace(id).split("/").pop();
    if (!leafName) continue;
    options.push({ value: leafName, label: titleLabel(leafName), assetId: id });
  }

  return stableUnique(options.map((o) => o.value)).map(
    (v) => options.find((o) => o.value === v)!,
  );
}

export const horseHandler: EntityHandler = (context): EntityHandlerResult | null => {
  const { folderRoot, all, ns, entityType } = context;

  if (folderRoot !== "horse" || !isHorseCoatLeaf(entityType)) return null;

  const { coats, markings } = extractHorseTextures(all);

  const controls = [];
  let getBaseTextureAssetId;

  if (coats.length > 1) {
    controls.push({
      kind: "select" as const,
      id: "horse.coat",
      label: "Coat Color",
      defaultValue: coats.includes("horse_brown") ? "horse_brown" : coats[0]!,
      options: coats.map((c) => ({
        value: c,
        label: titleLabel(c.replace(/^horse_/, "")),
      })),
    });
    getBaseTextureAssetId = (
      state: Parameters<NonNullable<EntityHandlerResult["getBaseTextureAssetId"]>>[0],
    ) => {
      const chosen = getSelect(state, "horse.coat", coats[0]!);
      const candidate = `${ns}:entity/horse/${chosen}` as AssetId;
      return all.has(candidate) ? candidate : context.baseAssetId;
    };
  }

  if (markings.length > 0) {
    controls.push({
      kind: "select" as const,
      id: "horse.markings",
      label: "Spot Type",
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

  const findEquipment = (path: string): AssetId | null => {
    for (const id of all) {
      const stripped = stripNamespace(id);
      if (stripped === `entity/equipment/${path}`) return id;
    }
    return null;
  };

  const horseSaddleTexture = findEquipment("horse_saddle/saddle");
  const horseSaddleBoneNames = [
    "headpiece",
    "noseband",
    "left_bit",
    "right_bit",
    "left_rein",
    "right_rein",
    "saddle",
  ];

  const horseArmorOptions = extractHorseArmorOptions(all, ns);

  if (horseArmorOptions.length > 0) {
    controls.push({
      kind: "select" as const,
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
      kind: "toggle" as const,
      id: "horse.saddle",
      label: "Saddle",
      defaultValue: false,
    });
    controls.push({
      kind: "toggle" as const,
      id: "horse.rider",
      label: "Rider",
      defaultValue: false,
    });
  }

  const getBoneRenderOverrides = (
    state: Parameters<NonNullable<EntityHandlerResult["getBoneRenderOverrides"]>>[0],
  ) => {
    const saddleEnabled = getToggle(state, "horse.saddle", false);
    const saddleOverrides: Record<string, { visible: boolean }> = {};
    for (const partName of horseSaddleBoneNames) {
      saddleOverrides[partName] = { visible: saddleEnabled };
    }
    return saddleOverrides;
  };

  const getEntityStateOverrides = (
    state: Parameters<NonNullable<EntityHandlerResult["getEntityStateOverrides"]>>[0],
  ) => {
    const riderEnabled = getToggle(state, "horse.rider", false);
    return { is_ridden: riderEnabled };
  };

  const getLayerContributions = (
    state: Parameters<NonNullable<EntityHandlerResult["getLayerContributions"]>>[0],
  ) => {
    const layers = [];

    // Horse markings overlay
    const chosen = getSelect(state, "horse.markings", "none");
    if (chosen !== "none") {
      const tex = `${ns}:entity/horse/${chosen}` as AssetId;
      if (all.has(tex)) {
        const markingScale = 1.001;
        layers.push({
          id: "horse_markings",
          label: "Markings",
          kind: "cloneTexture" as const,
          textureAssetId: tex,
          blend: "normal" as const,
          zIndex: 80,
          opacity: 1,
          materialMode: { kind: "default" as const },
          boneScaleMultipliers: {
            "*": { x: markingScale, y: markingScale, z: markingScale },
          },
        });
      }
    }

    // Horse armor
    const armor = getSelect(state, "horse.armor", "none");
    if (armor !== "none") {
      const opt = horseArmorOptions.find((o) => o.value === armor);
      if (opt) {
        layers.push({
          id: "horse_armor",
          label: "Armor",
          kind: "cemModel" as const,
          cemEntityTypeCandidates: ["horse_armor"],
          textureAssetId: opt.assetId,
          blend: "normal" as const,
          zIndex: 140,
          opacity: 1,
          materialMode: { kind: "default" as const },
          syncToBasePose: true,
          boneScaleMultipliers: { "*": { x: 1.004, y: 1.004, z: 1.004 } },
        });
      }
    }

    // Horse saddle
    if (horseSaddleTexture && getToggle(state, "horse.saddle", false)) {
      layers.push({
        id: "horse_saddle",
        label: "Saddle",
        kind: "cemModel" as const,
        cemEntityTypeCandidates: ["horse_saddle"],
        textureAssetId: horseSaddleTexture,
        blend: "normal" as const,
        zIndex: 135,
        opacity: 1,
        materialMode: { kind: "default" as const },
        allowVanillaFallback: false,
        replacesBaseBones: horseSaddleBoneNames,
        boneAliasMap: {
          headpiece: "head",
          noseband: "head",
          left_bit: "head",
          right_bit: "head",
          left_rein: "head",
          right_rein: "head",
          saddle: "body",
          head: "head",
          body: "body",
          neck: "neck",
          mouth: "mouth",
        },
      });
    }

    return layers;
  };

  return {
    controls,
    getBaseTextureAssetId,
    getBoneRenderOverrides,
    getEntityStateOverrides,
    getLayerContributions,
  };
};
