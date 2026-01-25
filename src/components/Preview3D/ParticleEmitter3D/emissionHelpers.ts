/**
 * Helper functions for particle emission logic to reduce complexity
 */
import type * as THREE from "three";
import type { CompiledMinecraftExpr, MinecraftExprContext } from "@lib/particle/minecraftExpr";

const ANIMATE_TICK_SAMPLE_COUNT = 667;
const ANIMATE_TICK_SAMPLE_VOLUME = 32 * 32 * 32;
const ANIMATE_TICK_BASE_CHANCE =
  1 - Math.pow(1 - 1 / ANIMATE_TICK_SAMPLE_VOLUME, ANIMATE_TICK_SAMPLE_COUNT);
export const ANIMATE_TICK_SAMPLE_CHANCE = ANIMATE_TICK_BASE_CHANCE * 5.0;

/**
 * Check if animateTick should fire this tick (Minecraft's random block sampling)
 */
export function shouldSampleAnimateTick(): boolean {
  return Math.random() <= ANIMATE_TICK_SAMPLE_CHANCE;
}

/**
 * Calculate loop count from expression or default to 1
 */
export function calculateLoopCount(
  loopCountFn: CompiledMinecraftExpr | null,
  rand: () => number,
): number {
  if (!loopCountFn) return 1;

  const rawLoopCount = loopCountFn(rand, 0);
  return Number.isFinite(rawLoopCount)
    ? Math.max(0, Math.trunc(rawLoopCount))
    : 0;
}

/**
 * Check if particle should spawn based on probability expression
 */
export function shouldSpawnParticle(
  probabilityFn: CompiledMinecraftExpr | null,
  rand: () => number,
  loopIndex: number,
): boolean {
  if (!probabilityFn) return true; // No probability check = always spawn

  const shouldSpawn = probabilityFn(rand, loopIndex);
  // Probability expressions return boolean-like values (0/1 or true/false)
  return Boolean(shouldSpawn);
}

/**
 * Calculate particle count from expression or default to 1
 */
export function calculateParticleCount(
  countFn: CompiledMinecraftExpr | null,
  rand: () => number,
  loopIndex: number,
  particleType: string,
  countExpr?: string,
): number {
  if (!countFn) return 1; // Default: spawn 1 particle

  const rawCount = countFn(rand, loopIndex);
  const particleCount = Number.isFinite(rawCount)
    ? Math.max(0, Math.trunc(rawCount))
    : 0;

  if (particleType === "lava") {
    console.log(
      `[ParticleEmitter3D] Lava count: rawCount=${rawCount}, particleCount=${particleCount}, countExpr="${countExpr}"`,
    );
  }

  return particleCount;
}

/**
 * Calculate emission position from expression or fallback to default
 */
export function calculatePosition(
  positionFns: [CompiledMinecraftExpr, CompiledMinecraftExpr, CompiledMinecraftExpr] | null,
  defaultPosition: [number, number, number],
  rand: () => number,
  loopIndex: number,
  context?: MinecraftExprContext,
  centered: boolean = true,
): [number, number, number] {
  if (!positionFns) {
    return defaultPosition;
  }

  const x = positionFns[0](rand, loopIndex, context);
  const y = positionFns[1](rand, loopIndex, context);
  const z = positionFns[2](rand, loopIndex, context);

  if (!centered) {
    return [x, y, z];
  }

  return [x - 0.5, y, z - 0.5];
}

/**
 * Calculate emission velocity from expression or fallback to default
 */
export function calculateVelocity(
  velocityFns: [CompiledMinecraftExpr, CompiledMinecraftExpr, CompiledMinecraftExpr] | null,
  defaultVelocity: [number, number, number],
  rand: () => number,
  loopIndex: number,
  context?: MinecraftExprContext,
): [number, number, number] {
  if (!velocityFns) {
    return defaultVelocity;
  }

  return [
    velocityFns[0](rand, loopIndex, context),
    velocityFns[1](rand, loopIndex, context),
    velocityFns[2](rand, loopIndex, context),
  ];
}

export interface EmitParticleParams {
  position: [number, number, number];
  velocity: [number, number, number];
  particleType: string;
  textures: THREE.Texture[];
  tint?: [number, number, number];
  frameDuration: number;
  scale?: number;
}

/**
 * Emit a single particle
 */
export function emitParticle(
  engine: { emit: (params: EmitParticleParams) => void },
  tmpPos: THREE.Vector3,
  params: EmitParticleParams,
) {
  const [x, y, z] = params.position;
  tmpPos.set(x, y, z);
  engine.emit({
    position: tmpPos,
    particleType: params.particleType,
    count: 1,
    textures: params.textures,
    tint: params.tint,
    frameDuration: params.frameDuration,
    velocity: params.velocity,
    scale: params.scale,
  });
}

export interface ProcessTickParams {
  emissionSource?: string;
  loopCountFn: CompiledMinecraftExpr | null;
  probabilityFn: CompiledMinecraftExpr | null;
  countFn: CompiledMinecraftExpr | null;
  positionFns: [CompiledMinecraftExpr, CompiledMinecraftExpr, CompiledMinecraftExpr] | null;
  velocityFns: [CompiledMinecraftExpr, CompiledMinecraftExpr, CompiledMinecraftExpr] | null;
  position: [number, number, number];
  velocity: [number, number, number];
  particleType: string;
  countExpr?: string;
  exprContext?: MinecraftExprContext;
  centered?: boolean;
  texture: {
    textures: THREE.Texture[];
    tint?: [number, number, number];
    frameDuration: number;
  };
  tint?: [number, number, number];
  scale?: number;
  engine: { emit: (params: EmitParticleParams) => void };
  tmpPos: THREE.Vector3;
  rand: () => number;
}

/**
 * Process a single Minecraft tick for particle emissions
 */
export function processTick(params: ProcessTickParams): void {
  const {
    emissionSource,
    loopCountFn,
    probabilityFn,
    countFn,
    positionFns,
    velocityFns,
    position,
    velocity,
  particleType,
  countExpr,
  exprContext,
  centered = true,
  texture,
  tint,
  scale,
    engine,
    tmpPos,
    rand,
  } = params;

  // For animateTick emissions, apply Minecraft's random block sampling
  if (emissionSource === "animateTick" && !shouldSampleAnimateTick()) {
    return; // Block not sampled this tick
  }

  const loopCount = calculateLoopCount(loopCountFn, rand);
  if (loopCount === 0) return;

  for (let loopIndex = 0; loopIndex < loopCount; loopIndex++) {
    if (!shouldSpawnParticle(probabilityFn, rand, loopIndex)) {
      continue;
    }

    const particleCount = calculateParticleCount(
      countFn,
      rand,
      loopIndex,
      particleType,
      countExpr,
    );
    if (particleCount === 0) continue;

    for (let i = 0; i < particleCount; i++) {
      const pos = calculatePosition(positionFns, position, rand, loopIndex, exprContext, centered);
      const vel = calculateVelocity(velocityFns, velocity, rand, loopIndex, exprContext);

      emitParticle(engine, tmpPos, {
        position: pos,
        velocity: vel,
        particleType,
        textures: texture.textures,
        tint: tint ?? texture.tint,
        frameDuration: texture.frameDuration,
        scale,
      });
    }
  }
}
