/**
 * AssetResults Component - Displays paginated resource cards
 *
 * PERFORMANCE OPTIMIZATIONS:
 * -------------------------
 * 1. Selective Subscriptions:
 *    - Cards only subscribe to grass/foliage colors if they actually use tinting
 *    - Prevents 95%+ of cards from re-rendering on pack order changes
 *
 * 2. Lazy Loading with IntersectionObserver:
 *    - Only loads textures for visible cards (200px buffer)
 *    - Drastically reduces initial load time for large asset lists
 *
 * 3. Progressive/Staggered Rendering:
 *    - Renders cards in batches of 12 using requestIdleCallback
 *    - Prevents browser lockup when loading 50+ cards at once
 *    - IMPACT: Initial page load feels instant, cards appear progressively
 */
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { isInventoryVariant, isNumberedVariant } from "@lib/assetUtils";
import { assetGroupingWorker } from "@lib/assetGroupingWorker";
import { useStore } from "@state/store";
import { AssetCard } from "./components/AssetCard";
import { SharedEntityThumbnailsCanvas } from "./components/SharedEntityThumbnailsCanvas";
import { getWinningPack } from "./utilities";
import type { Props } from "./types";
import s from "./styles.module.scss";

export default function AssetResults({
  assets,
  selectedId,
  onSelect,
  onPaginationChange,
}: Props) {
  const winners = useStore((state) => state.overrides);
  const providersByAsset = useStore((state) => state.providersByAsset);
  const packOrder = useStore((state) => state.packOrder);
  const disabledPackIds = useStore((state) => state.disabledPackIds);
  const currentPage = useStore((state) => state.currentPage);
  const itemsPerPage = useStore((state) => state.itemsPerPage);
  const disabledSet = useMemo(
    () => new Set(disabledPackIds),
    [disabledPackIds],
  );

  // Ref for the container to handle events
  const containerRef = useRef<HTMLDivElement>(null);

  // OPTIMIZATION: Progressive rendering - stagger card mounting to avoid initial lag
  // Render cards in batches to prevent overwhelming the browser with 50+ MinecraftCSSBlocks at once
  const [renderCount, setRenderCount] = useState(12); // Start with first 12 cards
  const renderBatchSize = 12; // Render 12 more cards per batch

  // State for grouped assets before pagination
  const [allGroupedAssets, setAllGroupedAssets] = useState<
    Array<{
      id: string;
      name: string;
      variantCount: number;
      allVariants: string[];
    }>
  >([]);

  // Reset render count when assets change (new search, pagination, etc.)
  useEffect(() => {
    setRenderCount(12);
  }, [assets, currentPage]);

  // Helper to get winning pack for an asset - wrapped to use store state
  const getWinningPackForAsset = useCallback(
    (assetId: string): string | undefined => {
      return getWinningPack(
        assetId,
        winners,
        providersByAsset,
        packOrder,
        disabledSet,
      );
    },
    [winners, providersByAsset, packOrder, disabledSet],
  );

  // OPTIMIZATION: Group assets by variant using Web Worker to avoid blocking main thread
  // This runs in a background thread and saves ~30-50ms per operation
  useEffect(() => {
    let mounted = true;

    const groupAssets = async () => {
      const assetIds = assets.map((a) => a.id);

      // Use Web Worker for CPU-intensive grouping
      const groups = await assetGroupingWorker.groupAssets(assetIds);

      if (!mounted) return;

      // Debug logging for grass_block
      const grassBlockGroups = groups.filter((g) =>
        g.baseId.includes("grass_block"),
      );
      if (grassBlockGroups.length > 0) {
        console.log(
          "[AssetResults] Grass block groups BEFORE pack filtering:",
          grassBlockGroups,
        );
      }

      // Filter each group to only include variants from the same winning pack
      const packFilteredGroups = groups.map((group) => {
        // Get the winning pack for the base asset
        const baseWinningPack = getWinningPackForAsset(group.variantIds[0]);

        // Filter variants to only those with the same winning pack
        const filteredVariants = group.variantIds.filter((variantId) => {
          return getWinningPackForAsset(variantId) === baseWinningPack;
        });

        return {
          ...group,
          variantIds: filteredVariants,
        };
      });

      // Debug logging for grass_block after filtering
      const grassBlockFiltered = packFilteredGroups.filter((g) =>
        g.baseId.includes("grass_block"),
      );
      if (grassBlockFiltered.length > 0) {
        console.log(
          "[AssetResults] Grass block groups AFTER pack filtering:",
          grassBlockFiltered,
        );
      }

      // Return only the base asset from each group
      // Prefer inventory variant as display icon since that's what players recognize
      const displayAssets = packFilteredGroups.map((group) => {
        // Find inventory variant to use as primary display, fall back to first variant
        const inventoryVariant = group.variantIds.find((id) =>
          isInventoryVariant(id),
        );
        let primaryId = inventoryVariant || group.variantIds[0];

        // Prefer the full banner texture for the banner family card icon.
        if (group.baseId === "entity/banner") {
          const full = group.variantIds.find((id) => id.endsWith(":entity/banner_base"));
          if (full) primaryId = full;
        }

        // Prefer the base pot texture for the decorated pot family card icon.
        if (group.baseId === "entity/decorated_pot") {
          const base = group.variantIds.find((id) =>
            id.endsWith(":entity/decorated_pot/decorated_pot_base"),
          );
          if (base) primaryId = base;
        }

        // Count only numbered texture variants (e.g., acacia_planks1, acacia_planks2)
        // Block states (_on, _off) and faces (_top, _side) should NOT be counted as variants
        const numberedVariants = group.variantIds.filter(isNumberedVariant);

        return {
          id: primaryId,
          name: group.displayName,
          variantCount: numberedVariants.length,
          allVariants: group.variantIds,
        };
      });

      // Store ALL grouped assets (before pagination)
      setAllGroupedAssets(displayAssets);
    };

    groupAssets();

    return () => {
      mounted = false;
    };
  }, [assets, getWinningPackForAsset]);

  // Paginate AFTER grouping and pack filtering
  const { groupedAssets, totalPages, hasNextPage, hasPrevPage } =
    useMemo(() => {
      const totalCards = allGroupedAssets.length;
      const totalPages = Math.ceil(totalCards / itemsPerPage);
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;

      const paginatedGroups = allGroupedAssets.slice(startIndex, endIndex);

      return {
        groupedAssets: paginatedGroups,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
      };
    }, [allGroupedAssets, currentPage, itemsPerPage]);

  // Progressively render more cards using requestIdleCallback for non-blocking updates
  useEffect(() => {
    if (renderCount >= groupedAssets.length) {
      return; // All cards rendered
    }

    // Use requestIdleCallback to render next batch during browser idle time
    const idleCallback =
      window.requestIdleCallback || ((cb) => setTimeout(cb, 16));
    const handle = idleCallback(() => {
      setRenderCount((prev) => Math.min(prev + renderBatchSize, groupedAssets.length));
    });

    return () => {
      if (window.cancelIdleCallback) {
        window.cancelIdleCallback(handle);
      } else {
        clearTimeout(handle as unknown as number);
      }
    };
  }, [renderCount, groupedAssets.length, renderBatchSize]);

  // Report pagination state to parent component
  useEffect(() => {
    if (onPaginationChange) {
      onPaginationChange({ totalPages, hasNextPage, hasPrevPage });
    }
  }, [totalPages, hasNextPage, hasPrevPage, onPaginationChange]);

  // Create a stable callback that can be reused
  const handleSelectAsset = useCallback(
    (assetId: string) => {
      onSelect(assetId);
    },
    [onSelect],
  );

  // Calculate display range for current page
  const displayRange = useMemo(() => {
    if (allGroupedAssets.length === 0) return { start: 0, end: 0 };
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(
      start + groupedAssets.length - 1,
      allGroupedAssets.length,
    );
    return { start, end };
  }, [
    currentPage,
    itemsPerPage,
    groupedAssets.length,
    allGroupedAssets.length,
  ]);

  console.log(
    "[AssetResults] Rendering page",
    currentPage,
    "with",
    groupedAssets.length,
    "cards | Total cards:",
    allGroupedAssets.length,
  );

  if (assets.length === 0) {
    return (
      <div className={s.root}>
        <div className={s.emptyState}>
          No assets found. Try searching for a block or texture.
        </div>
      </div>
    );
  }

  if (groupedAssets.length === 0) {
    return (
      <div className={s.root}>
        <div className={s.emptyState}>Loading assets...</div>
      </div>
    );
  }

  // Only render the first `renderCount` cards for progressive loading
  const visibleGroupedAssets = groupedAssets.slice(0, renderCount);
  const hasMoreToRender = renderCount < groupedAssets.length;

  return (
    <div className={s.root} ref={containerRef}>
      <SharedEntityThumbnailsCanvas />

      <div className={s.paginationInfo}>
        Showing {displayRange.start}–{displayRange.end} of{" "}
        {allGroupedAssets.length} resource cards
      </div>
      <div className={s.results}>
        {visibleGroupedAssets.map((group, index) => (
          <AssetCard
            key={group.id}
            asset={{ id: group.id, name: group.name }}
            isSelected={
              selectedId === group.id ||
              group.allVariants.includes(selectedId || "")
            }
            onSelect={() => handleSelectAsset(group.id)}
            staggerIndex={index}
            variantCount={group.variantCount}
          />
        ))}
        {hasMoreToRender && (
          <div className={s.loadingMore} key="loading-more">
            Loading more cards...
          </div>
        )}
      </div>
    </div>
  );
}
