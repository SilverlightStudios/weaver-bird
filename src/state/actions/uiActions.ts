/**
 * UI state actions for Zustand store
 */
import type { StateCreator } from "zustand";
import type { AppState, AssetId } from "../types";
import type { StoreActions } from "../storeActions";

type WeaverbirdStore = AppState & StoreActions;
type SetFn = Parameters<StateCreator<WeaverbirdStore, [["zustand/immer", never]], []>>[0];

export const createUIActions = (set: SetFn) => ({
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

  setGrassColormapPackId: (packId: string | undefined) => {
    set((state) => {
      state.grassColormapPackId = packId;
    });
  },

  setFoliageColormapUrl: (url: string | undefined) => {
    set((state) => {
      state.foliageColormapUrl = url;
    });
  },

  setFoliageColormapPackId: (packId: string | undefined) => {
    set((state) => {
      state.foliageColormapPackId = packId;
    });
  },

  setSelectedGrassColor: (
    color: { r: number; g: number; b: number } | undefined,
  ) => {
    console.log("[Store] setSelectedGrassColor called with:", color);
    set((state) => {
      state.selectedGrassColor = color;
    });
  },

  setShowPot: (show: boolean) => {
    set((state) => {
      state.showPot = show;
    });
  },

  setSignText: (text: string[]) => {
    set((state) => {
      state.signText = text;
    });
  },

  setJemDebugMode: (enabled: boolean) => {
    set((state) => {
      state.jemDebugMode = enabled;
    });
  },
});
