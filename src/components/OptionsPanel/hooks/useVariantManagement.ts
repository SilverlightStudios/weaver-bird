import { useState, useEffect, useMemo } from "react";
import {
  groupAssetsByVariant,
  isNumberedVariant,
  isPottedPlant,
} from "@lib/assetUtils";
import type { AssetRecord } from "@lib/types";

export const useVariantManagement = (
  assetId: string | null | undefined,
  allAssets: AssetRecord[],
  winnerPackIdForVariants: string | null,
  providersByAsset: Record<string, string[]>,
  onViewingVariantChange?: (variantId: string | undefined) => void,
) => {
  const [viewingVariantId, setViewingVariantId] = useState<string | undefined>(
    undefined,
  );

  // Reset viewing variant when asset or pack changes
  useEffect(() => {
    console.log(
      `[OptionsPanel.useEffect.resetVariant] asset=${assetId} pack=${winnerPackIdForVariants}`,
    );
    setViewingVariantId(undefined);
  }, [assetId, winnerPackIdForVariants]);

  // Notify parent when viewing variant changes
  useEffect(() => {
    console.log(
      `[OptionsPanel.useEffect.notifyVariantChange] variantId=${viewingVariantId}`,
    );
    if (onViewingVariantChange) {
      onViewingVariantChange(viewingVariantId);
    }
  }, [viewingVariantId, onViewingVariantChange]);

  // Check if texture variants are available
  const hasTextureVariants = useMemo(() => {
    if (!assetId || allAssets.length === 0) return false;

    const winnerPackId = winnerPackIdForVariants;
    const allAssetIds = allAssets.map((a) => a.id);
    const groups = groupAssetsByVariant(allAssetIds);
    const group = groups.find((g) => g.variantIds.includes(assetId));

    if (!group) return false;

    const numberedVariants = group.variantIds.filter(isNumberedVariant);
    const nonPottedVariants = numberedVariants.filter(
      (id) => !isPottedPlant(id),
    );

    const filteredVariants = winnerPackId
      ? nonPottedVariants.filter((variantId) => {
          const variantProviders = providersByAsset[variantId] ?? [];
          return variantProviders.includes(winnerPackId);
        })
      : nonPottedVariants;

    return filteredVariants.length > 1;
  }, [assetId, allAssets, winnerPackIdForVariants, providersByAsset]);

  return {
    viewingVariantId,
    setViewingVariantId,
    hasTextureVariants,
  };
};
