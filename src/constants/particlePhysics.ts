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
  SpawnedParticle as ExtractedSpawnedParticle,
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

  const quadSize =
    typeof extracted.size === "number" && Number.isFinite(extracted.size) && extracted.size > 0
      ? extracted.size
      : undefined;

  const result: ParticlePhysics = {
    lifetimeTicks: [extracted.lifetime[0], extracted.lifetime[1]],
    // Convert lifetime from game ticks to seconds (20 ticks = 1 second)
    lifetime: [extracted.lifetime[0] / 20, extracted.lifetime[1] / 20],
    // Default gravity to 0 if not specified
    gravity: typeof extracted.gravity === "number" && Number.isFinite(extracted.gravity)
      ? extracted.gravity
      : 0,
    // Default size to 0.1 if not specified
    size: quadSize ? [quadSize, quadSize] : [0.1, 0.1],
    quadSize,
  };

  // Optional friction
  if (
    typeof extracted.friction === "number" &&
    Number.isFinite(extracted.friction) &&
    extracted.friction > 0 &&
    extracted.friction <= 1
  ) {
    result.friction = extracted.friction;
  }

  // Velocity modifiers (blocks/tick)
  const vm = extracted.velocity_multiplier;
  if (Array.isArray(vm) && vm.length === 3 && vm.every((v) => typeof v === "number" && Number.isFinite(v))) {
    result.velocityMultiplier = [vm[0], vm[1], vm[2]];
  }

  const va = extracted.velocity_add;
  if (Array.isArray(va) && va.length === 3 && va.every((v) => typeof v === "number" && Number.isFinite(v))) {
    result.velocityAdd = [va[0], va[1], va[2]];
  }

  const vj = extracted.velocity_jitter;
  if (Array.isArray(vj) && vj.length === 3 && vj.every((v) => typeof v === "number" && Number.isFinite(v))) {
    result.velocityJitter = [vj[0], vj[1], vj[2]];
  }

  // Base RGB color (0..1)
  const col = extracted.color;
  if (Array.isArray(col) && col.length === 3 && col.every((v) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1)) {
    result.color = [col[0], col[1], col[2]];
  }

  // Base alpha/opacity multiplier
  if (typeof extracted.alpha === "number" && Number.isFinite(extracted.alpha) && extracted.alpha >= 0 && extracted.alpha <= 1) {
    result.baseAlpha = extracted.alpha;
  }

  // Scale multiplier (Particle.scale / ctor scale param)
  if (typeof extracted.scale === "number" && Number.isFinite(extracted.scale) && extracted.scale > 0) {
    result.scale = extracted.scale;
  }

  // BaseAshSmokeParticle extras
  if (typeof extracted.color_scale === "number" && Number.isFinite(extracted.color_scale) && extracted.color_scale >= 0) {
    result.colorScale = extracted.color_scale;
  }
  if (typeof extracted.lifetime_base === "number" && Number.isFinite(extracted.lifetime_base) && extracted.lifetime_base > 0) {
    result.lifetimeBase = extracted.lifetime_base;
  }

  if (typeof extracted.lifetime_animation === "boolean") {
    result.lifetimeAnimation = extracted.lifetime_animation;
  }

  if (typeof extracted.behavior === "string" && extracted.behavior.trim()) {
    result.behavior = extracted.behavior;
  }

  // Friction and texture behavior flags
  if (typeof extracted.has_physics === "boolean") {
    result.hasPhysics = extracted.has_physics;
  }

  if (typeof extracted.skips_friction === "boolean") {
    result.skipsFriction = extracted.skips_friction;
  }

  if (typeof extracted.uses_static_texture === "boolean") {
    result.usesStaticTexture = extracted.uses_static_texture;
  }

  const tickDelta = extracted.tick_velocity_delta;
  if (Array.isArray(tickDelta) && tickDelta.length === 3 && tickDelta.every((v) => typeof v === "number" && Number.isFinite(v))) {
    result.tickVelocityDelta = [tickDelta[0], tickDelta[1], tickDelta[2]];
  }

  const spawns = extracted.spawns_particles as ExtractedSpawnedParticle[] | undefined | null;
  if (Array.isArray(spawns)) {
    const mapped = spawns
      .map((spawn) => ({
        particleId: spawn.particle_id,
        probabilityExpr: spawn.probability_expr ?? undefined,
        countExpr: spawn.count_expr ?? undefined,
      }))
      .filter((spawn) => spawn.particleId);
    if (mapped.length > 0) {
      result.spawnsParticles = mapped;
    }
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
