/**
 * Memoized selectors for Weaverbird state
 * These are performance-critical for preventing unnecessary renders
 */

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "./store";
import { AssetId, PackId, OverrideEntry, OverrideWirePayload } from "./types";
import { assetMatchesQuery } from "@lib/searchUtils";
import { shouldExcludeAsset } from "@lib/assetUtils";
import { isEntityFeatureLayerTextureAssetId } from "@lib/entityComposite";

/**
 * Get providers for an asset, sorted by current pack order
 */
export const useSelectProvidersSorted = (assetId: AssetId) => {
  const providersByAsset = useStore((state) => state.providersByAsset);
  const packOrder = useStore((state) => state.packOrder);
  const disabledPackIds = useStore((state) => state.disabledPackIds);

  return useMemo(() => {
    const disabledSet = new Set(disabledPackIds);
    const providers = providersByAsset[assetId] ?? [];
    const filtered = providers.filter((id) => !disabledSet.has(id));
    const sorted = [...filtered].sort(
      (a, b) => packOrder.indexOf(a) - packOrder.indexOf(b),
    );
    return sorted;
  }, [assetId, providersByAsset, packOrder, disabledPackIds]);
};

/**
 * Get the winning pack for an asset (respects overrides)
 */
export const useSelectWinner = (assetId: AssetId) => {
  const overrides = useStore((state) => state.overrides);
  const providersByAsset = useStore((state) => state.providersByAsset);
  const packOrder = useStore((state) => state.packOrder);
  const disabledPackIds = useStore((state) => state.disabledPackIds);

  return useMemo(() => {
    const disabledSet = new Set(disabledPackIds);
    // Check if asset is penciled to a specific pack
    const override = overrides[assetId];
    if (override && !disabledSet.has(override.packId)) {
      return override.packId;
    }

    // Otherwise, get first provider in pack order
    const providers = (providersByAsset[assetId] ?? []).filter(
      (id) => !disabledSet.has(id),
    );
    if (providers.length === 0) return undefined;

    const sorted = [...providers].sort(
      (a, b) => packOrder.indexOf(a) - packOrder.indexOf(b),
    );
    return sorted[0];
  }, [assetId, overrides, providersByAsset, packOrder, disabledPackIds]);
};

/**
 * Check if an asset has been penciled
 */
export const useSelectIsPenciled = (assetId: AssetId) => {
  const overrides = useStore((state) => state.overrides);

  return useMemo(() => {
    return overrides[assetId] !== undefined;
  }, [assetId, overrides]);
};

/**
 * Get the pack for a given ID
 */
export const useSelectPack = (packId: PackId) => {
  const packs = useStore((state) => state.packs);

  return useMemo(() => {
    return packs[packId];
  }, [packId, packs]);
};

/**
 * Get all packs in order
 */
export const useSelectPacksInOrder = () => {
  const packs = useStore((state) => state.packs);
  const packOrder = useStore((state) => state.packOrder);

  return useMemo(() => {
    return packOrder.map((id) => packs[id]).filter(Boolean);
  }, [packs, packOrder]);
};

/**
 * Get disabled packs in their disabled order
 */
export const useSelectDisabledPacks = () => {
  const packs = useStore((state) => state.packs);
  const disabledPackIds = useStore((state) => state.disabledPackIds);

  return useMemo(() => {
    return disabledPackIds.map((id) => packs[id]).filter(Boolean);
  }, [packs, disabledPackIds]);
};

/**
 * Get asset by ID
 */
export const useSelectAsset = (assetId?: AssetId) => {
  const assets = useStore((state) => state.assets);

  return useMemo(() => {
    return assetId ? assets[assetId] : undefined;
  }, [assetId, assets]);
};

/**
 * Get filtered assets based on search query
 * Uses fuzzy matching that supports space-to-underscore conversion
 */
export const useSelectFilteredAssets = () => {
  const assets = useStore((state) => state.assets);
  const searchQuery = useStore((state) => state.searchQuery);

  return useMemo(() => {
    if (!searchQuery) {
      return Object.values(assets);
    }

    return Object.values(assets).filter((asset) =>
      assetMatchesQuery(asset.id, asset.labels, searchQuery),
    );
  }, [assets, searchQuery]);
};

/**
 * Get filtered assets based on search query (NO PAGINATION)
 * Pagination now happens in AssetResults component after grouping/filtering
 * Uses fuzzy matching that supports space-to-underscore conversion
 */
export const useSelectPaginatedAssets = () => {
  const assets = useStore((state) => state.assets);
  const searchQuery = useStore((state) => state.searchQuery);

  return useMemo(() => {
    // Filter assets by search query and exclude unwanted assets
    let filteredAssets = Object.values(assets).filter(
      (asset) =>
        !shouldExcludeAsset(asset.id) &&
        !isEntityFeatureLayerTextureAssetId(asset.id),
    );

    if (searchQuery) {
      filteredAssets = filteredAssets.filter((asset) =>
        assetMatchesQuery(asset.id, asset.labels, searchQuery),
      );
    }

    // Return all filtered assets - pagination happens after grouping
    return {
      assets: filteredAssets,
    };
  }, [assets, searchQuery]);
};

/**
 * Get all assets (unfiltered)
 */
export const useSelectAllAssets = () => {
  const assets = useStore((state) => state.assets);

  return useMemo(() => {
    return Object.values(assets);
  }, [assets]);
};

