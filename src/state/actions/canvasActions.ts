/**
 * Canvas settings actions for Zustand store
 */
import type { StateCreator } from "zustand";
import type { AppState } from "../types";
import type { StoreActions } from "../storeActions";

type WeaverbirdStore = AppState & StoreActions;
type SetFn = Parameters<StateCreator<WeaverbirdStore, [["zustand/immer", never]], []>>[0];

export const createCanvasActions = (set: SetFn) => ({
  setCanvasRenderMode: (mode: AppState["canvasRenderMode"]) => {
    set((state) => {
      state.canvasRenderMode = mode;
    });
  },

  setCanvas3DShowGrid: (show: boolean) => {
    set((state) => {
      state.canvas3DShowGrid = show;
    });
  },

  setCanvas2DShowPixelGrid: (show: boolean) => {
    set((state) => {
      state.canvas2DShowPixelGrid = show;
    });
  },

  setCanvas2DShowUVWrap: (show: boolean) => {
    set((state) => {
      state.canvas2DShowUVWrap = show;
    });
  },

  setCanvas2DTextureSource: (source: AppState["canvas2DTextureSource"]) => {
    set((state) => {
      state.canvas2DTextureSource = source;
    });
  },

  setCanvasItemShowGrid: (show: boolean) => {
    set((state) => {
      state.canvasItemShowGrid = show;
    });
  },

  setCanvasItemRotate: (rotate: boolean) => {
    set((state) => {
      state.canvasItemRotate = rotate;
    });
  },

  setCanvasItemHover: (hover: boolean) => {
    set((state) => {
      state.canvasItemHover = hover;
    });
  },

  setCanvasItemAnimate: (animate: boolean) => {
    set((state) => {
      state.canvasItemAnimate = animate;
    });
  },

  setCanvasItemAnimationFrame: (frame: number) => {
    set((state) => {
      state.canvasItemAnimationFrame = frame;
    });
  },

  setCanvasItemAnimationFrameCount: (count: number) => {
    set((state) => {
      state.canvasItemAnimationFrameCount = count;
    });
  },
});
