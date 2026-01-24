/**
 * Translation Normalization
 *
 * Normalizes translation channels by detecting absolute vs additive semantics
 * and computing baseline offsets for proper animation application.
 */

import type * as THREE from "three";
import type { BoneWithUserData } from "@/lib/emf/types";
import { createBoneNormalizationContext } from "./translationNormalizationHelpers";
import {
  detectAbsoluteSemantics,
  computeAdditiveOffsets,
} from "./translationNormalizationProcessing";

type Axis = "x" | "y" | "z";

export interface TranslationNormalizationConfig {
  bones: Map<string, THREE.Object3D>;
  modelGroup: THREE.Group;
  baseTransforms: Map<string, { position: THREE.Vector3; rotation: THREE.Euler; scale: THREE.Vector3 }>;
  translationAxesByBone: Map<string, Set<Axis>>;
  getBaselineBoneValue: (boneName: string, prop: string) => number;
  isConstantByChannel: Map<string, boolean>;
  poseDependentChannels: Set<string>;
  derivedFromInputOnly: Set<string>;
  smallSharedTyChannels: Set<string>;
}

/**
 * Normalize translation channels for all animated bones.
 */
export function normalizeTranslationAxes(config: TranslationNormalizationConfig): void {
  const {
    bones,
    modelGroup,
    baseTransforms,
    translationAxesByBone,
    getBaselineBoneValue,
    isConstantByChannel,
    poseDependentChannels,
    derivedFromInputOnly,
    smallSharedTyChannels,
  } = config;

  for (const [boneName, axesSet] of translationAxesByBone) {
    const bone = bones.get(boneName);
    if (!bone) continue;

    const userData = ((bone as BoneWithUserData).userData ?? {}) as Record<string, unknown>;
    const isRoot = bone.parent === modelGroup;

    const boneContext = createBoneNormalizationContext(
      boneName,
      bone,
      userData,
      isRoot,
      baseTransforms,
      getBaselineBoneValue,
    );

    // First pass: detect absolute translation semantics
    detectAbsoluteSemantics(axesSet, boneContext);

    // Second pass: compute additive offsets for non-absolute channels
    computeAdditiveOffsets(
      boneName,
      bone,
      userData,
      isRoot,
      axesSet,
      boneContext,
      isConstantByChannel,
      poseDependentChannels,
      derivedFromInputOnly,
      smallSharedTyChannels,
    );

    (bone as BoneWithUserData).userData = userData;
  }
}
