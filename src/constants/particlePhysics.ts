/**
 * Particle Physics - Extracted from Minecraft Source
 *
 * This module provides particle physics data extracted directly from
 * Minecraft's decompiled source code using Mojang's official mappings.
 *
 * All values come from Minecraft extraction - no hardcoded approximations.
 * If extraction hasn't run, particles are hidden (not rendered).
 */

import type {
  ExtractedPhysicsData,
  ExtractedParticlePhysics,
} from "@lib/tauri";

export interface SpawnedParticle {
  particleId: string;
  probabilityExpr?: string;
  countExpr?: string;
}

/**
 * Physics configuration for a particle type (all values from extraction)
 */
export interface ParticlePhysics {
  /** Lifetime range in game ticks [min, max] (20 ticks = 1 second) */
  lifetimeTicks: [number, number];
  /** Lifetime range in seconds [min, max] */
  lifetime: [number, number];
  /** Gravity/buoyancy (negative = floats up, positive = falls down) */
  gravity: number;
  /** Friction/drag coefficient applied per game tick (0-1, higher = less drag) */
  friction?: number;
  /** Whether this particle has physics (collision detection) */
  hasPhysics?: boolean;
  /** Velocity multipliers applied in the particle constructor (per-axis, blocks/tick) */
  velocityMultiplier?: [number, number, number];
  /** Constant velocity added in the particle constructor (per-axis, blocks/tick) */
  velocityAdd?: [number, number, number];
  /** Random velocity added in the particle constructor (per-axis, blocks/tick) */
  velocityJitter?: [number, number, number];
  /** Size multiplier range [start, end] */
  size: [number, number];
  /** Optional explicit initial quad size (Minecraft `quadSize`) */
  quadSize?: number;
  /** Optional size scale multiplier (`Particle.scale(...)` or constructor scale params) */
  scale?: number;
  /** Optional base opacity multiplier (0-1) */
  baseAlpha?: number;
  /** Optional base color tint [r, g, b] 0-1 range */
  color?: [number, number, number];
  /** BaseAshSmokeParticle grayscale color scale (random.nextFloat() * colorScale) */
  colorScale?: number;
  /** BaseAshSmokeParticle base lifetime parameter */
  lifetimeBase?: number;
  /** If true, animation frames map to lifetime instead of cycling */
  lifetimeAnimation?: boolean;
  /** High-level behavior identifier */
  behavior?: string;
  /** Velocity delta per tick [dx, dy, dz] for special movement patterns */
  tickVelocityDelta?: [number, number, number];
  /** Particles spawned by this particle during tick() */
  spawnsParticles?: SpawnedParticle[];
  /** Whether this particle skips friction (overrides tick() without calling super) */
  skipsFriction?: boolean;
  /** Whether this particle uses static random texture (picks one texture and keeps it) */
  usesStaticTexture?: boolean;
}

// ============================================================================
// EXTRACTED PHYSICS DATA CACHE
// ============================================================================

/** Cache for extracted physics data from Minecraft */
let extractedPhysicsCache: ExtractedPhysicsData | null = null;
let extractedPhysicsLoading: Promise<ExtractedPhysicsData | null> | null = null;

/**
 * Initialize extracted physics from Minecraft source
 *
 * Call this when the app starts or when Minecraft version changes.
 * This will load cached physics or return null if not available.
 */
export async function initializeExtractedPhysics(): Promise<ExtractedPhysicsData | null> {
  // Avoid concurrent loads
  if (extractedPhysicsLoading) {
    return extractedPhysicsLoading;
  }

  extractedPhysicsLoading = (async () => {
    try {
      const { getParticlePhysics: getPhysicsData } = await import("@lib/tauri");
      const data = await getPhysicsData();
      if (data) {
        console.log(
          `[particlePhysics] Loaded extracted physics for ${data.version} (${Object.keys(data.particles).length} particles)`,
        );
        extractedPhysicsCache = data;
      } else {
        console.warn(
          "[particlePhysics] No extracted physics data available. Run extraction for accurate particle behavior.",
        );
      }
      return data;
    } catch (error) {
      console.warn("[particlePhysics] Failed to load extracted physics:", error);
      return null;
    } finally {
      extractedPhysicsLoading = null;
    }
  })();

  return extractedPhysicsLoading;
}

/**
 * Set extracted physics data directly (used when extraction completes)
 */
export function setExtractedPhysics(data: ExtractedPhysicsData): void {
  extractedPhysicsCache = data;
  console.log(
    `[particlePhysics] Set extracted physics for ${data.version} (${Object.keys(data.particles).length} particles)`,
  );
}

/**
 * Clear extracted physics cache (call when Minecraft version changes)
 */
export function clearExtractedPhysicsCache(): void {
  extractedPhysicsCache = null;
  extractedPhysicsLoading = null;
}

/**
 * Check if extracted physics data is available
 */
export function hasExtractedPhysics(): boolean {
  return extractedPhysicsCache !== null;
}

/**
 * Get the version of extracted physics data
 */
export function getExtractedPhysicsVersion(): string | null {
  return extractedPhysicsCache?.version ?? null;
}

/**
 * Get list of particles that have extracted physics
 */
export function getExtractedParticleTypes(): string[] {
  if (!extractedPhysicsCache) return [];
  return Object.keys(extractedPhysicsCache.particles);
}

// ============================================================================
// PHYSICS CONVERSION
// ============================================================================

// Validation helpers
function isValidNumber(value: unknown, min?: number, max?: number): value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) return false;
  if (min !== undefined && value < min) return false;
  if (max !== undefined && value > max) return false;
  return true;
}

