/**
 * Helper functions for AnimationEngine
 * Extracted to reduce file size and complexity
 */
import type * as THREE from "three";
import type { AnimationContext, BoneTransform, AnimationLayer, EntityState } from "./types";
import { createAnimationContext, DEFAULT_ENTITY_STATE } from "./types";
import { safeEvaluate } from "./expressionEvaluator";
import { isBoneTransformProperty, createBoneTransform, buildBoneMap, storeBaseTransforms, resetAllBones, type BoneMap, type BaseTransformMap } from "./boneController";
import type { CompiledAnimation } from "./AnimationCompiler";
import { compileAnimations } from "./AnimationCompiler"; // Used in initializeAnimationEngine
import { collectSelfTranslationReadUsage } from "./selfReadAnalysis";
import { buildRestBoneValues, cloneRestBoneValues } from "./restBoneValues";
import { VANILLA_DURATIONS } from "@constants/animations/generated";
import type { AnimationPreset } from "./entityState";
import { getPresetById } from "./entityState";
import { applyVanillaFallback } from "./vanillaRigFallbacks";

/** Check if animation layers mention a specific needle string */
export function animationLayersMention(
  animationLayers: CompiledAnimation[][],
  needle: string,
): boolean {
  for (const layer of animationLayers) {
    for (const a of layer) {
      const expr = a.expression;
      const src = "source" in expr && typeof expr.source === "string" ? expr.source : "";
      if (src.includes(needle)) return true;
    }
  }
  return false;
}

/** Apply neutral input defaults for neck.ty if needed */
export function applyNeutralInputDefaults(
  animationLayers: CompiledAnimation[][],
  restBoneValues: Record<string, Record<string, number>>,
): void {
  const writesNeckTy = animationLayers.some((layer) =>
    layer.some(
      (a) =>
        a.targetType === "bone" &&
        a.targetName === "neck" &&
        a.propertyName === "ty",
    ),
  );
  if (writesNeckTy) return;

  const readsNeckTy = animationLayers.some((layer) =>
    layer.some((a) => {
      const expr = a.expression;
      const src = "source" in expr && typeof expr.source === "string" ? expr.source : "";
      return src.includes("neck.ty");
    }),
  );
  if (!readsNeckTy) return;

  restBoneValues.neck ??= {};
  restBoneValues.neck.ty = 4;
}

/** Process bone transform for a single animation */
function processBoneTransform(
  animation: CompiledAnimation,
  value: number,
  context: AnimationContext,
  boneTransforms: Map<string, BoneTransform>,
): void {
  if (animation.targetName === "varb") {
    context.boneValues.varb ??= {};
    context.boneValues.varb[animation.propertyName] = value;
    return;
  }

  if (!isBoneTransformProperty(animation.propertyName)) return;

  let transform = boneTransforms.get(animation.targetName);
  if (!transform) {
    transform = {};
    boneTransforms.set(animation.targetName, transform);
  }
  Object.assign(transform, createBoneTransform(animation.propertyName, value));

  if (!context.boneValues[animation.targetName]) {
    context.boneValues[animation.targetName] = {};
  }
  context.boneValues[animation.targetName][animation.propertyName] = value;
}

/** Evaluate all animation layers and produce bone transforms */
export function evaluateLayersToTransforms(
  animationLayers: CompiledAnimation[][],
  context: AnimationContext,
): Map<string, BoneTransform> {
  const boneTransforms: Map<string, BoneTransform> = new Map();

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
          processBoneTransform(animation, value, context, boneTransforms);
          break;
      }
    }
  }

  return boneTransforms;
}

interface ConstructorInitResult {
  bones: BoneMap;
  baseTransforms: BaseTransformMap;
  context: AnimationContext;
  animationLayers: CompiledAnimation[][];
  translationAxesByBone: Map<string, Set<"x" | "y" | "z">>;
  rotationAxesByBone: Map<string, Set<"x" | "y" | "z">>;
  restBoneValues: Record<string, Record<string, number>>;
  selfTranslationReads: Map<string, Set<"tx" | "ty" | "tz">>;
  selfTranslationPivotSeeds: Map<string, Set<"tx" | "ty" | "tz">>;
  rotationInputReads: Map<string, Set<"rx" | "ry" | "rz">>;
  rotationInputUsage: Map<string, { bone: boolean; var: boolean }>;
  selfRotationReads: Map<string, Set<"rx" | "ry" | "rz">>;
  animationDurationTicks: number;
}

