import { useMemo, useState, useEffect } from "react";
import {
  groupAssetsByVariant,
  isPottedPlant,
  categorizeVariants,
  isInventoryVariant,
  isNumberedVariant,
} from "@lib/assetUtils";
import { useSelectWinner } from "@state/selectors";
import { useStore } from "@state/store";
import { ViewModeTabs } from "./components/ViewModeTabs";
import {
  MultipleVariantsDisplay,
  SingleVariantDisplay,
  NoVariantsDisplay,
} from "./components/VariantDisplay";
import type { TextureVariantSelectorProps, ViewMode } from "./types";
import type { AssetGroup } from "@lib/assetUtils";
import s from "./styles.module.scss";

// Helper functions for variant filtering
function findVariantGroup(groups: AssetGroup[], assetId: string) {
  return groups.find((g) => g.variantIds.includes(assetId));
}

function filterNumberedNonPottedVariants(variantIds: string[]) {
  const numberedVariants = variantIds.filter(isNumberedVariant);
  return numberedVariants.filter((id) => !isPottedPlant(id));
}

function filterByWinnerPack(
  variants: string[],
  winnerPackId: string | undefined,
  providersByAsset: Record<string, string[]>
) {
  if (!winnerPackId) return variants;
  return variants.filter((variantId) => {
    const providers = providersByAsset[variantId] ?? [];
    return providers.includes(winnerPackId);
  });
}

export const TextureVariantSelector = ({
  assetId,
  allAssets,
  selectedVariantId,
  onSelectVariant,
}: TextureVariantSelectorProps) => {
  // Initialize view mode based on whether current asset is an inventory variant
  const initialViewMode =
    assetId && isInventoryVariant(assetId) ? "inventory" : "world";
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);

  // Update view mode when asset changes to match its type
  useEffect(() => {
    if (assetId) {
      setViewMode(isInventoryVariant(assetId) ? "inventory" : "world");
    }
  }, [assetId]);

  // Get the winning pack for the current asset
  const winnerPackId = useSelectWinner(assetId ?? "");
  const providersByAsset = useStore((state) => state.providersByAsset);

  // Find all variants for the currently selected asset
  const { worldVariants, inventoryVariants } = useMemo(() => {
    if (!assetId) return { worldVariants: [], inventoryVariants: [] };

    const allAssetIds = allAssets.map((a) => a.id);
    const groups = groupAssetsByVariant(allAssetIds);
    const group = findVariantGroup(groups, assetId);

    if (!group || group.variantIds.length <= 1) {
      return { worldVariants: [], inventoryVariants: [] };
    }

    const nonPottedVariants = filterNumberedNonPottedVariants(group.variantIds);
    const filteredVariants = filterByWinnerPack(
      nonPottedVariants,
      winnerPackId,
      providersByAsset
    );

    return categorizeVariants(filteredVariants);
  }, [assetId, allAssets, winnerPackId, providersByAsset]);

  // Determine which variants to show based on current view mode
  const currentVariants =
    viewMode === "world" ? worldVariants : inventoryVariants;
  const hasInventoryVariants = inventoryVariants.length > 0;
  const hasWorldVariants = worldVariants.length > 0;

  // Don't render if no variants available at all
  if (worldVariants.length <= 1 && inventoryVariants.length === 0) {
    return null;
  }

  return (
    <div className={s.root}>
      {hasInventoryVariants && (
        <ViewModeTabs
          viewMode={viewMode}
          worldVariants={worldVariants}
          inventoryVariants={inventoryVariants}
          assetId={assetId}
          hasWorldVariants={hasWorldVariants}
          onSelectVariant={onSelectVariant}
          setViewMode={setViewMode}
        />
      )}

      {currentVariants.length > 1 ? (
        <MultipleVariantsDisplay
          viewMode={viewMode}
          currentVariants={currentVariants}
          selectedVariantId={selectedVariantId}
          assetId={assetId}
          onSelectVariant={onSelectVariant}
        />
      ) : currentVariants.length === 1 ? (
        <SingleVariantDisplay viewMode={viewMode} variantId={currentVariants[0]} />
      ) : (
        <NoVariantsDisplay viewMode={viewMode} />
      )}
    </div>
  );
};
