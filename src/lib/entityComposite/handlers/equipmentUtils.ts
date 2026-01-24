import type { AssetId } from "@state";
import type { EntityLayerDefinition, EntityFeatureStateView } from "../types";
import type { EntityHandlerResult } from "./types";
import { getToggle } from "./utils";

export function buildControlsList(isHumanoid: boolean, isLayer1: boolean, isLayer2: boolean, hasLeggings: boolean): EntityHandlerResult["controls"] {
  const controls: EntityHandlerResult["controls"] = [];

  if (isHumanoid) {
    controls.push(
      { kind: "toggle", id: "equipment.add_player", label: "Show Player", defaultValue: false },
      { kind: "toggle", id: "equipment.add_armor_stand", label: "Show Armor Stand", defaultValue: false },
    );
  }

  if (isLayer1) {
    controls.push(
      { kind: "toggle", id: "equipment.show_helmet", label: "Helmet", defaultValue: true },
      { kind: "toggle", id: "equipment.show_chestplate", label: "Chestplate", defaultValue: true },
    );
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

  return controls;
}

function buildArmorLayer1Overrides(state: EntityFeatureStateView): Record<string, { visible?: boolean }> {
  const showHelmet = getToggle(state, "equipment.show_helmet", true);
  const showChest = getToggle(state, "equipment.show_chestplate", true);
  const showBoots = getToggle(state, "equipment.show_boots", true);

  if (showHelmet && showChest && showBoots) {
    return { "*": { visible: true } };
  }

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
}

export function buildUnderlayBaseOverrides(state: EntityFeatureStateView, isLayer1: boolean): Record<string, { visible?: boolean }> {
  const showPlayer = getToggle(state, "equipment.add_player", false);
  const showArmorStand = getToggle(state, "equipment.add_armor_stand", false);
  const showBase = showPlayer || showArmorStand;
  const overrides: Record<string, { visible?: boolean }> = {};

  if (!showBase) {
    overrides["*"] = { visible: false };
  }

  if (!isLayer1) return overrides;

  const showHelmet = getToggle(state, "equipment.show_helmet", true);
  if (!showHelmet) return overrides;

  return { ...overrides, headwear: { visible: false } };
}

function buildArmorLayer2Overrides(state: EntityFeatureStateView): Record<string, { visible?: boolean }> {
  const showLeggings = getToggle(state, "equipment.show_leggings", true);
  return { "*": { visible: !!showLeggings } };
}

export function getLayerContributions(
  state: EntityFeatureStateView,
  isHumanoid: boolean,
  isLayer1: boolean,
  armorTextureLayer1: AssetId | null,
  armorTextureLayer2: AssetId | null,
): EntityLayerDefinition[] {
  const layers: EntityLayerDefinition[] = [];
  const usesUnderlayRig = isHumanoid;

  if (usesUnderlayRig) {
    if (isLayer1 && armorTextureLayer1) {
      const overrides = buildArmorLayer1Overrides(state);
      const showPlayer = getToggle(state, "equipment.add_player", false);
      const helmetYOffset = 0.5 / 16;
      layers.push({
        id: "equipment_armor_layer_1",
        label: "Armor",
        kind: "cemModel",
        cemEntityTypeCandidates: ["armor_layer_1"],
        textureAssetId: armorTextureLayer1,
        blend: "normal",
        zIndex: 100,
        opacity: 1,
        materialMode: { kind: "default" },
        syncToBasePose: true,
        boneRenderOverrides: overrides,
        bonePositionOffsets: showPlayer ? { head: { x: 0, y: helmetYOffset, z: 0 } } : undefined,
        boneScaleMultipliers: { head: { x: 1.01, y: 1.01, z: 1.01 } },
      });
    }

    if (armorTextureLayer2) {
      const overrides = buildArmorLayer2Overrides(state);
      layers.push({
        id: "equipment_armor_layer_2",
        label: "Leggings",
        kind: "cemModel",
        cemEntityTypeCandidates: ["armor_layer_2"],
        textureAssetId: armorTextureLayer2,
        blend: "normal",
        zIndex: 90,
        opacity: 1,
        materialMode: { kind: "default" },
        syncToBasePose: true,
        boneRenderOverrides: overrides,
      });
    }
  } else if (
    isLayer1 &&
    armorTextureLayer2 &&
    getToggle(state, "equipment.show_leggings", true)
  ) {
    layers.push({
      id: "equipment_armor_layer_2",
      label: "Leggings",
      kind: "cemModel",
      cemEntityTypeCandidates: ["armor_layer_2"],
      textureAssetId: armorTextureLayer2,
      blend: "normal",
      zIndex: 90,
      opacity: 1,
      materialMode: { kind: "default" },
      syncToBasePose: true,
    });
  }

  return layers;
}
