import type { AssetId } from "@state";
import type { EntityHandler, EntityHandlerResult } from "./types";
import { findAssetId, getToggle } from "./utils";
import {
  buildControlsList,
  buildUnderlayBaseOverrides,
  getLayerContributions as getLayerContributionsHelper,
} from "./equipmentUtils";

export const equipmentHandler: EntityHandler = (context): EntityHandlerResult | null => {
  const { folderRoot, entityPath, leaf, ns, all, baseAssetId } = context;
  if (folderRoot !== "equipment") return null;

  const parts = entityPath.split("/");
  const equipmentKind = parts[1] ?? "";
  const kindLower = equipmentKind.toLowerCase();

  const isHumanoid = kindLower.includes("humanoid");
  const isLeggings = kindLower.includes("humanoid_leggings") || kindLower.includes("leggings");
  const isLayer1 = isHumanoid && !isLeggings;
  const isLayer2 = isLeggings;

  if (!isLayer1 && !isLayer2) return null;

  const leggingsTexture = isLayer1
    ? findAssetId(ns, [`entity/equipment/humanoid_leggings/${leaf}`], all)
    : null;
  const hasLeggings = isLayer1 && !!leggingsTexture;

  const controls = buildControlsList(isHumanoid, isLayer1, isLayer2, hasLeggings);

  const armorStandTexture =
    findAssetId(
      ns,
      [
        "entity/armorstand/armorstand",
        "entity/armorstand/wood",
        "entity/armor_stand",
        "entity/armor_stand/armor_stand",
      ],
      all,
    ) ?? ("minecraft:entity/armor_stand" as AssetId);

  const getBaseTextureAssetId: EntityHandlerResult["getBaseTextureAssetId"] = (state) => {
    const showPlayer = getToggle(state, "equipment.add_player", false);
    if (showPlayer) return "minecraft:entity/player/wide/steve";
    return armorStandTexture;
  };

  const getCemEntityType: EntityHandlerResult["getCemEntityType"] = (state) => {
    const showPlayer = getToggle(state, "equipment.add_player", false);
    if (showPlayer) return { entityType: "player", parentEntity: null };
    return { entityType: "armor_stand", parentEntity: null };
  };

  const armorTextureLayer1 = isLayer1 ? baseAssetId : null;
  const armorTextureLayer2 = isLayer2 ? baseAssetId : leggingsTexture;

  const getBoneRenderOverrides: EntityHandlerResult["getBoneRenderOverrides"] = (state) =>
    isHumanoid ? buildUnderlayBaseOverrides(state, isLayer1) : {};

  return {
    controls,
    getBaseTextureAssetId,
    getCemEntityType,
    getBoneRenderOverrides,
    getLayerContributions: (state) => getLayerContributionsHelper(state, isHumanoid, isLayer1, armorTextureLayer1, armorTextureLayer2),
  };
};
