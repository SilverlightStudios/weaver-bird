import { useMemo } from "react";
import {
  getBlockStateIdFromAssetId,
  getVariantGroupKey,
  groupAssetsByVariant,
  isPottedPlant,
} from "@lib/assetUtils";
import { getEntityVariants } from "@lib/emf";
import { getBlockEmissions, getEntityEmissions } from "@constants/particles";
import {
  isPainting,
  isPotteryShard,
  isDecoratedPot,
  isEntityDecoratedPot,
} from "../utilities";
import type { AssetRecord } from "@lib/types";
import type { BlockStateSchema } from "@lib/tauri/blockModels";
import type { EntityCompositeSchema } from "@lib/entityComposite/types";

interface TabVisibilityParams {
  assetId: string | null | undefined;
  allAssets: AssetRecord[];
  allAssetIds: string[];
  schema: BlockStateSchema | null;
  isColormapSelection: boolean;
  isItem: boolean;
  isPlantPotted: boolean;
  isSign: boolean;
  entityAssetId: string | null | undefined;
  entityFeatureSchema: EntityCompositeSchema | null;
  particleDataReady: boolean;
  providersByAsset: Record<string, string[]>;
  providers: { id: string; name: string }[];
}

function checkHasVariants(
  assetId: string,
  allAssetIds: string[],
  providersByAsset: Record<string, string[]>,
  providersCount: number,
): boolean {
  const baseAssetId = getVariantGroupKey(assetId);
  const currentProviders = providersByAsset[assetId] ?? [];
  if (currentProviders.length > 1) return true;

  const groups = groupAssetsByVariant(allAssetIds);
  const group = groups.find((g) => g.baseId === baseAssetId);

  if (!group) return providersCount > 1;

  return group.variantIds.some((id) => {
    const variantProviders = providersByAsset[id] ?? [];
    return variantProviders.length > 1;
  });
}

export const useTabVisibility = ({
  assetId,
  allAssets,
  allAssetIds,
  schema,
  isColormapSelection,
  isItem,
  isPlantPotted,
  isSign,
  entityAssetId,
  entityFeatureSchema,
  particleDataReady,
  providersByAsset,
  providers,
}: TabVisibilityParams) => {
  const isPaintingAsset = isPainting(assetId);
  const isPotteryShardAsset = isPotteryShard(assetId);
  const isDecoratedPotAsset = isDecoratedPot(assetId);
  const isEntityDecoratedPotAsset = isEntityDecoratedPot(assetId);

  const hasVariantsTab = useMemo(() => {
    if (isColormapSelection || !assetId) return false;
    return checkHasVariants(assetId, allAssetIds, providersByAsset, providers.length);
  }, [isColormapSelection, assetId, providersByAsset, allAssetIds, providers.length]);

  const canBePotted = useMemo(() => {
    if (!assetId || isPlantPotted || allAssets.length === 0) return false;
    const groupKey = getVariantGroupKey(assetId);
    const groups = groupAssetsByVariant(allAssets.map((a) => a.id));
    const group = groups.find((g) => g.baseId === groupKey);
    if (!group) return false;
    return group.variantIds.some((id) => isPottedPlant(id));
  }, [assetId, isPlantPotted, allAssets]);

  const shouldShowParticlePropertiesTab = useMemo(() => {
    if (!assetId || !particleDataReady) return false;

    const isEntityAsset = assetId.includes("entity/");

    if (isEntityAsset) {
      const entityId = assetId.replace(/^minecraft:entity\//, "minecraft:");
      const emissions = getEntityEmissions(entityId);
      return emissions !== null && emissions.emissions.length > 0;
    } else {
      const blockStateId = getBlockStateIdFromAssetId(assetId);
      const blockId = blockStateId.replace(/:block\//, ":");
      const emissions = getBlockEmissions(blockId);
      return emissions !== null && emissions.emissions.length > 0;
    }
  }, [assetId, particleDataReady]);

  const isEntityAsset = Boolean(entityAssetId?.includes("entity/"));
  const hasEntityVariants = Boolean(entityAssetId && getEntityVariants(entityAssetId).length > 0);
  const hasEntityFeatureControls = Boolean(entityFeatureSchema && entityFeatureSchema.controls.length > 0);
  const hasBlockStateProps = Boolean(schema && schema.properties.length > 0);
  const showPotTab = Boolean(!isColormapSelection && (isPlantPotted || canBePotted));
  const showBlockStateTab = Boolean(!isColormapSelection && !isItem && hasBlockStateProps);
  const showItemTab = Boolean(isItem && !isPotteryShardAsset && !isEntityDecoratedPotAsset);
  const showPaintingTab = Boolean(isPaintingAsset && allAssets.length > 0);
  const showDecoratedPotTab = Boolean(isDecoratedPotAsset && allAssets.length > 0);
  const showEntityFeaturesTab = Boolean(entityAssetId && isEntityAsset && hasEntityFeatureControls);

  return {
    shouldShowPotTab: showPotTab,
    shouldShowBlockStateTab: showBlockStateTab,
    shouldShowEntityVariantTab: hasEntityVariants,
    shouldShowAnimationsTab: isEntityAsset,
    shouldShowEntityFeaturesTab: showEntityFeaturesTab,
    shouldShowItemTab: showItemTab,
    shouldShowPaintingTab: showPaintingTab,
    shouldShowPotteryShardTab: isPotteryShardAsset,
    shouldShowDecoratedPotTab: showDecoratedPotTab,
    shouldShowEntityDecoratedPotTab: isEntityDecoratedPotAsset,
    shouldShowSignTab: isSign,
    shouldShowParticlePropertiesTab,
    hasVariantsTab,
  };
};
