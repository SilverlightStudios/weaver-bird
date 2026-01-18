/**
 * ParticleWrapper - Unified component that emits particles for blocks and entities
 *
 * Automatically detects whether the asset is a block or entity and queries
 * the appropriate particle mappings, spawning ParticleEmitter3D instances.
 *
 * Triggers lazy loading of particle data when first rendered.
 */

import { useEffect, useMemo } from "react";
import {
  getBlockEmissions,
  getEntityEmissions,
  isEmissionConditionMet,
  loadParticleData,
  isParticleDataLoaded,
  type ParticleEmission,
} from "@constants/particles";
import {
  applyNaturalBlockStateDefaults,
  extractBlockStateProperties,
  getBlockStateIdFromAssetId,
} from "@lib/assetUtils";
import { ParticleEmitter3D } from "./ParticleEmitter3D";
import { useStore } from "@state";

export interface ParticleWrapperProps {
  /** Asset ID (block or entity, e.g., "minecraft:block/campfire" or "minecraft:entity/enderman") */
  assetId: string;
  /** State properties for condition matching (e.g., { lit: "true" }) */
  stateProps?: Record<string, string>;
  /** Whether particle emission is enabled */
  enabled?: boolean;
}

/**
 * Check if asset ID is an entity
 */
function isEntityAsset(assetId: string): boolean {
  return assetId.includes("entity/");
}

/**
 * Get direction offset for a facing direction
 * Returns the step value for the given axis
 */
function getDirectionStep(facing: string, axis: "x" | "y" | "z"): number {
  const steps: Record<string, { x: number; y: number; z: number }> = {
    north: { x: 0, y: 0, z: -1 },
    south: { x: 0, y: 0, z: 1 },
    west: { x: -1, y: 0, z: 0 },
    east: { x: 1, y: 0, z: 0 },
    up: { x: 0, y: 1, z: 0 },
    down: { x: 0, y: -1, z: 0 },
  };
  return steps[facing]?.[axis] ?? 0;
}

/**
 * Get opposite facing direction
 */
function getOppositeFacing(facing: string): string {
  const opposites: Record<string, string> = {
    north: "south",
    south: "north",
    west: "east",
    east: "west",
    up: "down",
    down: "up",
  };
  return opposites[facing] ?? facing;
}

/**
 * Evaluate a position expression to get a numeric value
 * Handles simple expressions like "0.5", "random()", "pos.getX() + 0.5"
 * Also handles Minecraft facing-based expressions for wall torches:
 *   "$0.getValue(FACING).getOpposite().getStepX()"
 */
function evaluatePositionExpr(
  expr: string | undefined,
  axis: "x" | "y" | "z",
  blockProps: Record<string, string>,
): number {
  if (!expr) {
    // Default positions: center of block
    return axis === "y" ? 0.5 : 0.5;
  }

  // Handle simple numeric values
  const numValue = parseFloat(expr);
  if (!isNaN(numValue) && isFinite(numValue)) {
    return numValue;
  }

  try {
    // Process the expression to make it evaluatable
    let processed = expr;

    // Handle FACING property references (e.g., wall torches)
    // Pattern: ($0.getValue(FACING)).getOpposite().getStepX()
    // or: ($0.getValue(FACING)).getStepZ()
    const facingPattern = /\(\$0\.getValue\(FACING\)\)(\.getOpposite\(\))?\.(getStep[XYZ])\(\)/g;
    processed = processed.replace(facingPattern, (_match, opposite, stepMethod) => {
      const facing = blockProps.facing || "north";
      const actualFacing = opposite ? getOppositeFacing(facing) : facing;
      const stepAxis = stepMethod.slice(7).toLowerCase() as "x" | "y" | "z"; // getStepX -> x
      const step = getDirectionStep(actualFacing, stepAxis);
      return step.toString();
    });

    // Now continue with the standard processing
    processed = processed
      // Remove type casts
      .replace(/\((?:double|float|int|long)\)\s*/g, "")
      // Replace BlockPos getters with 0 (block center in our coordinate system)
      .replace(/[A-Za-z_$][A-Za-z0-9_$]*\.get[XYZ]\(\)/g, "0")
      // Replace random calls with 0.5 (expected center)
      .replace(/[A-Za-z_$][A-Za-z0-9_$]*\.(?:nextFloat|nextDouble)\(\)/g, "0.5")
      .replace(/Math\.random\(\)/g, "0.5")
      // Remove float/double suffixes
      .replace(/(\d+(?:\.\d+)?)[dDfF]\b/g, "$1")
      .trim();

    // Validate that only numeric expressions remain
    if (!/^[0-9+\-*/().\s]+$/.test(processed)) {
      // Expression contains non-numeric characters, can't evaluate
      return 0.5;
    }

    // Evaluate the expression
     
    const result = new Function(`"use strict"; return (${processed});`)() as number;

    if (typeof result === "number" && isFinite(result)) {
      return result;
    }
  } catch {
    // Evaluation failed, fall through to default
  }

  // Default to block center
  return 0.5;
}

