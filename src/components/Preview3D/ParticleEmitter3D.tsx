import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  ParticleEngine,
  loadParticleTextures,
  type LoadedParticleTexture,
  type SpawnTextureConfig,
} from "@lib/particle";
import { getParticlePhysics } from "@constants/particles";
import { compileMinecraftExpr, type CompiledMinecraftExpr } from "@lib/particle/minecraftExpr";
import { useSelectPack, useSelectWinner } from "@state/selectors";
import { useStore } from "@state";

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
const ANIMATE_TICK_SAMPLE_COUNT = 667;
const ANIMATE_TICK_SAMPLE_VOLUME = 32 * 32 * 32;
const ANIMATE_TICK_BASE_CHANCE =
  1 - Math.pow(1 - 1 / ANIMATE_TICK_SAMPLE_VOLUME, ANIMATE_TICK_SAMPLE_COUNT);
const ANIMATE_TICK_SAMPLE_CHANCE = ANIMATE_TICK_BASE_CHANCE * 5.0;

function useCompiledTriplet(
  expr?: [string, string, string],
  blockProps?: Record<string, string>,
  loopIndexVar?: string,
) {
  return useMemo(() => {
    if (!expr) return null;
    const fns = expr.map((e) =>
      compileMinecraftExpr(e, blockProps, loopIndexVar),
    ) as Array<CompiledMinecraftExpr | null>;
    if (fns.some((f) => !f)) return null;
    return fns as [CompiledMinecraftExpr, CompiledMinecraftExpr, CompiledMinecraftExpr];
  }, [expr?.[0], expr?.[1], expr?.[2], blockProps, loopIndexVar]);
}

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
  emissionSource,
}: ParticleEmitter3DProps): JSX.Element | null {
  console.log(`[ParticleEmitter3D] Render: particleType=${particleType}, enabled=${enabled}, emissionRate=${emissionRate}, emissionSource=${emissionSource}`);

  const particleDataReady = useStore((state) => state.particleDataReady);
  const engineRef = useRef<ParticleEngine | null>(null);
  const [texture, setTexture] = useState<LoadedParticleTexture | null>(null);
  const [spawnTextures, setSpawnTextures] = useState<Record<string, SpawnTextureConfig>>({});
  const accumulator = useRef(0);

  const positionFns = useCompiledTriplet(positionExpr, blockProps, loopIndexVar);
  const velocityFns = useCompiledTriplet(velocityExpr, blockProps, loopIndexVar);

  const spawnParticleTypes = useMemo(() => {
    if (!particleDataReady) return [];
    const physics = getParticlePhysics(particleType);
    const spawns = physics?.spawnsParticles ?? physics?.spawns_particles;
    if (!spawns || spawns.length === 0) return [];
    const ids = spawns
      .map((spawn) => spawn.particleId ?? spawn.particle_id ?? "")
      .filter((id) => id.length > 0);
    return Array.from(new Set(ids));
  }, [particleType, particleDataReady]);

  const spawnKey = useMemo(() => spawnParticleTypes.join("|"), [spawnParticleTypes]);

  // Compile probability and count expressions (single expressions, not triplets)
  const probabilityFn = useMemo(() => {
    if (!probabilityExpr) return null;
    return compileMinecraftExpr(probabilityExpr, blockProps, loopIndexVar);
  }, [probabilityExpr, blockProps, loopIndexVar]);

  const countFn = useMemo(() => {
    if (!countExpr) return null;
    return compileMinecraftExpr(countExpr, blockProps, loopIndexVar);
  }, [countExpr, blockProps, loopIndexVar]);

  const loopCountFn = useMemo(() => {
    if (!loopCountExpr) return null;
    return compileMinecraftExpr(loopCountExpr, blockProps, loopIndexVar);
  }, [loopCountExpr, blockProps, loopIndexVar]);

  const probabilityInvalid = Boolean(probabilityExpr) && !probabilityFn;
  const countInvalid = Boolean(countExpr) && !countFn;
  const loopCountInvalid = Boolean(loopCountExpr) && !loopCountFn;

  console.log(`[ParticleEmitter3D] Expression compilation for ${particleType}:`, {
    hasPositionExpr: !!positionExpr,
    positionFns: !!positionFns,
    hasVelocityExpr: !!velocityExpr,
    velocityFns: !!velocityFns,
    positionExpr,
    velocityExpr,
  });

  const invalidExpressions =
    (positionExpr && !positionFns) ||
    (velocityExpr && !velocityFns) ||
    probabilityInvalid ||
    countInvalid ||
    loopCountInvalid;

  const winnerPackId = useSelectWinner(`minecraft:particle/${particleType}`);
  // Fallback to vanilla pack if no winner found (particles may not be registered in pack system)
  const effectivePackId = winnerPackId || "minecraft:vanilla";
  const winnerPack = useSelectPack(effectivePackId);

  console.log(`[ParticleEmitter3D] Pack resolution for ${particleType}:`, {
    winnerPackId,
    effectivePackId,
    winnerPackPath: winnerPack?.path,
    winnerPackIsZip: winnerPack?.is_zip,
  });

  useEffect(() => {
    if (invalidExpressions) {
      if (engineRef.current) {
        console.log(`[ParticleEmitter3D] Disposing ParticleEngine for ${particleType}`);
        engineRef.current.dispose();
        engineRef.current = null;
      }
      return;
    }
    console.log(`[ParticleEmitter3D] Creating ParticleEngine for ${particleType}`);
    const engine = new ParticleEngine("medium");
    engine.setSpawnTextureMap(spawnTextures);
    engineRef.current = engine;
    console.log(`[ParticleEmitter3D] ParticleEngine created successfully for ${particleType}`);
    return () => {
      console.log(`[ParticleEmitter3D] Disposing ParticleEngine for ${particleType}`);
      engine.dispose();
      engineRef.current = null;
    };
  }, [particleType, invalidExpressions]);

  useEffect(() => {
    console.log(`[ParticleEmitter3D] Loading textures for ${particleType}, pack=${winnerPack?.path}`);
    let cancelled = false;
    (async () => {
      const loaded = await loadParticleTextures(
        particleType,
        winnerPack?.path,
        winnerPack?.is_zip,
      ).catch((err) => {
        console.error(`[ParticleEmitter3D] Failed to load textures for ${particleType}:`, err);
        return null;
      });

      console.log(`[ParticleEmitter3D] Texture load result for ${particleType}:`, {
        loaded: !!loaded,
        textureCount: loaded?.textures?.length,
        tint: loaded?.tint,
      });

      if (!cancelled) {
        setTexture(loaded?.textures?.length ? loaded : null);
      }
    })();
    return () => { cancelled = true; };
  }, [particleType, winnerPack?.path, winnerPack?.is_zip]);

  useEffect(() => {
    let cancelled = false;
    if (!spawnKey) {
      setSpawnTextures({});
      return () => { cancelled = true; };
    }

    (async () => {
      const entries = await Promise.all(
        spawnParticleTypes.map(async (spawnType) => {
          const loaded = await loadParticleTextures(
            spawnType,
            winnerPack?.path,
            winnerPack?.is_zip,
          ).catch(() => null);
          if (!loaded?.textures?.length) return null;
          return [
            spawnType,
            {
              textures: loaded.textures,
              frameDuration: loaded.frameDuration,
              tint: loaded.tint,
            } satisfies SpawnTextureConfig,
          ] as const;
        }),
      );

      if (cancelled) return;

      const map: Record<string, SpawnTextureConfig> = {};
      for (const entry of entries) {
        if (entry) {
          map[entry[0]] = entry[1];
        }
      }
      setSpawnTextures(map);
    })();

    return () => { cancelled = true; };
  }, [spawnKey, spawnParticleTypes, winnerPack?.path, winnerPack?.is_zip]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setSpawnTextureMap(spawnTextures);
  }, [spawnTextures]);

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

        // For animateTick emissions, apply Minecraft's random block sampling
        // Minecraft samples 667 blocks out of 32×32×32 blocks per tick (~2.01% chance per block)
        // This is part of the game's actual behavior - animateTick is NOT called every tick
        // The probability expressions (like "nextInt(5) == 0") happen INSIDE animateTick
        if (emissionSource === "animateTick") {
          const roll = Math.random();
          if (roll > ANIMATE_TICK_SAMPLE_CHANCE) {
            continue; // Block not sampled this tick
          }
        }
        // particleTick emissions are called every tick (no sampling needed)

        const rawLoopCount = loopCountFn ? loopCountFn(rand, 0) : 1;
        const loopCount = Number.isFinite(rawLoopCount)
          ? Math.max(0, Math.trunc(rawLoopCount))
          : 0;

        if (loopCount === 0) continue;

        for (let loopIndex = 0; loopIndex < loopCount; loopIndex++) {
          // Check emission probability (if expression provided)
          if (probabilityFn) {
            const shouldSpawn = probabilityFn(rand, loopIndex);
            // Probability expressions return boolean-like values (0/1 or true/false)
            // For expressions like "nextInt(5) == 0", result is 1 (true) or 0 (false)
            if (!shouldSpawn) continue;
          }
          // If no probabilityExpr, spawn every tick (100% probability)

          // Determine particle count
          let particleCount = 1; // Default: spawn 1 particle per tick
          if (countFn) {
            const rawCount = countFn(rand, loopIndex);
            particleCount = Number.isFinite(rawCount)
              ? Math.max(0, Math.trunc(rawCount))
              : 0;
            if (particleType === "lava") {
              console.log(`[ParticleEmitter3D] Lava count: rawCount=${rawCount}, particleCount=${particleCount}, countExpr="${countExpr}"`);
            }
          }
          // If no countExpr, spawn exactly 1 particle (no random batching)

          // Spawn particles
          if (particleCount === 0) continue;
          for (let i = 0; i < particleCount; i++) {
            let x = position[0];
            let y = position[1];
            let z = position[2];
            if (positionFns) {
              x = positionFns[0](rand, loopIndex) - 0.5;
              y = positionFns[1](rand, loopIndex);
              z = positionFns[2](rand, loopIndex) - 0.5;
            }

            let vx = velocity[0];
            let vy = velocity[1];
            let vz = velocity[2];
            if (velocityFns) {
              vx = velocityFns[0](rand, loopIndex);
              vy = velocityFns[1](rand, loopIndex);
              vz = velocityFns[2](rand, loopIndex);
            }

            tmpPos.set(x, y, z);
            engine.emit({
              position: tmpPos,
              particleType,
              count: 1,
              textures: texture.textures,
              tint: tint ?? texture.tint,
              frameDuration: texture.frameDuration,
              velocity: [vx, vy, vz],
              scale,
            });
          }
        }
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

  if (!texture || !engineRef.current) {
    console.log(`[ParticleEmitter3D] Not rendering ${particleType}:`, {
      hasTexture: !!texture,
      hasEngine: !!engineRef.current,
    });
    return null;
  }

  console.log(`[ParticleEmitter3D] Rendering ${particleType} emitter`);
  return <primitive object={engineRef.current.getObject3D()} />;
}
