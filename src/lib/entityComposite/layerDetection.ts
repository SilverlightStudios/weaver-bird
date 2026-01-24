import type { AssetId } from "@state";
import {
  getEntityPath,
  getLeafName,
  isEquipmentLayer,
  isBeeVariantLayer,
  isBreezeVariantLayer,
  isVillagerLayer,
  isBannerLayer,
  isHorseMarkingLayer,
  isCowMushroomLayer,
  hasOverlaySuffix,
  hasCrackinessSuffix,
  hasOverlayInPath,
  tryFindBaseEntity,
  findEquipmentOwner,
  stripKnownSuffix,
} from "./layerDetectionHelpers";

/**
 * Heuristic filter for entity textures that are meant to be rendered as
 * feature layers rather than standalone entities.
 *
 * This is intentionally conservative: we only filter known overlay patterns.
 */
export function isEntityFeatureLayerTextureAssetId(assetId: AssetId): boolean {
  const entityPath = getEntityPath(assetId);
  if (!entityPath) return false;

  // Check various layer patterns using helper functions
  if (isEquipmentLayer(entityPath)) return true;
  if (isBeeVariantLayer(entityPath)) return true;
  if (isBreezeVariantLayer(entityPath)) return true;
  if (isVillagerLayer(entityPath)) return true;
  if (isBannerLayer(entityPath)) return true;
  if (isHorseMarkingLayer(entityPath)) return true;
  if (isCowMushroomLayer(entityPath)) return true;

  // Check for overlay suffixes
  const leaf = getLeafName(entityPath);
  if (hasOverlaySuffix(leaf)) return true;
  if (hasCrackinessSuffix(leaf)) return true;
  if (hasOverlayInPath(entityPath)) return true;

  return false;
}

export function getLikelyBaseEntityAssetIdForLayer(
  layerAssetId: AssetId,
  allAssetIds: Iterable<AssetId>,
): AssetId | null {
  if (!isEntityFeatureLayerTextureAssetId(layerAssetId)) return null;
  const entityPath = getEntityPath(layerAssetId);
  if (!entityPath) return null;

  const set = new Set(allAssetIds);
  const ns = layerAssetId.includes(":") ? layerAssetId.split(":")[0] : "minecraft";

  // Try to find base entity for specific types
  if (entityPath.startsWith("bee/")) {
    return tryFindBaseEntity(set, ns, ["entity/bee/bee", "entity/bee"]);
  }

  if (entityPath.startsWith("villager/")) {
    return tryFindBaseEntity(set, ns, ["entity/villager/villager", "entity/villager"]);
  }

  if (entityPath.startsWith("zombie_villager/")) {
    return tryFindBaseEntity(set, ns, [
      "entity/zombie_villager/zombie_villager",
      "entity/zombie_villager",
    ]);
  }

  if (entityPath.startsWith("banner/")) {
    return tryFindBaseEntity(set, ns, [
      "entity/banner/base",
      "entity/banner/banner_base",
      "entity/banner_base",
      "entity/banner",
    ]);
  }

  // Equipment layers -> owning entity
  if (entityPath.startsWith("equipment/")) {
    return findEquipmentOwner(entityPath, set);
  }

  // Try to find base entity by stripping known suffixes
  const parts = entityPath.split("/");
  const dir = parts.slice(0, -1).join("/");
  const leaf = parts[parts.length - 1] ?? "";
  const baseLeaf = stripKnownSuffix(leaf);

  if (baseLeaf) {
    return tryFindBaseEntity(set, ns, [
      `entity/${dir}/${baseLeaf}`,
      `entity/${baseLeaf}`,
    ]);
  }

  return null;
}
