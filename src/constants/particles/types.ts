/**
 * Particle System Types
 *
 * All type definitions for Minecraft particle physics, emissions, and rendering.
 * These types are used by both generated data files and runtime code.
 */

// ============================================================================
// PARTICLE PHYSICS TYPES
// ============================================================================

/**
 * Physics configuration for a particle type
 *
 * All values are extracted from Minecraft source code using Rust.
 * No hardcoded approximations - if extraction hasn't run, particles won't render.
 */
export interface SpawnedParticle {
  particleId?: string;
  probabilityExpr?: string | null;
  countExpr?: string | null;
  particle_id?: string;
  probability_expr?: string | null;
  count_expr?: string | null;
}

export interface ParticlePhysics {
  /** Lifetime range in ticks [min, max] or single value (20 ticks = 1 second) */
  lifetime?: [number, number] | number | null;
  /** Lifetime in game ticks [min, max] - schema v3+ */
  lifetimeTicks?: [number, number] | null;
  /** Gravity/buoyancy (negative = floats up, positive = falls down, blocks/tick²) */
  gravity?: number | null;
  /** Friction/drag coefficient applied per game tick (0-1, higher = less drag) */
  friction?: number | null;
  /** Has physics (collision detection) */
  hasPhysics?: boolean | null;
  has_physics?: boolean | null;
  /** Base opacity multiplier (0-1) */
  alpha?: number | null;
  /** Base opacity - schema v3+ */
  baseAlpha?: number | null;
  /** Velocity multipliers applied in the particle constructor (per-axis, blocks/tick) */
  velocityMultiplier?: [number, number, number] | null;
  velocity_multiplier?: [number, number, number] | null;
  /** Constant velocity added in the particle constructor (per-axis, blocks/tick) */
  velocityAdd?: [number, number, number] | null;
  velocity_add?: [number, number, number] | null;
  /** Random velocity added in the particle constructor (per-axis, blocks/tick) */
  velocityJitter?: [number, number, number] | null;
  velocity_jitter?: [number, number, number] | null;
  /** Random position offset added in the particle constructor (per-axis, blocks) */
  positionJitter?: [number, number, number] | null;
  position_jitter?: [number, number, number] | null;
  /** Size multiplier (single value or range) */
  size?: number | [number, number] | null;
  /** Explicit quad size - schema v3+ */
  quadSize?: number | null;
  /** Base color tint [r, g, b] 0-1 range */
  color?: [number, number, number] | null;
  /** Color scale for grayscale particles - schema v3+ */
  colorScale?: number | null;
  color_scale?: number | null;
  /** Random color base for per-particle tinting */
  colorRandomBase?: number | null;
  color_random_base?: number | null;
  /** Random color scale for per-particle tinting */
  colorRandomScale?: number | null;
  color_random_scale?: number | null;
  /** Per-channel multiplier for randomized color */
  colorRandomMultiplier?: [number, number, number] | null;
  color_random_multiplier?: [number, number, number] | null;

  // Schema v3+ fields (not in old cached data but used by components)
  /** Size scale multiplier */
  scale?: number | null;
  /** High-level behavior identifier */
  behavior?: string | null;
  /** Base lifetime parameter */
  lifetimeBase?: number | null;
  lifetime_base?: number | null;
  /** If true, animation frames map to lifetime instead of cycling */
  lifetimeAnimation?: boolean | null;
  lifetime_animation?: boolean | null;
  /** Velocity delta per tick [dx, dy, dz] for special movement patterns */
  tickVelocityDelta?: [number, number, number] | null;
  tick_velocity_delta?: [number, number, number] | null;
  /** Random velocity jitter applied in tick() method (per-axis, blocks/tick) */
  tickVelocityJitter?: [number, number, number] | null;
  tick_velocity_jitter?: [number, number, number] | null;
  /** Particles spawned during tick() */
  spawnsParticles?: SpawnedParticle[] | null;
  spawns_particles?: SpawnedParticle[] | null;
  /** Whether this particle skips friction (overrides tick() without calling super) */
  skipsFriction?: boolean | null;
  skips_friction?: boolean | null;
  /** Whether this particle uses static random texture (picks one texture and keeps it) */
  usesStaticTexture?: boolean | null;
  uses_static_texture?: boolean | null;
  /** Quad size animation curve (from getQuadSize() method) */
  quadSizeCurve?: QuadSizeCurve | null;
  quad_size_curve?: QuadSizeCurve | null;
}

/**
 * Particle size animation curve types
 * Determines how particle size changes over its lifetime
 */
