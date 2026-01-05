import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  ParticleEngine,
  loadParticleTextures,
  type LoadedParticleTexture,
} from "@lib/particle";
import { useSelectPack, useSelectWinner } from "@state/selectors";

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
  /** Block state props for evaluating direction-based expressions (e.g., wall torches) */
  blockProps?: Record<string, string>;
  /** Optional per-emission tint override [r,g,b] 0-255 */
  tint?: [number, number, number];
  /** Optional per-emission size scale multiplier */
  scale?: number;
}

type Axis = "X" | "Y" | "Z";

function oppositeDirection(dir: string): string | null {
  switch (dir) {
    case "north":
      return "south";
    case "south":
      return "north";
    case "west":
      return "east";
    case "east":
      return "west";
    case "up":
      return "down";
    case "down":
      return "up";
    default:
      return null;
  }
}

function directionStep(dir: string, axis: Axis): number | null {
  switch (dir) {
    case "north":
      return axis === "Z" ? -1 : 0;
    case "south":
      return axis === "Z" ? 1 : 0;
    case "west":
      return axis === "X" ? -1 : 0;
    case "east":
      return axis === "X" ? 1 : 0;
    case "up":
      return axis === "Y" ? 1 : 0;
    case "down":
      return axis === "Y" ? -1 : 0;
    default:
      return null;
  }
}

function normalizeDirectionPropertyKey(propName: string, blockProps?: Record<string, string>): string {
  const key = propName.toLowerCase();
  if (!blockProps) return key;
  if (key in blockProps) return key;
  // Common constant names that still map to the `facing` state key.
  if (key.endsWith("_facing") && "facing" in blockProps) return "facing";
  if (key.endsWith("_direction") && "facing" in blockProps) return "facing";
  return key;
}

