/**
 * Entity and animation actions for Zustand store
 */
import type { StateCreator } from "zustand";
import type { AppState, AssetId } from "../types";
import type { StoreActions } from "../storeActions";
import { POSE_GROUP_BY_ID } from "../initialState";
import { clampAnimationSpeed } from "@lib/emf/animation/types";

type WeaverbirdStore = AppState & StoreActions;
type SetFn = Parameters<StateCreator<WeaverbirdStore, [["zustand/immer", never]], []>>[0];

export const createEntityActions = (set: SetFn) => ({
  setEntityVariant: (variant: string | undefined) => {
    set((state) => {
      state.entityVariant = variant;
    });
  },

  setUseLegacyCEM: (use: boolean) => {
    set((state) => {
      state.useLegacyCEM = use;
    });
  },

  setTargetMinecraftVersion: (version: string | null) => {
    set((state) => {
      state.targetMinecraftVersion = version;
    });
  },

  setEntityVersionVariants: (variants: Record<string, string[]>) => {
    set((state) => {
      state.entityVersionVariants = variants;
    });
  },

  setAnimationPreset: (preset: string | null) => {
    set((state) => {
      state.animationPreset = preset;
      state.animationPlaying = preset !== null;
    });
  },

  setAnimationPlaying: (playing: boolean) => {
    set((state) => {
      state.animationPlaying = playing;
    });
  },

  setAnimationSpeed: (speed: number) => {
    set((state) => {
      state.animationSpeed = clampAnimationSpeed(speed);
    });
  },

  setEntityHeadYaw: (yaw: number) => {
    set((state) => {
      state.entityHeadYaw = ((yaw + 180) % 360) - 180;
    });
  },

  setEntityHeadPitch: (pitch: number) => {
    set((state) => {
      state.entityHeadPitch = Math.max(-90, Math.min(90, pitch));
    });
  },

  setEntitySwingDirection: (direction: number) => {
    set((state) => {
      state.entitySwingDirection = Math.max(0, Math.min(3, Math.floor(direction)));
    });
  },

  setAvailableAnimationPresets: (presets: string[] | null) => {
    set((state) => {
      state.availableAnimationPresets = presets;
    });
  },

  setAvailableAnimationTriggers: (triggers: string[] | null) => {
    set((state) => {
      state.availableAnimationTriggers = triggers;
    });
  },

  setAvailablePoseToggles: (toggles: string[] | null) => {
    set((state) => {
      state.availablePoseToggles = toggles;

      const allow = toggles ? new Set(toggles) : null;
      for (const key of Object.keys(state.activePoseToggles)) {
        if (allow && allow.has(key)) continue;
        delete state.activePoseToggles[key];
      }
    });
  },

  setAvailableBones: (bones: string[] | null) => {
    set((state) => {
      state.availableBones = bones;
    });
  },

  setPoseToggleEnabled: (toggleId: string, enabled: boolean) => {
    set((state) => {
      const available = state.availablePoseToggles;
      if (!available || !available.includes(toggleId)) return;
      const group = POSE_GROUP_BY_ID[toggleId];
      if (enabled && group) {
        for (const [id] of Object.entries(state.activePoseToggles)) {
          if (id !== toggleId && POSE_GROUP_BY_ID[id] === group) {
            delete state.activePoseToggles[id];
          }
        }
      }
      if (enabled) state.activePoseToggles[toggleId] = true;
      else delete state.activePoseToggles[toggleId];
    });
  },

  triggerAnimation: (triggerId: string) => {
    set((state) => {
      state.animationTriggerRequestId = triggerId;
      state.animationTriggerRequestNonce += 1;
    });
  },

  setEntityFeatureToggle: (baseAssetId: AssetId, toggleId: string, enabled: boolean) => {
    set((state) => {
      state.entityFeatureStateByAssetId[baseAssetId] ??= {
        toggles: {},
        selects: {},
      };
      if (enabled && toggleId === "equipment.add_player") {
        state.entityFeatureStateByAssetId[baseAssetId].toggles[
          "equipment.add_armor_stand"
        ] = false;
      }
      if (enabled && toggleId === "equipment.add_armor_stand") {
        state.entityFeatureStateByAssetId[baseAssetId].toggles[
          "equipment.add_player"
        ] = false;
      }
      state.entityFeatureStateByAssetId[baseAssetId].toggles[toggleId] = enabled;
    });
  },

  setEntityFeatureSelect: (baseAssetId: AssetId, selectId: string, value: string) => {
    set((state) => {
      state.entityFeatureStateByAssetId[baseAssetId] ??= {
        toggles: {},
        selects: {},
      };
      state.entityFeatureStateByAssetId[baseAssetId].selects[selectId] = value;
    });
  },

  setEntityAnimationVariant: (assetId: AssetId, variant) => {
    set((state) => {
      state.entityAnimationVariantByAssetId[assetId] = variant;
    });
  },

  setEntityParticleBounds: (assetId: AssetId, bounds) => {
    set((state) => {
      if (!bounds) {
        delete state.entityParticleBoundsByAssetId[assetId];
        return;
      }
      state.entityParticleBoundsByAssetId[assetId] = bounds;
    });
  },
});
