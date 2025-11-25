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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/ui/components/tabs";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/ui/components/Tooltip/Tooltip";
import VariantChooser from "@components/VariantChooser";
import BlockStatePanel from "@components/Preview3D/BlockStatePanel";
import TextureVariantSelector from "@components/TextureVariantSelector";
import PaintingSelector from "@components/PaintingSelector";
import PotteryShardSelector from "@components/PotteryShardSelector";
import DecoratedPotConfigurator from "@components/DecoratedPotConfigurator";
import Preview3D from "@components/Preview3D";
import { isNumberedVariant } from "@lib/assetUtils";
import { Separator } from "@/ui/components/Separator/Separator";
import {
  getBlockStateIdFromAssetId,
  isBiomeColormapAsset,
  isPottedPlant,
  isMinecraftItem,
  getVariantGroupKey,
  groupAssetsByVariant,
} from "@lib/assetUtils";
import type { ItemDisplayMode } from "@lib/itemDisplayModes";
import { getDisplayModeName } from "@lib/itemDisplayModes";
import {
  getBlockStateSchema,
  type BlockStateSchema,
} from "@lib/tauri/blockModels";
import { useSelectWinner, useSelectPacksDir } from "@state/selectors";
import { useStore } from "@state/store";
import s from "./styles.module.scss";

// Tab icon component with tooltip
interface TabIconProps {
  icon: string;
  label: string;
  value: string;
}

