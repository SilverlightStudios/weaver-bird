/**
 * EntityParticles - Wrapper component that emits particles for an entity
 *
 * Queries the entity-to-particle mappings and spawns appropriate
 * ParticleEmitter3D instances based on entity state conditions.
 */

import { useMemo } from "react";
import {
  getEntityEmissions,
  isEmissionConditionMet,
  type ParticleEmission,
} from "@constants/particles";
import { ParticleEmitter3D } from "./ParticleEmitter3D";
import { useStore } from "@state";
import type { MinecraftExprContext } from "@lib/particle/minecraftExpr";

export interface EntityParticlesProps {
  /** Entity asset ID (e.g., "minecraft:entity/zombie") */
  assetId: string;
  /** Entity state properties for condition matching (if any) */
  entityProps?: Record<string, string>;
  /** Whether particle emission is enabled */
  enabled?: boolean;
}

/**
 * Convert asset ID to entity ID format
 * "minecraft:entity/zombie" -> "minecraft:zombie"
 */
function assetIdToEntityId(assetId: string): string {
  // Entity assets are like "minecraft:entity/zombie"
  // Entity IDs are like "minecraft:zombie"
  return assetId.replace(/^minecraft:entity\//, "minecraft:");
}

/**
 * EntityParticles component
 *
 * Automatically determines which particles an entity should emit
 * based on the entity ID and current state properties.
 */
export function EntityParticles({
  assetId,
  entityProps = {},
  enabled = true,
}: EntityParticlesProps): JSX.Element | null {
  console.log(`[EntityParticles] Render: assetId=${assetId}, enabled=${enabled}`);

  // Subscribe to particleDataReady to re-render when caches load
  const particleDataReady = useStore((state) => state.particleDataReady);
  const entityParticleBounds = useStore((state) => state.entityParticleBoundsByAssetId[assetId]);
  console.log(`[EntityParticles] particleDataReady=${particleDataReady}`);

  const activeEmissions = useMemo(() => {
    console.log(
      `[EntityParticles.activeEmissions] Computing for assetId=${assetId}, particleDataReady=${particleDataReady}`,
    );

    // Don't query if particle data isn't ready yet
    if (!particleDataReady) {
      console.log(
        `[EntityParticles.activeEmissions] Particle data not ready, returning empty array`,
      );
      return [];
    }

    const entityId = assetIdToEntityId(assetId);
    console.log(`[EntityParticles.activeEmissions] Converted to entityId=${entityId}`);

    const entityEmissions = getEntityEmissions(entityId);
    console.log(
      `[EntityParticles.activeEmissions] getEntityEmissions result:`,
      entityEmissions,
    );

    if (!entityEmissions) {
      console.log(
        `[EntityParticles.activeEmissions] No emissions found for entity ${entityId}`,
      );
      return [];
    }

    const filtered = entityEmissions.emissions.filter((emission: ParticleEmission) =>
      isEmissionConditionMet(emission, entityProps),
    );
    console.log(
      `[EntityParticles.activeEmissions] Filtered ${filtered.length} emissions (from ${entityEmissions.emissions.length} total)`,
    );

    return filtered;
  }, [assetId, entityProps, particleDataReady]);
  const exprContext = useMemo((): MinecraftExprContext | undefined => {
    const base = entityParticleBounds?.base ?? { x: 0, y: 0, z: 0 };
    const size = entityParticleBounds?.size ?? { x: 1, y: 1, z: 1 };
    return {
      position: base,
      dimensions: {
        width: size.x || 1,
        height: size.y || 1,
        depth: size.z || size.x || 1,
      },
    };
  }, [entityParticleBounds]);
  const entityPosition = exprContext?.position
    ? [exprContext.position.x, exprContext.position.y, exprContext.position.z] as [number, number, number]
    : undefined;

  // Don't render if no active emissions or disabled
  if (!enabled || activeEmissions.length === 0) {
    console.log(
      `[EntityParticles] Not rendering: enabled=${enabled}, activeEmissions.length=${activeEmissions.length}`,
    );
    return null;
  }

  console.log(`[EntityParticles] Rendering ${activeEmissions.length} particle emitters`);

  return (
    <group>
      {activeEmissions.map((emission: ParticleEmission, index: number) => {
        console.log(
          `[EntityParticles] Creating emitter ${index + 1}/${activeEmissions.length} for particle: ${emission.particleId}`,
        );

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
            emissionRate={emission.rate}
            position={entityPosition}
            positionExpr={emission.positionExpr ?? undefined}
            velocityExpr={emission.velocityExpr ?? undefined}
            probabilityExpr={emission.probabilityExpr}
            countExpr={emission.countExpr}
            loopCountExpr={emission.loopCountExpr}
            loopIndexVar={emission.loopIndexVar}
            blockProps={entityProps} // Reuse blockProps for entity state
            tint={tint}
            scale={emission.options?.scale ?? undefined}
            exprContext={exprContext}
            centered={false}
            enabled={enabled}
          />
        );
      })}
    </group>
  );
}

/**
 * Hook to check if an entity has particle emissions
 */
export function useEntityHasParticles(assetId: string): boolean {
  const particleDataReady = useStore((state) => state.particleDataReady);

  return useMemo(() => {
    if (!particleDataReady) return false;
    const entityId = assetIdToEntityId(assetId);
    const entityEmissions = getEntityEmissions(entityId);
    return entityEmissions !== null && entityEmissions.emissions.length > 0;
  }, [assetId, particleDataReady]);
}
