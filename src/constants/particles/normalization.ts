import type {
  ParticlePhysics,
  ParticleEmission,
  SpawnedParticle,
  ParticleData,
  ParticlePhysicsMap,
} from "./types";

export function normalizeSpawnedParticles(
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

function normalizeField<T>(camelCase: T | undefined, snake_case: T | undefined): T | null {
  return camelCase ?? snake_case ?? null;
}

export function normalizeParticlePhysics(raw: ParticlePhysics): ParticlePhysics {
  return {
    ...raw,
    lifetimeTicks: raw.lifetimeTicks ?? (Array.isArray(raw.lifetime) ? raw.lifetime : null),
    hasPhysics: normalizeField(raw.hasPhysics, raw.has_physics),
    quadSize: raw.quadSize ?? (typeof raw.size === "number" ? raw.size : null),
    baseAlpha: normalizeField(raw.baseAlpha, raw.alpha),
    velocityMultiplier: normalizeField(raw.velocityMultiplier, raw.velocity_multiplier),
    velocityAdd: normalizeField(raw.velocityAdd, raw.velocity_add),
    velocityJitter: normalizeField(raw.velocityJitter, raw.velocity_jitter),
    colorScale: normalizeField(raw.colorScale, raw.color_scale),
    lifetimeBase: normalizeField(raw.lifetimeBase, raw.lifetime_base),
    lifetimeAnimation: normalizeField(raw.lifetimeAnimation, raw.lifetime_animation),
    tickVelocityDelta: normalizeField(raw.tickVelocityDelta, raw.tick_velocity_delta),
    skipsFriction: normalizeField(raw.skipsFriction, raw.skips_friction),
    usesStaticTexture: normalizeField(raw.usesStaticTexture, raw.uses_static_texture),
    spawnsParticles: normalizeSpawnedParticles(
      raw.spawnsParticles ?? raw.spawns_particles ?? null,
    ),
  };
}

export function extractRandomClause(expr: string): string {
  const parts = expr.split("||").flatMap((part) => part.split("&&"));
  for (const part of parts) {
    if (/(nextInt|nextFloat|nextDouble|Math\.random|random)/.test(part)) {
      return part.trim();
    }
  }
  return expr.trim();
}

export function stripLeadingNot(expr: string): string {
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

export function mergeConditions(
  base: string | null | undefined,
  extra: string | null | undefined,
): string | null {
  if (!base && !extra) return null;
  if (!base) return extra ?? null;
  if (!extra) return base ?? null;
  if (base === extra) return base;
  return `${base} && ${extra}`;
}

export function isCampfireBlock(ownerId?: string): boolean {
  return Boolean(ownerId && ownerId.includes("campfire"));
}

export function detectLoopIndexVar(exprs: Array<string | null | undefined>): string | null {
  for (const expr of exprs) {
    if (!expr) continue;
    const itemsMatch = expr.match(/items\.get\(\s*(\$\d+)/);
    if (itemsMatch) return itemsMatch[1];
    const floorMatch = expr.match(/floorMod\(\s*(\$\d+)/) ?? expr.match(/Math\.floorMod\(\s*(\$\d+)/);
    if (floorMatch) return floorMatch[1];
  }
  return null;
}

export function looksLikeCampfireSlotExpr(exprs: Array<string | null | undefined>): boolean {
  return exprs.some(
    (expr) =>
      !!expr &&
      (expr.includes("Direction.from2DDataValue") ||
        expr.includes("CampfireBlock.FACING") ||
        expr.includes("getClockWise")),
  );
}

function normalizeItemSlotProbability(probabilityExpr: string | null): string | null {
  if (!probabilityExpr || !probabilityExpr.includes("items.get(")) {
    return probabilityExpr;
  }

  const randomClause = extractRandomClause(probabilityExpr);
  return stripLeadingNot(randomClause);
}

function normalizeEmissionSource(
  emissionSource: string | null,
  ownerIsCampfire: boolean,
): string | null {
  if (emissionSource === "makeParticles") {
    return ownerIsCampfire ? "particleTick" : "animateTick";
  }
  if (emissionSource === "addParticlesAndSound") {
    return "animateTick";
  }
  return emissionSource;
}

function normalizeCampfireLoopCount(
  loopCountExpr: string | null,
  loopIndexVar: string | null,
  positionExpr: string[] | null,
  ownerId?: string,
): string | null {
  if (
    loopCountExpr &&
    ownerId?.includes("campfire") &&
    /items\s*\.\s*size\s*\(\s*\)/.test(loopCountExpr)
  ) {
    return "4";
  }
  if (loopCountExpr || !loopIndexVar) return loopCountExpr;

  const looksLikeCampfire = looksLikeCampfireSlotExpr(positionExpr ?? []);
  if (looksLikeCampfire && ownerId?.includes("campfire")) {
    return "4";
  }
  return loopCountExpr;
}

function isCampfireCookingSmoke(
  particleId: string,
  positionExpr: string[] | null,
  loopCountExpr: string | null,
  ownerId?: string,
): boolean {
  if (!ownerId?.includes("campfire")) return false;
  if (particleId !== "smoke") return false;
  if (looksLikeCampfireSlotExpr(positionExpr ?? [])) return true;
  return Boolean(loopCountExpr && /items\s*\.\s*size\s*\(\s*\)/.test(loopCountExpr));
}

function applyCampfireParticleTick(params: {
  condition: string | null;
  probabilityExpr: string | null;
  countExpr: string | null;
  particleId: string;
  isCampfireSmoke: boolean;
  rawEmissionSource: string | null;
}): { condition: string | null; probabilityExpr: string | null; countExpr: string | null } {
  let { condition, probabilityExpr, countExpr } = params;
  const { particleId, isCampfireSmoke, rawEmissionSource } = params;

  condition = mergeConditions(condition, "lit=true");

  if (isCampfireSmoke) {
    probabilityExpr = probabilityExpr ?? "rand() < 0.11";
    countExpr = countExpr ?? "randInt(2) + 2";
  } else if (particleId === "smoke" && rawEmissionSource === "makeParticles") {
    probabilityExpr = "false";
  }

  return { condition, probabilityExpr, countExpr };
}

interface NormalizedEmissionState {
  condition: string | null;
  probabilityExpr: string | null;
  countExpr: string | null;
  loopCountExpr: string | null;
  loopIndexVar: string | null;
  emissionSource: string | null;
}

function initializeEmissionState(
  raw: ParticleEmission,
  extended: ParticleEmission & {
    probability_expr?: string | null;
    count_expr?: string | null;
    loop_count_expr?: string | null;
    loop_index_var?: string | null;
    emission_source?: string | null;
  },
): Omit<NormalizedEmissionState, 'emissionSource' | 'loopCountExpr'> & { rawEmissionSource: string | null } {
  return {
    condition: raw.condition ?? null,
    probabilityExpr: raw.probabilityExpr ?? extended.probability_expr ?? null,
    countExpr: raw.countExpr ?? extended.count_expr ?? null,
    loopIndexVar: raw.loopIndexVar ?? extended.loop_index_var ?? null,
    rawEmissionSource: raw.emissionSource ?? extended.emission_source ?? null,
  };
}

function detectAndNormalizeLoopVar(
  state: { probabilityExpr: string | null; loopIndexVar: string | null },
  positionExpr: string[] | null,
  velocityExpr: string[] | null,
): string | null {
  return state.loopIndexVar ?? detectLoopIndexVar([
    state.probabilityExpr,
    ...(positionExpr ?? []),
    ...(velocityExpr ?? []),
  ]);
}

function applyCampfireSignalCondition(
  condition: string | null,
  particleId: string,
): string | null {
  const signalCondition =
    particleId === "campfire_signal_smoke"
      ? "signal_fire=true"
      : "signal_fire=false";
  return mergeConditions(condition, signalCondition);
}

function applyCampfireNormalization(
  state: NormalizedEmissionState,
  particleId: string,
  isCampfireSmoke: boolean,
  ownerId?: string,
): NormalizedEmissionState {
  const ownerIsCampfire = isCampfireBlock(ownerId);

  if (ownerIsCampfire && state.emissionSource === "particleTick") {
    const result = applyCampfireParticleTick({
      condition: state.condition,
      probabilityExpr: state.probabilityExpr,
      countExpr: state.countExpr,
      particleId,
      isCampfireSmoke,
      rawEmissionSource: state.emissionSource,
    });
    state.condition = result.condition;
    state.probabilityExpr = result.probabilityExpr;
    state.countExpr = result.countExpr;
  }

  if (ownerIsCampfire && isCampfireSmoke) {
    state.condition = applyCampfireSignalCondition(state.condition, particleId);
  }

  return state;
}

function processLoopVariables(
  initial: ReturnType<typeof initializeEmissionState>,
  extended: ParticleEmission & {
    loop_count_expr?: string | null;
    position_expr?: [string, string, string] | null;
    velocity_expr?: [string, string, string] | null;
  },
  raw: ParticleEmission,
  ownerId?: string,
): { loopCountExpr: string | null; loopIndexVar: string | null; probabilityExpr: string | null } {
  const positionExpr = raw.positionExpr ?? extended.position_expr ?? null;
  const velocityExpr = raw.velocityExpr ?? extended.velocity_expr ?? null;
  const probabilityExpr = normalizeItemSlotProbability(initial.probabilityExpr);
  const loopIndexVar = detectAndNormalizeLoopVar(
    { probabilityExpr, loopIndexVar: initial.loopIndexVar },
    positionExpr,
    velocityExpr,
  );
  const loopCountExpr = normalizeCampfireLoopCount(
    raw.loopCountExpr ?? extended.loop_count_expr ?? null,
    loopIndexVar,
    positionExpr,
    ownerId,
  );
  return { loopCountExpr, loopIndexVar, probabilityExpr };
}

export function normalizeParticleEmission(
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
    particle_id?: string;
  };

  const positionExpr = raw.positionExpr ?? extended.position_expr ?? null;
  const initial = initializeEmissionState(raw, extended);
  const { loopCountExpr, loopIndexVar, probabilityExpr } = processLoopVariables(
    initial,
    extended,
    raw,
    ownerId,
  );

  const ownerIsCampfire = isCampfireBlock(ownerId);
  const emissionSource = normalizeEmissionSource(initial.rawEmissionSource, ownerIsCampfire);
  const particleId = raw.particleId ?? extended.particle_id ?? "";
  const isCampfireSmoke = particleId === "campfire_signal_smoke" || particleId === "campfire_cosy_smoke";

  let state = applyCampfireNormalization(
    {
      condition: initial.condition,
      probabilityExpr,
      countExpr: initial.countExpr,
      loopCountExpr,
      loopIndexVar,
      emissionSource,
    },
    particleId,
    isCampfireSmoke,
    ownerId,
  );

  if (isCampfireCookingSmoke(particleId, positionExpr, loopCountExpr, ownerId)) {
    state.condition = mergeConditions(state.condition, "cooking=true");
  }

  if (initial.rawEmissionSource === "extinguish") {
    state = { ...state, probabilityExpr: "false" };
  }

  return {
    ...raw,
    condition: state.condition ?? undefined,
    probabilityExpr: state.probabilityExpr ?? undefined,
    countExpr: state.countExpr ?? undefined,
    loopCountExpr: state.loopCountExpr ?? undefined,
    loopIndexVar: state.loopIndexVar ?? undefined,
    emissionSource: state.emissionSource ?? undefined,
  };
}

export function normalizeParticleData(raw: ParticleData): ParticleData {
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