/** Initialize animation engine data structures from model and animation layers */
export function initializeAnimationEngine(
  modelGroup: THREE.Group,
  animationLayers?: AnimationLayer[],
  entityId?: string,
): ConstructorInitResult {
  const bones = buildBoneMap(modelGroup);
  const baseTransforms = storeBaseTransforms(bones);
  const context = createAnimationContext();

  let compiledLayers: CompiledAnimation[][] = [];
  let translationAxes = new Map<string, Set<"x" | "y" | "z">>();
  let rotationAxes = new Map<string, Set<"x" | "y" | "z">>();
  let selfTranslationReads = new Map<string, Set<"tx" | "ty" | "tz">>();
  let selfTranslationPivotSeeds = new Map<string, Set<"tx" | "ty" | "tz">>();
  let rotationInputReads = new Map<string, Set<"rx" | "ry" | "rz">>();
  let rotationInputUsage = new Map<string, { bone: boolean; var: boolean }>();
  let selfRotationReads = new Map<string, Set<"rx" | "ry" | "rz">>();

  let animationDurationTicks = 100;
  if (entityId && entityId in VANILLA_DURATIONS) {
    animationDurationTicks = VANILLA_DURATIONS[entityId as keyof typeof VANILLA_DURATIONS];
    console.log(`[AnimationEngine] Using extracted duration for ${entityId}: ${animationDurationTicks} ticks`);
  }

  if (animationLayers && animationLayers.length > 0) {
    const analysisResult = collectSelfTranslationReadUsage(
      animationLayers,
      modelGroup,
      bones,
      baseTransforms,
    );
    selfTranslationReads = analysisResult.reads;
    selfTranslationPivotSeeds = analysisResult.pivotSeeds;
    rotationInputReads = analysisResult.rotationInputs;
    rotationInputUsage = analysisResult.rotationInputUsage;
    selfRotationReads = analysisResult.selfRotationReads;

    const compiled = compileAnimations(animationLayers);
    compiledLayers = compiled.layers;
    translationAxes = compiled.translationAxesByBone;
    rotationAxes = compiled.rotationAxesByBone;
  }

  const restBoneValues = buildRestBoneValues(
    bones,
    baseTransforms,
    modelGroup,
    selfTranslationReads,
    selfTranslationPivotSeeds,
  );
  context.boneValues = cloneRestBoneValues(restBoneValues);

  return {
    bones,
    baseTransforms,
    context,
    animationLayers: compiledLayers,
    translationAxesByBone: translationAxes,
    rotationAxesByBone: rotationAxes,
    restBoneValues,
    selfTranslationReads,
    selfTranslationPivotSeeds,
    rotationInputReads,
    rotationInputUsage,
    selfRotationReads,
    animationDurationTicks,
  };
}

/** Apply preset state to entity */
export function applyPresetState(
  presetId: string | null,
  currentPresetId: string | null,
  context: AnimationContext,
  restBoneValues: Record<string, Record<string, number>>,
  bones: BoneMap,
  baseTransforms: BaseTransformMap,
  autoPlay: boolean,
): { preset: AnimationPreset | null; shouldPlay: boolean } {
  if (presetId === currentPresetId) {
    return { preset: null, shouldPlay: autoPlay && presetId !== null };
  }

  let preset: AnimationPreset | null = null;
  if (presetId !== null) {
    const found = getPresetById(presetId);
    if (!found) {
      console.warn(`[AnimationEngine] Unknown preset: ${presetId}`);
      return { preset: null, shouldPlay: false };
    }
    preset = found;
  }

  const preservedId = context.entityState.id;
  const preservedHeadYaw = context.entityState.head_yaw;
  const preservedHeadPitch = context.entityState.head_pitch;

  context.entityState = {
    ...DEFAULT_ENTITY_STATE,
    id: preservedId,
    head_yaw: preservedHeadYaw,
    head_pitch: preservedHeadPitch,
  };
  context.variables = {};
  context.boneValues = cloneRestBoneValues(restBoneValues);
  context.randomCache.clear();

  context.entityState.frame_counter = 0;

  if (presetId === null) {
    resetAllBones(bones, baseTransforms);
    return { preset: null, shouldPlay: false };
  }

  if (preset?.setup) {
    const setupState = preset.setup();
    Object.assign(context.entityState, setupState);
  }

  return { preset, shouldPlay: autoPlay };
}

