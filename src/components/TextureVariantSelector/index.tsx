import { useMemo, useState, useEffect } from "react";
import {
  beautifyAssetName,
  groupAssetsByVariant,
  isPottedPlant,
  categorizeVariants,
  isInventoryVariant,
} from "@lib/assetUtils";
import s from "./styles.module.scss";

interface Props {
  assetId?: string;
  allAssets: Array<{ id: string; name: string }>;
  onSelectVariant: (variantId: string) => void;
}

type ViewMode = "world" | "inventory";

export default function TextureVariantSelector({
  assetId,
  allAssets,
  onSelectVariant,
}: Props) {
  // Initialize view mode based on whether current asset is an inventory variant
  const initialViewMode = assetId && isInventoryVariant(assetId) ? "inventory" : "world";
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);

  // Update view mode when asset changes to match its type
  useEffect(() => {
    if (assetId) {
      setViewMode(isInventoryVariant(assetId) ? "inventory" : "world");
    }
  }, [assetId]);

  // Find all variants for the currently selected asset
  const { worldVariants, inventoryVariants } = useMemo(() => {
    if (!assetId) return { worldVariants: [], inventoryVariants: [] };

    const allAssetIds = allAssets.map((a) => a.id);
    const groups = groupAssetsByVariant(allAssetIds);

    // Find the group that contains the selected asset
    const group = groups.find((g) => g.variantIds.includes(assetId));

    if (!group || group.variantIds.length <= 1) {
      return { worldVariants: [], inventoryVariants: [] };
    }

    // Filter out potted variants - they're controlled by "Show Pot" toggle, not texture selector
    const nonPottedVariants = group.variantIds.filter(
      (id) => !isPottedPlant(id),
    );

    // Categorize into world and inventory variants
    return categorizeVariants(nonPottedVariants);
  }, [assetId, allAssets]);

  // Determine which variants to show based on current view mode
  const currentVariants = viewMode === "world" ? worldVariants : inventoryVariants;
  const hasInventoryVariants = inventoryVariants.length > 0;
  const hasWorldVariants = worldVariants.length > 0;

  // Don't render if no variants available at all
  if (worldVariants.length <= 1 && inventoryVariants.length === 0) {
    return null;
  }

  // Get a friendly name for the variant dropdown
  const getVariantDisplayName = (variantId: string, index: number) => {
    const name = beautifyAssetName(variantId);
    // For inventory variants, strip the "Inventory" suffix since we're already in inventory view
    if (viewMode === "inventory") {
      return name.replace(/ Inventory$/, "") + (index === 0 ? " (Default)" : "");
    }
    return name + (index === 0 ? " (Default)" : "");
  };

  return (
    <div className={s.root}>
      {/* View mode tabs - only show if inventory variants exist */}
      {hasInventoryVariants && (
        <div className={s.viewTabs}>
          <button
            className={`${s.viewTab} ${viewMode === "world" ? s.active : ""}`}
            onClick={() => {
              setViewMode("world");
              // Select first world variant when switching to world view
              if (worldVariants.length > 0 && assetId && !worldVariants.includes(assetId)) {
                onSelectVariant(worldVariants[0]);
              }
            }}
            disabled={!hasWorldVariants}
          >
            World View
          </button>
          <button
            className={`${s.viewTab} ${viewMode === "inventory" ? s.active : ""}`}
            onClick={() => {
              setViewMode("inventory");
              // Select first inventory variant when switching to inventory view
              if (inventoryVariants.length > 0 && assetId && !inventoryVariants.includes(assetId)) {
                onSelectVariant(inventoryVariants[0]);
              }
            }}
          >
            Inventory View
          </button>
        </div>
      )}

      {/* Variant selector */}
      {currentVariants.length > 1 ? (
        <>
          <label className={s.label} htmlFor="texture-variant-select">
            {viewMode === "world" ? "Texture Variant" : "Inventory Variant"}
          </label>
          <select
            id="texture-variant-select"
            className={s.select}
            value={assetId}
            onChange={(e) => onSelectVariant(e.target.value)}
          >
            {currentVariants.map((variantId, index) => (
              <option key={variantId} value={variantId}>
                {getVariantDisplayName(variantId, index)}
              </option>
            ))}
          </select>
          <div className={s.hint}>
            {currentVariants.length} variant{currentVariants.length !== 1 ? "s" : ""} available
          </div>
        </>
      ) : currentVariants.length === 1 ? (
        <>
          <label className={s.label}>
            {viewMode === "world" ? "World Texture" : "Inventory Texture"}
          </label>
          <div className={s.singleVariant}>
            {getVariantDisplayName(currentVariants[0], 0).replace(" (Default)", "")}
          </div>
          {viewMode === "inventory" && (
            <div className={s.hint}>
              This is the texture shown when the block is in your inventory
            </div>
          )}
        </>
      ) : (
        <div className={s.noVariants}>
          No {viewMode === "world" ? "world" : "inventory"} variants available
        </div>
      )}
    </div>
  );
}
