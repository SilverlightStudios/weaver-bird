/**
 * Pack management actions for Zustand store
 */
import type { StateCreator } from "zustand";
import type { AppState, PackId, PackMeta } from "../types";
import type { StoreActions } from "../storeActions";

type WeaverbirdStore = AppState & StoreActions;
type SetFn = Parameters<StateCreator<WeaverbirdStore, [["zustand/immer", never]], []>>[0];

export const createPackActions = (set: SetFn) => ({
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

  setPackFormats: (formats: Record<string, number>) => {
    set((state) => {
      state.packFormats = formats;
    });
  },
});
