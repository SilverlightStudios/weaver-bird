/**
 * Animation Evaluator
 *
 * Evaluates compiled animations and applies transforms to bones.
 */

import * as THREE from "three";
import type { AnimationContext, BoneTransform } from "./types";
import type { BoneMap, BaseTransformMap } from "./boneController";
import {
  resetAllBones,
  isBoneTransformProperty,
  applyBoneTransform,
  createBoneTransform,
  DEBUG_ANIMATIONS,
} from "./boneController";
import { safeEvaluate } from "./expressionEvaluator";
import { cloneRestBoneValues } from "./restBoneValues";
import type { CompiledAnimation } from "./AnimationCompiler";
import { applyVanillaRotationInputSeeding } from "./VanillaInputSeeding";
import {
  applyRigCorrections,
  inferRigCorrections,
  type RigCorrectionState,
} from "./RigCorrections";

export interface EvaluationParams {
  context: AnimationContext;
  animationLayers: CompiledAnimation[][];
  bones: BoneMap;
  baseTransforms: BaseTransformMap;
  restBoneValues: Record<string, Record<string, number>>;
  rotationInputReads: Map<string, Set<"rx" | "ry" | "rz">>;
  rotationInputUsage: Map<string, { bone: boolean; var: boolean }>;
  rotationAxesByBone: Map<string, Set<"x" | "y" | "z">>;
  poseBoneInputOverrides: Record<string, Record<string, number>>;
  triggerBoneInputOverrides: Record<string, Record<string, number>>;
  featureBoneInputOverrides: Record<string, Record<string, number>>;
  rootOverlay: { x: number; y: number; z: number; rx: number; ry: number; rz: number };
  forceRuleIndex: number | null;
  modelGroup: THREE.Group;
  rigCorrectionState: RigCorrectionState;
  baseRootPosition: THREE.Vector3;
  baseRootRotation: THREE.Euler;
  warnedMissingBones: Set<string>;
  entityId?: string;
  hasLoggedAnimationSummary: boolean;
  debugFrameCount: number;
}

export interface EvaluationResult {
  hasLoggedAnimationSummary: boolean;
  debugFrameCount: number;
  rootOverlay: { x: number; y: number; z: number; rx: number; ry: number; rz: number };
}

/**
 * Evaluate animations and apply transforms to bones
 * TODO: High complexity (58) due to comprehensive transform evaluation logic.
 * Consider splitting into: evaluateTransforms(), applyBoneTransforms(), applyRootTransforms()
 */
