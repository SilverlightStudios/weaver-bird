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
import BiomeColorCard from "@app/BiomeColorCard";
import VariantChooser from "@components/VariantChooser";
import BlockStatePanel from "@components/Preview3D/BlockStatePanel";
import TextureVariantSelector from "@components/TextureVariantSelector";
import PaintingSelector from "@components/PaintingSelector";
import PotteryShardSelector from "@components/PotteryShardSelector";
import DecoratedPotConfigurator from "@components/DecoratedPotConfigurator";
import DecoratedPotBlockView from "@components/DecoratedPotBlockView";
import { groupAssetsByVariant } from "@lib/assetUtils";
import {
  Combobox,
  type ComboboxOption,
} from "@/ui/components/Combobox/Combobox";
import { Separator } from "@/ui/components/Separator/Separator";
import {
  getColormapAssetId,
  guessColormapTypeForAsset,
  getBlockStateIdFromAssetId,
  isBiomeColormapAsset,
  isPottedPlant,
  isMinecraftItem,
} from "@lib/assetUtils";
import type { ItemDisplayMode } from "@lib/itemDisplayModes";
import { getDisplayModeName, supportsRotation } from "@lib/itemDisplayModes";
import {
  getBlockStateSchema,
  type BlockStateSchema,
} from "@lib/tauri/blockModels";
import { useSelectWinner, useSelectPacksDir } from "@state/selectors";
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
  biomeColor?: { r: number; g: number; b: number } | null;
  onBiomeColorChange?: (color: { r: number; g: number; b: number }) => void;
  providers?: ProviderOption[];
  onSelectProvider?: (packId: string) => void;
  showPot: boolean;
  onShowPotChange: (show: boolean) => void;
  hasTintindex: boolean;
  tintType?: "grass" | "foliage";
  foliagePreviewBlock: string;
  onFoliagePreviewBlockChange: (blockId: string) => void;
  onBlockPropsChange?: (props: Record<string, string>) => void;
  onSeedChange?: (seed: number) => void;
  // Props for texture variant selector
  allAssets?: Array<{ id: string; name: string }>;
  onSelectVariant?: (variantId: string) => void;
  // Props for item display
  itemDisplayMode?: ItemDisplayMode;
  onItemDisplayModeChange?: (mode: ItemDisplayMode) => void;
  itemRotate?: boolean;
  onItemRotateChange?: (rotate: boolean) => void;
  itemHover?: boolean;
  onItemHoverChange?: (hover: boolean) => void;
}

const FOLIAGE_PREVIEW_OPTIONS: ComboboxOption[] = [
  { value: "minecraft:block/oak_leaves", label: "Oak Leaves" },
  { value: "minecraft:block/spruce_leaves", label: "Spruce Leaves" },
  { value: "minecraft:block/birch_leaves", label: "Birch Leaves" },
  { value: "minecraft:block/jungle_leaves", label: "Jungle Leaves" },
  { value: "minecraft:block/acacia_leaves", label: "Acacia Leaves" },
  { value: "minecraft:block/dark_oak_leaves", label: "Dark Oak Leaves" },
];

