import { useMemo, useState, useEffect } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getPackTexturePath, getVanillaTexturePath } from "@lib/tauri";
import {
  beautifyAssetName,
  groupAssetsByVariant,
  isPottedPlant,
  categorizeVariants,
  isInventoryVariant,
  isNumberedVariant,
  normalizeAssetId,
  getVariantNumber,
} from "@lib/assetUtils";
import { useSelectWinner, useSelectPack } from "@state/selectors";
import { useStore } from "@state/store";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/ui/components/Tooltip/Tooltip";
import s from "./styles.module.scss";

interface Props {
  assetId?: string;
  allAssets: Array<{ id: string; name: string }>;
  selectedVariantId?: string; // Currently viewing variant (view-only, local state)
  onSelectVariant: (variantId: string) => void;
}

type ViewMode = "world" | "inventory";

// Hook to load texture URL for a variant
function useVariantTexture(variantId: string) {
  const [textureUrl, setTextureUrl] = useState<string | null>(null);
  const winnerPackId = useSelectWinner(variantId);
  const pack = useSelectPack(winnerPackId || "");

  useEffect(() => {
    let mounted = true;

    async function loadTexture() {
      if (!variantId) return;

      try {
        const normalizedId = normalizeAssetId(variantId);
        let texturePath: string;

        if (winnerPackId && winnerPackId !== "minecraft:vanilla" && pack) {
          texturePath = await getPackTexturePath(
            pack.path,
            normalizedId,
            pack.is_zip,
          );
        } else {
          texturePath = await getVanillaTexturePath(normalizedId);
        }

        if (mounted) {
          const url = convertFileSrc(texturePath);
          setTextureUrl(url);
        }
      } catch (error) {
        console.warn(`Failed to load texture for ${variantId}:`, error);
        if (mounted) {
          setTextureUrl(null);
        }
      }
    }

    loadTexture();

    return () => {
      mounted = false;
    };
  }, [variantId, winnerPackId, pack]);

  return textureUrl;
}

// Individual texture thumbnail component
function TextureThumbnail({
  variantId,
  index,
  isSelected,
  onClick,
}: {
  variantId: string;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const textureUrl = useVariantTexture(variantId);
  const variantNumber = getVariantNumber(variantId);
  const displayText =
    variantNumber !== null ? `Variant ${variantNumber}` : variantId;

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <button
          className={`${s.thumbnail} ${isSelected ? s.selected : ""}`}
          onClick={onClick}
          type="button"
          aria-label={displayText}
        >
          <span className={s.thumbnailNumber}>{index + 1}</span>
          {textureUrl ? (
            <img
              src={textureUrl}
              alt={displayText}
              className={s.thumbnailImage}
            />
          ) : (
            <div className={s.thumbnailPlaceholder}>?</div>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={4}>
        {displayText}
      </TooltipContent>
    </Tooltip>
  );
}

export default function TextureVariantSelector({
  assetId,
  allAssets,
  selectedVariantId,
  onSelectVariant,
}: Props) {
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

    // Find the group that contains the selected asset
    const group = groups.find((g) => g.variantIds.includes(assetId));

    if (!group || group.variantIds.length <= 1) {
      return { worldVariants: [], inventoryVariants: [] };
    }

    // Filter to only numbered texture variants (e.g., acacia_planks1, acacia_planks2)
    // Block states (_on, _off) and faces (_top, _side) should NOT appear in variant selector
    const numberedVariants = group.variantIds.filter(isNumberedVariant);

    // Filter out potted variants - they're controlled by "Show Pot" toggle, not texture selector
    const nonPottedVariants = numberedVariants.filter(
      (id) => !isPottedPlant(id),
    );

    // Filter to only include variants from the winning pack
    // This ensures we only show variants from the currently selected resource pack
    const filteredVariants = winnerPackId
      ? nonPottedVariants.filter((variantId) => {
          const providers = providersByAsset[variantId] ?? [];
          return providers.includes(winnerPackId);
        })
      : nonPottedVariants;

    // Categorize into world and inventory variants
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

  // Get a friendly name for the variant dropdown
  const getVariantDisplayName = (variantId: string, index: number) => {
    const name = beautifyAssetName(variantId);
    // For inventory variants, strip the "Inventory" suffix since we're already in inventory view
    if (viewMode === "inventory") {
      return (
        name.replace(/ Inventory$/, "") + (index === 0 ? " (Default)" : "")
      );
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
              if (
                worldVariants.length > 0 &&
                assetId &&
                !worldVariants.includes(assetId)
              ) {
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
              if (
                inventoryVariants.length > 0 &&
                assetId &&
                !inventoryVariants.includes(assetId)
              ) {
                onSelectVariant(inventoryVariants[0]);
              }
            }}
          >
            Inventory View
          </button>
        </div>
      )}

      {/* Variant thumbnails */}
      {currentVariants.length > 1 ? (
        <>
          <h3 className={s.sectionTitle}>
            {viewMode === "world" ? "Texture Variants" : "Inventory Variants"}
          </h3>
          <div className={s.thumbnailGrid}>
            {currentVariants.map((variantId, index) => (
              <TextureThumbnail
                key={variantId}
                variantId={variantId}
                index={index}
                isSelected={variantId === (selectedVariantId || assetId)}
                onClick={() => onSelectVariant(variantId)}
              />
            ))}
          </div>
          <div className={s.hint}>
            {currentVariants.length} variant
            {currentVariants.length !== 1 ? "s" : ""} available
          </div>
        </>
      ) : currentVariants.length === 1 ? (
        <>
          <label className={s.label}>
            {viewMode === "world" ? "World Texture" : "Inventory Texture"}
          </label>
          <div className={s.singleVariant}>
            {getVariantDisplayName(currentVariants[0], 0).replace(
              " (Default)",
              "",
            )}
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
