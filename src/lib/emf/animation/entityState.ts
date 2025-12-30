/**
 * Entity State Management
 *
 * Manages entity state variables for animation playback.
 * Provides animation presets that simulate common entity behaviors.
 */

import type { EntityState, AnimationContext } from "./types";
import { DEFAULT_ENTITY_STATE, createAnimationContext, clampAnimationSpeed } from "./types";

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

// ============================================================================
// Animation Presets
// ============================================================================

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
 */
export const ANIMATION_PRESETS: AnimationPreset[] = [
  {
    id: "idle",
    name: "Idle",
    description: "Stationary with breathing and ambient motion",
    icon: "🧍",
    duration: 0,
    loop: true,
    setup: () => ({
      limb_swing: 0,
      limb_speed: 0,
      swing_progress: 0,
      hurt_time: 0,
      death_time: 0,
      is_aggressive: false,
      is_hurt: false,
      is_sprinting: false,
      is_in_water: false,
      health: 20,
    }),
    update: (state, dt) => ({
      age: state.age + dt * 20,
      time: (state.time + dt * 20) % 27720,
      frame_time: dt,
      limb_swing: 0,
      limb_speed: 0,
    }),
  },

  {
    id: "walking",
    name: "Walking",
    description: "Normal walking motion",
    icon: "🚶",
    duration: 0,
    loop: true,
    setup: () => ({
      limb_speed: 0.4,
      swing_progress: 0,
      hurt_time: 0,
      death_time: 0,
      is_on_ground: true,
      is_sprinting: false,
      is_in_water: false,
      health: 20,
    }),
    update: (state, dt) => ({
      age: state.age + dt * 20,
      time: (state.time + dt * 20) % 27720,
      frame_time: dt,
      // Minecraft's `limb_swing` advances by `limb_speed` each tick.
      limb_swing: state.limb_swing + dt * 20 * state.limb_speed,
      limb_speed: 0.4,
      is_on_ground: true,
    }),
  },

  {
    id: "sprinting",
    name: "Sprinting",
    description: "Fast running motion",
    icon: "🏃",
    duration: 0,
    loop: true,
    setup: () => ({
      limb_speed: 1.0,
      swing_progress: 0,
      hurt_time: 0,
      death_time: 0,
      is_on_ground: true,
      is_sprinting: true,
      is_in_water: false,
      health: 20,
    }),
    update: (state, dt) => ({
      age: state.age + dt * 20,
      time: (state.time + dt * 20) % 27720,
      frame_time: dt,
      limb_swing: state.limb_swing + dt * 20 * state.limb_speed,
      limb_speed: 1.0,
      is_sprinting: true,
      is_on_ground: true,
    }),
  },

  {
    id: "attacking",
    name: "Attacking",
    description: "Attack/swing animation",
    icon: "⚔️",
    duration: 0,
    loop: true,
    setup: () => ({
      is_aggressive: true,
      hurt_time: 0,
      death_time: 0,
      health: 20,
    }),
    update: (state, dt) => {
      // Cycle swing_progress 0 -> 1 in 0.3 seconds, then pause briefly
      const cycleDuration = 0.5;
      const attackDuration = 0.3;

      // Calculate position in cycle
      const cyclePos = (state.age / 20) % cycleDuration;
      const newProgress =
        cyclePos < attackDuration ? cyclePos / attackDuration : 0;

      return {
        age: state.age + dt * 20,
        time: (state.time + dt * 20) % 27720,
        frame_time: dt,
        swing_progress: newProgress,
        is_aggressive: true,
        limb_swing: state.limb_swing + dt * 20 * 0.2,
        limb_speed: 0.2, // Slight movement during attack
      };
    },
  },

  {
    id: "hurt",
    name: "Hurt",
    description: "Taking damage animation",
    icon: "💔",
    duration: 0,
    loop: true,
    setup: () => ({
      is_hurt: true,
      health: 10,
    }),
    update: (state, dt) => {
      // Oscillate hurt_time between 0-10
      const hurtCycle = 0.5; // seconds per hurt flash
      const cyclePos = (state.age / 20) % hurtCycle;
      const normalizedPos = cyclePos / hurtCycle;
      const hurtTime = normalizedPos < 0.5 ? normalizedPos * 20 : (1 - normalizedPos) * 20;

      return {
        age: state.age + dt * 20,
        time: (state.time + dt * 20) % 27720,
        frame_time: dt,
        hurt_time: hurtTime,
        is_hurt: hurtTime > 0,
      };
    },
  },

  {
    id: "dying",
    name: "Dying",
    description: "Death animation (non-looping)",
    icon: "💀",
    duration: 1.0,
    loop: false,
    setup: () => ({
      death_time: 0,
      health: 0,
      hurt_time: 0,
      swing_progress: 0,
      limb_speed: 0,
    }),
    update: (state, dt) => ({
      age: state.age + dt * 20,
      frame_time: dt,
      death_time: Math.min(state.death_time + dt * 20, 20),
      health: 0,
    }),
  },

  {
    id: "swimming",
    name: "Swimming",
    description: "Swimming motion",
    icon: "🏊",
    duration: 0,
    loop: true,
    setup: () => ({
      is_in_water: true,
      is_on_ground: false,
      is_wet: true,
      hurt_time: 0,
      death_time: 0,
      health: 20,
    }),
    update: (state, dt) => ({
      age: state.age + dt * 20,
      time: (state.time + dt * 20) % 27720,
      frame_time: dt,
      limb_swing: state.limb_swing + dt * 20 * state.limb_speed,
      limb_speed: 0.6,
      is_in_water: true,
      is_on_ground: false,
      is_wet: true,
    }),
  },

  {
    id: "sneaking",
    name: "Sneaking",
    description: "Crouching/sneaking motion",
    icon: "🥷",
    duration: 0,
    loop: true,
    setup: () => ({
      is_sneaking: true,
      is_on_ground: true,
      hurt_time: 0,
      death_time: 0,
      health: 20,
    }),
    update: (state, dt) => ({
      age: state.age + dt * 20,
      time: (state.time + dt * 20) % 27720,
      frame_time: dt,
      limb_swing: state.limb_swing + dt * 20 * state.limb_speed,
      limb_speed: 0.25,
      is_sneaking: true,
      is_on_ground: true,
    }),
  },

  {
    id: "sitting",
    name: "Sitting",
    description: "Sitting/resting pose",
    icon: "🧘",
    duration: 0,
    loop: true,
    setup: () => ({
      is_sitting: true,
      is_on_ground: true,
      limb_speed: 0,
      limb_swing: 0,
      hurt_time: 0,
      death_time: 0,
      health: 20,
    }),
    update: (state, dt) => ({
      age: state.age + dt * 20,
      time: (state.time + dt * 20) % 27720,
      frame_time: dt,
      limb_swing: 0,
      limb_speed: 0,
      is_sitting: true,
    }),
  },

  {
    id: "riding",
    name: "Riding",
    description: "Mounted on another entity",
    icon: "🏇",
    duration: 0,
    loop: true,
    setup: () => ({
      is_riding: true,
      is_on_ground: false,
      hurt_time: 0,
      death_time: 0,
      health: 20,
    }),
    update: (state, dt) => ({
      age: state.age + dt * 20,
      time: (state.time + dt * 20) % 27720,
      frame_time: dt,
      limb_swing: state.limb_swing + dt * 20 * state.limb_speed,
      limb_speed: 0.3,
      is_riding: true,
      is_on_ground: false,
      // Simulate slight vertical movement while riding
      pos_y: Math.sin(state.age / 10) * 0.1,
    }),
  },

  {
    id: "angry",
    name: "Angry",
    description: "Aggressive/angry state",
    icon: "😠",
    duration: 0,
    loop: true,
    setup: () => ({
      is_aggressive: true,
      anger_time: 100,
      anger_time_start: 100,
      hurt_time: 0,
      death_time: 0,
      health: 20,
    }),
    update: (state, dt) => ({
      age: state.age + dt * 20,
      time: (state.time + dt * 20) % 27720,
      frame_time: dt,
      limb_swing: state.limb_swing + dt * 20 * state.limb_speed,
      limb_speed: 0.5,
      is_aggressive: true,
      anger_time: 100,
    }),
  },

  {
    id: "baby",
    name: "Baby",
    description: "Baby/child variant walking",
    icon: "👶",
    duration: 0,
    loop: true,
    setup: () => ({
      is_child: true,
      is_on_ground: true,
      hurt_time: 0,
      death_time: 0,
      health: 20,
    }),
    update: (state, dt) => ({
      age: state.age + dt * 20,
      time: (state.time + dt * 20) % 27720,
      frame_time: dt,
      limb_swing: state.limb_swing + dt * 20 * state.limb_speed,
      limb_speed: 0.5,
      is_child: true,
      is_on_ground: true,
    }),
  },
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
