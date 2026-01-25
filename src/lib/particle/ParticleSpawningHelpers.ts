import { compileMinecraftExpr, type CompiledMinecraftExpr } from "./minecraftExpr";

export function normalizeProbabilityExpr(
  particleType: string,
  rawProbabilityExpr: string | undefined,
): string | undefined {
  if (!rawProbabilityExpr) return undefined;

  if (particleType === "lava" && rawProbabilityExpr.includes("$$0")) {
    return rawProbabilityExpr.replace(/\$\$0/g, "this.age / this.lifetime");
  }

  return rawProbabilityExpr;
}

export function compileSpawnExpressions(
  probabilityExpr: string | undefined,
  countExpr: string | undefined,
): {
  probabilityFn: CompiledMinecraftExpr | null;
  countFn: CompiledMinecraftExpr | null;
  isValid: boolean;
} {
  const probabilityFn = probabilityExpr ? compileMinecraftExpr(probabilityExpr) : null;
  const countFn = countExpr ? compileMinecraftExpr(countExpr) : null;

  const isValid =
    (!probabilityExpr || probabilityFn !== null) &&
    (!countExpr || countFn !== null);

  return { probabilityFn, countFn, isValid };
}

export function extractSpawnFields(spawn: Record<string, unknown>): {
  spawnType: string | undefined;
  rawProbabilityExpr: string | undefined;
  countExpr: string | undefined;
} {
  const spawnType = (spawn.particleId ?? spawn.particle_id) as string | undefined;
  const rawProbabilityExpr = (spawn.probabilityExpr ?? spawn.probability_expr) as string | undefined;
  const countExpr = (spawn.countExpr ?? spawn.count_expr) as string | undefined;

  return { spawnType, rawProbabilityExpr, countExpr };
}
