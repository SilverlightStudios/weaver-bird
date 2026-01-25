/**
 * Baseline Capture Utilities
 *
 * Captures baseline bone values under different contexts (default, walking, water)
 * for use in transform normalization.
 */

import type { AnimationContext, ParsedExpression, BoneTransform } from "./types";
import { createAnimationContext } from "./types";
import { cloneRestBoneValues } from "./restBoneValues";

/**
 * Compiled animation structure (matches AnimationEngine's internal type).
 */
interface CompiledAnimation {
  targetType: "bone" | "var" | "render";
  targetName: string;
  propertyName: string;
  expression: ParsedExpression;
}

export interface BaselineContextConfig {
  restBoneValues: Record<string, Record<string, number>>;
  applyVanillaRotationInputSeeding: (ctx: AnimationContext) => void;
  evaluateLayersToTransforms: (ctx: AnimationContext) => Map<string, BoneTransform>;
}

export interface BaselineCaptureResult {
  baselineBoneValues: Map<string, number>;
  baselineBoneValuesWater: Map<string, number>;
  altBaselineValues: Map<string, number>;
}

/**
 * Capture baseline bone values under multiple contexts.
 */
export function captureBaselines(config: BaselineContextConfig): BaselineCaptureResult {
  const baselineBoneValues = new Map<string, number>();
  const baselineBoneValuesWater = new Map<string, number>();
  const altBaselineValues = new Map<string, number>();

  // Default baseline context
  const baselineContext = createBaselineContext(config.restBoneValues);
  config.applyVanillaRotationInputSeeding(baselineContext);
  const baselineTransforms = config.evaluateLayersToTransforms(baselineContext);

  // Walking-like alternate baseline (for detecting pose-dependent channels)
  const altContext = createBaselineContext(config.restBoneValues, {
    limb_speed: 0.4,
    limb_swing: 0,
  });
  config.applyVanillaRotationInputSeeding(altContext);
  const altTransforms = config.evaluateLayersToTransforms(altContext);
  extractTranslationChannels(altTransforms, altBaselineValues);

  // Water baseline (for aquatic entities)
  const waterContext = createBaselineContext(config.restBoneValues, {
    is_in_water: true,
    is_on_ground: false,
  });
  config.applyVanillaRotationInputSeeding(waterContext);
  const waterTransforms = config.evaluateLayersToTransforms(waterContext);
  extractRotationChannels(waterTransforms, baselineBoneValuesWater);

  // Extract all channels from default baseline
  extractAllChannels(baselineTransforms, baselineBoneValues);

  return { baselineBoneValues, baselineBoneValuesWater, altBaselineValues };
}

/**
 * Create a baseline context with optional entity state overrides.
 */
function createBaselineContext(
  restBoneValues: Record<string, Record<string, number>>,
  stateOverrides?: Partial<AnimationContext["entityState"]>,
): AnimationContext {
  const ctx = createAnimationContext();
  ctx.boneValues = cloneRestBoneValues(restBoneValues);
  ctx.entityState.frame_counter = 1;
  ctx.entityState.frame_time = 0;
  if (stateOverrides) {
    Object.assign(ctx.entityState, stateOverrides);
  }
  return ctx;
}

type TransformMap = Map<string, BoneTransform>;

/**
 * Extract translation channels (tx, ty, tz) from transforms to a map.
 */
function extractTranslationChannels(transforms: TransformMap, target: Map<string, number>): void {
  for (const [boneName, transform] of transforms) {
    if (transform.tx !== undefined) target.set(`${boneName}.tx`, transform.tx);
    if (transform.ty !== undefined) target.set(`${boneName}.ty`, transform.ty);
    if (transform.tz !== undefined) target.set(`${boneName}.tz`, transform.tz);
  }
}

/**
 * Extract rotation channels (rx, ry, rz) from transforms to a map.
 */
function extractRotationChannels(transforms: TransformMap, target: Map<string, number>): void {
  for (const [boneName, transform] of transforms) {
    if (transform.rx !== undefined) target.set(`${boneName}.rx`, transform.rx);
    if (transform.ry !== undefined) target.set(`${boneName}.ry`, transform.ry);
    if (transform.rz !== undefined) target.set(`${boneName}.rz`, transform.rz);
  }
}

/**
 * Extract all transform channels to a map.
 */
function extractAllChannels(transforms: TransformMap, target: Map<string, number>): void {
  for (const [boneName, transform] of transforms) {
    if (transform.tx !== undefined) target.set(`${boneName}.tx`, transform.tx);
    if (transform.ty !== undefined) target.set(`${boneName}.ty`, transform.ty);
    if (transform.tz !== undefined) target.set(`${boneName}.tz`, transform.tz);
    if (transform.rx !== undefined) target.set(`${boneName}.rx`, transform.rx);
    if (transform.ry !== undefined) target.set(`${boneName}.ry`, transform.ry);
    if (transform.rz !== undefined) target.set(`${boneName}.rz`, transform.rz);
  }
}

/**
 * Detect which channels are constant-only expressions.
 */
export function detectConstantChannels(
  animationLayers: ReadonlyArray<ReadonlyArray<CompiledAnimation>>,
  isConstantExpression: (expr: ParsedExpression) => boolean,
  isBoneTransformProperty: (prop: string) => boolean,
): Map<string, boolean> {
  const isConstantByChannel = new Map<string, boolean>();
  for (const layer of animationLayers) {
    for (const anim of layer) {
      if (anim.targetType !== "bone") continue;
      if (!isBoneTransformProperty(anim.propertyName)) continue;
      isConstantByChannel.set(
        `${anim.targetName}.${anim.propertyName}`,
        isConstantExpression(anim.expression),
      );
    }
  }
  return isConstantByChannel;
}

/**
 * Detect direct rotation copy targets (e.g., `bone.rx = otherBone.rx`).
 */
export function detectDirectRotationCopies(
  animationLayers: ReadonlyArray<ReadonlyArray<CompiledAnimation>>,
): Map<string, string> {
  const directRotationCopyTargets = new Map<string, string>();
  for (const layer of animationLayers) {
    for (const anim of layer) {
      if (anim.targetType !== "bone") continue;
      if (anim.propertyName !== "rx" && anim.propertyName !== "ry" && anim.propertyName !== "rz") {
        continue;
      }
      if (!("ast" in anim.expression)) continue;
      const { ast } = anim.expression;
      if (ast.type !== "Variable") continue;
      const { name } = ast;
      const dot = name.indexOf(".");
      if (dot === -1) continue;
      const bone = name.slice(0, dot);
      const prop = name.slice(dot + 1);
      if (bone === "var" || bone === "render" || bone === "varb") continue;
      if (prop === anim.propertyName) {
        directRotationCopyTargets.set(`${anim.targetName}.${prop}`, bone);
      }
    }
  }
  return directRotationCopyTargets;
}

/**
 * Propagate dependencies through a dependency graph.
 * If channel A depends on channel B and B is in the flagged set, A gets flagged too.
 */
export function propagateDependencies(
  flaggedChannels: Set<string>,
  channelDeps: Map<string, Set<string>>,
): void {
  if (flaggedChannels.size === 0 || channelDeps.size === 0) return;

  let changed = true;
  while (changed) {
    changed = false;
    for (const [target, deps] of channelDeps) {
      if (flaggedChannels.has(target)) continue;
      for (const dep of deps) {
        if (flaggedChannels.has(dep)) {
          flaggedChannels.add(target);
          changed = true;
          break;
        }
      }
    }
  }
}
