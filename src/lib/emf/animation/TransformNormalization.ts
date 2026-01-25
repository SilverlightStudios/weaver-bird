/**
 * Transform Normalization
 *
 * Handles initialization of translation/rotation normalization for CEM animations.
 */

import type { AnimationContext, BoneTransform } from "./types";
import type { BoneMap, BaseTransformMap } from "./boneController";
import { isConstantExpression } from "./expressionParser";
import { isBoneTransformProperty } from "./boneController";
import type { CompiledAnimation } from "./AnimationCompiler";
import {
  captureBaselines,
  detectConstantChannels,
  detectDirectRotationCopies,
  propagateDependencies,
} from "./baselineCapture";
import {
  collectCrossReads,
  findDerivedFromInputOnlyBones,
  findPoseDependentChannels,
  findSmallSharedTyChannels,
} from "./crossReadAnalysis";
import { normalizeTranslationAxes } from "./translationNormalization";
import { normalizeRotationAxes, applyDirectRotationCopyOverrides } from "./rotationNormalization";
import type * as THREE from "three";

export interface NormalizationParams {
  animationLayers: CompiledAnimation[][];
  bones: BoneMap;
  modelGroup: THREE.Group;
  baseTransforms: BaseTransformMap;
  translationAxesByBone: Map<string, Set<"x" | "y" | "z">>;
  rotationAxesByBone: Map<string, Set<"x" | "y" | "z">>;
  selfRotationReads: Map<string, Set<"rx" | "ry" | "rz">>;
  restBoneValues: Record<string, Record<string, number>>;
  applyVanillaRotationInputSeeding: (context: AnimationContext) => void;
  evaluateLayersToTransforms: (context: AnimationContext) => Map<string, BoneTransform>;
  getBaselineBoneValue: (boneName: string, property: string) => number;
}

export interface NormalizationResult {
  baselineBoneValues: Map<string, number>;
  baselineBoneValuesWater: Map<string, number>;
}

/**
 * Initialize transform normalization for CEM animations
 */
export function initializeTransformNormalization(params: NormalizationParams): NormalizationResult {
  const {
    animationLayers,
    bones,
    modelGroup,
    baseTransforms,
    translationAxesByBone,
    rotationAxesByBone,
    selfRotationReads,
    restBoneValues,
    applyVanillaRotationInputSeeding,
    evaluateLayersToTransforms,
  } = params;

  const { baselineBoneValues, baselineBoneValuesWater, altBaselineValues } = captureBaselines({
    restBoneValues,
    applyVanillaRotationInputSeeding,
    evaluateLayersToTransforms,
  });
  const baselineLookup = (boneName: string, prop: string) =>
    baselineBoneValues.get(`${boneName}.${prop}`) ?? 0;

  const isConstantByChannel = detectConstantChannels(
    animationLayers,
    isConstantExpression,
    isBoneTransformProperty,
  );
  const directRotationCopyTargets = detectDirectRotationCopies(animationLayers);

  const { translationCrossReads, translationChannelDeps } = collectCrossReads(animationLayers);

  const derivedFromInputOnly = findDerivedFromInputOnlyBones(
    translationChannelDeps,
    bones,
    modelGroup,
    translationAxesByBone,
  );

  const poseDependentChannels = findPoseDependentChannels(
    translationCrossReads,
    baselineBoneValues,
    altBaselineValues,
  );
  propagateDependencies(poseDependentChannels, translationChannelDeps);

  const smallSharedTyChannels = findSmallSharedTyChannels(
    translationCrossReads,
    baselineBoneValues,
  );
  propagateDependencies(smallSharedTyChannels, translationChannelDeps);

  normalizeTranslationAxes({
    bones,
    modelGroup,
    baseTransforms,
    translationAxesByBone,
    getBaselineBoneValue: baselineLookup,
    isConstantByChannel,
    poseDependentChannels,
    derivedFromInputOnly,
    smallSharedTyChannels,
  });

  normalizeRotationAxes({
    bones,
    baseTransforms,
    rotationAxesByBone,
    selfRotationReads,
    baselineBoneValues,
    baselineBoneValuesWater,
    directRotationCopyTargets,
    getBaselineBoneValue: baselineLookup,
  });

  applyDirectRotationCopyOverrides(directRotationCopyTargets, bones, baseTransforms);

  return {
    baselineBoneValues,
    baselineBoneValuesWater,
  };
}
