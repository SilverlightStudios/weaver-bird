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
 * Evaluate a position expression to get a numeric value
 * Handles simple expressions like "0.5", "random()", "pos.getX() + 0.5"
 */
function evaluatePositionExpr(
  expr: string | undefined,
  axis: "x" | "y" | "z",
  _blockProps: Record<string, string>,
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
    let processed = expr
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
    // eslint-disable-next-line no-new-func
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
 * "minecraft:block/campfire" -> "minecraft:campfire"
 */
function assetIdToBlockId(assetId: string): string {
  const blockStateId = getBlockStateIdFromAssetId(assetId);
  return blockStateId.replace(/:block\//, ":");
}

/**
 * Convert asset ID to entity ID format
 * "minecraft:entity/zombie" -> "minecraft:zombie"
 */
function assetIdToEntityId(assetId: string): string {
  return assetId.replace(/^minecraft:entity\//, "minecraft:");
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

  // Get active emissions
  const activeEmissions = useMemo(() => {
    if (!particleDataReady) {
      return [];
    }

    const emissionId = isEntity
      ? assetIdToEntityId(assetId)
      : assetIdToBlockId(assetId);

    const emissions = isEntity
      ? getEntityEmissions(emissionId)
      : getBlockEmissions(emissionId);

    if (!emissions) {
      return [];
    }

    return emissions.emissions.filter((emission: ParticleEmission) =>
      isEmissionConditionMet(emission, effectiveProps),
    );
  }, [assetId, effectiveProps, particleDataReady, isEntity]);

  // Get showEmissionPoints from store
  const showEmissionPoints = useStore((state) => state.showEmissionPoints);

  // Don't render if no active emissions or disabled
  if (!enabled || activeEmissions.length === 0) {
    return null;
  }

  return (
    <group>
      {activeEmissions.map((emission: ParticleEmission, index: number) => {
        // Convert particle options color (0-1 range) to tint (0-255 range)
        const tint = emission.options?.color
          ? ([
              emission.options.color[0] * 255,
              emission.options.color[1] * 255,
              emission.options.color[2] * 255,
            ] as [number, number, number])
          : undefined;

        return (
          <ParticleEmitter3D
            key={`${emission.particleId}-${index}`}
            particleType={emission.particleId}
            emissionRate={emission.rate}
            positionExpr={emission.positionExpr}
            velocityExpr={emission.velocityExpr}
            probabilityExpr={emission.probabilityExpr}
            countExpr={emission.countExpr}
            loopCountExpr={emission.loopCountExpr}
            loopIndexVar={emission.loopIndexVar}
            blockProps={effectiveProps}
            tint={tint}
            scale={emission.options?.scale}
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

    const emissions = isEntity
      ? getEntityEmissions(emissionId)
      : getBlockEmissions(emissionId);

    return emissions !== null && emissions.emissions.length > 0;
  }, [assetId, particleDataReady]);
}
