/**
 * Built-in animation presets that simulate entity behaviors
 */

import type { EntityState } from "./types";
import { MOVEMENT_PRESETS } from "./presets/movementPresets";
import { STATE_PRESETS } from "./presets/statePresets";

export interface AnimationPreset {
  /** Unique identifier */
  id: string;

  /** Display name */
  name: string;

  /** Description of the animation */
  description: string;

  /** Icon emoji */
  icon: string;

  /** Duration in seconds (0 = infinite loop) */
  duration: number;

  /** Whether the animation loops */
  loop: boolean;

  /** Update function called each frame */
  update: (state: EntityState, deltaTime: number) => Partial<EntityState>;

  /** Optional setup function called when preset is selected */
  setup?: () => Partial<EntityState>;
}

/**
 * Built-in animation presets that simulate entity behaviors.
 * Combines movement and state-based presets.
 */
export const ANIMATION_PRESETS: AnimationPreset[] = [
  ...MOVEMENT_PRESETS,
  ...STATE_PRESETS,
];

/**
 * Get an animation preset by ID.
 */
export function getPresetById(id: string): AnimationPreset | undefined {
  return ANIMATION_PRESETS.find((p) => p.id === id);
}

/**
 * Get the default (idle) preset.
 */
export function getDefaultPreset(): AnimationPreset {
  return ANIMATION_PRESETS[0];
}