function TabIcon({ icon, label, value }: TabIconProps) {
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <TabsTrigger value={value} aria-label={label}>
          <span className={s.tabIcon}>{icon}</span>
        </TabsTrigger>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

interface ProviderOption {
  packId: string;
  packName: string;
  isPenciled?: boolean;
  isWinner?: boolean;
}

interface Props {
  assetId?: string;
  providers?: ProviderOption[];
  onSelectProvider?: (packId: string) => void;
  onBlockPropsChange?: (props: Record<string, string>) => void;
  onSeedChange?: (seed: number) => void;
  // Props for asset selection (paintings, pottery shards, etc.)
  allAssets?: Array<{ id: string; name: string }>;
  onSelectVariant?: (variantId: string) => void;
  // Props for texture variant viewing (view-only, temporary)
  onViewingVariantChange?: (variantId: string | undefined) => void;
  // Props for item display
  itemDisplayMode?: ItemDisplayMode;
  onItemDisplayModeChange?: (mode: ItemDisplayMode) => void;
}

export default function OptionsPanel({
  assetId,
  providers = [],
  onSelectProvider,
  onBlockPropsChange,
  onSeedChange,
  allAssets = [],
  onSelectVariant,
  onViewingVariantChange,
  itemDisplayMode = "ground",
}: Props) {
  // Read showPot state from global store
  const showPot = useStore((state) => state.showPot ?? true);
  const setShowPot = useStore((state) => state.setShowPot);
  const providersByAsset = useStore((state) => state.providersByAsset);

  const [blockProps, setBlockProps] = useState<Record<string, string>>({});
  const [seed, setSeed] = useState(0);

  // Local state for temporary variant viewing (view-only, doesn't affect global state)
  const [viewingVariantId, setViewingVariantId] = useState<string | undefined>(
    undefined,
  );

  // Notify parent when viewing variant changes
  useEffect(() => {
    if (onViewingVariantChange) {
      onViewingVariantChange(viewingVariantId);
    }
  }, [viewingVariantId, onViewingVariantChange]);

  // Get the winning pack for this asset (respects pencil overrides)
  const winnerPackIdForVariants = useSelectWinner(assetId ?? "");

  // Check if texture variants are available for the selected asset
  // Only numbered variants (e.g., acacia_planks1, acacia_planks2) count as texture variants
  // Block states (_on, _off) and faces (_top, _side) should NOT show the variant selector
  // IMPORTANT: Must match the logic in TextureVariantSelector to avoid showing empty tabs
  const hasTextureVariants = useMemo(() => {
    if (!assetId || allAssets.length === 0) return false;

    const winnerPackId = winnerPackIdForVariants;
    const allAssetIds = allAssets.map((a) => a.id);
    const groups = groupAssetsByVariant(allAssetIds);

    // Find the group that contains the selected asset
    const group = groups.find((g) => g.variantIds.includes(assetId));

    if (!group) return false;

    // Count only numbered texture variants
    const numberedVariants = group.variantIds.filter(isNumberedVariant);

    // Filter out potted variants
    const nonPottedVariants = numberedVariants.filter(
      (id) => !isPottedPlant(id),
    );

    // Filter to only include variants from the winning pack (same logic as TextureVariantSelector)
    const filteredVariants = winnerPackId
      ? nonPottedVariants.filter((variantId) => {
          const variantProviders = providersByAsset[variantId] ?? [];
          return variantProviders.includes(winnerPackId);
        })
      : nonPottedVariants;

    // Need more than 1 variant to show the selector
    return filteredVariants.length > 1;
  }, [assetId, allAssets, winnerPackIdForVariants, providersByAsset]);

  // Forward block props and seed changes to parent
  const handleBlockPropsChange = (props: Record<string, string>) => {
    setBlockProps(props);
    if (onBlockPropsChange) {
      onBlockPropsChange(props);
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
  const isPainting = assetId
    ? (() => {
        const path = assetId.includes(":") ? assetId.split(":")[1] : assetId;
        return path.startsWith("painting/");
      })()
    : false;
  const isPotteryShard = assetId
    ? (() => {
        const path = assetId.includes(":") ? assetId.split(":")[1] : assetId;
        return path.startsWith("item/pottery_shard_");
      })()
    : false;
  const isDecoratedPot = assetId
    ? (() => {
        const path = assetId.includes(":") ? assetId.split(":")[1] : assetId;
        return path === "block/decorated_pot";
      })()
    : false;
  const isEntityDecoratedPot = assetId
    ? (() => {
        const path = assetId.includes(":") ? assetId.split(":")[1] : assetId;
        return path.startsWith("entity/decorated_pot/");
      })()
    : false;
  const selectedWinnerPackId = useSelectWinner(assetId ?? "");
  const winnerPackId = assetId ? selectedWinnerPackId : null;
  const packsDir = useSelectPacksDir();
  const blockStateAssetId =
    assetId != null ? getBlockStateIdFromAssetId(assetId) : null;
  const isMinecraftNamespace = assetId?.startsWith("minecraft:") ?? false;

  // Load schema to determine available tabs
  useEffect(() => {
    if (!assetId || isColormapSelection || !packsDir || !blockStateAssetId) {
      setSchema(null);
      return;
    }

    const targetBlockStateId = blockStateAssetId;
    const targetPackId =
      winnerPackId ?? (isMinecraftNamespace ? "minecraft:vanilla" : null);
    if (!targetPackId) {
      setSchema(null);
      return;
    }
    const packIdForSchema: string = targetPackId;

    let cancelled = false;

    async function loadSchema() {
      try {
        const schemaData = await getBlockStateSchema(
          packIdForSchema,
          targetBlockStateId,
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
    loadSchema();

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

  // Reset state when asset changes
  useEffect(() => {
    if (assetId) {
      setBlockProps({});
      setSeed(0);
      setViewingVariantId(undefined); // Reset variant view when switching assets
    }
  }, [assetId]);

  // Determine which tabs to show
  // Variants tab shows texture variants from different resource packs
  // Check if the base asset (without variant number) has multiple providers
  // This ensures the tab persists when switching between numbered variants
  const hasVariantsTab = useMemo(() => {
    if (isColormapSelection || !assetId) return false;

    // Get base asset ID (remove variant number)
    const baseAssetId = getVariantGroupKey(assetId);

    // Check if the current asset has multiple providers
    const currentProviders = providersByAsset[assetId] ?? [];
    if (currentProviders.length > 1) return true;

    // Also check if any variant of this asset has multiple providers
    const allAssetIds = allAssets.map((a) => a.id);
    const groups = groupAssetsByVariant(allAssetIds);
    const group = groups.find((g) => g.baseId === baseAssetId);

    if (!group) return providers.length > 1;

    // Check if any variant in the group has multiple providers
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

  // Pot tab shows for both potted plants AND pottable plants (plants that have potted variants)
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
  // Block State tab shows blockstate properties (facing, half, etc.) and seed
  const shouldShowBlockStateTab =
    !isColormapSelection && !isItem && (schema?.properties.length ?? 0) > 0;
  // Item tab shows item display controls (rotation, display mode)
  const shouldShowItemTab = isItem && !isPotteryShard && !isEntityDecoratedPot; // Exclude pottery shards and entity decorated pots from item tab
  // Painting tab shows all available paintings to select from
  const shouldShowPaintingTab = isPainting && allAssets.length > 0;
  // Pottery shard tab shows 3D decorated pot preview with this shard
  const shouldShowPotteryShardTab = isPotteryShard;
  // Decorated pot tab shows configurator for each side
  const shouldShowDecoratedPotTab = isDecoratedPot && allAssets.length > 0;
  // Entity decorated pot texture tab shows 2D texture view and 3D pot preview
  const shouldShowEntityDecoratedPotTab = isEntityDecoratedPot;

  const defaultTab = shouldShowPotteryShardTab
    ? "pottery-shard"
    : shouldShowEntityDecoratedPotTab
      ? "entity-pot"
      : shouldShowDecoratedPotTab
        ? "decorated-pot"
        : shouldShowPaintingTab
          ? "painting"
          : shouldShowItemTab
            ? "item"
            : shouldShowBlockStateTab
              ? "block-state"
              : "advanced";

  if (!assetId) {
    return (
      <div className={s.root}>
        <div className={s.emptyState}>Select an asset to view options</div>
      </div>
    );
  }

  // Colormap assets (grass/foliage colormaps) are now handled in the global "Biome & Colormaps" tab
  if (isColormapSelection) {
    return (
      <div className={s.root}>
        <div className={s.emptyState}>
          <p>
            Colormap settings are now in the <strong>Biome & Colormaps</strong>{" "}
            tab.
          </p>
          <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", opacity: 0.7 }}>
            Look for the leaf icon on the left sidebar.
          </p>
        </div>
      </div>
    );
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
          {shouldShowBlockStateTab && (
            <TabIcon icon="⚙" label="Block State" value="block-state" />
          )}
          {shouldShowPotTab && <TabIcon icon="🌱" label="Pot" value="pot" />}
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
          <TabsContent value="pottery-shard">
            <div>
              {onSelectVariant && allAssets.length > 0 && (
                <>
                  <PotteryShardSelector
                    assetId={assetId}
                    allAssets={allAssets}
                    onSelectShard={onSelectVariant}
                    includeItems={true}
                    includeEntity={false}
                  />
                  <Separator style={{ margin: "1rem 0" }} />
                </>
              )}
              {/* Convert pottery shard item to entity texture for preview */}
              <Preview3D
                assetId={
                  assetId
                    ?.replace("item/", "entity/decorated_pot/")
                    .replace("_pottery_shard", "_pottery_pattern") || assetId
                }
                showPot={false}
                blockProps={{}}
                seed={0}
                allAssetIds={[]}
              />
            </div>
          </TabsContent>
        )}

        {shouldShowEntityDecoratedPotTab && (
          <TabsContent value="entity-pot">
            <div>
              {onSelectVariant && allAssets.length > 0 && (
                <PotteryShardSelector
                  assetId={assetId}
                  allAssets={allAssets}
                  onSelectShard={onSelectVariant}
                  includeItems={false}
                  includeEntity={true}
                />
              )}
            </div>
          </TabsContent>
        )}

        {shouldShowDecoratedPotTab && (
          <TabsContent value="decorated-pot">
            <div>
              <DecoratedPotConfigurator
                assetId={assetId}
                allAssets={allAssets}
              />
            </div>
          </TabsContent>
        )}

        {shouldShowPaintingTab && onSelectVariant && (
          <TabsContent value="painting">
            <div>
              <PaintingSelector
                assetId={assetId}
                allAssets={allAssets}
                onSelectPainting={onSelectVariant}
              />
            </div>
          </TabsContent>
        )}

        {shouldShowItemTab && (
          <TabsContent value="item">
            <div>
              <h3>Item Display</h3>
              <Separator style={{ margin: "0.75rem 0" }} />

              {/* Display mode info */}
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "#666",
                }}
              >
                <strong>Display Mode:</strong>{" "}
                {getDisplayModeName(itemDisplayMode)}
              </p>
              <p
                style={{
                  fontSize: "0.85rem",
                  marginTop: "0.5rem",
                  color: "#888",
                }}
              >
                Items are rendered as 3D dropped items with 1px thickness, just
                like in Minecraft.
              </p>

              <Separator style={{ margin: "1rem 0" }} />

              <p
                style={{
                  fontSize: "0.85rem",
                  color: "#888",
                }}
              >
                To configure item animations and display options, open the{" "}
                <strong>Canvas Settings</strong> tab on the right side.
              </p>

              {/* Future: Display mode selector */}
              {/* <div style={{ marginTop: "1rem" }}>
                <label>View Mode</label>
                <select
                  value={itemDisplayMode}
                  onChange={(e) =>
                    onItemDisplayModeChange?.(e.target.value as ItemDisplayMode)
                  }
                >
                  <option value="ground">Dropped (Ground)</option>
                  <option value="hand_right">Right Hand</option>
                  <option value="hand_left">Left Hand</option>
                  <option value="head">Head Slot</option>
                  <option value="item_frame">Item Frame</option>
                </select>
              </div> */}
            </div>
          </TabsContent>
        )}

        {shouldShowBlockStateTab && (
          <TabsContent value="block-state">
            <BlockStatePanel
              assetId={assetId}
              blockProps={blockProps}
              onBlockPropsChange={handleBlockPropsChange}
              seed={seed}
              onSeedChange={handleSeedChange}
            />
          </TabsContent>
        )}

        {shouldShowPotTab && (
          <TabsContent value="pot">
            <div>
              <h3>Pot Display</h3>
              <Separator style={{ margin: "0.75rem 0" }} />
              <label
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  alignItems: "center",
                }}
              >
                <input
                  type="checkbox"
                  checked={showPot}
                  onChange={(e) => setShowPot(e.target.checked)}
                  style={{
                    cursor: "pointer",
                    width: "18px",
                    height: "18px",
                  }}
                />
                <span
                  style={{
                    textTransform: "uppercase",
                    fontWeight: "600",
                  }}
                >
                  Show Pot
                </span>
              </label>
              <p style={{ fontSize: "0.85rem", marginTop: "1rem" }}>
                This is a potted plant. Toggle the pot display on or off.
              </p>
            </div>
          </TabsContent>
        )}

        {hasTextureVariants && onSelectVariant && (
          <TabsContent value="texture-variants">
            <div>
              <TextureVariantSelector
                assetId={assetId}
                allAssets={allAssets}
                selectedVariantId={viewingVariantId}
                onSelectVariant={setViewingVariantId}
              />
            </div>
          </TabsContent>
        )}

        {hasVariantsTab && onSelectProvider && (
          <TabsContent value="variants">
            <div>
              <h3>Resource Pack Variants</h3>
              <Separator style={{ margin: "0.75rem 0" }} />
              <p style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>
                This texture has variants from {providers.length} different
                resource packs. Click on a variant below to switch between
                different visual styles.
              </p>
              <VariantChooser
                providers={providers}
                onSelectProvider={onSelectProvider}
                assetId={assetId}
              />
            </div>
          </TabsContent>
        )}

        <TabsContent value="advanced">
          <div>
            <h3>Advanced Options</h3>
            <p>Additional configuration options for advanced users.</p>
            <div style={{ fontSize: "0.85rem" }}>
              <p>
                <strong>Asset ID:</strong> {assetId}
              </p>
              <p>
                <strong>Current Seed:</strong> {seed}
              </p>
              <p>
                <strong>Block Props:</strong> {Object.keys(blockProps).length}{" "}
                configured
              </p>
              <p>
                <strong>Has Schema:</strong> {schema ? "Yes" : "No"}
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
