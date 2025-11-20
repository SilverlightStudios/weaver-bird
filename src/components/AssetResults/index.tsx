import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getVanillaTexturePath, getPackTexturePath } from "@lib/tauri";
import {
  beautifyAssetName,
  getBlockStateIdFromAssetId,
  groupAssetsByVariant,
  isBiomeColormapAsset,
  normalizeAssetId,
  isInventoryVariant,
} from "@lib/assetUtils";
import {
  useSelectWinner,
  useSelectIsPenciled,
  useSelectPack,
} from "@state/selectors";
import { useStore } from "@state/store";
import s from "./styles.module.scss";

interface AssetItem {
  id: string;
  name: string;
}

interface Props {
  assets: AssetItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
  totalItems?: number; // Total count before pagination (for display)
  displayRange?: { start: number; end: number }; // Range being displayed
}

interface AssetCardProps {
  asset: AssetItem;
  isSelected: boolean;
  onSelect: () => void;
  variantCount?: number; // Number of variants if this is a grouped asset
}

function AssetCard({
  asset,
  isSelected,
  onSelect,
  variantCount,
}: AssetCardProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const isColormap = isBiomeColormapAsset(asset.id);

  // Get the winning pack for this asset
  const winnerPackId = useSelectWinner(asset.id);
  const isPenciled = useSelectIsPenciled(asset.id);
  const winnerPack = useSelectPack(winnerPackId || "");

  // Intersection Observer to detect visibility
  useEffect(() => {
    if (!cardRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Once visible, stop observing (lazy load only once)
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }, // Start loading 200px before visible
    );

    observer.observe(cardRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Only load image when visible
  useEffect(() => {
    if (!isVisible) return;

    let mounted = true;

    const loadImage = async () => {
      try {
        let texturePath: string;
        // Normalize asset ID to fix trailing underscores and other issues
        const normalizedAssetId = normalizeAssetId(asset.id);

        // Priority: 1. Pack texture (if exists), 2. Vanilla texture (fallback)
        if (winnerPackId && winnerPack) {
          try {
            // Try to load from the winning pack
            texturePath = await getPackTexturePath(
              winnerPack.path,
              normalizedAssetId,
              winnerPack.is_zip,
            );
          } catch (packError) {
            // If pack texture fails, fall back to vanilla
            console.warn(
              `Pack texture not found for ${normalizedAssetId}, using vanilla.`,
              packError,
            );
            texturePath = await getVanillaTexturePath(normalizedAssetId);
          }
        } else {
          // No pack provides this texture, use vanilla
          texturePath = await getVanillaTexturePath(normalizedAssetId);
        }

        if (mounted) {
          // Convert file path to Tauri asset URL
          const assetUrl = convertFileSrc(texturePath);
          setImageSrc(assetUrl);
          setImageError(false);
        }
      } catch (error) {
        if (mounted) {
          setImageError(true);
          console.warn(`Failed to load texture for ${asset.id}:`, error);
        }
      }
    };

    loadImage();

    return () => {
      mounted = false;
    };
  }, [isVisible, asset.id, winnerPackId, winnerPack]);

  const displayName = asset.name || beautifyAssetName(asset.id);

  return (
    <div
      ref={cardRef}
      className={`${s.card} ${isSelected ? s.selected : ""}`}
      onClick={onSelect}
    >
      <div className={s.imageContainer}>
        {imageSrc && !imageError ? (
          <img
            src={imageSrc}
            alt={displayName}
            className={isColormap ? s.colormapTexture : s.texture}
            onError={() => setImageError(true)}
          />
        ) : imageError ? (
          <div className={s.placeholder}>
            <span className={s.placeholderIcon}>🎨</span>
          </div>
        ) : (
          <div className={s.placeholder}>
            <span className={s.placeholderIcon}>⏳</span>
          </div>
        )}
        {isPenciled && (
          <div
            className={s.penciledIndicator}
            title="Manually selected texture"
          >
            ✏️
          </div>
        )}
        {variantCount && variantCount > 1 && (
          <div className={s.variantBadge} title={`${variantCount} variants`}>
            {variantCount}
          </div>
        )}
      </div>
      <div className={s.assetName}>{displayName}</div>
    </div>
  );
}

export default function AssetResults({
  assets,
  selectedId,
  onSelect,
  totalItems,
  displayRange,
}: Props) {
  const winners = useStore((state) => state.overrides);
  const providersByAsset = useStore((state) => state.providersByAsset);
  const packOrder = useStore((state) => state.packOrder);

  // Helper to get winning pack for an asset
  const getWinningPack = useCallback(
    (assetId: string): string | undefined => {
      // Check if asset is penciled to a specific pack
      const override = winners[assetId];
      if (override) {
        return override.packId;
      }

      // Otherwise, get first provider in pack order
      const providers = providersByAsset[assetId] ?? [];
      if (providers.length === 0) return undefined;

      const sorted = [...providers].sort(
        (a, b) => packOrder.indexOf(a) - packOrder.indexOf(b),
      );
      return sorted[0];
    },
    [winners, providersByAsset, packOrder],
  );

  // Group assets by variant, but only group variants from the same winning pack
  const groupedAssets = useMemo(() => {
    const assetIds = assets.map((a) => a.id);
    const groups = groupAssetsByVariant(assetIds);

    // Filter each group to only include variants from the same winning pack
    const packFilteredGroups = groups.map((group) => {
      // Get the winning pack for the base asset
      const baseWinningPack = getWinningPack(group.variantIds[0]);

      // Filter variants to only those with the same winning pack
      const filteredVariants = group.variantIds.filter((variantId) => {
        return getWinningPack(variantId) === baseWinningPack;
      });

      return {
        ...group,
        variantIds: filteredVariants,
      };
    });

    // Return only the base asset from each group
    // Prefer inventory variant as display icon since that's what players recognize
    const displayAssets = packFilteredGroups.map((group) => {
      // Find inventory variant to use as primary display, fall back to first variant
      const inventoryVariant = group.variantIds.find((id) => isInventoryVariant(id));
      const primaryId = inventoryVariant || group.variantIds[0];
      const canonicalId = primaryId.includes(":colormap/")
        ? primaryId
        : getBlockStateIdFromAssetId(primaryId);
      return {
        id: primaryId,
        name: beautifyAssetName(canonicalId),
        variantCount: group.variantIds.length,
        allVariants: group.variantIds,
      };
    });

    return displayAssets;
  }, [assets, getWinningPack]);

  console.log(
    "[AssetResults] Rendering",
    assets.length,
    "assets (",
    groupedAssets.length,
    "groups) with lazy loading",
    totalItems ? `| Total: ${totalItems}` : "",
  );

  if (assets.length === 0) {
    return (
      <div className={s.root}>
        <div className={s.emptyState}>
          {totalItems === 0
            ? "No assets found. Try searching for a block or texture."
            : "No results on this page."}
        </div>
      </div>
    );
  }

  return (
    <div className={s.root}>
      {totalItems && displayRange && (
        <div className={s.paginationInfo}>
          Showing {displayRange.start}–{displayRange.end} of {totalItems} assets
        </div>
      )}
      <div className={s.results}>
        {groupedAssets.map((group) => (
          <AssetCard
            key={group.id}
            asset={{ id: group.id, name: group.name }}
            isSelected={
              selectedId === group.id ||
              group.allVariants.includes(selectedId || "")
            }
            onSelect={() => onSelect(group.id)}
            variantCount={group.variantCount}
          />
        ))}
      </div>
    </div>
  );
}