export type QuadSizeCurve =
  | { type: "constant" }
  | { type: "linear_grow_clamped"; multiplier: number }
  | { type: "quadratic_shrink"; factor: number }
  | { type: "linear_shrink"; lifetime_multiplier: number }
  | { type: "ease_in_quad" }
  | { type: "sine_wave"; amplitude: number; frequency: number; phase: number }
  | { type: "absolute"; size: number };

/**
 * Map of particle type ID to physics configuration
 * Example: { "smoke": {...}, "flame": {...} }
 */
export type ParticlePhysicsMap = Record<string, ParticlePhysics>;

// ============================================================================
// PARTICLE EMISSION TYPES
// ============================================================================

/**
 * Configuration for a single particle emission from a block or entity
 *
 * Contains the particle type, spawn rate, position/velocity expressions
 * extracted from Minecraft's animateTick() methods.
 */
export interface ParticleEmission {
  /** Particle type ID (e.g., "smoke", "flame") */
  particleId: string;
  /** Optional ParticleOptions payload for particles that require parameters (e.g., dust color/scale) */
  options?: {
    /** Discriminator for how to interpret the options (e.g., "dust") */
    kind: string;
    /** Optional RGB color (0..1) */
    color?: [number, number, number] | null;
    /** Optional scale multiplier */
    scale?: number | null;
  } | null;
  /** Optional block state condition (e.g., "lit=true") */
  condition?: string | null;
  /** Emissions per second (deprecated - use probabilityExpr and countExpr instead) */
  rate?: number;
  /** Position expressions [x,y,z] from Minecraft source */
  positionExpr?: [string, string, string] | null;
  /** Velocity expressions [vx,vy,vz] from Minecraft source (blocks/tick) */
  velocityExpr?: [string, string, string] | null;
  /** Emission probability expression (e.g., "nextInt(5) == 0", "nextFloat() < 0.11") */
  probabilityExpr?: string;
  /** Particle count expression (e.g., "nextInt(1) + 1", "nextInt(2) + 2") */
  countExpr?: string;
  /** Optional loop count expression when a for-loop index appears in expressions */
  loopCountExpr?: string;
  /** Loop index variable token (e.g., "$7") when used in expressions */
  loopIndexVar?: string;
  /** Whether this uses addAlwaysVisibleParticle (true) or addParticle (false) */
  alwaysVisible?: boolean;
  /** Which method this emission comes from ("animateTick", "particleTick", or other) */
  emissionSource?: string;
}

/**
 * All particle emissions for a single block type
 */
export interface BlockEmissions {
  /** Minecraft class name (for debugging) */
  className?: string;
  /** List of particle emissions */
  emissions: ParticleEmission[];
}

/**
 * Map of block ID to emissions configuration
 * Example: { "torch": {...}, "campfire": {...} }
 */
export type BlockEmissionsMap = Record<string, BlockEmissions>;

/**
 * All particle emissions for a single entity type
 */
export interface EntityEmissions {
  /** Minecraft class name (for debugging) */
  className?: string;
  /** List of particle emissions */
  emissions: ParticleEmission[];
}

/**
 * Map of entity ID to emissions configuration
 * Example: { "zombie": {...}, "creeper": {...} }
 */
export type EntityEmissionsMap = Record<string, EntityEmissions>;

// ============================================================================
// PARTICLE TEXTURE TYPES
// ============================================================================

/**
 * Texture configuration for a particle type
 * Maps particle IDs to their texture file names
 */
export interface ParticleTextures {
  /** Array of texture file names (without .png extension) */
  textures: string[];
}

/**
 * Map of particle type ID to texture configuration
 * Example: { "smoke": { textures: ["generic_7", "generic_6", ...] }, "flame": { textures: ["flame"] } }
 */
export type ParticleTexturesMap = Record<string, ParticleTextures>;

// ============================================================================
// COMBINED DATA TYPES
// ============================================================================

/**
 * Complete particle data for a Minecraft version
 *
 * This is the structure of generated TypeScript files.
 * Generated by Rust from Minecraft JAR extraction.
 */
export interface ParticleData {
  /** Minecraft version this data was extracted from */
  version: string;
  /** Timestamp of extraction (ISO 8601) */
  extractedAt: string;
  /** Particle physics configurations */
  physics: ParticlePhysicsMap;
  /** Block particle emissions */
  blocks: BlockEmissionsMap;
  /** Entity particle emissions */
  entities: EntityEmissionsMap;
  /** Particle texture mappings */
  particles: ParticleTexturesMap;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Result of checking if an emission condition is met
 */
export type EmissionConditionCheck = (
  emission: ParticleEmission,
  blockProps: Record<string, string>,
) => boolean;