interface TickContext {
  initialized: boolean;
  speed: number;
  elapsedTime: number;
  isPlaying: boolean;
  activePreset: AnimationPreset | null;
  context: AnimationContext;
  animationLayers: CompiledAnimation[][];
  bones: BoneMap;
  baseTransforms: BaseTransformMap;
  triggerManagerUpdate: (delta: number, state: EntityState) => { boneInputOverrides: Record<string, Record<string, number>>; rootOverlay: { x: number; y: number; z: number; rx: number; ry: number; rz: number }; forceRuleIndex: number | null };
  poseManagerUpdate: (state: EntityState) => { entityStateOverrides: Partial<EntityState>; boneInputOverrides: Record<string, Record<string, number>> };
  evaluateAndApply: (pose: Record<string, Record<string, number>>, trigger: Record<string, Record<string, number>>, overlay: { x: number; y: number; z: number; rx: number; ry: number; rz: number }, rule: number | null) => void;
  applyRootOverlay: () => void;
}

/** Execute animation tick update */
export function tickAnimation(
  ctx: TickContext,
  deltaTime: number,
): { newElapsedTime: number; newIsPlaying: boolean; result: boolean } {
  if (!ctx.initialized) return { newElapsedTime: ctx.elapsedTime, newIsPlaying: ctx.isPlaying, result: false };

  const scaledDelta = deltaTime * ctx.speed;
  let newElapsedTime = ctx.elapsedTime;
  let newIsPlaying = ctx.isPlaying;

  if (ctx.isPlaying && ctx.activePreset) {
    newElapsedTime += scaledDelta;

    if (!ctx.activePreset.loop && ctx.activePreset.duration > 0 && newElapsedTime >= ctx.activePreset.duration) {
      newIsPlaying = false;
    } else {
      const updates = ctx.activePreset.update(ctx.context.entityState, scaledDelta);
      Object.assign(ctx.context.entityState, updates);
    }
  }

  ctx.context.entityState.frame_time = scaledDelta;
  ctx.context.entityState.frame_counter++;

  const triggerResult = ctx.triggerManagerUpdate(scaledDelta, ctx.context.entityState);
  const poseResult = ctx.poseManagerUpdate(ctx.context.entityState);

  Object.assign(ctx.context.entityState, poseResult.entityStateOverrides);

  if (ctx.animationLayers.length > 0) {
    try {
      ctx.evaluateAndApply(poseResult.boneInputOverrides, triggerResult.boneInputOverrides, triggerResult.rootOverlay, triggerResult.forceRuleIndex);
    } catch (error) {
      console.error("[AnimationEngine] Error during animation evaluation:", error);
    }
    return { newElapsedTime, newIsPlaying, result: true };
  }

  resetAllBones(ctx.bones, ctx.baseTransforms);

  if (newIsPlaying && ctx.activePreset) {
    applyVanillaFallback(ctx.bones, ctx.baseTransforms, ctx.context.entityState);
    return { newElapsedTime, newIsPlaying, result: true };
  }

  ctx.applyRootOverlay();
  return { newElapsedTime, newIsPlaying, result: newIsPlaying };
}

/** Execute animation tick with external state */
export function tickAnimationWithExternalState(
  ctx: Omit<TickContext, "elapsedTime" | "isPlaying" | "activePreset" | "triggerManagerUpdate">,
  deltaTime: number,
  externalState: EntityState,
  rootOverlaySetter: (overlay: { x: number; y: number; z: number; rx: number; ry: number; rz: number }) => void,
): boolean {
  if (!ctx.initialized) return false;

  const scaledDelta = deltaTime * ctx.speed;
  ctx.context.entityState = { ...externalState };
  if (!Number.isFinite(ctx.context.entityState.frame_time)) {
    ctx.context.entityState.frame_time = scaledDelta;
  }
  if (!Number.isFinite(ctx.context.entityState.frame_counter)) {
    ctx.context.entityState.frame_counter = 0;
  }

  rootOverlaySetter({ x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 });

  const poseResult = ctx.poseManagerUpdate(ctx.context.entityState);

  if (ctx.animationLayers.length > 0) {
    try {
      ctx.evaluateAndApply(poseResult.boneInputOverrides, {}, { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 }, null);
    } catch (error) {
      console.error("[AnimationEngine] Error during overlay evaluation:", error);
    }
    return true;
  }

  resetAllBones(ctx.bones, ctx.baseTransforms);
  ctx.applyRootOverlay();
  return false;
}
