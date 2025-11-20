/**
 * Zustand store for Weaverbird application state
 * Uses immer for immutable updates and normalized entity structure
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { AppState, PackId, AssetId, PackMeta, AssetRecord } from "./types";

interface StoreActions {
  // Pack management
  setPackOrder: (order: PackId[]) => void;
  ingestPacks: (packs: PackMeta[]) => void;

  // Asset management
  ingestAssets: (assets: AssetRecord[]) => void;
  ingestProviders: (assetId: AssetId, providerIds: PackId[]) => void;
  ingestAllProviders: (providers: Record<AssetId, PackId[]>) => void;

  // Overrides (pencil functionality)
  setOverride: (
    assetId: AssetId,
    packId: PackId | undefined,
    options?: { variantPath?: string },
  ) => void;

  // UI state
  setOutputDir: (path: string) => void;
  setPackFormat: (format: number) => void;
  setSearchQuery: (query: string) => void;
  setSelectedAsset: (id: AssetId | undefined) => void;
  setProgress: (progress: AppState["progress"]) => void;
  setPacksDir: (path: string) => void;

  // Launcher management
  setSelectedLauncher: (launcher: AppState["selectedLauncher"]) => void;
  setAvailableLaunchers: (launchers: AppState["availableLaunchers"]) => void;

  // Pagination
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (itemsPerPage: number) => void;

  // Biome selection
  setSelectedBiomeId: (biomeId: string | undefined) => void;
  setSelectedFoliageColor: (
    color: { r: number; g: number; b: number } | undefined,
  ) => void;

  // Colormap state actions - NEW centralized colormap management
  setColormapCoordinates: (
    coords: { x: number; y: number } | undefined,
  ) => void;
  setGrassColormapUrl: (url: string | undefined) => void;
  setFoliageColormapUrl: (url: string | undefined) => void;
  setSelectedGrassColor: (
    color: { r: number; g: number; b: number } | undefined,
  ) => void;

  // Colormap selection (DEPRECATED - use overrides system)
  setSelectedGrassColormapAssetId: (assetId: string | undefined) => void;
  setSelectedFoliageColormapAssetId: (assetId: string | undefined) => void;

  // Reset
  reset: () => void;
}

type WeaverbirdStore = AppState & StoreActions;

const initialState: AppState = {
  // Entities
  packs: {},
  packOrder: [],
  assets: {},
  providersByAsset: {},
  overrides: {},

  // UI
  selectedAssetId: undefined,
  searchQuery: "",
  progress: undefined,
  outputDir: undefined,
  packFormat: 48,
  packsDir: undefined,
  selectedLauncher: undefined,
  availableLaunchers: [],
  currentPage: 1,
  itemsPerPage: 50,

  // Colormap state - will be initialized by colormap manager
  colormapCoordinates: undefined, // Will be set to plains biome coords on init
  grassColormapUrl: undefined, // Will be resolved from top pack
  foliageColormapUrl: undefined, // Will be resolved from top pack
  selectedGrassColor: undefined, // Will be sampled from colormap
  selectedFoliageColor: undefined, // Will be sampled from colormap
  selectedBiomeId: "plains", // Default to plains biome

  // Legacy (DEPRECATED)
  selectedGrassColormapAssetId: undefined,
  selectedFoliageColormapAssetId: undefined,
};

export const useStore = create<WeaverbirdStore>()(
  immer((set) => ({
    ...initialState,

    // Pack management
    setPackOrder: (order: PackId[]) => {
      set((state) => {
        state.packOrder = order;
      });
    },

    ingestPacks: (packs: PackMeta[]) => {
      set((state) => {
        for (const pack of packs) {
          state.packs[pack.id] = pack;
        }
      });
    },

    // Asset management
    ingestAssets: (assets: AssetRecord[]) => {
      set((state) => {
        for (const asset of assets) {
          state.assets[asset.id] = asset;
        }
      });
    },

    ingestProviders: (assetId: AssetId, providerIds: PackId[]) => {
      set((state) => {
        state.providersByAsset[assetId] = providerIds;
      });
    },

    // Batch ingest all providers at once (performance optimization)
    ingestAllProviders: (providers: Record<AssetId, PackId[]>) => {
      set((state) => {
        state.providersByAsset = providers;
      });
    },

    // Overrides
    setOverride: (
      assetId: AssetId,
      packId: PackId | undefined,
      options?: { variantPath?: string },
    ) => {
      set((state) => {
        if (packId === undefined) {
          state.overrides[assetId] = undefined;
        } else {
          state.overrides[assetId] = {
            packId,
            penciled: true,
            variantPath: options?.variantPath,
          };
        }
      });
    },

    // UI
    setOutputDir: (path: string) => {
      set((state) => {
        state.outputDir = path;
      });
    },

    setPackFormat: (format: number) => {
      set((state) => {
        state.packFormat = format;
      });
    },

    setSearchQuery: (query: string) => {
      set((state) => {
        state.searchQuery = query;
      });
    },

    setSelectedAsset: (id: AssetId | undefined) => {
      set((state) => {
        state.selectedAssetId = id;
      });
    },

    setProgress: (progress: AppState["progress"]) => {
      set((state) => {
        state.progress = progress;
      });
    },

    setPacksDir: (path: string) => {
      set((state) => {
        state.packsDir = path;
      });
    },

    setSelectedLauncher: (launcher: AppState["selectedLauncher"]) => {
      set((state) => {
        state.selectedLauncher = launcher;
      });
    },

    setAvailableLaunchers: (launchers: AppState["availableLaunchers"]) => {
      set((state) => {
        state.availableLaunchers = launchers;
      });
    },

    setCurrentPage: (page: number) => {
      set((state) => {
        state.currentPage = page;
      });
    },

    setItemsPerPage: (itemsPerPage: number) => {
      set((state) => {
        state.itemsPerPage = itemsPerPage;
      });
    },

    setSelectedBiomeId: (biomeId: string | undefined) => {
      set((state) => {
        state.selectedBiomeId = biomeId;
      });
    },

    setSelectedFoliageColor: (
      color: { r: number; g: number; b: number } | undefined,
    ) => {
      set((state) => {
        state.selectedFoliageColor = color;
      });
    },

    // NEW Colormap state actions
    setColormapCoordinates: (coords: { x: number; y: number } | undefined) => {
      set((state) => {
        state.colormapCoordinates = coords;
      });
    },

    setGrassColormapUrl: (url: string | undefined) => {
      set((state) => {
        state.grassColormapUrl = url;
      });
    },

    setFoliageColormapUrl: (url: string | undefined) => {
      set((state) => {
        state.foliageColormapUrl = url;
      });
    },

    setSelectedGrassColor: (
      color: { r: number; g: number; b: number } | undefined,
    ) => {
      set((state) => {
        state.selectedGrassColor = color;
      });
    },

    // Legacy (DEPRECATED)
    setSelectedGrassColormapAssetId: (assetId: string | undefined) => {
      set((state) => {
        state.selectedGrassColormapAssetId = assetId;
      });
    },

    setSelectedFoliageColormapAssetId: (assetId: string | undefined) => {
      set((state) => {
        state.selectedFoliageColormapAssetId = assetId;
      });
    },

    reset: () => {
      set(initialState);
    },
  })),
);

export type { WeaverbirdStore };