function replaceDirectionSteps(js: string, blockProps?: Record<string, string>): string | null {
  // If we can't resolve direction steps exactly, fail compilation so we don't render inaccurate particles.
  if (!/getStep[XYZ]\s*\(/.test(js)) return js;
  if (!blockProps) return null;

  let failed = false;

  const replaceStateSteps = (pattern: RegExp): void => {
    js = js.replace(pattern, (_m, propName: string, oppositeFlag: string | undefined, axis: Axis) => {
      const key = normalizeDirectionPropertyKey(propName, blockProps);
      const raw = blockProps[key]?.toLowerCase();
      if (!raw) {
        failed = true;
        return "0";
      }
      const dir = oppositeFlag ? oppositeDirection(raw) : raw;
      const step = dir ? directionStep(dir, axis) : null;
      if (step === null) {
        failed = true;
        return "0";
      }
      return String(step);
    });
  };

  // (state.getValue(FACING).getOpposite()).getStepX()
  replaceStateSteps(
    /\(\s*[A-Za-z_$][A-Za-z0-9_$]*\.getValue\s*\(\s*(\w+)\s*\)\s*(\.getOpposite\s*\(\s*\))?\s*\)\s*\.getStep([XYZ])\s*\(\s*\)/g,
  );
  // state.getValue(FACING).getOpposite().getStepX()
  replaceStateSteps(
    /[A-Za-z_$][A-Za-z0-9_$]*\.getValue\s*\(\s*(\w+)\s*\)\s*(\.getOpposite\s*\(\s*\))?\s*\.getStep([XYZ])\s*\(\s*\)/g,
  );

  // Direction.NORTH.getOpposite().getStepX()
  js = js.replace(
    /Direction\s*\.\s*(\w+)\s*(\.getOpposite\s*\(\s*\))?\s*\.getStep([XYZ])\s*\(\s*\)/g,
    (_m, dirName: string, oppositeFlag: string | undefined, axis: Axis) => {
      const raw = dirName.toLowerCase();
      const dir = oppositeFlag ? oppositeDirection(raw) : raw;
      const step = dir ? directionStep(dir, axis) : null;
      if (step === null) {
        failed = true;
        return "0";
      }
      return String(step);
    },
  );

  if (failed) return null;
  // If any step access is still present, we don't know how to evaluate it safely.
  if (/getStep[XYZ]\s*\(/.test(js)) return null;

  return js;
}

function compileMinecraftExpr(
  expr: string,
  blockProps?: Record<string, string>,
): ((rand: () => number) => number) | null {
  const js = expr
    .replace(/\(double\)|\(float\)|\(int\)/g, "")
    // Replace BlockPos-style getters (pos.getX/getY/getZ). Identifiers may include `$` (CFR $$0 vars).
    .replace(/[A-Za-z_$][A-Za-z0-9_$]*\.get[XYZ]\(\)/g, "0")
    // Replace Minecraft RandomSource calls with our injected RNG.
    .replace(/[A-Za-z_$][A-Za-z0-9_$]*\.nextBoolean\(\)/g, "(rand() > 0.5)")
    .replace(/[A-Za-z_$][A-Za-z0-9_$]*\.(?:nextFloat|nextDouble)\(\)/g, "rand()")
    .replace(/Math\.random\(\)/g, "rand()")
    .replace(/(\d(?:[\d.]*)(?:[eE][+-]?\d+)?)[dDfF]\b/g, "$1")
    .trim();

  const processed = replaceDirectionSteps(js, blockProps);
  if (!processed) return null;

  // Allow only numeric expressions plus our `rand()` helper, ternary operators, and comparison operators.
  // Supports: numbers, operators (+,-,*,/), parentheses, rand(), ternary (?:), comparisons (>,<,=,!), and scientific notation (e/E).
  if (!/^[0-9+\-*/().\srandEe><=!?:]+$/.test(processed)) return null;

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("rand", `"use strict"; return (${processed});`) as (
      rand: () => number,
    ) => number;
    return (rand) => Number(fn(rand));
  } catch {
    return null;
  }
}

function useCompiledTriplet(
  expr?: [string, string, string],
  blockProps?: Record<string, string>,
) {
  return useMemo(() => {
    if (!expr) return null;
    const fns = expr.map((e) => compileMinecraftExpr(e, blockProps)) as Array<
      ((rand: () => number) => number) | null
    >;
    if (fns.some((f) => !f)) return null;
    return fns as [(rand: () => number) => number, (rand: () => number) => number, (rand: () => number) => number];
  }, [expr?.[0], expr?.[1], expr?.[2], blockProps]);
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
  blockProps,
  tint,
  scale,
}: ParticleEmitter3DProps): JSX.Element | null {
  console.log(`[ParticleEmitter3D] Render: particleType=${particleType}, enabled=${enabled}, emissionRate=${emissionRate}`);

  const engineRef = useRef<ParticleEngine | null>(null);
  const [texture, setTexture] = useState<LoadedParticleTexture | null>(null);
  const accumulator = useRef(0);

  const positionFns = useCompiledTriplet(positionExpr, blockProps);
  const velocityFns = useCompiledTriplet(velocityExpr, blockProps);

  // Compile probability and count expressions (single expressions, not triplets)
  const probabilityFn = useMemo(() => {
    if (!probabilityExpr) return null;
    return compileMinecraftExpr(probabilityExpr, blockProps);
  }, [probabilityExpr, blockProps]);

  const countFn = useMemo(() => {
    if (!countExpr) return null;
    return compileMinecraftExpr(countExpr, blockProps);
  }, [countExpr, blockProps]);

  console.log(`[ParticleEmitter3D] Expression compilation for ${particleType}:`, {
    hasPositionExpr: !!positionExpr,
    positionFns: !!positionFns,
    hasVelocityExpr: !!velocityExpr,
    velocityFns: !!velocityFns,
    positionExpr,
    velocityExpr,
  });

  const invalidExpressions =
    (positionExpr && !positionFns) || (velocityExpr && !velocityFns);

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

        // Check emission probability (if expression provided)
        if (probabilityFn) {
          const shouldSpawn = probabilityFn(rand);
          // Probability expressions return boolean-like values (0/1 or true/false)
          // For expressions like "nextInt(5) == 0", result is 1 (true) or 0 (false)
          if (!shouldSpawn) continue;
        }
        // If no probabilityExpr, spawn every tick (100% probability)

        // Determine particle count
        let particleCount = 1; // Default: spawn 1 particle per tick
        if (countFn) {
          particleCount = Math.max(1, Math.round(countFn(rand)));
        }
        // If no countExpr, spawn exactly 1 particle (no random batching)

        // Spawn particles
        for (let i = 0; i < particleCount; i++) {
          let x = position[0];
          let y = position[1];
          let z = position[2];
          if (positionFns) {
            x = positionFns[0](rand) - 0.5;
            y = positionFns[1](rand);
            z = positionFns[2](rand) - 0.5;
          }

          let vx = velocity[0];
          let vy = velocity[1];
          let vz = velocity[2];
          if (velocityFns) {
            vx = velocityFns[0](rand);
            vy = velocityFns[1](rand);
            vz = velocityFns[2](rand);
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

    engine.update(delta);
  });

  if (invalidExpressions) {
    console.log(`[ParticleEmitter3D] Expression compilation FAILED for ${particleType}:`, {
      positionExpr,
      positionFns: !!positionFns,
      velocityExpr,
      velocityFns: !!velocityFns,
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
