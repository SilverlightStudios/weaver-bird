/**
 * Particle settings actions for Zustand store
 */
import type { StateCreator } from "zustand";
import type { AppState } from "../types";
import type { StoreActions } from "../storeActions";

type WeaverbirdStore = AppState & StoreActions;
type SetFn = Parameters<StateCreator<WeaverbirdStore, [["zustand/immer", never]], []>>[0];

export const createParticleActions = (set: SetFn) => ({
  setShowBlockParticles: (show: boolean) => {
    set((state) => {
      state.showBlockParticles = show;
    });
  },

  setShowEmissionPoints: (show: boolean) => {
    set((state) => {
      state.showEmissionPoints = show;
    });
  },

  setParticleQuality: (quality: "low" | "medium" | "high") => {
    set((state) => {
      state.particleQuality = quality;
    });
  },

  setParticleDataReady: (ready: boolean) => {
    set((state) => {
      state.particleDataReady = ready;
    });
  },
});
