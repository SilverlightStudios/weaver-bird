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
  SpawnedParticle,
} from "./types";

// ============================================================================
// NORMALIZATION
// ============================================================================

import { normalizeParticleData } from "./normalization";

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
  particles: {},
};

/**
 * Load particle data lazily (only when first needed)
 *
 * @returns Promise that resolves to the particle data
 */
export async function loadParticleData(): Promise<ParticleData> {
  // Return cached data if already loaded
  if (cachedParticleData) {
    cachedParticleData = normalizeParticleData(cachedParticleData);
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
      const normalized = normalizeParticleData(data);
      cachedParticleData = normalized;
      console.log(
        `[ParticleData] Loaded: ${Object.keys(normalized.physics).length} physics, ` +
          `${Object.keys(normalized.blocks).length} blocks, ` +
          `${Object.keys(normalized.entities).length} entities, ` +
          `${Object.keys(normalized.particles ?? {}).length} textures`,
      );
      return normalized;
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
export function getBlockEmissions(blockId: string, blockProps?: Record<string, string>): BlockEmissions | null {
  // Normalize block ID: "minecraft:torch" -> "torch"
  let id = blockId.replace(/^minecraft:/, "");

  // Pattern-based: if block has wall property set to true, use wall-mounted variant for particles
  // This handles blocks where wall/floor variants use the same blockstate but different particle positions
  // Examples: torch/wall_torch, sign/wall_sign, banner/wall_banner
  // The "wall" property is synthetic (not from Minecraft), added by our schema augmentation
  if (blockProps?.wall === "true") {
    let wallVariant: string;

    // Pattern 1: "torch" -> "wall_torch" (prefix)
    if (!id.includes("_wall_") && !id.startsWith("wall_")) {
      // Try adding "wall_" prefix first
      wallVariant = `wall_${id}`;
      let wallData = getParticleDataSync().blocks[wallVariant];

      // If prefix doesn't work, try infix: "redstone_torch" -> "redstone_wall_torch"
      if (!wallData) {
        const parts = id.split("_");
        if (parts.length > 1) {
          // Insert "wall" before the last part
          parts.splice(parts.length - 1, 0, "wall");
          wallVariant = parts.join("_");
          wallData = getParticleDataSync().blocks[wallVariant];
        }
      }

      if (wallData) {
        id = wallVariant;
      }
    }
  }

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
function normalizeEntityIdInput(entityId: string): string {
  return entityId.replace(/^minecraft:/, "").replace(/^entity\//, "");
}

function findEntityByClassName(
  targetId: string,
  entities: ParticleData["entities"],
): string | null {
  const normalizedTarget = targetId.replace(/[_/]/g, "").toLowerCase();
  if (!normalizedTarget) return null;

  for (const [key, data] of Object.entries(entities)) {
    const className = data.className ?? "";
    const simpleName = className.split(".").pop() ?? "";
    const normalizedClass = simpleName.replace(/_/g, "").toLowerCase();
    if (normalizedClass && normalizedClass === normalizedTarget) {
      return key;
    }
  }

  return null;
}

export function getEntityEmissions(entityId: string): EntityEmissions | null {
  const entities = getParticleDataSync().entities;
  if (!entities || Object.keys(entities).length === 0) return null;

  const normalized = normalizeEntityIdInput(entityId);
  const baseId = normalized.split("/")[0] ?? normalized;
  const candidates = [normalized, baseId].filter(Boolean);

  for (const candidate of candidates) {
    const rawData = entities[candidate];
    if (rawData) {
      return {
        className: rawData.className,
        emissions: rawData.emissions as ParticleEmission[],
      };
    }

    const classNameKey = findEntityByClassName(candidate, entities);
    if (classNameKey) {
      const matched = entities[classNameKey];
      return {
        className: matched.className,
        emissions: matched.emissions as ParticleEmission[],
      };
    }
  }

  return null;
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

  const condition = emission.condition.trim();
  if (!condition) return true;

  const evaluatePart = (expr: string): boolean => {
    const trimmed = expr.trim();
    if (!trimmed) return true;
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
    if (trimmed.includes("=")) {
      const [rawKey, expectedRaw] = trimmed.split("=");
      if (!rawKey || expectedRaw === undefined) return true;
      const key = rawKey.trim().toLowerCase();
      const expected = expectedRaw.trim();
      return props[key] === expected;
    }
    const key = trimmed.toLowerCase();
    return props[key] === "true";
  };

  const orGroups = condition.split("||").map((group) => group.trim()).filter(Boolean);
  return orGroups.some((group) => {
    const andParts = group.split("&&").map((part) => part.trim()).filter(Boolean);
    if (andParts.length === 0) return true;
    return andParts.every((part) => evaluatePart(part));
  });
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
  const {blocks} = getParticleDataSync();

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
