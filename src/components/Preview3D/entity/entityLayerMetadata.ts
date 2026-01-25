/**
 * Entity layer metadata and validation utilities
 */
import * as THREE from "three";
import type { EntityLayerDefinition } from "@lib/entityComposite";
import type { AnimationLayer } from "@lib/emf/jemLoader";

export function shouldSkipLayer(layer: EntityLayerDefinition, baseBones: Map<string, THREE.Object3D>): boolean {
  const replacements = layer.replacesBaseBones ?? [];
  if (replacements.length === 0) return false;
  for (const name of replacements) {
    const bone = baseBones.get(name);
    if (bone) {
      let found = false;
      bone.traverse((child) => { if (child !== bone && child instanceof THREE.Mesh) found = true; });
      if (found) return true;
    }
  }
  return false;
}

export function storeLayerMetadata(
  layer: EntityLayerDefinition,
  layerOverrides: Record<string, Partial<Record<string, { visible?: boolean }>> | null>,
  layerAliasMaps: Record<string, Record<string, string> | null>,
  layerPositionOffsets: Record<string, Record<string, { x: number; y: number; z: number }> | null>,
  layerScaleMultipliers: Record<string, Record<string, { x: number; y: number; z: number }> | null>,
  layerAnimations: Record<string, AnimationLayer[] | null>,
  layerAnimationEntityIds: Record<string, string | undefined>,
  layerAnimatedBones: Record<string, Set<string>>,
) {
  layerOverrides[layer.id] = layer.boneRenderOverrides ?? null;
  layerAliasMaps[layer.id] = layer.boneAliasMap ?? null;
  layerPositionOffsets[layer.id] = layer.bonePositionOffsets ?? null;
  layerScaleMultipliers[layer.id] = layer.boneScaleMultipliers ?? null;
  layerAnimations[layer.id] = null;
  layerAnimationEntityIds[layer.id] = undefined;
  layerAnimatedBones[layer.id] = new Set<string>();
}
