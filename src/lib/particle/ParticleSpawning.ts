import type { ParticlePhysics } from "@constants/particles";
import type { CompiledMinecraftExpr } from "./minecraftExpr";
import {
  normalizeProbabilityExpr,
  compileSpawnExpressions,
  extractSpawnFields,
} from "./ParticleSpawningHelpers";

export interface SpawnRuntime {
  particleType: string;
  probabilityFn: CompiledMinecraftExpr | null;
  countFn: CompiledMinecraftExpr | null;
}

/**
 * Get compiled spawn runtimes from physics data
 */
export function getSpawnRuntimes(
  particleType: string,
  physics: ParticlePhysics,
  cache: Map<string, SpawnRuntime[]>
): SpawnRuntime[] {
  const cached = cache.get(particleType);
  if (cached) return cached;

  const spawns = physics.spawnsParticles ?? physics.spawns_particles;
  if (!spawns || spawns.length === 0) {
    cache.set(particleType, []);
    return [];
  }

  const runtimes: SpawnRuntime[] = [];
  for (const spawn of spawns) {
    const { spawnType, rawProbabilityExpr, countExpr } = extractSpawnFields(spawn);
    if (!spawnType) continue;

    const probabilityExpr = normalizeProbabilityExpr(particleType, rawProbabilityExpr);
    const { probabilityFn, countFn, isValid } = compileSpawnExpressions(probabilityExpr, countExpr);

    if (!isValid) continue;

    runtimes.push({
      particleType: spawnType,
      probabilityFn,
      countFn,
    });
  }

  cache.set(particleType, runtimes);
  return runtimes;
}

/**
 * Check if child particles should spawn and return spawn configurations
 */
export function evaluateChildSpawns(
  runtimes: SpawnRuntime[],
  context: { age: number; lifetime: number }
): Array<{ particleType: string; count: number }> {
  const spawns: Array<{ particleType: string; count: number }> = [];

  for (const spawn of runtimes) {
    if (spawn.probabilityFn) {
      const shouldSpawn = spawn.probabilityFn(Math.random, 0, context);
      if (!shouldSpawn) continue;
    }

    let count = 1;
    if (spawn.countFn) {
      const rawCount = spawn.countFn(Math.random, 0, context);
      count = Number.isFinite(rawCount) ? Math.max(0, Math.trunc(rawCount)) : 0;
    }

    if (count > 0) {
      spawns.push({ particleType: spawn.particleType, count });
    }
  }

  return spawns;
}