export default function OptionsPanel({
  assetId,
  onBiomeColorChange,
  providers = [],
  onSelectProvider,
  showPot,
  onShowPotChange,
  hasTintindex,
  tintType,
  foliagePreviewBlock,
  onFoliagePreviewBlockChange,
  onBlockPropsChange,
  onSeedChange,
  allAssets = [],
  onSelectVariant,
  itemDisplayMode = "ground",
  onItemDisplayModeChange,
  itemRotate = true,
  onItemRotateChange,
  itemHover = true,
  onItemHoverChange,
}: Props) {
  const [blockProps, setBlockProps] = useState<Record<string, string>>({});
  const [seed, setSeed] = useState(0);

  // Check if texture variants are available for the selected asset
  const hasTextureVariants = useMemo(() => {
    if (!assetId || allAssets.length === 0) return false;

    const allAssetIds = allAssets.map((a) => a.id);
    const groups = groupAssetsByVariant(allAssetIds);

    // Find the group that contains the selected asset
    const group = groups.find((g) => g.variantIds.includes(assetId));

    return group && group.variantIds.length > 1;
  }, [assetId, allAssets]);

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
  const isPainting = assetId ? (() => {
    const path = assetId.includes(":") ? assetId.split(":")[1] : assetId;
    return path.startsWith("painting/");
  })() : false;
  const isPotteryShard = assetId ? (() => {
    const path = assetId.includes(":") ? assetId.split(":")[1] : assetId;
    return path.startsWith("item/pottery_shard_");
  })() : false;
  const isDecoratedPot = assetId ? (() => {
    const path = assetId.includes(":") ? assetId.split(":")[1] : assetId;
    return path === "block/decorated_pot";
  })() : false;
  const isEntityDecoratedPot = assetId ? (() => {
    const path = assetId.includes(":") ? assetId.split(":")[1] : assetId;
    return path.startsWith("entity/decorated_pot/");
  })() : false;
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
    }
  }, [assetId]);

  // Determine which tabs to show
  const effectiveColormapType = tintType ?? guessColormapTypeForAsset(assetId);
  const colormapAssetId = isColormapSelection
    ? (assetId ?? getColormapAssetId(effectiveColormapType))
    : getColormapAssetId(effectiveColormapType);
  const hasBiomeColorTab = hasTintindex || isColormapSelection;
  // Variants tab shows texture variants from different resource packs
  const hasVariantsTab = !isColormapSelection && providers.length > 1;
  const shouldShowPotTab = !isColormapSelection && isPlantPotted;
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
    ? "entity-pot-texture"
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

  if (isColormapSelection && onBiomeColorChange && colormapAssetId) {
    return (
      <div className={s.root}>
        {effectiveColormapType === "foliage" && (
          <div className={s.leafSelector}>
            <label htmlFor="foliage-preview-select">Preview Leaves</label>
            <Combobox
              options={FOLIAGE_PREVIEW_OPTIONS}
              value={foliagePreviewBlock}
              onValueChange={onFoliagePreviewBlockChange}
              placeholder="Select leaf type..."
              searchPlaceholder="Search leaves..."
              emptyMessage="No matching leaves"
            />
          </div>
        )}
        <BiomeColorCard
          assetId={colormapAssetId}
          type={effectiveColormapType}
          onColorSelect={onBiomeColorChange}
          updateGlobalState={false}
        />
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
            <>
              <TabIcon icon="🖼" label="Texture" value="entity-pot-texture" />
              <TabIcon icon="🏺" label="3D Pot" value="entity-pot" />
            </>
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
          {shouldShowPotTab && (
            <TabIcon icon="🌱" label="Pot" value="pot" />
          )}
          {hasBiomeColorTab && (
            <TabIcon icon="🎨" label="Biome Color" value="biome" />
          )}
          {hasTextureVariants && onSelectVariant && (
            <TabIcon icon="🖼" label="Texture Variant" value="texture-variants" />
          )}
          {hasVariantsTab && (
            <TabIcon icon="📦" label="Pack Variants" value="variants" />
          )}
          <TabIcon icon="⚡" label="Advanced" value="advanced" />
        </TabsList>

        {shouldShowPotteryShardTab && (
          <TabsContent value="pottery-shard">
            <div style={{ padding: "1rem" }}>
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
              <DecoratedPotBlockView singleShard={assetId} />
            </div>
          </TabsContent>
        )}

        {shouldShowEntityDecoratedPotTab && (
          <>
            <TabsContent value="entity-pot-texture">
              <div style={{ padding: "1rem" }}>
                {onSelectVariant && allAssets.length > 0 && (
                  <>
                    <PotteryShardSelector
                      assetId={assetId}
                      allAssets={allAssets}
                      onSelectShard={onSelectVariant}
                      includeItems={false}
                      includeEntity={true}
                    />
                    <Separator style={{ margin: "1rem 0" }} />
                  </>
                )}
                <h3>Decorated Pot Texture</h3>
                <Separator style={{ margin: "0.75rem 0" }} />
                <p style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>
                  This is the 2D texture pattern used on decorated pots.
                </p>
                {/* Texture preview will be shown in the main preview area */}
              </div>
            </TabsContent>
            <TabsContent value="entity-pot">
              <div style={{ padding: "1rem" }}>
                {onSelectVariant && allAssets.length > 0 && (
                  <>
                    <PotteryShardSelector
                      assetId={assetId}
                      allAssets={allAssets}
                      onSelectShard={onSelectVariant}
                      includeItems={false}
                      includeEntity={true}
                    />
                    <Separator style={{ margin: "1rem 0" }} />
                  </>
                )}
                <DecoratedPotBlockView entityTexture={assetId} />
              </div>
            </TabsContent>
          </>
        )}

        {shouldShowDecoratedPotTab && (
          <TabsContent value="decorated-pot">
            <div style={{ padding: "1rem" }}>
              <DecoratedPotConfigurator
                assetId={assetId}
                allAssets={allAssets}
              />
            </div>
          </TabsContent>
        )}

        {shouldShowPaintingTab && onSelectVariant && (
          <TabsContent value="painting">
            <div style={{ padding: "1rem" }}>
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
            <div style={{ padding: "1rem" }}>
              <h3>Item Display</h3>
              <Separator style={{ margin: "0.75rem 0" }} />

              {/* Rotation toggle */}
              {supportsRotation(itemDisplayMode) && (
                <label
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "center",
                    marginBottom: "1rem",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={itemRotate}
                    onChange={(e) =>
                      onItemRotateChange?.(e.target.checked)
                    }
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
                    Rotate Item
                  </span>
                </label>
              )}

              {/* Hover toggle */}
              <label
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  alignItems: "center",
                  marginBottom: "1rem",
                }}
              >
                <input
                  type="checkbox"
                  checked={itemHover}
                  onChange={(e) =>
                    onItemHoverChange?.(e.target.checked)
                  }
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
                  Hover Item
                </span>
              </label>

              {/* Display mode info */}
              <p style={{ fontSize: "0.85rem", marginTop: "1rem", color: "#666" }}>
                <strong>Display Mode:</strong> {getDisplayModeName(itemDisplayMode)}
              </p>
              <p style={{ fontSize: "0.85rem", marginTop: "0.5rem", color: "#888" }}>
                Items are rendered as 3D dropped items with 1px thickness, just like in Minecraft.
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
            <div style={{ padding: "1rem" }}>
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
                  onChange={(e) => onShowPotChange(e.target.checked)}
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

        {hasBiomeColorTab && colormapAssetId && (
          <TabsContent value="biome">
            {onBiomeColorChange && (
              <BiomeColorCard
                assetId={colormapAssetId}
                type={effectiveColormapType}
                onColorSelect={onBiomeColorChange}
                updateGlobalState={false}
              />
            )}
          </TabsContent>
        )}

        {hasTextureVariants && onSelectVariant && (
          <TabsContent value="texture-variants">
            <div style={{ padding: "1rem" }}>
              <TextureVariantSelector
                assetId={assetId}
                allAssets={allAssets}
                onSelectVariant={onSelectVariant}
              />
            </div>
          </TabsContent>
        )}

        {hasVariantsTab && onSelectProvider && (
          <TabsContent value="variants">
            <div style={{ padding: "1rem" }}>
              <h3>Texture Variants</h3>
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
          <div style={{ padding: "1rem" }}>
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
