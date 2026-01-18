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

import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsList } from "@/ui/components/tabs";
import {
  getBlockStateIdFromAssetId,
  isBiomeColormapAsset,
  isPottedPlant,
  isMinecraftItem,
  getVariantGroupKey,
  groupAssetsByVariant,
  isNumberedVariant,
  isSignTexture,
  isHangingSign,
  isEntityTexture,
} from "@lib/assetUtils";
import { groupAssetsForCards } from "@lib/utils/assetGrouping";
import { getEntityVariants } from "@lib/emf";
import { resolveBlockEntityRenderSpec } from "@lib/blockEntityResolver";
import {
  getBlockStateSchema,
  type BlockStateSchema,
} from "@lib/tauri/blockModels";
import { useSelectWinner, useSelectPacksDir } from "@state/selectors";
import { useStore } from "@state/store";
import { TabIcon } from "./components/TabIcon";
import { PotteryShardTab } from "./components/tabs/PotteryShardTab";
import { EntityDecoratedPotTab } from "./components/tabs/EntityDecoratedPotTab";
import { DecoratedPotTab } from "./components/tabs/DecoratedPotTab";
import { PaintingTab } from "./components/tabs/PaintingTab";
import { ItemDisplayTab } from "./components/tabs/ItemDisplayTab";
import { BlockStateTab } from "./components/tabs/BlockStateTab";
import { EntityVariantTab } from "./components/tabs/EntityVariantTab";
import { AnimationsTab } from "./components/tabs/AnimationsTab";
import { EntityFeaturesTab } from "./components/tabs/EntityFeaturesTab";
import { PotTab } from "./components/tabs/PotTab";
import { SignOptionsTab } from "./components/tabs/SignOptionsTab";
import { TextureVariantTab } from "./components/tabs/TextureVariantTab";
import { PackVariantsTab } from "./components/tabs/PackVariantsTab";
import { AdvancedTab } from "./components/tabs/AdvancedTab";
import { ParticlePropertiesTab } from "./components/tabs/ParticlePropertiesTab";
import { resolveEntityCompositeSchema } from "@lib/entityComposite";
import {
  getBlockEmissions,
  getEntityEmissions,
} from "@constants/particles";
import {
  isPainting,
  isPotteryShard,
  isDecoratedPot,
  isEntityDecoratedPot,
  getDefaultTab,
} from "./utilities";
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

  const [blockProps, setBlockProps] = useState<Record<string, string>>({});
  const [seed, setSeed] = useState(0);
  const [viewingVariantId, setViewingVariantId] = useState<string | undefined>(
    undefined,
  );

  const winnerPackIdForVariants = useSelectWinner(assetId ?? "");

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

  // Forward block props and seed changes to parent
  const handleBlockPropsChange = (props: Record<string, string>) => {
    setBlockProps(props);
    if (onBlockPropsChange) {
      onBlockPropsChange(props);
    }

    // For bell blocks, update swing direction based on facing property
    // The bell swings in the direction it's facing (away from the support pillars)
    if (assetId?.includes("bell") && props.facing) {
      const setSwingDirection = useStore.getState().setEntitySwingDirection;
      // Map facing to swing direction:
      // Bell facing NORTH/SOUTH -> swing on X axis (NORTH=0, SOUTH=1)
      // Bell facing EAST/WEST -> swing on Z axis (EAST=2, WEST=3)
      const directionMap: Record<string, number> = {
        north: 1, // Swing SOUTH (positive X)
        south: 0, // Swing NORTH (negative X)
        east: 3,  // Swing WEST (positive Z)
        west: 2,  // Swing EAST (negative Z)
      };
      const swingDirection = directionMap[props.facing] ?? 3;
      setSwingDirection(swingDirection);
    }
  };

  const handleSeedChange = (newSeed: number) => {
    setSeed(newSeed);
    if (onSeedChange) {
      onSeedChange(newSeed);
    }
  };

  const [schema, setSchema] = useState<BlockStateSchema | null>(null);

  const isPlantPotted = assetId ? isPottedPlant(assetId) : false;
  const isColormapSelection = assetId ? isBiomeColormapAsset(assetId) : false;
  const isItem = assetId ? isMinecraftItem(assetId) : false;

  const selectedWinnerPackId = useSelectWinner(assetId ?? "");
  const winnerPackId = assetId ? selectedWinnerPackId : null;

  const shouldShowCompatibilityCheckbox = false;

  const isPaintingAsset = isPainting(assetId);
  const isPotteryShardAsset = isPotteryShard(assetId);
  const isDecoratedPotAsset = isDecoratedPot(assetId);
  const isEntityDecoratedPotAsset = isEntityDecoratedPot(assetId);
  const isSign = assetId ? isSignTexture(assetId) : false;
  const isHangingSignAsset = assetId ? isHangingSign(assetId) : false;

  const allAssetIds = useMemo(() => allAssets.map((a) => a.id), [allAssets]);
  const blockEntitySpec = useMemo(
    () => (assetId ? resolveBlockEntityRenderSpec(assetId, allAssetIds) : null),
    [assetId, allAssetIds],
  );
  const entityAssetId = blockEntitySpec?.assetId ?? assetId;
  const combinedAssetIds = useMemo(() => {
    if (!assetId || allAssetIds.length === 0) return assetId ? [assetId] : [];
    const groups = groupAssetsForCards(allAssetIds);
    const group = groups.find((g) => g.variantIds.includes(assetId));
    return group ? group.variantIds : [assetId];
  }, [assetId, allAssetIds]);
  const entityFeatureSchema = useMemo(() => {
    if (!entityAssetId) return null;
    console.log(
      `[OptionsPanel.entityFeatureSchema] Resolving schema for assetId="${entityAssetId}"`,
    );
    const schema = resolveEntityCompositeSchema(entityAssetId, allAssetIds);
    if (schema) {
      console.log(
        `[OptionsPanel.entityFeatureSchema] Schema resolved: baseAssetId="${schema.baseAssetId}" controls=${schema.controls.length}`,
      );
    }
    return schema;
  }, [entityAssetId, allAssetIds]);

  const packsDir = useSelectPacksDir();
  const blockStateAssetId =
    assetId != null ? getBlockStateIdFromAssetId(assetId) : null;
  const isMinecraftNamespace = assetId?.startsWith("minecraft:") ?? false;

  //#region Load schema to determine available tabs
  useEffect(() => {
    // Skip schema loading for GUI textures and entity textures (they don't have blockstates)
    const isGUITexture = assetId?.includes("gui/");
    const isEntityTexture = assetId?.includes("entity/");

    if (
      !assetId ||
      isColormapSelection ||
      !packsDir ||
      !blockStateAssetId ||
      isGUITexture ||
      isEntityTexture
    ) {
      setSchema(null);
      return;
    }

    const targetPackId =
      winnerPackId ?? (isMinecraftNamespace ? "minecraft:vanilla" : null);

    if (!targetPackId) {
      setSchema(null);
      return;
    }

    let cancelled = false;

    async function loadSchema() {
      try {
        const schemaData = await getBlockStateSchema(
          targetPackId!,
          blockStateAssetId!,
          packsDir!,
        );
        if (!cancelled) {
          setSchema(schemaData);
        }
      } catch (err) {
        console.error("[OptionsPanel] Error loading schema:", err);
        if (!cancelled) {
          setSchema(null);
        }
      }
    }
    void loadSchema();

    return () => {
      cancelled = true;
    };
  }, [
    assetId,
    blockStateAssetId,
    winnerPackId,
    packsDir,
    isColormapSelection,
    isMinecraftNamespace,
  ]);
  //#endregion

  // Reset state when asset changes
  useEffect(() => {
    if (assetId) {
      setBlockProps({});
      setSeed(0);
      setViewingVariantId(undefined);
      onBlockPropsChange?.({});
    }
  }, [assetId, onBlockPropsChange]);

  // Determine which tabs to show
  const hasVariantsTab = useMemo(() => {
    if (isColormapSelection || !assetId) return false;

    const baseAssetId = getVariantGroupKey(assetId);
    const currentProviders = providersByAsset[assetId] ?? [];
    if (currentProviders.length > 1) return true;

    const allAssetIds = allAssets.map((a) => a.id);
    const groups = groupAssetsByVariant(allAssetIds);
    const group = groups.find((g) => g.baseId === baseAssetId);

    if (!group) return providers.length > 1;

    return group.variantIds.some((id) => {
      const variantProviders = providersByAsset[id] ?? [];
      return variantProviders.length > 1;
    });
  }, [
    isColormapSelection,
    assetId,
    providersByAsset,
    allAssets,
    providers.length,
  ]);

  const canBePotted = useMemo(() => {
    if (!assetId || isPlantPotted || allAssets.length === 0) return false;
    const groupKey = getVariantGroupKey(assetId);
    const groups = groupAssetsByVariant(allAssets.map((a) => a.id));
    const group = groups.find((g) => g.baseId === groupKey);
    if (!group) return false;
    return group.variantIds.some((id) => isPottedPlant(id));
  }, [assetId, isPlantPotted, allAssets]);

  const shouldShowPotTab =
    !isColormapSelection && (isPlantPotted || canBePotted);
  const shouldShowBlockStateTab =
    !isColormapSelection && !isItem && (schema?.properties.length ?? 0) > 0;
  const shouldShowEntityVariantTab = entityAssetId
    ? getEntityVariants(entityAssetId).length > 0
    : false;
  const shouldShowAnimationsTab = entityAssetId
    ? isEntityTexture(entityAssetId)
    : false;
  const shouldShowEntityFeaturesTab =
    entityAssetId != null &&
    entityAssetId.includes("entity/") &&
    entityFeatureSchema != null &&
    entityFeatureSchema.controls.length > 0;
  const shouldShowItemTab =
    isItem && !isPotteryShardAsset && !isEntityDecoratedPotAsset;
  const shouldShowPaintingTab = isPaintingAsset && allAssets.length > 0;
  const shouldShowPotteryShardTab = isPotteryShardAsset;
  const shouldShowDecoratedPotTab = isDecoratedPotAsset && allAssets.length > 0;
  const shouldShowEntityDecoratedPotTab = isEntityDecoratedPotAsset;
  const shouldShowSignTab = isSign;

  // Check if asset has particle emissions
  const particleDataReady = useStore((state) => state.particleDataReady);
  const shouldShowParticlePropertiesTab = useMemo(() => {
    if (!assetId || !particleDataReady) return false;

    // Check if it's an entity
    const isEntityAsset = assetId.includes("entity/");

    if (isEntityAsset) {
      // "minecraft:entity/zombie" -> "minecraft:zombie"
      const entityId = assetId.replace(/^minecraft:entity\//, "minecraft:");
      const emissions = getEntityEmissions(entityId);
      return emissions !== null && emissions.emissions.length > 0;
    } else {
      // "minecraft:block/campfire" -> "minecraft:campfire"
      const blockStateId = getBlockStateIdFromAssetId(assetId);
      const blockId = blockStateId.replace(/:block\//, ":");
      const emissions = getBlockEmissions(blockId);
      return emissions !== null && emissions.emissions.length > 0;
    }
  }, [assetId, particleDataReady]);

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
        <TabsList>
          {shouldShowPotteryShardTab && (
            <TabIcon icon="🏺" label="Pottery Shard" value="pottery-shard" />
          )}
          {shouldShowEntityDecoratedPotTab && (
            <TabIcon icon="🏺" label="Decorated Pot" value="entity-pot" />
          )}
          {shouldShowDecoratedPotTab && (
            <TabIcon icon="🏺" label="Decorated Pot" value="decorated-pot" />
          )}
          {shouldShowPaintingTab && onSelectVariant && (
            <TabIcon icon="🖼" label="Painting" value="painting" />
          )}
          {shouldShowItemTab && (
            <TabIcon icon="🗡️" label="Item Display" value="item" />
          )}
          {shouldShowSignTab && <TabIcon icon="🪧" label="Sign" value="sign" />}
          {shouldShowBlockStateTab && (
            <TabIcon icon="⚙" label="Block State" value="block-state" />
          )}
          {shouldShowEntityVariantTab && (
            <TabIcon icon="🔄" label="Entity Variant" value="entity-variant" />
          )}
          {shouldShowAnimationsTab && (
            <TabIcon icon="🎬" label="Animations" value="animations" />
          )}
          {shouldShowEntityFeaturesTab && (
            <TabIcon icon="🧩" label="Features" value="entity-features" />
          )}
          {shouldShowPotTab && <TabIcon icon="🌱" label="Pot" value="pot" />}
          {shouldShowParticlePropertiesTab && (
            <TabIcon icon="✨" label="Particles" value="particle-properties" />
          )}
          {hasTextureVariants && onSelectVariant && (
            <TabIcon
              icon="🖼"
              label="Texture Variant"
              value="texture-variants"
            />
          )}
          {hasVariantsTab && (
            <TabIcon icon="📦" label="Pack Variants" value="variants" />
          )}
          <TabIcon icon="⚡" label="Advanced" value="advanced" />
        </TabsList>

        {shouldShowPotteryShardTab && (
          <PotteryShardTab
            assetId={assetId}
            allAssets={allAssets}
            onSelectVariant={onSelectVariant}
          />
        )}

        {shouldShowEntityDecoratedPotTab && (
          <EntityDecoratedPotTab
            assetId={assetId}
            allAssets={allAssets}
            onSelectVariant={onSelectVariant}
          />
        )}

        {shouldShowDecoratedPotTab && (
          <DecoratedPotTab assetId={assetId} allAssets={allAssets} />
        )}

        {shouldShowPaintingTab && onSelectVariant && (
          <PaintingTab
            assetId={assetId}
            allAssets={allAssets}
            onSelectVariant={onSelectVariant}
          />
        )}

        {shouldShowItemTab && (
          <ItemDisplayTab itemDisplayMode={itemDisplayMode} />
        )}

        {shouldShowSignTab && (
          <SignOptionsTab isHangingSign={isHangingSignAsset} />
        )}

        {shouldShowBlockStateTab && (
          <BlockStateTab
            assetId={assetId}
            blockProps={blockProps}
            seed={seed}
            onBlockPropsChange={handleBlockPropsChange}
            onSeedChange={handleSeedChange}
          />
        )}

        {shouldShowEntityVariantTab && entityAssetId && (
          <EntityVariantTab assetId={entityAssetId} />
        )}

        {shouldShowAnimationsTab && <AnimationsTab />}

        {shouldShowEntityFeaturesTab && entityFeatureSchema && (
          <EntityFeaturesTab schema={entityFeatureSchema} />
        )}

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

        {hasTextureVariants && onSelectVariant && (
          <TextureVariantTab
            assetId={assetId}
            allAssets={allAssets}
            selectedVariantId={viewingVariantId}
            onSelectVariant={setViewingVariantId}
          />
        )}

        {hasVariantsTab && onSelectProvider && (
          <PackVariantsTab
            assetId={assetId}
            providers={providers}
            onSelectProvider={onSelectProvider}
          />
        )}

        <AdvancedTab
          assetId={assetId}
          combinedAssetIds={combinedAssetIds}
          seed={seed}
          blockProps={blockProps}
          schema={schema}
        />
      </Tabs>
    </div>
  );
};
