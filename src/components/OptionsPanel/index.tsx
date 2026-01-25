/**
 * Options Panel Component
 *
 * Displays tabbed options for the selected asset including:
 * - Block State properties
 * - Pot controls
 * - Biome color picker
 * - Block state variants
 * - Resource pack providers
 * - Advanced debug info
 */

import { useEffect, useMemo } from "react";
import { Tabs } from "@/ui/components/tabs";
import { isParticleDataLoaded, loadParticleData } from "@constants/particles";
import { useSelectWinner, useSelectPacksDir } from "@state/selectors";
import { useStore } from "@state/store";
import { useAssetFlags } from "./hooks/useAssetFlags";
import { useBlockStateSchema } from "./hooks/useBlockStateSchema";
import { useVariantManagement } from "./hooks/useVariantManagement";
import { useTabVisibility } from "./hooks/useTabVisibility";
import { useOptionsPanelState } from "./hooks/useOptionsPanelState";
import { useEntityMetadata } from "./hooks/useEntityMetadata";
import { TabsList } from "./components/TabsList";
import { TabsContent } from "./components/TabsContent";
import { getDefaultTab } from "./utilities";
import type { OptionsPanelProps } from "./types";
import s from "./styles.module.scss";

export const OptionsPanel = ({
  assetId,
  providers = [],
  onSelectProvider,
  onBlockPropsChange,
  onSeedChange,
  onParticleConditionOverridesChange,
  allAssets = [],
  onSelectVariant,
  onViewingVariantChange,
  itemDisplayMode = "ground",
}: OptionsPanelProps) => {
  const showPot = useStore((state) => state.showPot ?? false);
  const setShowPot = useStore((state) => state.setShowPot);
  const providersByAsset = useStore((state) => state.providersByAsset);
  const particleDataReady = useStore((state) => state.particleDataReady);
  const setParticleDataReady = useStore((state) => state.setParticleDataReady);

  const winnerPackIdForVariants = useSelectWinner(assetId ?? "");
  const selectedWinnerPackId = useSelectWinner(assetId ?? "");
  const winnerPackId = assetId ? selectedWinnerPackId : null;
  const packsDir = useSelectPacksDir();

  const {
    isPlantPotted,
    isColormapSelection,
    isItem,
    isSign,
    isHangingSignAsset,
    isMinecraftNamespace,
    blockStateAssetId,
  } = useAssetFlags(assetId);

  const allAssetIds = useMemo(() => allAssets.map((a) => a.id), [allAssets]);

  const { blockProps, seed, handleBlockPropsChange, handleSeedChange } =
    useOptionsPanelState(assetId, onBlockPropsChange, onSeedChange);

  const { viewingVariantId, setViewingVariantId, hasTextureVariants } =
    useVariantManagement(
      assetId,
      allAssets,
      winnerPackIdForVariants,
      providersByAsset,
      onViewingVariantChange,
    );

  const { entityAssetId, combinedAssetIds, entityFeatureSchema } =
    useEntityMetadata(assetId, allAssetIds);

  const schema = useBlockStateSchema(
    assetId,
    blockStateAssetId,
    winnerPackId,
    packsDir,
    isColormapSelection,
    isMinecraftNamespace,
  );

  const tabVisibility = useTabVisibility({
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
  });

  const {
    shouldShowPotTab,
    shouldShowBlockStateTab,
    shouldShowEntityVariantTab,
    shouldShowAnimationsTab,
    shouldShowEntityFeaturesTab,
    shouldShowItemTab,
    shouldShowPaintingTab,
    shouldShowPotteryShardTab,
    shouldShowDecoratedPotTab,
    shouldShowEntityDecoratedPotTab,
    shouldShowSignTab,
    shouldShowParticlePropertiesTab,
    hasVariantsTab,
  } = tabVisibility;

  const shouldShowCompatibilityCheckbox = false;

  const defaultTab = getDefaultTab({
    shouldShowPotteryShardTab,
    shouldShowEntityDecoratedPotTab,
    shouldShowDecoratedPotTab,
    shouldShowPaintingTab,
    shouldShowItemTab,
    shouldShowSignTab,
    shouldShowBlockStateTab,
    shouldShowCompatibilityCheckbox,
  });

  useEffect(() => {
    if (!assetId || particleDataReady) return;
    if (isParticleDataLoaded()) {
      setParticleDataReady(true);
      return;
    }

    loadParticleData()
      .then(() => {
        setParticleDataReady(true);
      })
      .catch((error) => {
        console.error("[OptionsPanel] Failed to load particle data:", error);
      });
  }, [assetId, particleDataReady, setParticleDataReady, loadParticleData, isParticleDataLoaded]);

  if (!assetId) {
    return (
      <div className={s.root}>
        <div className={s.emptyState}>Select an asset to view options</div>
      </div>
    );
  }

  // Colormap assets are now filtered out in selectors, so this is unreachable
  // Keeping the check for safety in case assets slip through
  if (isColormapSelection) {
    return null;
  }

  return (
    <div className={s.root}>
      <Tabs defaultValue={defaultTab}>
        <TabsList
          shouldShowPotteryShardTab={shouldShowPotteryShardTab}
          shouldShowEntityDecoratedPotTab={shouldShowEntityDecoratedPotTab}
          shouldShowDecoratedPotTab={shouldShowDecoratedPotTab}
          shouldShowPaintingTab={shouldShowPaintingTab}
          shouldShowItemTab={shouldShowItemTab}
          shouldShowSignTab={shouldShowSignTab}
          shouldShowBlockStateTab={shouldShowBlockStateTab}
          shouldShowEntityVariantTab={shouldShowEntityVariantTab}
          shouldShowAnimationsTab={shouldShowAnimationsTab}
          shouldShowEntityFeaturesTab={shouldShowEntityFeaturesTab}
          shouldShowPotTab={shouldShowPotTab}
          shouldShowParticlePropertiesTab={shouldShowParticlePropertiesTab}
          hasTextureVariants={hasTextureVariants}
          hasVariantsTab={hasVariantsTab}
          onSelectVariant={onSelectVariant}
        />

        <TabsContent
          assetId={assetId}
          allAssets={allAssets}
          blockProps={blockProps}
          seed={seed}
          showPot={showPot}
          itemDisplayMode={itemDisplayMode}
          isHangingSignAsset={isHangingSignAsset}
          entityAssetId={entityAssetId}
          entityFeatureSchema={entityFeatureSchema}
          combinedAssetIds={combinedAssetIds}
          schema={schema}
          viewingVariantId={viewingVariantId}
          providers={providers}
          shouldShowPotteryShardTab={shouldShowPotteryShardTab}
          shouldShowEntityDecoratedPotTab={shouldShowEntityDecoratedPotTab}
          shouldShowDecoratedPotTab={shouldShowDecoratedPotTab}
          shouldShowPaintingTab={shouldShowPaintingTab}
          shouldShowItemTab={shouldShowItemTab}
          shouldShowSignTab={shouldShowSignTab}
          shouldShowBlockStateTab={shouldShowBlockStateTab}
          shouldShowEntityVariantTab={shouldShowEntityVariantTab}
          shouldShowAnimationsTab={shouldShowAnimationsTab}
          shouldShowEntityFeaturesTab={shouldShowEntityFeaturesTab}
          shouldShowPotTab={shouldShowPotTab}
          shouldShowParticlePropertiesTab={shouldShowParticlePropertiesTab}
          hasTextureVariants={hasTextureVariants}
          hasVariantsTab={hasVariantsTab}
          onSelectVariant={onSelectVariant}
          onSelectProvider={onSelectProvider}
          onBlockPropsChange={handleBlockPropsChange}
          onSeedChange={handleSeedChange}
          onParticleConditionOverridesChange={onParticleConditionOverridesChange}
          setShowPot={setShowPot}
          setViewingVariantId={setViewingVariantId}
        />
      </Tabs>
    </div>
  );
};
