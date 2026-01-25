/**
 * Particle Engine Types
 */

import type * as THREE from "three";
import type { ParticlePhysics } from "@constants/particles";

/**
 * Internal particle state
 */
export interface Particle {
  active: boolean;
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  position: THREE.Vector3;
  prevPosition: THREE.Vector3;
  spawnPosition: THREE.Vector3;
  velocity: THREE.Vector3; // blocks/tick
  spawnVelocity: THREE.Vector3; // blocks/tick at spawn
  age: number; // ticks
  lifetime: number; // ticks
  quadSize: number; // Minecraft `quadSize` (half-size, world units)
  physics: ParticlePhysics | null;
  particleType: string;
  textures: THREE.Texture[];
  frameIndex: number; // for cycling animations
  frameTimeTicks: number;
  frameCount: number;
  frameDurationTicks: number;
  lifetimeAnimation: boolean; // SpriteSet.get(age,lifetime) style
  staticRandomTexture: boolean; // Pick one random texture and keep it (like campfire smoke)
}

/**
 * Configuration for particle emission
 */
export interface EmitConfig {
  /** Position to emit from */
  position: THREE.Vector3;
  /** Particle type ID (e.g., "flame", "smoke") */
  particleType: string;
  /** Number of particles to emit */
  count: number;
  /** Array of textures for animation frames */
  textures: THREE.Texture[];
  /** Optional color tint [r, g, b] 0-255 */
  tint?: [number, number, number];
  /** Frame duration in ticks (20 ticks = 1 second) */
  frameDuration?: number;
  /** Initial velocity (blocks/tick) [vx, vy, vz] */
  velocity?: [number, number, number];
  /** Optional per-emission size scale multiplier */
  scale?: number;
}

export interface SpawnTextureConfig {
  textures: THREE.Texture[];
  frameDuration?: number;
  tint?: [number, number, number];
}

/**
 * Quality presets
 */
export type ParticleQuality = "low" | "medium" | "high";

export const QUALITY_MAX_PARTICLES: Record<ParticleQuality, number> = {
  low: 50,
  medium: 150,
  high: 300,
};

export const TICKS_PER_SECOND = 20;
export const SECONDS_PER_TICK = 1 / TICKS_PER_SECOND;
