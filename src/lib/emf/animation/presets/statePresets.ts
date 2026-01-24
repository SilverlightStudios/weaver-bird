/**
 * State-based animation presets (combat, damage, status effects)
 */

import type { AnimationPreset } from "../animationPresets";

export const STATE_PRESETS: AnimationPreset[] = [
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
      const cycleDuration = 0.5;
      const attackDuration = 0.3;
      const cyclePos = (state.age / 20) % cycleDuration;
      const newProgress = cyclePos < attackDuration ? cyclePos / attackDuration : 0;

      return {
        age: state.age + dt * 20,
        time: (state.time + dt * 20) % 27720,
        frame_time: dt,
        swing_progress: newProgress,
        is_aggressive: true,
        limb_swing: state.limb_swing + dt * 20 * 0.2,
        limb_speed: 0.2,
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
      const hurtCycle = 0.5;
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
