/**
 * Entity State Management
 *
 * Manages entity state variables for animation playback.
 * Provides animation presets that simulate common entity behaviors.
 */

import type { EntityState, AnimationContext } from "./types";
import { DEFAULT_ENTITY_STATE, createAnimationContext, clampAnimationSpeed } from "./types";
import {
  ANIMATION_PRESETS,
  getPresetById,
  getDefaultPreset,
  type AnimationPreset,
} from "./animationPresets";

// ============================================================================
// Entity State Management
// ============================================================================

/**
 * Create a fresh entity state with optional overrides.
 */
export function createEntityState(
  overrides?: Partial<EntityState>
): EntityState {
  return {
    ...DEFAULT_ENTITY_STATE,
    ...overrides,
  };
}

/**
 * Update entity state with new values.
 */
export function updateEntityState(
  state: EntityState,
  updates: Partial<EntityState>
): EntityState {
  return {
    ...state,
    ...updates,
  };
}

/**
 * Reset entity state to defaults, preserving identity (id).
 */
export function resetEntityState(state: EntityState): EntityState {
  return {
    ...DEFAULT_ENTITY_STATE,
    id: state.id,
  };
}

// Re-export for convenience
export type { AnimationPreset };
export { ANIMATION_PRESETS, getPresetById, getDefaultPreset };

// ============================================================================
// Animation State Controller
// ============================================================================

/**
 * Controller for managing animation playback state.
 */
export class AnimationStateController {
  private context: AnimationContext;
  private currentPreset: AnimationPreset | null = null;
  private isPlaying: boolean = false;
  private speed: number = 1.0;
  private elapsedTime: number = 0;

  constructor() {
    this.context = createAnimationContext();
  }

  /**
   * Get the current animation context.
   */
  getContext(): AnimationContext {
    return this.context;
  }

  /**
   * Get the current entity state.
   */
  getEntityState(): EntityState {
    return this.context.entityState;
  }

  /**
   * Set a new preset and optionally start playing.
   */
  setPreset(preset: AnimationPreset | null, autoPlay: boolean = true) {
    this.currentPreset = preset;
    this.elapsedTime = 0;

    if (preset?.setup) {
      const setupUpdates = preset.setup();
      this.context.entityState = {
        ...this.context.entityState,
        ...setupUpdates,
      };
    }

    if (autoPlay && preset) {
      this.isPlaying = true;
    }
  }

  /**
   * Get the current preset.
   */
  getPreset(): AnimationPreset | null {
    return this.currentPreset;
  }

  /**
   * Start/resume playback.
   */
  play() {
    this.isPlaying = true;
  }

  /**
   * Pause playback.
   */
  pause() {
    this.isPlaying = false;
  }

  /**
   * Stop playback and reset state.
   */
  stop() {
    this.isPlaying = false;
    this.currentPreset = null;
    this.elapsedTime = 0;
    this.context = createAnimationContext();
  }

  /**
   * Check if currently playing.
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Set playback speed multiplier.
   */
  setSpeed(speed: number) {
    this.speed = clampAnimationSpeed(speed);
  }

  /**
   * Get current playback speed.
   */
  getSpeed(): number {
    return this.speed;
  }

  /**
   * Update head orientation (for manual control).
   */
  setHeadOrientation(yaw: number, pitch: number) {
    this.context.entityState.head_yaw = yaw;
    this.context.entityState.head_pitch = pitch;
  }

  /**
   * Update entity state directly (for custom control).
   */
  updateState(updates: Partial<EntityState>) {
    this.context.entityState = {
      ...this.context.entityState,
      ...updates,
    };
  }

  /**
   * Tick the animation forward by deltaTime seconds.
   * Returns true if animation is still running.
   */
  tick(deltaTime: number): boolean {
    if (!this.isPlaying || !this.currentPreset) {
      return false;
    }

    const scaledDelta = deltaTime * this.speed;
    this.elapsedTime += scaledDelta;

    // Check if non-looping animation has finished
    if (
      !this.currentPreset.loop &&
      this.currentPreset.duration > 0 &&
      this.elapsedTime >= this.currentPreset.duration
    ) {
      this.isPlaying = false;
      return false;
    }

    // Apply preset update
    const updates = this.currentPreset.update(
      this.context.entityState,
      scaledDelta
    );

    this.context.entityState = {
      ...this.context.entityState,
      ...updates,
    };

    return true;
  }

  /**
   * Set a custom variable value.
   */
  setVariable(name: string, value: number) {
    this.context.variables[name] = value;
  }

  /**
   * Get a custom variable value.
   */
  getVariable(name: string): number {
    return this.context.variables[name] ?? 0;
  }

  /**
   * Set a bone property value.
   */
  setBoneValue(bone: string, property: string, value: number) {
    if (!this.context.boneValues[bone]) {
      this.context.boneValues[bone] = {};
    }
    this.context.boneValues[bone][property] = value;
  }

  /**
   * Get a bone property value.
   */
  getBoneValue(bone: string, property: string): number {
    return this.context.boneValues[bone]?.[property] ?? 0;
  }

  /**
   * Clear all bone values (for reset).
   */
  clearBoneValues() {
    this.context.boneValues = {};
  }

  /**
   * Clear random cache (for fresh random values).
   */
  clearRandomCache() {
    this.context.randomCache.clear();
  }
}
