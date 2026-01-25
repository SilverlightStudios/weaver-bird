/**
 * Zustand store for Weaverbird application state
 * Uses immer for immutable updates and normalized entity structure
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { AppState } from "./types";
import type { StoreActions } from "./storeActions";
import { initialState } from "./initialState";
import { createStoreActions } from "./storeImplementations";

type WeaverbirdStore = AppState & StoreActions;

export const useStore = create<WeaverbirdStore>()(
  immer((set) => ({
    ...initialState,
    ...createStoreActions(set),
  })),
);

export type { WeaverbirdStore };
