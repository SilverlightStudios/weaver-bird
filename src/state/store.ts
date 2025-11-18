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

    reset: () => {
      set(initialState);
    },
  })),
);

export type { WeaverbirdStore };
