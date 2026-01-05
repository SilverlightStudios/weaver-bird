/**
 * Particle Data Loader
 *
 * Loads particle data from generated TypeScript file with lazy loading support.
 * The generated file is created by Rust extraction from the Minecraft JAR.
 *
 * Data is loaded lazily when first requested to improve startup performance.
 */
import type {
  ParticleData,
  ParticlePhysics,
  ParticleEmission,
  BlockEmissions,
  EntityEmissions,
} from "./types";

// Export all types
export type {
  ParticleData,
  ParticlePhysics,
  ParticleEmission,
  BlockEmissions,
  EntityEmissions,
  ParticlePhysicsMap,
  BlockEmissionsMap,
  EntityEmissionsMap,
  EmissionConditionCheck,
} from "./types";

// ============================================================================
// LAZY LOADING STATE
// ============================================================================

/** Cached particle data (loaded lazily) */
let cachedParticleData: ParticleData | null = null;

/** Loading promise to prevent duplicate loads */
let loadingPromise: Promise<ParticleData> | null = null;

/** Empty placeholder data for when data hasn't loaded yet */
const EMPTY_PARTICLE_DATA: ParticleData = {
  version: "",
  extractedAt: "",
  physics: {},
  blocks: {},
  entities: {},
};

/**
 * Load particle data lazily (only when first needed)
 *
 * @returns Promise that resolves to the particle data
 */
export async function loadParticleData(): Promise<ParticleData> {
  // Return cached data if already loaded
  if (cachedParticleData) {
    return cachedParticleData;
  }

  // Return existing promise if already loading
  if (loadingPromise) {
    return loadingPromise;
  }

  // Start loading
  const promise = (async (): Promise<ParticleData> => {
    try {
      console.log("[ParticleData] Starting lazy load...");
      const module = await import("./generated");
      const data: ParticleData = module.particleData;
      cachedParticleData = data;
      console.log(
        `[ParticleData] Loaded: ${Object.keys(data.physics).length} physics, ` +
          `${Object.keys(data.blocks).length} blocks, ` +
          `${Object.keys(data.entities).length} entities`,
      );
      return data;
    } catch (error) {
      console.error("[ParticleData] Failed to load:", error);
      loadingPromise = null; // Allow retry on failure
      throw error;
    }
  })();

  loadingPromise = promise;
  return promise;
}

/**
 * Check if particle data has been loaded
 */
export function isParticleDataLoaded(): boolean {
  return cachedParticleData !== null;
}

/**
 * Get particle data synchronously (returns empty data if not loaded)
 * For async loading, use loadParticleData() instead
 */
function getParticleDataSync(): ParticleData {
  return cachedParticleData ?? EMPTY_PARTICLE_DATA;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get the loaded particle data (synchronous, returns empty if not loaded)
 */
export function getParticleData(): ParticleData {
  return getParticleDataSync();
}

/**
 * Get physics configuration for a particle type
 *
 * @param particleId - Particle type ID (e.g., "smoke", "flame")
 * @returns Physics config or null if not found
 */
export function getParticlePhysics(particleId: string): ParticlePhysics | null {
  return getParticleDataSync().physics[particleId] ?? null;
}

/**
 * Get all particle emissions for a block
 *
 * @param blockId - Block ID (e.g., "minecraft:torch", "torch")
 * @returns Block emissions or null if not found
 */
export function getBlockEmissions(blockId: string): BlockEmissions | null {
  // Normalize block ID: "minecraft:torch" -> "torch"
  const id = blockId.replace(/^minecraft:/, "");
  const rawData = getParticleDataSync().blocks[id];

  if (!rawData) return null;

  // Return emissions as-is from extracted data
  // Emission timing is now controlled by probabilityExpr and countExpr
  return {
    className: rawData.className,
    emissions: rawData.emissions as ParticleEmission[],
  };
}

/**
 * Get all particle emissions for an entity
 *
 * @param entityId - Entity ID (e.g., "minecraft:zombie", "zombie")
 * @returns Entity emissions or null if not found
 */
export function getEntityEmissions(entityId: string): EntityEmissions | null {
  // Normalize entity ID: "minecraft:zombie" -> "zombie"
  const id = entityId.replace(/^minecraft:/, "");
  const rawData = getParticleDataSync().entities[id];

  if (!rawData) return null;

  // Return emissions as-is from extracted data
  // Emission timing is now controlled by probabilityExpr and countExpr
  return {
    className: rawData.className,
    emissions: rawData.emissions as ParticleEmission[],
  };
}

/**
 * Check if a particle emission's condition is met given block/entity properties
 *
 * @param emission - Particle emission configuration
 * @param props - Block or entity state properties (e.g., { lit: "true" })
 * @returns True if condition is met or no condition exists
 */
export function isEmissionConditionMet(
  emission: ParticleEmission,
  props: Record<string, string>,
): boolean {
  if (!emission.condition) return true;

  // Handle two formats:
  // 1. "key=value" - explicit comparison
  // 2. "KEY" - uppercase property name, check if lowercase version is "true"
  if (emission.condition.includes("=")) {
    const [key, expected] = emission.condition.split("=");
    if (!key || expected === undefined) return true;
    return props[key] === expected;
  } else {
    // Uppercase property name like "LIT" -> check if "lit" is "true"
    const key = emission.condition.toLowerCase();
    return props[key] === "true";
  }
}

/**
 * Get all blocks that emit a specific particle type
 *
 * @param particleId - Particle type ID
 * @returns Array of block IDs that emit this particle
 */
export function getBlocksEmittingParticle(particleId: string): string[] {
  const needle = particleId.toLowerCase();
  const result: string[] = [];
  const blocks = getParticleDataSync().blocks;

  for (const [blockId, blockData] of Object.entries(blocks)) {
    if (blockData.emissions.some((e) => e.particleId === needle)) {
      result.push(`minecraft:${blockId}`);
    }
  }

  return result.sort();
}

/**
 * Get the Minecraft version of the loaded data
 */
export function getParticleDataVersion(): string {
  return getParticleDataSync().version;
}