/**
 * EmissionPointMarker - Visual marker for particle emission points
 */
interface EmissionPointMarkerProps {
  emission: ParticleEmission;
  blockProps: Record<string, string>;
  color: string;
}

function EmissionPointMarker({
  emission,
  blockProps,
  color,
}: EmissionPointMarkerProps): JSX.Element {
  const position = useMemo(() => {
    const [xExpr, yExpr, zExpr] = emission.positionExpr ?? [
      undefined,
      undefined,
      undefined,
    ];
    return [
      evaluatePositionExpr(xExpr, "x", blockProps),
      evaluatePositionExpr(yExpr, "y", blockProps),
      evaluatePositionExpr(zExpr, "z", blockProps),
    ] as [number, number, number];
  }, [emission.positionExpr, blockProps]);

  return (
    <group position={position}>
      {/* Outer glow sphere */}
      <mesh>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </mesh>
      {/* Inner solid sphere */}
      <mesh>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

/**
 * Convert asset ID to block ID format
 * "minecraft:block/campfire" -> "campfire"
 */
function assetIdToBlockId(assetId: string): string {
  const blockStateId = getBlockStateIdFromAssetId(assetId);
  // Strip namespace and block/ prefix to match generated data keys
  return blockStateId.replace(/^[^:]+:block\//, "");
}

/**
 * Convert asset ID to entity ID format
 * "minecraft:entity/zombie" -> "zombie"
 */
function assetIdToEntityId(assetId: string): string {
  // Strip namespace and entity/ prefix to match generated data keys
  return assetId.replace(/^[^:]+:entity\//, "");
}

/**
 * ParticleWrapper component
 *
 * Automatically determines which particles an asset should emit
 * based on the asset type (block/entity) and current state properties.
 */
export function ParticleWrapper({
  assetId,
  stateProps = {},
  enabled = true,
}: ParticleWrapperProps): JSX.Element | null {
  const isEntity = isEntityAsset(assetId);

  // Subscribe to particleDataReady to re-render when caches load
  const particleDataReady = useStore((state) => state.particleDataReady);
  const setParticleDataReady = useStore((state) => state.setParticleDataReady);

  console.log(`[ParticleWrapper] Rendering for ${assetId}, enabled=${enabled}, particleDataReady=${particleDataReady}`);

  // Trigger lazy loading of particle data when first rendered
  useEffect(() => {
    // Skip if already loaded
    if (isParticleDataLoaded()) {
      if (!particleDataReady) {
        setParticleDataReady(true);
      }
      return;
    }

    // Load particle data lazily
    loadParticleData()
      .then(() => {
        setParticleDataReady(true);
      })
      .catch((error) => {
        console.error("[ParticleWrapper] Failed to load particle data:", error);
      });
  }, [particleDataReady, setParticleDataReady]);

  // Compute effective props (with defaults for blocks)
  const effectiveProps = useMemo(() => {
    if (isEntity) {
      // Entities don't have blockstate defaults
      return stateProps;
    }
    // For blocks, apply property inference and defaults
    const inferredProps = extractBlockStateProperties(assetId);
    let props = { ...inferredProps, ...stateProps };
    props = applyNaturalBlockStateDefaults(props, assetId);
    return props;
  }, [assetId, stateProps, isEntity]);

  // Calculate block ID for special handling (e.g., redstone color tinting)
  const blockId = isEntity ? null : assetIdToBlockId(assetId);

  // Get active emissions
  const activeEmissions = useMemo(() => {
    console.log(`[ParticleWrapper] activeEmissions useMemo called for ${assetId}, particleDataReady=${particleDataReady}`);
    if (!particleDataReady) {
      console.log(`[ParticleWrapper] Particle data not ready yet for ${assetId}`);
      return [];
    }

    const emissionId = isEntity
      ? assetIdToEntityId(assetId)
      : assetIdToBlockId(assetId);

    console.log(`[ParticleWrapper] Looking up emissions for ${emissionId} (isEntity=${isEntity})`);

    const emissions = isEntity
      ? getEntityEmissions(emissionId)
      : getBlockEmissions(emissionId, effectiveProps);

    if (!emissions) {
      console.log(`[ParticleWrapper] No emissions found for ${emissionId}`);
      return [];
    }

    console.log(`[ParticleWrapper] Found ${emissions.emissions.length} emissions for ${emissionId}`);

    return emissions.emissions.filter((emission: ParticleEmission) => {
      // Check standard condition system first
      if (!isEmissionConditionMet(emission, effectiveProps)) {
        return false;
      }

      // Special case: redstone_wire only spawns particles when powered (power > 0)
      // From RedStoneWireBlock.java: if ($4 == 0) return; // where $4 is power level
      if (emissionId === "redstone_wire" && emission.particleId === "dust") {
        const powerStr = effectiveProps.power ?? "0";
        const power = parseInt(powerStr, 10);
        if (isNaN(power) || power <= 0) {
          return false;
        }
      }

      // Special case: redstone_ore and deepslate_redstone_ore only spawn particles when lit=true
      // The extractor currently sets condition=null for these blocks, but Minecraft only spawns
      // particles when the ore is lit (after being clicked/walked on)
      // From RedStoneOreBlock.java: private void spawnParticles(Level level, BlockPos pos) - only called when lit
      if ((emissionId === "redstone_ore" || emissionId === "deepslate_redstone_ore") && emission.particleId === "dust") {
        const lit = effectiveProps.lit ?? "false";
        if (lit !== "true") {
          return false;
        }
      }

      return true;
    });
  }, [assetId, effectiveProps, particleDataReady, isEntity]);

  // Get showEmissionPoints from store
  const showEmissionPoints = useStore((state) => state.showEmissionPoints);

  console.log(`[ParticleWrapper] activeEmissions.length=${activeEmissions.length}, enabled=${enabled}`);

  // Don't render if no active emissions or disabled
  if (!enabled || activeEmissions.length === 0) {
    console.log(`[ParticleWrapper] Returning null - no emissions or disabled`);
    return null;
  }

  // Helper function to calculate redstone wire color based on power level
  // Formula extracted from RedStoneWireBlock.java (Minecraft 1.21.11)
  const getRedstoneColor = (power: number): [number, number, number] => {
    const powerRatio = power / 15.0;
    const r = powerRatio * 0.6 + (powerRatio > 0.0 ? 0.4 : 0.3);
    const g = Math.max(0.0, Math.min(1.0, powerRatio * powerRatio * 0.7 - 0.5));
    const b = Math.max(0.0, Math.min(1.0, powerRatio * powerRatio * 0.6 - 0.7));
    return [r * 255, g * 255, b * 255];
  };

  return (
    <group>
      {activeEmissions.map((emission: ParticleEmission, index: number) => {
        // Determine particle tint color
        let tint: [number, number, number] | undefined;

        // Special handling for redstone_wire: calculate color from power level
        // and add 20% spawn probability (from spawnParticlesAlongLine method)
        let {probabilityExpr} = emission;
        if (blockId === "redstone_wire" && emission.particleId === "dust") {
          const powerStr = effectiveProps.power ?? "0";
          const power = parseInt(powerStr, 10);
          if (!isNaN(power) && power >= 0 && power <= 15) {
            tint = getRedstoneColor(power);
          }
          // RedStoneWireBlock.spawnParticlesAlongLine has 20% spawn probability:
          // if (random.nextFloat() >= 0.2f * range) return;
          // Simplified to 20% probability for preview (average across different ranges)
          probabilityExpr = "nextInt(5) == 0"; // 20% chance
        }
        // Otherwise use emission options color if present
        else if (emission.options?.color) {
          tint = [
            emission.options.color[0] * 255,
            emission.options.color[1] * 255,
            emission.options.color[2] * 255,
          ] as [number, number, number];
        }

        return (
          <ParticleEmitter3D
            key={`${emission.particleId}-${index}`}
            particleType={emission.particleId}
            emissionRate={emission.rate}
            positionExpr={emission.positionExpr ?? undefined}
            velocityExpr={emission.velocityExpr ?? undefined}
            probabilityExpr={probabilityExpr}
            countExpr={emission.countExpr}
            loopCountExpr={emission.loopCountExpr}
            loopIndexVar={emission.loopIndexVar}
            blockProps={effectiveProps}
            tint={tint}
            scale={emission.options?.scale ?? undefined}
            emissionSource={emission.emissionSource}
            enabled={enabled}
          />
        );
      })}

      {/* Emission Point Visualization */}
      {showEmissionPoints &&
        activeEmissions.map((emission: ParticleEmission, index: number) => (
          <EmissionPointMarker
            key={`marker-${emission.particleId}-${index}`}
            emission={emission}
            blockProps={effectiveProps}
            color={
              emission.options?.color
                ? `rgb(${Math.round(emission.options.color[0] * 255)}, ${Math.round(emission.options.color[1] * 255)}, ${Math.round(emission.options.color[2] * 255)})`
                : "#ff0000"
            }
          />
        ))}
    </group>
  );
}

/**
 * Hook to check if an asset has particle emissions
 */
export function useAssetHasParticles(assetId: string): boolean {
  const particleDataReady = useStore((state) => state.particleDataReady);

  return useMemo(() => {
    if (!particleDataReady) return false;

    const isEntity = isEntityAsset(assetId);
    const emissionId = isEntity
      ? assetIdToEntityId(assetId)
      : assetIdToBlockId(assetId);

    // For blocks, compute effectiveProps to handle wall torches correctly
    let blockProps: Record<string, string> | undefined;
    if (!isEntity) {
      const inferredProps = extractBlockStateProperties(assetId);
      blockProps = applyNaturalBlockStateDefaults(inferredProps, assetId);
    }

    const emissions = isEntity
      ? getEntityEmissions(emissionId)
      : getBlockEmissions(emissionId, blockProps);

    return emissions !== null && emissions.emissions.length > 0;
  }, [assetId, particleDataReady]);
}
