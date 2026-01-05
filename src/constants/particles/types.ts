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
export interface ParticlePhysics {
  /** Lifetime range in ticks [min, max] or single value (20 ticks = 1 second) */
  lifetime?: [number, number] | number;
  /** Lifetime in game ticks [min, max] - schema v3+ */
  lifetimeTicks?: [number, number];
  /** Gravity/buoyancy (negative = floats up, positive = falls down, blocks/tick²) */
  gravity?: number;
  /** Friction/drag coefficient applied per game tick (0-1, higher = less drag) */
  friction?: number;
  /** Has physics (collision detection) */
  hasPhysics?: boolean;
  /** Base opacity multiplier (0-1) */
  alpha?: number;
  /** Base opacity - schema v3+ */
  baseAlpha?: number;
  /** Velocity multipliers applied in the particle constructor (per-axis, blocks/tick) */
  velocityMultiplier?: [number, number, number];
  /** Constant velocity added in the particle constructor (per-axis, blocks/tick) */
  velocityAdd?: [number, number, number];
  /** Random velocity added in the particle constructor (per-axis, blocks/tick) */
  velocityJitter?: [number, number, number];
  /** Size multiplier (single value or range) */
  size?: number | [number, number];
  /** Explicit quad size - schema v3+ */
  quadSize?: number;
  /** Base color tint [r, g, b] 0-1 range */
  color?: [number, number, number];
  /** Color scale for grayscale particles - schema v3+ */
  colorScale?: number;

  // Schema v3+ fields (not in old cached data but used by components)
  /** Size scale multiplier */
  scale?: number;
  /** High-level behavior identifier */
  behavior?: string;
  /** Base lifetime parameter */
  lifetimeBase?: number;
  /** If true, animation frames map to lifetime instead of cycling */
  lifetimeAnimation?: boolean;
  /** Velocity delta per tick [dx, dy, dz] for special movement patterns */
  tickVelocityDelta?: [number, number, number];
}

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
    color?: [number, number, number];
    /** Optional scale multiplier */
    scale?: number;
  };
  /** Optional block state condition (e.g., "lit=true") */
  condition?: string;
  /** Emissions per second (deprecated - use probabilityExpr and countExpr instead) */
  rate?: number;
  /** Position expressions [x,y,z] from Minecraft source */
  positionExpr?: [string, string, string];
  /** Velocity expressions [vx,vy,vz] from Minecraft source (blocks/tick) */
  velocityExpr?: [string, string, string];
  /** Emission probability expression (e.g., "nextInt(5) == 0", "nextFloat() < 0.11") */
  probabilityExpr?: string;
  /** Particle count expression (e.g., "nextInt(1) + 1", "nextInt(2) + 2") */
  countExpr?: string;
  /** Whether this uses addAlwaysVisibleParticle (true) or addParticle (false) */
  alwaysVisible?: boolean;
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