function isValidVec3(value: unknown): value is [number, number, number] {
  return Array.isArray(value) &&
    value.length === 3 &&
    value.every((v) => typeof v === "number" && Number.isFinite(v));
}

function setIfValidNumber(
  target: ParticlePhysics,
  key: keyof ParticlePhysics,
  value: unknown,
  min?: number,
  max?: number,
): void {
  if (isValidNumber(value, min, max)) {
    (target as Record<string, unknown>)[key] = value;
  }
}

function setIfValidVec3(
  target: ParticlePhysics,
  key: keyof ParticlePhysics,
  value: unknown,
): void {
  if (isValidVec3(value)) {
    (target as Record<string, unknown>)[key] = [value[0], value[1], value[2]];
  }
}

function setIfValidBoolean(
  target: ParticlePhysics,
  key: keyof ParticlePhysics,
  value: unknown,
): void {
  if (typeof value === "boolean") {
    (target as Record<string, unknown>)[key] = value;
  }
}

function setIfValidString(
  target: ParticlePhysics,
  key: keyof ParticlePhysics,
  value: unknown,
): void {
  if (typeof value === "string" && value.trim()) {
    (target as Record<string, unknown>)[key] = value;
  }
}

function extractQuadSize(extracted: ExtractedParticlePhysics): number | undefined {
  if (typeof extracted.size === "number" && Number.isFinite(extracted.size) && extracted.size > 0) {
    return extracted.size;
  }
  return undefined;
}

function extractSpawnedParticles(
  spawns: unknown,
): Array<{ particleId: string; probabilityExpr?: string; countExpr?: string }> | undefined {
  if (!Array.isArray(spawns)) return undefined;

  const mapped = spawns
    .map((spawn) => ({
      particleId: spawn.particle_id,
      probabilityExpr: spawn.probability_expr ?? undefined,
      countExpr: spawn.count_expr ?? undefined,
    }))
    .filter((spawn) => spawn.particleId);

  return mapped.length > 0 ? mapped : undefined;
}

/**
 * Convert extracted physics (from Minecraft source) to our ParticlePhysics format
 *
 * The extracted data uses game ticks (20 ticks = 1 second), so we convert.
 * Returns null if the extracted data is missing required fields.
 */
function convertExtractedPhysics(extracted: ExtractedParticlePhysics): ParticlePhysics | null {
  // Require lifetime - without it we can't properly simulate
  if (
    !Array.isArray(extracted.lifetime) ||
    typeof extracted.lifetime[0] !== "number" ||
    typeof extracted.lifetime[1] !== "number"
  ) {
    return null;
  }

  const quadSize = extractQuadSize(extracted);

  const result: ParticlePhysics = {
    lifetimeTicks: [extracted.lifetime[0], extracted.lifetime[1]],
    lifetime: [extracted.lifetime[0] / 20, extracted.lifetime[1] / 20],
    gravity: isValidNumber(extracted.gravity) ? extracted.gravity : 0,
    size: quadSize ? [quadSize, quadSize] : [0.1, 0.1],
    quadSize,
  };

  // Optional fields with validation
  setIfValidNumber(result, "friction", extracted.friction, 0, 1);
  setIfValidNumber(result, "baseAlpha", extracted.alpha, 0, 1);
  setIfValidNumber(result, "scale", extracted.scale, 0);
  setIfValidNumber(result, "colorScale", extracted.color_scale, 0);
  setIfValidNumber(result, "lifetimeBase", extracted.lifetime_base, 0);

  setIfValidVec3(result, "velocityMultiplier", extracted.velocity_multiplier);
  setIfValidVec3(result, "velocityAdd", extracted.velocity_add);
  setIfValidVec3(result, "velocityJitter", extracted.velocity_jitter);
  setIfValidVec3(result, "tickVelocityDelta", extracted.tick_velocity_delta);

  // Color needs special validation (0..1 range)
  if (isValidVec3(extracted.color)) {
    const [r, g, b] = extracted.color;
    if (r >= 0 && r <= 1 && g >= 0 && g <= 1 && b >= 0 && b <= 1) {
      result.color = [r, g, b];
    }
  }

  setIfValidBoolean(result, "lifetimeAnimation", extracted.lifetime_animation);
  setIfValidBoolean(result, "hasPhysics", extracted.has_physics);
  setIfValidBoolean(result, "skipsFriction", extracted.skips_friction);
  setIfValidBoolean(result, "usesStaticTexture", extracted.uses_static_texture);

  setIfValidString(result, "behavior", extracted.behavior);

  const spawns = extractSpawnedParticles(extracted.spawns_particles);
  if (spawns) {
    result.spawnsParticles = spawns;
  }

  return result;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get physics configuration for a particle type
 *
 * Returns extracted Minecraft data, or null if extraction hasn't run.
 * Particles should not render when this returns null.
 */
export function getParticlePhysics(particleId: string): ParticlePhysics | null {
  if (!extractedPhysicsCache) {
    return null;
  }

  const extracted = extractedPhysicsCache.particles[particleId];
  if (!extracted) {
    return null;
  }

  return convertExtractedPhysics(extracted);
}

/**
 * Alias for backward compatibility
 */
export const getParticlePhysicsWithExtracted = getParticlePhysics;

/**
 * Check if a particle type has extracted physics defined
 */
export function hasParticlePhysics(particleId: string): boolean {
  return extractedPhysicsCache?.particles[particleId] !== undefined;
}
