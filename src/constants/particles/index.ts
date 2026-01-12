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
  ParticlePhysicsMap,
  SpawnedParticle,
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

function normalizeSpawnedParticles(
  spawns?: SpawnedParticle[] | null,
): SpawnedParticle[] | null | undefined {
  if (!spawns) return spawns ?? undefined;
  return spawns.map((spawn) => {
    const raw = spawn as SpawnedParticle & {
      particle_id?: string;
      probability_expr?: string | null;
      count_expr?: string | null;
    };
    return {
      ...spawn,
      particleId: spawn.particleId ?? raw.particle_id ?? "",
      probabilityExpr: spawn.probabilityExpr ?? raw.probability_expr ?? null,
      countExpr: spawn.countExpr ?? raw.count_expr ?? null,
    };
  });
}

function normalizeParticlePhysics(raw: ParticlePhysics): ParticlePhysics {
  const velocityMultiplier =
    raw.velocityMultiplier ?? raw.velocity_multiplier ?? null;
  const velocityAdd = raw.velocityAdd ?? raw.velocity_add ?? null;
  const velocityJitter = raw.velocityJitter ?? raw.velocity_jitter ?? null;
  const colorScale = raw.colorScale ?? raw.color_scale ?? null;
  const lifetimeBase = raw.lifetimeBase ?? raw.lifetime_base ?? null;
  const lifetimeAnimation =
    raw.lifetimeAnimation ?? raw.lifetime_animation ?? null;
  const tickVelocityDelta =
    raw.tickVelocityDelta ?? raw.tick_velocity_delta ?? null;
  const skipsFriction = raw.skipsFriction ?? raw.skips_friction ?? null;
  const usesStaticTexture = raw.usesStaticTexture ?? raw.uses_static_texture ?? null;
  const hasPhysics = raw.hasPhysics ?? raw.has_physics ?? null;
  const quadSize = raw.quadSize ?? (typeof raw.size === "number" ? raw.size : null);
  const baseAlpha = raw.baseAlpha ?? raw.alpha ?? null;
  const lifetimeTicks =
    raw.lifetimeTicks ??
    (Array.isArray(raw.lifetime) ? raw.lifetime : null);
  const spawnsParticles = normalizeSpawnedParticles(
    raw.spawnsParticles ?? raw.spawns_particles ?? null,
  );

  return {
    ...raw,
    lifetimeTicks,
    hasPhysics,
    quadSize,
    baseAlpha,
    velocityMultiplier,
    velocityAdd,
    velocityJitter,
    colorScale,
    lifetimeBase,
    lifetimeAnimation,
    tickVelocityDelta,
    skipsFriction,
    usesStaticTexture,
    spawnsParticles,
  };
}

function extractRandomClause(expr: string): string {
  const parts = expr.split("||").flatMap((part) => part.split("&&"));
  for (const part of parts) {
    if (/(nextInt|nextFloat|nextDouble|Math\.random|random)/.test(part)) {
      return part.trim();
    }
  }
  return expr.trim();
}

function stripLeadingNot(expr: string): string {
  const trimmed = expr.trim();
  if (trimmed.startsWith("!")) {
    const rest = trimmed.slice(1).trim();
    const unwrapped = rest.startsWith("(") && rest.endsWith(")")
      ? rest.slice(1, -1).trim()
      : rest;
    return unwrapped;
  }
  return trimmed;
}

function mergeConditions(
  base: string | null | undefined,
  extra: string | null | undefined,
): string | null | undefined {
  if (!base && !extra) return base ?? extra ?? null;
  if (!base) return extra ?? null;
  if (!extra) return base ?? null;
  if (base === extra) return base;
  return `${base} && ${extra}`;
}

function isCampfireBlock(ownerId?: string): boolean {
  return Boolean(ownerId && ownerId.includes("campfire"));
}

