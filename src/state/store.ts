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
  disablePack: (packId: PackId, targetIndex?: number) => void;
  enablePack: (packId: PackId, targetIndex?: number) => void;
  setDisabledPackOrder: (order: PackId[]) => void;

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

  // Reset
  reset: () => void;
}

type WeaverbirdStore = AppState & StoreActions;

const initialState: AppState = {
  // Entities
  packs: {},
  packOrder: [],
  disabledPackIds: [],
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
};

export const useStore = create<WeaverbirdStore>()(
  immer((set) => ({
    ...initialState,

    // Pack management
    setPackOrder: (order: PackId[]) => {
      set((state) => {
        const disabledSet = new Set(state.disabledPackIds);
        const seen = new Set<string>();
        state.packOrder = order.filter((id) => {
          if (disabledSet.has(id) || seen.has(id)) {
            return false;
          }
          seen.add(id);
          return true;
        });
      });
    },

    ingestPacks: (packs: PackMeta[]) => {
      set((state) => {
        for (const pack of packs) {
          state.packs[pack.id] = pack;
        }
      });
    },

    disablePack: (packId: PackId, targetIndex?: number) => {
      set((state) => {
        const currentIndex = state.packOrder.indexOf(packId);
        if (currentIndex === -1) {
          return;
        }

        state.packOrder.splice(currentIndex, 1);

        const existingDisabledIndex = state.disabledPackIds.indexOf(packId);
        if (existingDisabledIndex !== -1) {
          state.disabledPackIds.splice(existingDisabledIndex, 1);
        }

        const maxIndex = state.disabledPackIds.length;
        const insertAt =
          targetIndex === undefined
            ? maxIndex
            : Math.min(Math.max(targetIndex, 0), maxIndex);

        state.disabledPackIds.splice(insertAt, 0, packId);
      });
    },

    enablePack: (packId: PackId, targetIndex?: number) => {
      set((state) => {
        const disabledIndex = state.disabledPackIds.indexOf(packId);
        if (disabledIndex === -1) {
          return;
        }

        state.disabledPackIds.splice(disabledIndex, 1);

        const maxIndex = state.packOrder.length;
        const insertAt =
          targetIndex === undefined
            ? maxIndex
            : Math.min(Math.max(targetIndex, 0), maxIndex);

        state.packOrder.splice(insertAt, 0, packId);
      });
    },

    setDisabledPackOrder: (order: PackId[]) => {
      set((state) => {
        const disabledSet = new Set(state.disabledPackIds);
        const seen = new Set<string>();
        const filtered = order.filter((id) => {
          if (!disabledSet.has(id) || seen.has(id)) {
            return false;
          }
          seen.add(id);
          return true;
        });
        const remainder = state.disabledPackIds.filter((id) => !seen.has(id));
        state.disabledPackIds = [...filtered, ...remainder];
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

    reset: () => {
      set(initialState);
    },
  })),
);

export type { WeaverbirdStore };
