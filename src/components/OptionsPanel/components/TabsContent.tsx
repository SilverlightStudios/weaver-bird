import type { EntityFeatureRecord } from "@lib/packFormatCompatibility";
import type { Asset, BlockStateSchema } from "../types";
import { BlockStateTab } from "./tabs/BlockStateTab";
import { PotTab } from "./tabs/PotTab";
import { AdvancedTab } from "./tabs/AdvancedTab";
import { ParticlePropertiesTab } from "./tabs/ParticlePropertiesTab";
import {
  DecoratedPotTabs,
  ItemAndDisplayTabs,
  EntityTabs,
  VariantTabs,
} from "./TabsContentGroups";

interface TabsContentProps {
  assetId: string;
  allAssets: Asset[];
  blockProps: Record<string, string | number>;
  seed: number;
  showPot: boolean;
  itemDisplayMode: string;
  isHangingSignAsset: boolean;
  entityAssetId: string | null;
  entityFeatureSchema: EntityFeatureRecord | null;
  combinedAssetIds: string[];
  schema: BlockStateSchema | null;
  viewingVariantId: string | null;
  providers: Array<{ packId: string; packName: string }>;
  shouldShowPotteryShardTab: boolean;
  shouldShowEntityDecoratedPotTab: boolean;
  shouldShowDecoratedPotTab: boolean;
  shouldShowPaintingTab: boolean;
  shouldShowItemTab: boolean;
  shouldShowSignTab: boolean;
  shouldShowBlockStateTab: boolean;
  shouldShowEntityVariantTab: boolean;
  shouldShowAnimationsTab: boolean;
  shouldShowEntityFeaturesTab: boolean;
  shouldShowPotTab: boolean;
  shouldShowParticlePropertiesTab: boolean;
  hasTextureVariants: boolean;
  hasVariantsTab: boolean;
  onSelectVariant?: (id: string) => void;
  onSelectProvider?: (packId: string, assetId: string) => void;
  onBlockPropsChange: (props: Record<string, string | number>) => void;
  onSeedChange: (seed: number) => void;
  onParticleConditionOverridesChange?: (overrides: Record<string, boolean>) => void;
  setShowPot: (show: boolean) => void;
  setViewingVariantId: (id: string | null) => void;
}

export function TabsContent({
  assetId,
  allAssets,
  blockProps,
  seed,
  showPot,
  itemDisplayMode,
  isHangingSignAsset,
  entityAssetId,
  entityFeatureSchema,
  combinedAssetIds,
  schema,
  viewingVariantId,
  providers,
  shouldShowPotteryShardTab,
  shouldShowEntityDecoratedPotTab,
  shouldShowDecoratedPotTab,
  shouldShowPaintingTab,
  shouldShowItemTab,
  shouldShowSignTab,
  shouldShowBlockStateTab,
  shouldShowEntityVariantTab,
  shouldShowAnimationsTab,
  shouldShowEntityFeaturesTab,
  shouldShowPotTab,
  shouldShowParticlePropertiesTab,
  hasTextureVariants,
  hasVariantsTab,
  onSelectVariant,
  onSelectProvider,
  onBlockPropsChange,
  onSeedChange,
  onParticleConditionOverridesChange,
  setShowPot,
  setViewingVariantId,
}: TabsContentProps) {
  return (
    <>
      <DecoratedPotTabs
        assetId={assetId}
        allAssets={allAssets}
        shouldShowPotteryShardTab={shouldShowPotteryShardTab}
        shouldShowEntityDecoratedPotTab={shouldShowEntityDecoratedPotTab}
        shouldShowDecoratedPotTab={shouldShowDecoratedPotTab}
        onSelectVariant={onSelectVariant}
      />

      <ItemAndDisplayTabs
        assetId={assetId}
        allAssets={allAssets}
        shouldShowPaintingTab={shouldShowPaintingTab}
        shouldShowItemTab={shouldShowItemTab}
        shouldShowSignTab={shouldShowSignTab}
        itemDisplayMode={itemDisplayMode}
        isHangingSignAsset={isHangingSignAsset}
        onSelectVariant={onSelectVariant}
      />

      {shouldShowBlockStateTab && (
        <BlockStateTab
          assetId={assetId}
          blockProps={blockProps}
          seed={seed}
          onBlockPropsChange={onBlockPropsChange}
          onSeedChange={onSeedChange}
        />
      )}

      <EntityTabs
        entityAssetId={entityAssetId}
        entityFeatureSchema={entityFeatureSchema}
        shouldShowEntityVariantTab={shouldShowEntityVariantTab}
        shouldShowAnimationsTab={shouldShowAnimationsTab}
        shouldShowEntityFeaturesTab={shouldShowEntityFeaturesTab}
      />

      {shouldShowPotTab && (
        <PotTab showPot={showPot} onShowPotChange={setShowPot} />
      )}

      {shouldShowParticlePropertiesTab && (
        <ParticlePropertiesTab
          assetId={assetId}
          isEntity={assetId?.includes("entity/") ?? false}
          stateProps={blockProps}
          onConditionOverride={onParticleConditionOverridesChange}
        />
      )}

      <VariantTabs
        assetId={assetId}
        allAssets={allAssets}
        providers={providers}
        viewingVariantId={viewingVariantId}
        hasTextureVariants={hasTextureVariants}
        hasVariantsTab={hasVariantsTab}
        onSelectVariant={onSelectVariant}
        onSelectProvider={onSelectProvider}
        setViewingVariantId={setViewingVariantId}
      />

      <AdvancedTab
        assetId={assetId}
        combinedAssetIds={combinedAssetIds}
        seed={seed}
        blockProps={blockProps}
        schema={schema}
      />
    </>
  );
}
