/**
 * Hook for checking if an asset can be potted
 */

import { useMemo } from "react";
import {
  isPottedPlant,
  getVariantGroupKey,
  groupAssetsByVariant,
} from "@lib/assetUtils";

export function usePottedPlantCheck(
  assetId: string | undefined,
  allAssetIds: string[],
): { isPlantPotted: boolean; canBePotted: boolean } {
  const isPlantPotted = assetId ? isPottedPlant(assetId) : false;

  const canBePotted = useMemo(() => {
    if (!assetId || isPlantPotted || allAssetIds.length === 0) {
      return false;
    }

    const groupKey = getVariantGroupKey(assetId);
    const groups = groupAssetsByVariant(allAssetIds);
    const group = groups.find((g) => g.baseId === groupKey);

    if (!group) return false;

    // Check if any variant in the group is a potted version
    return group.variantIds.some((id) => isPottedPlant(id));
  }, [assetId, isPlantPotted, allAssetIds]);

  return { isPlantPotted, canBePotted };
}
