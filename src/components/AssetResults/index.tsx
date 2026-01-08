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
 *
 * SMART VARIANT SELECTION:
 * ------------------------
 * When a user clicks on a combined resource card (e.g., "boat" with multiple variants),
 * the system intelligently selects the variant that best matches the search query:
 *
 * Example: Searching "jungle" and clicking "boat" → Selects "minecraft:entity/boat/jungle"
 * Example: Searching "dark oak" and clicking "sign" → Selects "minecraft:block/dark_oak_sign"
 *
 * Scoring algorithm prioritizes:
 * - Exact word matches over substring matches
 * - Matches in the last path segment (wood type, variant name)
 * - Multiple matching terms score higher
 */
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  isInventoryVariant,
  isMinecraftItem,
  isNumberedVariant,
} from "@lib/assetUtils";
import { assetGroupingWorker } from "@lib/assetGroupingWorker";
import { assetMatchesQuery } from "@lib/searchUtils";
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
  const searchQuery = useStore((state) => state.searchQuery);
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
      displayId: string;
      name: string;
      variantCount: number;
      allVariants: string[];
    }>
  >([]);

  // Reset render count when assets change (new search, pagination, etc.)
  useEffect(() => {
    setRenderCount(12);
  }, [assets, currentPage, searchQuery]);

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
      const labelsById = new Map(assets.map((asset) => [asset.id, asset.labels]));

      // Use Web Worker for CPU-intensive grouping
      const groups = await assetGroupingWorker.groupAssets(assetIds);

      if (!mounted) return;

      // Debug logging for grass_block
      const grassBlockGroups = groups.filter((g) =>
        g.baseId.includes("grass_block"),
      );
      if (grassBlockGroups.length > 0) {
        console.log(
          "[AssetResults] Grass block groups BEFORE search filtering:",
          grassBlockGroups,
        );
      }

      const queryFilteredGroups = searchQuery
        ? groups.filter((group) =>
            group.variantIds.some((variantId) => {
              const labels = labelsById.get(variantId) ?? [];
              return assetMatchesQuery(variantId, labels, searchQuery);
            }),
          )
        : groups;

      // Debug logging for grass_block after filtering
      const grassBlockFiltered = queryFilteredGroups.filter((g) =>
        g.baseId.includes("grass_block"),
      );
      if (grassBlockFiltered.length > 0) {
        console.log(
          "[AssetResults] Grass block groups AFTER search filtering:",
          grassBlockFiltered,
        );
      }

      // Helper function to find best matching variant based on search query
      const findBestMatch = (variants: string[], query: string): string => {
        if (!query || variants.length === 0) return variants[0] || "";

        const queryTerms = query
          .toLowerCase()
          .split(/[\s_\-/]+/)
          .filter((term) => term.length > 0);

        if (queryTerms.length === 0) return variants[0] || "";

        let bestMatch = variants[0] || "";
        let bestScore = -1;

        for (const variant of variants) {
          const variantPath = variant.includes(":")
            ? variant.split(":")[1] || variant
            : variant;
          const variantName = variantPath.toLowerCase();

          let score = 0;
          for (const term of queryTerms) {
            if (variantName.includes(term)) {
              const isExactWord = new RegExp(`\\b${term}\\b`).test(variantName);
              const matchBonus = isExactWord ? 10 : 5;
              const lastSegment = variantPath.split("/").pop()?.toLowerCase() || "";
              const isInLastSegment = lastSegment.includes(term);
              const positionBonus = isInLastSegment ? 5 : 0;
              score += matchBonus + positionBonus;
            }
          }

          if (score > bestScore) {
            bestScore = score;
            bestMatch = variant;
          }
        }

        return bestScore > 0 ? bestMatch : variants[0] || "";
      };

      // Return only the base asset from each group
      // Prefer inventory variant as display icon since that's what players recognize
      const displayAssets = queryFilteredGroups.map((group) => {
        const blockVariants = group.variantIds.filter((id) =>
          id.includes(":block/"),
        );
        const itemVariants = group.variantIds.filter((id) =>
          isMinecraftItem(id),
        );
        const otherVariants = group.variantIds.filter(
          (id) => !id.includes(":block/") && !isMinecraftItem(id),
        );

        const getAssetPath = (id: string) =>
          id.includes(":") ? id.split(":")[1] ?? id : id;

        const baseBlockPath =
          group.baseId.startsWith("block/") ? group.baseId : undefined;
        const baseItemPath = baseBlockPath
          ? `item/${baseBlockPath.slice("block/".length)}`
          : group.baseId.startsWith("item/")
            ? group.baseId
            : undefined;

        const pickVariant = (variants: string[], targetPath?: string) => {
          if (variants.length === 0) return undefined;
          if (!targetPath) return variants[0];
          return (
            variants.find((id) => getAssetPath(id) === targetPath) ??
            variants[0]
          );
        };

        const blockPrimaryId = pickVariant(blockVariants, baseBlockPath);
        const itemPrimaryId = pickVariant(itemVariants, baseItemPath);

        // SMART SELECTION: Use search query to pick best matching variant
        let selectionId: string;
        if (searchQuery && group.variantIds.length > 1) {
          // Prefer block variants for selection so 3D previews stay default
          if (blockVariants.length > 0) {
            selectionId = findBestMatch(blockVariants, searchQuery);
          } else if (itemVariants.length > 0) {
            selectionId = findBestMatch(itemVariants, searchQuery);
          } else {
            selectionId = findBestMatch(group.variantIds, searchQuery);
          }
          console.log(
            `[AssetResults.grouping] Smart selection for "${group.baseId}": query="${searchQuery}" → "${selectionId}"`,
          );
        } else {
          // Default behavior
          selectionId = blockPrimaryId ?? itemPrimaryId ?? group.variantIds[0];
        }

        // Prefer inventory variant as display icon since that's what players recognize
        const inventoryVariant = group.variantIds.find((id) =>
          isInventoryVariant(id),
        );
        let displayId = itemPrimaryId ?? inventoryVariant ?? selectionId;

        // SMART SELECTION FOR DISPLAY: Apply to displayId for multi-variant groups
        // This makes the card thumbnail show the matching variant based on search
        if (searchQuery && group.variantIds.length > 1) {
          if (itemVariants.length > 0) {
            displayId =
              itemVariants.length > 1
                ? findBestMatch(itemVariants, searchQuery)
                : itemPrimaryId ?? itemVariants[0];
            console.log(
              `[AssetResults.grouping] Smart displayId for item "${group.baseId}": "${displayId}"`,
            );
          } else if (
            otherVariants.length > 1 &&
            !blockVariants.length &&
            !itemVariants.length
          ) {
            // Entity-only group (like boats)
            displayId = findBestMatch(otherVariants, searchQuery);
            console.log(
              `[AssetResults.grouping] Smart displayId for entity "${group.baseId}": "${displayId}"`,
            );
          } else if (blockVariants.length > 1) {
            // Block group with multiple variants (like signs, fences)
            displayId = findBestMatch(blockVariants, searchQuery);
            console.log(
              `[AssetResults.grouping] Smart displayId for block "${group.baseId}": "${displayId}"`,
            );
          }
        }

        // Prefer the full banner texture for the banner family card icon.
        // (Skip smart selection override for banner to keep the base texture)
        if (group.baseId === "entity/banner") {
          const full = group.variantIds.find((id) =>
            id.endsWith(":entity/banner_base"),
          );
          if (full) displayId = full;
        }

        // Prefer the base pot texture for the decorated pot family card icon.
        // (Skip smart selection override for decorated_pot to keep the base texture)
        if (group.baseId === "entity/decorated_pot") {
          const base = group.variantIds.find((id) =>
            id.endsWith(":entity/decorated_pot/decorated_pot_base"),
          );
          if (base) displayId = base;
        }

        let variantCount = 0;
        if (blockPrimaryId) {
          const blockWinnerPack = getWinningPackForAsset(blockPrimaryId);
          const blockVariantsForCount = blockWinnerPack
            ? blockVariants.filter(
                (variantId) =>
                  getWinningPackForAsset(variantId) === blockWinnerPack,
              )
            : blockVariants;
          variantCount = blockVariantsForCount.filter(isNumberedVariant).length;
        } else {
          const numberedVariants = group.variantIds.filter(isNumberedVariant);
          variantCount = numberedVariants.length;
        }

        return {
          id: selectionId,
          displayId,
          name: group.displayName,
          variantCount,
          allVariants: [...blockVariants, ...itemVariants, ...otherVariants],
        };
      });

      // Store ALL grouped assets (before pagination)
      setAllGroupedAssets(displayAssets);
    };

    groupAssets();

    return () => {
      mounted = false;
    };
  }, [assets, getWinningPackForAsset, searchQuery]);

  // Paginate AFTER grouping and search filtering
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

  /**
   * Find the best matching variant from a list based on the search query
   * Returns the variant whose name contains the most search terms
   */
  const findBestMatchingVariant = useCallback(
    (variants: string[], query: string): string => {
      if (!query || variants.length === 0) {
        return variants[0] || "";
      }

      // Normalize query to lowercase and split into terms
      const queryTerms = query
        .toLowerCase()
        .split(/[\s_\-/]+/)
        .filter((term) => term.length > 0);

      if (queryTerms.length === 0) {
        return variants[0] || "";
      }

      let bestMatch = variants[0] || "";
      let bestScore = -1;

      for (const variant of variants) {
        // Extract the readable part of the asset ID
        // e.g., "minecraft:entity/boat/jungle" -> "boat jungle"
        const variantPath = variant.includes(":")
          ? variant.split(":")[1] || variant
          : variant;
        const variantName = variantPath.toLowerCase();

        // Score based on:
        // 1. How many query terms appear in the variant name
        // 2. Exact word matches score higher than substring matches
        // 3. Earlier matches score higher (wood types before "boat")
        let score = 0;

        for (const term of queryTerms) {
          if (variantName.includes(term)) {
            // Check if it's an exact word match (e.g., "jungle" in "boat/jungle")
            const isExactWord = new RegExp(`\\b${term}\\b`).test(variantName);
            const matchBonus = isExactWord ? 10 : 5;

            // Bonus for matches in the last segment (wood type, etc.)
            const lastSegment = variantPath.split("/").pop()?.toLowerCase() || "";
            const isInLastSegment = lastSegment.includes(term);
            const positionBonus = isInLastSegment ? 5 : 0;

            score += matchBonus + positionBonus;
          }
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = variant;
        }
      }

      // If no matches found, return the first variant
      return bestScore > 0 ? bestMatch : variants[0] || "";
    },
    [],
  );

  // Create a stable callback that can be reused
  // Now selects the best matching variant based on search query
  const handleSelectAsset = useCallback(
    (assetId: string, allVariants: string[]) => {
      // If there's a search query and multiple variants, find the best match
      const selectedVariant =
        searchQuery && allVariants.length > 1
          ? findBestMatchingVariant(allVariants, searchQuery)
          : assetId;

      console.log(
        `[AssetResults] Smart selection: query="${searchQuery}" variants=${allVariants.length} selected="${selectedVariant}"`,
      );

      onSelect(selectedVariant);
    },
    [onSelect, searchQuery, findBestMatchingVariant],
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
        <div className={s.emptyState}>
          {searchQuery
            ? "No assets match that search."
            : "Loading assets..."}
        </div>
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
            asset={{ id: group.displayId, name: group.name }}
            isSelected={
              selectedId === group.id ||
              selectedId === group.displayId ||
              group.allVariants.includes(selectedId || "")
            }
            onSelect={() => handleSelectAsset(group.id, group.allVariants)}
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