/* eslint-disable complexity, max-depth */
export function evaluateAndApplyTransforms(params: EvaluationParams): EvaluationResult {
  const {
    context,
    animationLayers,
    bones,
    baseTransforms,
    restBoneValues,
    rotationInputReads,
    rotationInputUsage,
    rotationAxesByBone,
    poseBoneInputOverrides,
    triggerBoneInputOverrides,
    featureBoneInputOverrides,
    rootOverlay,
    forceRuleIndex,
    modelGroup,
    rigCorrectionState,
    baseRootPosition,
    baseRootRotation,
    warnedMissingBones,
    entityId,
  } = params;

  let { hasLoggedAnimationSummary, debugFrameCount } = params;

  resetAllBones(bones, baseTransforms);
  context.boneValues = cloneRestBoneValues(restBoneValues);

  applyVanillaRotationInputSeeding(
    context,
    bones,
    baseTransforms,
    rotationInputReads,
    rotationInputUsage,
    rotationAxesByBone,
  );

  for (const [boneName, props] of Object.entries(poseBoneInputOverrides)) {
    context.boneValues[boneName] = {
      ...(context.boneValues[boneName] ?? {}),
      ...props,
    };
  }
  for (const [boneName, props] of Object.entries(featureBoneInputOverrides)) {
    context.boneValues[boneName] = {
      ...(context.boneValues[boneName] ?? {}),
      ...props,
    };
  }
  for (const [boneName, props] of Object.entries(triggerBoneInputOverrides)) {
    context.boneValues[boneName] = {
      ...(context.boneValues[boneName] ?? {}),
      ...props,
    };
  }

  const boneTransforms: Map<string, BoneTransform> = new Map();

  if (DEBUG_ANIMATIONS && !hasLoggedAnimationSummary) {
    console.log("[AnimationEvaluator] Animation layers summary:");
    for (let i = 0; i < animationLayers.length; i++) {
      const layer = animationLayers[i];
      console.log(`  Layer ${i}: ${layer.length} expressions`);
      for (const anim of layer) {
        if (
          anim.targetType === "bone" &&
          (anim.propertyName === "tx" || anim.propertyName === "ty" || anim.propertyName === "tz")
        ) {
          console.log(`    - ${anim.targetName}.${anim.propertyName} (translation)`);
        }
      }
    }
    hasLoggedAnimationSummary = true;
  }

  debugFrameCount++;
  const shouldLogThisFrame = DEBUG_ANIMATIONS && debugFrameCount <= 3;

  const baseRuleIndex = context.entityState.rule_index;
  if (forceRuleIndex !== null) {
    context.entityState.rule_index = forceRuleIndex;
  }

  for (const layer of animationLayers) {
    for (const animation of layer) {
      const value = safeEvaluate(animation.expression, context, 0);

      switch (animation.targetType) {
        case "var":
          context.variables[animation.propertyName] = value;
          break;

        case "render":
          break;

        case "bone":
          if (animation.targetName === "varb") {
            context.boneValues.varb ??= {};
            context.boneValues.varb[animation.propertyName] = value;
            break;
          }
          if (isBoneTransformProperty(animation.propertyName)) {
            let transform = boneTransforms.get(animation.targetName);
            if (!transform) {
              transform = {};
              boneTransforms.set(animation.targetName, transform);
            }
            const partial = createBoneTransform(animation.propertyName, value);
            Object.assign(transform, partial);

            if (
              shouldLogThisFrame &&
              (animation.propertyName === "tx" || animation.propertyName === "ty" || animation.propertyName === "tz")
            ) {
              console.log(
                `[AnimationEvaluator] Frame ${debugFrameCount}: ${animation.targetName}.${animation.propertyName} = ${value.toFixed(3)}`,
              );
            }

            if (!context.boneValues[animation.targetName]) {
              context.boneValues[animation.targetName] = {};
            }
            context.boneValues[animation.targetName][animation.propertyName] = value;
          }
          break;
      }
    }
  }

  if (forceRuleIndex !== null) {
    context.entityState.rule_index = baseRuleIndex;
  }

  if (shouldLogThisFrame) {
    console.log(`[AnimationEvaluator] Frame ${debugFrameCount}: Accumulated transforms for ${boneTransforms.size} bones`);
    for (const [boneName, transform] of boneTransforms) {
      if (transform.tx !== undefined || transform.ty !== undefined || transform.tz !== undefined) {
        console.log(`  ${boneName}: tx=${transform.tx?.toFixed(3)}, ty=${transform.ty?.toFixed(3)}, tz=${transform.tz?.toFixed(3)}`);
      }
    }
  }

  if (entityId === "bell") {
    const bodyTransform = boneTransforms.get("body");
    if (bodyTransform) {
      const dir = context.entityState.swing_direction;
      const useXAxis = dir === 0 || dir === 1;
      const useZAxis = dir === 2 || dir === 3;
      const negateSign = dir === 0 || dir === 2;

      if (useXAxis) {
        if (negateSign && bodyTransform.rx !== undefined) {
          bodyTransform.rx = -bodyTransform.rx;
        }
        bodyTransform.rz = undefined;
      } else if (useZAxis) {
        if (negateSign && bodyTransform.rz !== undefined) {
          bodyTransform.rz = -bodyTransform.rz;
        }
        bodyTransform.rx = undefined;
      }
    }
  }

  for (const [boneName, transform] of boneTransforms) {
    const bone = bones.get(boneName);
    if (bone) {
      const base = baseTransforms.get(boneName);
      applyBoneTransform(bone, transform, base);
    } else if (!warnedMissingBones.has(boneName)) {
      console.warn(
        `[AnimationEvaluator] Animation references missing bone: "${boneName}". ` +
          `Available bones: ${Array.from(bones.keys()).join(", ")}`,
      );
      warnedMissingBones.add(boneName);
    }
  }

  applyRigCorrections(rigCorrectionState, bones);

  modelGroup.updateMatrixWorld(true);

  const inferred = inferRigCorrections(rigCorrectionState, modelGroup);
  if (inferred) {
    applyRigCorrections(rigCorrectionState, bones);
    modelGroup.updateMatrixWorld(true);
  }

  modelGroup.position.set(
    baseRootPosition.x + rootOverlay.x,
    baseRootPosition.y + rootOverlay.y,
    baseRootPosition.z + rootOverlay.z,
  );
  modelGroup.rotation.set(
    baseRootRotation.x + rootOverlay.rx,
    baseRootRotation.y + rootOverlay.ry,
    baseRootRotation.z + rootOverlay.rz,
    baseRootRotation.order,
  );

  if (shouldLogThisFrame) {
    console.log(`[AnimationEvaluator] World positions AFTER animation:`);
    const bonesToCheck = ["head", "headwear", "head2", "left_ear2", "nose"];
    for (const boneName of bonesToCheck) {
      const bone = bones.get(boneName);
      if (bone) {
        const worldPos = new THREE.Vector3();
        bone.getWorldPosition(worldPos);
        console.log(
          `  ${boneName}: local=[${bone.position.x.toFixed(3)}, ${bone.position.y.toFixed(3)}, ${bone.position.z.toFixed(3)}], world=[${worldPos.x.toFixed(3)}, ${worldPos.y.toFixed(3)}, ${worldPos.z.toFixed(3)}]`,
        );
      }
    }
  }

  return {
    hasLoggedAnimationSummary,
    debugFrameCount,
    rootOverlay,
  };
}