function detectLoopIndexVar(exprs: Array<string | null | undefined>): string | null {
  for (const expr of exprs) {
    if (!expr) continue;
    const itemsMatch = expr.match(/items\.get\(\s*(\$\d+)/);
    if (itemsMatch) return itemsMatch[1];
    const floorMatch = expr.match(/floorMod\(\s*(\$\d+)/) || expr.match(/Math\.floorMod\(\s*(\$\d+)/);
    if (floorMatch) return floorMatch[1];
  }
  return null;
}

function looksLikeCampfireSlotExpr(exprs: Array<string | null | undefined>): boolean {
  return exprs.some(
    (expr) =>
      !!expr &&
      (expr.includes("Direction.from2DDataValue") ||
        expr.includes("CampfireBlock.FACING") ||
        expr.includes("getClockWise")),
  );
}

function normalizeParticleEmission(
  raw: ParticleEmission,
  ownerId?: string,
): ParticleEmission {
  const extended = raw as ParticleEmission & {
    probability_expr?: string | null;
    count_expr?: string | null;
    loop_count_expr?: string | null;
    loop_index_var?: string | null;
    position_expr?: [string, string, string] | null;
    velocity_expr?: [string, string, string] | null;
    emission_source?: string | null;
  };

  let condition = raw.condition ?? null;
  let probabilityExpr = raw.probabilityExpr ?? extended.probability_expr ?? null;
  let countExpr = raw.countExpr ?? extended.count_expr ?? null;
  let loopCountExpr = raw.loopCountExpr ?? extended.loop_count_expr ?? null;
  let loopIndexVar = raw.loopIndexVar ?? extended.loop_index_var ?? null;
  const rawEmissionSource = raw.emissionSource ?? extended.emission_source ?? null;
  let emissionSource = rawEmissionSource;
  const ownerIsCampfire = isCampfireBlock(ownerId);

  const usesItemSlots = Boolean(probabilityExpr && probabilityExpr.includes("items.get("));
  if (ownerId && ownerId.includes("campfire") && usesItemSlots) {
    // Campfire item-slot smoke depends on block entity state; default to empty slots.
    probabilityExpr = "false";
  } else if (probabilityExpr && probabilityExpr.includes("items.get(")) {
    const randomClause = extractRandomClause(probabilityExpr);
    probabilityExpr = stripLeadingNot(randomClause);
  }

  const positionExpr = raw.positionExpr ?? extended.position_expr ?? null;
  const velocityExpr = raw.velocityExpr ?? extended.velocity_expr ?? null;
  if (!loopIndexVar) {
    loopIndexVar = detectLoopIndexVar([
      probabilityExpr,
      ...(positionExpr ?? []),
      ...(velocityExpr ?? []),
    ]);
  }

  if (!loopCountExpr && loopIndexVar && looksLikeCampfireSlotExpr(positionExpr ?? [])) {
    if (ownerId && ownerId.includes("campfire")) {
      loopCountExpr = "4";
    }
  }

  if (emissionSource === "makeParticles") {
    emissionSource = ownerIsCampfire ? "particleTick" : "animateTick";
  }

  const particleId = raw.particleId ?? (raw as { particle_id?: string }).particle_id ?? "";
  const isCampfireSmoke =
    particleId === "campfire_signal_smoke" || particleId === "campfire_cosy_smoke";

  if (ownerIsCampfire && emissionSource === "particleTick") {
    condition = mergeConditions(condition, "lit=true");

    if (isCampfireSmoke) {
      probabilityExpr = probabilityExpr ?? "rand() < 0.11";
      countExpr = countExpr ?? "randInt(2) + 2";
    } else if (particleId === "smoke" && rawEmissionSource === "makeParticles") {
      // Smoke from makeParticles only occurs during extinguish events.
      probabilityExpr = "false";
    }
  }

  if (ownerIsCampfire && isCampfireSmoke) {
    const signalCondition =
      particleId === "campfire_signal_smoke"
        ? "signal_fire=true"
        : "signal_fire=false";
    condition = mergeConditions(condition, signalCondition);
  }

  return {
    ...raw,
    condition: condition ?? undefined,
    probabilityExpr: probabilityExpr ?? undefined,
    countExpr: countExpr ?? undefined,
    loopCountExpr: loopCountExpr ?? undefined,
    loopIndexVar: loopIndexVar ?? undefined,
    emissionSource: emissionSource ?? undefined,
  };
}

function normalizeParticleData(raw: ParticleData): ParticleData {
  const physics: ParticlePhysicsMap = {};
  for (const [id, entry] of Object.entries(raw.physics)) {
    physics[id] = normalizeParticlePhysics(entry);
  }
  const blocks: ParticleData["blocks"] = {};
  for (const [id, entry] of Object.entries(raw.blocks)) {
    blocks[id] = {
      ...entry,
      emissions: entry.emissions.map((emission) =>
        normalizeParticleEmission(emission, id),
      ),
    };
  }
  const entities: ParticleData["entities"] = {};
  for (const [id, entry] of Object.entries(raw.entities)) {
    entities[id] = {
      ...entry,
      emissions: entry.emissions.map((emission) =>
        normalizeParticleEmission(emission, id),
      ),
    };
  }
  const particles = raw.particles ?? {};
  return {
    ...raw,
    physics,
    blocks,
    entities,
    particles,
  };
}

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

  const condition = emission.condition.trim();
  if (!condition) return true;

  const evaluatePart = (expr: string): boolean => {
    const trimmed = expr.trim();
    if (!trimmed) return true;
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
    if (trimmed.includes("=")) {
      const [key, expected] = trimmed.split("=");
      if (!key || expected === undefined) return true;
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
