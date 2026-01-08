/**
 * BlockParticles - Wrapper component that emits particles for a block
 *
 * Queries the block-to-particle mappings and spawns appropriate
 * ParticleEmitter3D instances based on block state conditions.
 */

import { useMemo } from "react";
import {
  getBlockEmissions,
  isEmissionConditionMet,
  type ParticleEmission,
} from "@constants/particles";
import {
  applyNaturalBlockStateDefaults,
  extractBlockStateProperties,
  getBlockStateIdFromAssetId,
} from "@lib/assetUtils";
import { ParticleEmitter3D } from "./ParticleEmitter3D";
import { useStore } from "@state";

export interface BlockParticlesProps {
  /** Block asset ID (e.g., "minecraft:block/campfire") */
  assetId: string;
  /** Block state properties for condition matching (e.g., { lit: "true" }) */
  blockProps?: Record<string, string>;
  /** Whether particle emission is enabled */
  enabled?: boolean;
}

/**
 * Convert asset ID to block ID format
 * "minecraft:block/campfire" -> "minecraft:campfire"
 */
function assetIdToBlockId(assetId: string): string {
  // Reuse the same blockstate normalization logic as the 3D block model preview.
  // `getBlockStateIdFromAssetId` returns `namespace:block/<name>`; block emissions use `namespace:<name>`.
  const blockStateId = getBlockStateIdFromAssetId(assetId);
  return blockStateId.replace(/:block\//, ":");
}

/**
 * BlockParticles component
 *
 * Automatically determines which particles a block should emit
 * based on the block ID and current state properties.
 */
export function BlockParticles({
  assetId,
  blockProps = {},
  enabled = true,
}: BlockParticlesProps): JSX.Element | null {
  console.log(`[BlockParticles] Render: assetId=${assetId}, enabled=${enabled}`);

  // Subscribe to particleDataReady to re-render when caches load
  const particleDataReady = useStore((state) => state.particleDataReady);
  console.log(`[BlockParticles] particleDataReady=${particleDataReady}`);

  // Match BlockModel's property inference/defaulting so conditionals like `lit=true` work.
  const effectiveProps = useMemo(() => {
    const inferredProps = extractBlockStateProperties(assetId);
    let props = { ...inferredProps, ...blockProps };
    props = applyNaturalBlockStateDefaults(props, assetId);
    return props;
  }, [assetId, blockProps]);

  const activeEmissions = useMemo(() => {
    console.log(`[BlockParticles.activeEmissions] Computing for assetId=${assetId}, particleDataReady=${particleDataReady}`);

    // Don't query if particle data isn't ready yet
    if (!particleDataReady) {
      console.log(`[BlockParticles.activeEmissions] Particle data not ready, returning empty array`);
      return [];
    }

    const blockId = assetIdToBlockId(assetId);
    console.log(`[BlockParticles.activeEmissions] Converted to blockId=${blockId}`);

    const blockEmissions = getBlockEmissions(blockId);
    console.log(`[BlockParticles.activeEmissions] getBlockEmissions result:`, blockEmissions);

    if (!blockEmissions) {
      console.log(`[BlockParticles.activeEmissions] No emissions found for block ${blockId}`);
      return [];
    }

    const filtered = blockEmissions.emissions.filter((emission: ParticleEmission) =>
      isEmissionConditionMet(emission, effectiveProps),
    );
    console.log(`[BlockParticles.activeEmissions] Filtered ${filtered.length} emissions (from ${blockEmissions.emissions.length} total)`);

    return filtered;
  }, [assetId, effectiveProps, particleDataReady]);

  // Don't render if no active emissions or disabled
  if (!enabled || activeEmissions.length === 0) {
    console.log(`[BlockParticles] Not rendering: enabled=${enabled}, activeEmissions.length=${activeEmissions.length}`);
    return null;
  }

  console.log(`[BlockParticles] Rendering ${activeEmissions.length} particle emitters`);

  return (
    <group>
      {activeEmissions.map((emission: ParticleEmission, index: number) => {
        console.log(`[BlockParticles] Creating emitter ${index + 1}/${activeEmissions.length} for particle: ${emission.particleId}`);

        // Convert particle options color (0-1 range) to tint (0-255 range)
        const tint = emission.options?.color
          ? [
              emission.options.color[0] * 255,
              emission.options.color[1] * 255,
              emission.options.color[2] * 255,
            ] as [number, number, number]
          : undefined;

        return (
          <ParticleEmitter3D
            key={`${emission.particleId}-${index}`}
            particleType={emission.particleId}
            positionExpr={emission.positionExpr}
            velocityExpr={emission.velocityExpr}
            probabilityExpr={emission.probabilityExpr}
            countExpr={emission.countExpr}
            loopCountExpr={emission.loopCountExpr}
            loopIndexVar={emission.loopIndexVar}
            blockProps={effectiveProps}
            tint={tint}
            scale={emission.options?.scale}
            emissionSource={emission.emissionSource}
            enabled={enabled}
          />
        );
      })}
    </group>
  );
}

/**
 * Hook to check if a block has particle emissions
 */
export function useBlockHasParticles(assetId: string): boolean {
  const particleDataReady = useStore((state) => state.particleDataReady);

  return useMemo(() => {
    if (!particleDataReady) return false;
    const blockId = assetIdToBlockId(assetId);
    const blockEmissions = getBlockEmissions(blockId);
    return blockEmissions !== null && blockEmissions.emissions.length > 0;
  }, [assetId, particleDataReady]);
}
