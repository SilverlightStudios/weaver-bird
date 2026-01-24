/**
 * Zustand store action implementations
 * Combines all action creators by concern
 */
import type { StateCreator } from "zustand";
import type { AppState } from "./types";
import type { StoreActions } from "./storeActions";
import { initialState } from "./initialState";
import { createPackActions } from "./actions/packActions";
import { createAssetActions } from "./actions/assetActions";
import { createUIActions } from "./actions/uiActions";
import { createCanvasActions } from "./actions/canvasActions";
import { createEntityActions } from "./actions/entityActions";
import { createParticleActions } from "./actions/particleActions";

type WeaverbirdStore = AppState & StoreActions;

/**
 * Creates all store action implementations by combining action creators
 * @param set - Zustand set function from immer middleware
 */
export const createStoreActions = (
  set: Parameters<StateCreator<WeaverbirdStore, [["zustand/immer", never]], []>>[0],
): StoreActions => ({
  ...createPackActions(set),
  ...createAssetActions(set),
  ...createUIActions(set),
  ...createCanvasActions(set),
  ...createEntityActions(set),
  ...createParticleActions(set),
  reset: () => {
    set(initialState);
  },
});
