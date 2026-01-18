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

export function normalizeParticlePhysics(raw: ParticlePhysics): ParticlePhysics {
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
  loopIndexVar ??= detectLoopIndexVar([
    probabilityExpr,
    ...(positionExpr ?? []),
    ...(velocityExpr ?? []),
  ]);

  if (!loopCountExpr && loopIndexVar && looksLikeCampfireSlotExpr(positionExpr ?? [])) {
    if (ownerId && ownerId.includes("campfire")) {
      loopCountExpr = "4";
    }
  }

  if (emissionSource === "makeParticles") {
    emissionSource = ownerIsCampfire ? "particleTick" : "animateTick";
  }
  if (emissionSource === "addParticlesAndSound") {
    emissionSource = "animateTick";
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

  if (rawEmissionSource === "extinguish") {
    probabilityExpr = "false";
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