/**
 * Get UI state (selected asset, search, progress, etc.)
 * Uses shallow equality to prevent unnecessary re-renders
 */
export const useSelectUIState = () => {
  return useStore(
    useShallow((state) => ({
      selectedAssetId: state.selectedAssetId,
      searchQuery: state.searchQuery,
      progress: state.progress,
      outputDir: state.outputDir,
      packFormat: state.packFormat,
    })),
  );
};

/**
 * Get pack order (stable reference with useMemo)
 */
export const useSelectPackOrder = () => {
  return useStore((state) => state.packOrder);
};

/**
 * Get disabled pack IDs
 */
export const useSelectDisabledPackIds = () => {
  return useStore((state) => state.disabledPackIds);
};

/**
 * Get all action methods individually (avoid destructuring object references)
 */
export const useSelectSetSearchQuery = () =>
  useStore((state) => state.setSearchQuery);
export const useSelectSetSelectedAsset = () =>
  useStore((state) => state.setSelectedAsset);
export const useSelectSetPackOrder = () =>
  useStore((state) => state.setPackOrder);
export const useSelectSetDisabledPackOrder = () =>
  useStore((state) => state.setDisabledPackOrder);
export const useSelectSetOverride = () =>
  useStore((state) => state.setOverride);
export const useSelectSetOutputDir = () =>
  useStore((state) => state.setOutputDir);
export const useSelectSetPackFormat = () =>
  useStore((state) => state.setPackFormat);
export const useSelectIngestPacks = () =>
  useStore((state) => state.ingestPacks);
export const useSelectSetPackFormats = () =>
  useStore((state) => state.setPackFormats);
export const useSelectDisablePack = () =>
  useStore((state) => state.disablePack);
export const useSelectEnablePack = () => useStore((state) => state.enablePack);
export const useSelectIngestAssets = () =>
  useStore((state) => state.ingestAssets);
export const useSelectIngestProviders = () =>
  useStore((state) => state.ingestProviders);
export const useSelectIngestAllProviders = () =>
  useStore((state) => state.ingestAllProviders);
export const useSelectSetCurrentPage = () =>
  useStore((state) => state.setCurrentPage);
export const useSelectSetItemsPerPage = () =>
  useStore((state) => state.setItemsPerPage);

/**
 * Get overrides as a simple record (packId -> packId mapping)
 */
export const useSelectOverridesRecord = () => {
  const overrides = useStore((state) => state.overrides);

  return useMemo<Record<string, OverrideWirePayload>>(() => {
    return Object.fromEntries(
      Object.entries(overrides)
        .filter(
          (entry): entry is [string, OverrideEntry] => entry[1] !== undefined,
        )
        .map(([assetId, entry]) => [
          assetId,
          {
            packId: entry.packId,
            ...(entry.variantPath ? { variantPath: entry.variantPath } : {}),
          },
        ]),
    );
  }, [overrides]);
};

export const useSelectOverrideVariantPath = (assetId: AssetId) => {
  const overrides = useStore((state) => state.overrides);

  return useMemo(() => {
    return overrides[assetId]?.variantPath;
  }, [assetId, overrides]);
};

/**
 * Get the currently selected asset
 */
export const useSelectSelectedAsset = () => {
  const selectedId = useStore((state) => state.selectedAssetId);
  return useSelectAsset(selectedId);
};

/**
 * Get providers for selected asset with winner information
 */
export const useSelectProvidersWithWinner = (assetId?: AssetId) => {
  // Subscribe to all required state slices
  const packs = useStore((state) => state.packs);
  const overrides = useStore((state) => state.overrides);
  const providersByAsset = useStore((state) => state.providersByAsset);
  const packOrder = useStore((state) => state.packOrder);
  const disabledPackIds = useStore((state) => state.disabledPackIds);

  return useMemo(() => {
    if (!assetId) return [];

    const disabledSet = new Set(disabledPackIds);
    // Get sorted providers for this asset
    const providers = (providersByAsset[assetId] ?? []).filter(
      (id) => !disabledSet.has(id),
    );
    const sortedProviders = [...providers].sort(
      (a, b) => packOrder.indexOf(a) - packOrder.indexOf(b),
    );

    // Get winner and pencil status
    const override = overrides[assetId];
    const penciledPackId =
      override && !disabledSet.has(override.packId)
        ? override.packId
        : undefined;
    const winner = penciledPackId || sortedProviders[0];
    const isPenciled = override !== undefined;

    return sortedProviders.map((packId) => ({
      packId,
      packName: packs[packId]?.name ?? packId,
      isWinner: packId === winner,
      isPenciled,
    }));
  }, [assetId, packs, overrides, providersByAsset, packOrder, disabledPackIds]);
};

/**
 * Launcher selectors
 */
export const useSelectSelectedLauncher = () => {
  return useStore((state) => state.selectedLauncher);
};

export const useSelectAvailableLaunchers = () => {
  return useStore((state) => state.availableLaunchers);
};

export const useSelectSetSelectedLauncher = () => {
  return useStore((state) => state.setSelectedLauncher);
};

export const useSelectSetAvailableLaunchers = () => {
  return useStore((state) => state.setAvailableLaunchers);
};

/**
 * Get the packs directory path
 */
export const useSelectPacksDir = () => {
  return useStore((state) => state.packsDir);
};
