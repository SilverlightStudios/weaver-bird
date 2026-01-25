/**
 * JEM to Three.js Converter
 *
 * Converts parsed JEM entity models to Three.js scene graphs following
 * Blockbench's exact positioning and hierarchy logic.
 */

import * as THREE from "three";
import { applyBoneTransformHandlers } from "./boneTransformHandlers";
import { applyVanillaHierarchy } from "./jemHierarchy";
import type { ParsedEntityModel } from "./jemLoader";
import { convertPart } from "./jemThreeJSHelpers";
import { log } from "./jemUtilities";
import {
  configureTextures,
  hasZeroedBodyTranslation as checkZeroedBodyTranslation,
  markHumanoidLimbSemantics,
  detectQuadruped,
  markQuadrupedLimbSemantics,
  collectAnimatedBones,
  hasNegativeHead2TyBaseline as checkNegativeHead2TyBaseline,
  refreshRestPositions,
} from "./jemThreeJSConverterUtils";

export function jemToThreeJS(
  model: ParsedEntityModel,
  texture: THREE.Texture | null,
  textureMap: Record<string, THREE.Texture> = {},
  entityId?: string,
): THREE.Group {
  const root = new THREE.Group();
  root.name = "jem_entity";

  configureTextures(texture, textureMap);
  log.section("Converting to Three.js");

  const materialCache = new Map<string, THREE.MeshStandardMaterial>();
  const rootGroups: Record<string, THREE.Group> = {};
  for (const part of model.parts) {
    const group = convertPart(part, texture, textureMap, materialCache, null);
    root.add(group);
    rootGroups[group.name] = group;
  }

  // Mark translation semantics for humanoid limbs
  markHumanoidLimbSemantics(rootGroups);

  // Mark translation semantics for quadruped limbs
  const { isQuadruped, legNames } = detectQuadruped(rootGroups);
  const hasHorseFamilyRig = isQuadruped && !!root.getObjectByName("neck2");
  if (isQuadruped) {
    const hasZeroedBody = checkZeroedBodyTranslation(model);
    markQuadrupedLimbSemantics(rootGroups, legNames, hasZeroedBody);
  }

  // Collect animated bones and their references
  const { animatedBones, referencedBonesByTarget, referencedTranslationBonesByTarget } =
    collectAnimatedBones(model);

  // Apply implicit vanilla hierarchy for common skeletons
  applyVanillaHierarchy(
    root,
    rootGroups,
    animatedBones,
    referencedBonesByTarget,
    referencedTranslationBonesByTarget,
    entityId,
  );

  // Refresh rest positions after hierarchy adjustments
  refreshRestPositions(root);

  // Fix translation semantics for specific animated submodels
  const hasNegativeHead2TyBaseline = checkNegativeHead2TyBaseline(model, isQuadruped);

  root.traverse((obj) => {
    if (!(obj instanceof THREE.Group)) return;
    applyBoneTransformHandlers({ obj, isQuadruped, hasHorseFamilyRig, hasNegativeHead2TyBaseline });
  });

  log.hierarchy(root);
  return root;
}

