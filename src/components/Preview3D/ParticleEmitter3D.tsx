import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSelectPack, useSelectWinner } from "@state/selectors";
import { useStore } from "@state";
import { useParticleTexture, useSpawnParticleTextures } from "./hooks/useParticleTextures";
import { useParticleEngine } from "./hooks/useParticleEngine";
import { processTick } from "./ParticleEmitter3D/emissionHelpers";
import { useCompiledExpressions } from "./ParticleEmitter3D/useCompiledExpressions";
import type { MinecraftExprContext } from "@lib/particle/minecraftExpr";

export interface ParticleEmitter3DProps {
  particleType: string;
  enabled?: boolean;
  /** Particles per second (deprecated - use probabilityExpr and countExpr instead) */
  emissionRate?: number;
  /** Centered scene position (x/z already centered) */
  position?: [number, number, number];
  /** Minecraft animateTick position args (x,y,z) */
  positionExpr?: [string, string, string];
  /** Minecraft addParticle velocity args (blocks/tick) */
  velocity?: [number, number, number];
  /** Minecraft animateTick velocity args (vx,vy,vz) */
  velocityExpr?: [string, string, string];
  /** Emission probability expression (e.g., "nextInt(5) == 0") */
  probabilityExpr?: string;
  /** Particle count expression (e.g., "nextInt(1) + 1") */
  countExpr?: string;
  /** Optional loop count expression when a for-loop index appears in expressions */
  loopCountExpr?: string;
  /** Loop index variable token (e.g., "$7") when used in expressions */
  loopIndexVar?: string;
  /** Block state props for evaluating direction-based expressions (e.g., wall torches) */
  blockProps?: Record<string, string>;
  /** Optional per-emission tint override [r,g,b] 0-255 */
  tint?: [number, number, number];
  /** Optional per-emission size scale multiplier */
  scale?: number;
  /** Optional context for expression evaluation */
  exprContext?: MinecraftExprContext;
  /** Whether to center X/Z for block coordinates */
  centered?: boolean;
  /** Which method this emission comes from (determines call rate):
   * - "animateTick": ~2% per tick (random block sampling)
   * - "particleTick": 100% per tick (called every tick)
   */
  emissionSource?: string;
}

// Minecraft's animateTick sampling mechanics:
// - Every tick, 667 random block positions are sampled in each chunk section (32×32×32 volume)
// - Base probability per block: 1 - (1 - 1/32768)^667 ≈ 2.04%
//
// This 2.04% is correct for Minecraft's world where thousands of blocks compete for sampling.
// However, in our single-block preview, this creates an artificially low spawn rate because:
// 1. Players focusing on one campfire in-game see it sampled more frequently in practice
// 2. Our preview has no competing blocks - it's always "in focus"
// 3. The base 2.04% gives campfire lava: 0.0816 particles/sec (1 every ~12 seconds)
//
// Investigation findings (see detailed analysis):
// - Campfire lava particles spawn ONLY from animateTick (not block entity)
// - Probability: 20% when animateTick fires (nextInt(5) == 0)
// - Count: Always exactly 1 particle (nextInt(1) + 1)
// - NO burst mechanism - observed "bursts" are pure Poisson distribution clustering
// - Rate calculation: 20 tps × 2.04% sample × 20% probability × 1 count = 0.0816/sec
//
// For single-block preview, we apply 5x multiplier to match player experience:
// - Base rate: 0.0816 particles/sec (too sparse for preview)
// - With 5x: 0.408 particles/sec (1 every ~2.4 seconds) - better represents focused observation
// Constants moved to emissionHelpers.ts

export function ParticleEmitter3D({
  particleType,
  enabled = true,
  emissionRate = 0,
  position = [0, 0, 0],
  positionExpr,
  velocity = [0, 0, 0],
  velocityExpr,
  probabilityExpr,
  countExpr,
  loopCountExpr,
  loopIndexVar,
  blockProps,
  tint,
  scale,
  exprContext,
  centered = true,
  emissionSource,
}: ParticleEmitter3DProps): JSX.Element | null {
  console.log(`[ParticleEmitter3D] Render: particleType=${particleType}, enabled=${enabled}, emissionRate=${emissionRate}, emissionSource=${emissionSource}`);

  const particleDataReady = useStore((state) => state.particleDataReady);

  const {
    positionFns,
    velocityFns,
    probabilityFn,
    countFn,
    loopCountFn,
    probabilityInvalid,
    countInvalid,
    loopCountInvalid,
    invalidExpressions,
  } = useCompiledExpressions(
    positionExpr,
    velocityExpr,
    probabilityExpr,
    countExpr,
    loopCountExpr,
    blockProps,
    loopIndexVar,
  );

  console.log(`[ParticleEmitter3D] Expression compilation for ${particleType}:`, {
    hasPositionExpr: !!positionExpr,
    positionFns: !!positionFns,
    hasVelocityExpr: !!velocityExpr,
    velocityFns: !!velocityFns,
    positionExpr,
    velocityExpr,
  });

  const winnerPackId = useSelectWinner(`minecraft:particle/${particleType}`);
  const effectivePackId = winnerPackId ?? "minecraft:vanilla";
  const winnerPack = useSelectPack(effectivePackId);

  console.log(`[ParticleEmitter3D] Pack resolution for ${particleType}:`, {
    winnerPackId,
    effectivePackId,
    winnerPackPath: winnerPack?.path,
    winnerPackIsZip: winnerPack?.is_zip,
  });

  const texture = useParticleTexture(particleType, winnerPack);
  const spawnTextures = useSpawnParticleTextures(particleType, particleDataReady, winnerPack);
  const { engineRef, engineReady, object3D } = useParticleEngine(particleType, invalidExpressions, spawnTextures);

  const accumulator = useRef(0);
  const tmpPos = useMemo(() => new THREE.Vector3(), []);
  const rand = Math.random;

  useFrame((_, delta) => {
    const engine = engineRef.current;
    if (!engine || !texture || invalidExpressions) return;

    if (enabled) {
      // Minecraft tick rate: 20Hz (20 ticks per second)
      accumulator.current += delta * 20;
      while (accumulator.current >= 1) {
        accumulator.current -= 1;
        processTick({
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
          centered,
          texture,
          tint,
          scale,
          engine,
          tmpPos,
          rand,
        });
      }
    }

    engine.update(delta);
  });

  if (invalidExpressions) {
    console.log(`[ParticleEmitter3D] Expression compilation FAILED for ${particleType}:`, {
      positionExpr,
      positionFns: !!positionFns,
      velocityExpr,
      velocityFns: !!velocityFns,
      probabilityExpr,
      probabilityValid: !probabilityInvalid,
      countExpr,
      countValid: !countInvalid,
      loopCountExpr,
      loopCountValid: !loopCountInvalid,
    });
    return null;
  }

  if (!texture || !engineReady || !object3D) {
    console.log(`[ParticleEmitter3D] Not rendering ${particleType}:`, {
      hasTexture: !!texture,
      hasEngine: engineReady,
      hasObject3D: !!object3D,
    });
    return null;
  }

  console.log(`[ParticleEmitter3D] Rendering ${particleType} emitter`);
  return <primitive object={object3D} />;
}
