/**
 * Asset management actions for Zustand store
 */
import type { StateCreator } from "zustand";
import type { AppState, PackId, AssetId, AssetRecord } from "../types";
import type { StoreActions } from "../storeActions";

type WeaverbirdStore = AppState & StoreActions;
type SetFn = Parameters<StateCreator<WeaverbirdStore, [["zustand/immer", never]], []>>[0];

export const createAssetActions = (set: SetFn) => ({
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

  ingestAllProviders: (providers: Record<AssetId, PackId[]>) => {
    set((state) => {
      state.providersByAsset = providers;
    });
  },

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
});
