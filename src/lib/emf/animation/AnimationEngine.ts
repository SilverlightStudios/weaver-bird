/**
 * CEM Animation Engine
 *
 * Main orchestrator for entity model animations.
 * Delegates to specialized modules for compilation, triggers, poses, and rig corrections.
 *
 * TODO: Convert from class-based to functional closure pattern to reduce file size
 * and improve organization. Factory function approach would be more concise.
 */
/* eslint-disable max-lines */

import type * as THREE from "three";
import type {
  AnimationContext,
  AnimationLayer,
  EntityState,
} from "./types";
import {
  createAnimationContext,
  DEFAULT_ENTITY_STATE,
  clampAnimationSpeed,
} from "./types";
import type { BoneMap, BaseTransformMap } from "./boneController";
import {
  resetAllBones,
} from "./boneController";
import type { AnimationPreset } from "./entityState";
import { cloneRestBoneValues } from "./restBoneValues";
// Extracted modules
import { initializeTransformNormalization } from "./TransformNormalization";
import type { CompiledAnimation } from "./AnimationCompiler";
import { TriggerManager } from "./TriggerManager";
import { PoseManager } from "./PoseManager";
import {
  createRigCorrectionState,
  type RigCorrectionState,
} from "./RigCorrections";
import { applyVanillaRotationInputSeeding } from "./VanillaInputSeeding";
import { evaluateAndApplyTransforms } from "./AnimationEvaluator";
import {
  animationLayersMention,
  applyNeutralInputDefaults,
  evaluateLayersToTransforms as evaluateLayersHelper,
  initializeAnimationEngine,
  applyPresetState,
  tickAnimation,
  tickAnimationWithExternalState,
} from "./AnimationEngineHelpers";

/**
 * Animation engine for a single entity model.
 */
export class AnimationEngine {
  private animationLayers: CompiledAnimation[][] = [];
  private baselineBoneValues: Map<string, number> = new Map();
  private baselineBoneValuesWater: Map<string, number> = new Map();
  private translationAxesByBone: Map<string, Set<"x" | "y" | "z">> = new Map();
  private rotationAxesByBone: Map<string, Set<"x" | "y" | "z">> = new Map();
  private restBoneValues: Record<string, Record<string, number>> = {};
  private selfTranslationReads: Map<string, Set<"tx" | "ty" | "tz">> = new Map();
  private selfTranslationPivotSeeds: Map<string, Set<"tx" | "ty" | "tz">> = new Map();
  private rotationInputReads: Map<string, Set<"rx" | "ry" | "rz">> = new Map();
  private rotationInputUsage: Map<string, { bone: boolean; var: boolean }> = new Map();
  private selfRotationReads: Map<string, Set<"rx" | "ry" | "rz">> = new Map();

  private baseRootPosition: THREE.Vector3;
  private baseRootRotation: THREE.Euler;
  private rootOverlay = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 };

  private modelGroup: THREE.Group;
  private bones: BoneMap;
  private baseTransforms: BaseTransformMap;
  private context: AnimationContext;

  private activePreset: AnimationPreset | null = null;
  private isPlaying = false;
  private speed = 1.0;
  private elapsedTime = 0;
  private initialized = false;
  private warnedMissingBones: Set<string> = new Set();
  private entityId: string | undefined;
  private animationDurationTicks = 100;

  private hasLoggedAnimationSummary = false;
  private debugFrameCount = 0;

  // Extracted managers
  private triggerManager: TriggerManager;
  private poseManager: PoseManager;
  private rigCorrectionState: RigCorrectionState;

  constructor(modelGroup: THREE.Group, animationLayers?: AnimationLayer[], entityId?: string) {
    this.modelGroup = modelGroup;
    this.baseRootPosition = modelGroup.position.clone();
    this.baseRootRotation = modelGroup.rotation.clone();
    this.entityId = entityId;

    const init = initializeAnimationEngine(modelGroup, animationLayers, entityId);
    this.bones = init.bones;
    this.baseTransforms = init.baseTransforms;
    this.context = init.context;
    this.animationLayers = init.animationLayers;
    this.translationAxesByBone = init.translationAxesByBone;
    this.rotationAxesByBone = init.rotationAxesByBone;
    this.restBoneValues = init.restBoneValues;
    this.selfTranslationReads = init.selfTranslationReads;
    this.selfTranslationPivotSeeds = init.selfTranslationPivotSeeds;
    this.rotationInputReads = init.rotationInputReads;
    this.rotationInputUsage = init.rotationInputUsage;
    this.selfRotationReads = init.selfRotationReads;
    this.animationDurationTicks = init.animationDurationTicks;

    // Initialize managers
    this.triggerManager = new TriggerManager(
      this.animationDurationTicks,
      (needle) => animationLayersMention(this.animationLayers, needle),
    );
    this.poseManager = new PoseManager();
    this.rigCorrectionState = createRigCorrectionState();

    if (this.animationLayers.length > 0) {
      applyNeutralInputDefaults(this.animationLayers, this.restBoneValues);
      this.triggerManager.inferEatRuleIndex(this.animationLayers);
      this.initializeTransformNormalization();
    }

    this.initialized = true;
  }

  setPoseToggles(toggleIds: string[] | null | undefined): void {
    this.poseManager.setPoseToggles(toggleIds);
  }

  setFeatureBoneInputOverrides(overrides: Record<string, Record<string, number>> | null | undefined): void {
    this.poseManager.setFeatureBoneInputOverrides(overrides);
  }

  playTrigger(triggerId: string): void {
    this.triggerManager.playTrigger(triggerId, this.context.entityState);
  }

  getBaselineBoneValue(boneName: string, property: string): number {
    return this.baselineBoneValues.get(`${boneName}.${property}`) ?? 0;
  }

  private initializeTransformNormalization(): void {
    const result = initializeTransformNormalization({
      animationLayers: this.animationLayers,
      bones: this.bones,
      modelGroup: this.modelGroup,
      baseTransforms: this.baseTransforms,
      translationAxesByBone: this.translationAxesByBone,
      rotationAxesByBone: this.rotationAxesByBone,
      selfRotationReads: this.selfRotationReads,
      restBoneValues: this.restBoneValues,
      applyVanillaRotationInputSeeding: (ctx) => this.applyVanillaRotationInputSeeding(ctx),
      evaluateLayersToTransforms: (ctx) => evaluateLayersHelper(this.animationLayers, ctx),
      getBaselineBoneValue: (bone, prop) => this.getBaselineBoneValue(bone, prop),
    });

    this.baselineBoneValues = result.baselineBoneValues;
    this.baselineBoneValuesWater = result.baselineBoneValuesWater;
  }

  private applyVanillaRotationInputSeeding(context: AnimationContext = this.context): void {
    applyVanillaRotationInputSeeding(
      context,
      this.bones,
      this.baseTransforms,
      this.rotationInputReads,
      this.rotationInputUsage,
      this.rotationAxesByBone,
    );
  }

  hasAnimations(): boolean {
    return this.animationLayers.length > 0;
  }

  getLayerCount(): number {
    return this.animationLayers.length;
  }

  getExpressionCount(): number {
    return this.animationLayers.reduce((sum, layer) => sum + layer.length, 0);
  }

  getBoneNames(): string[] {
    return Array.from(this.bones.keys());
  }

  setPreset(presetId: string | null, autoPlay = true): void {
    const currentPresetId = this.activePreset?.id ?? null;
    const result = applyPresetState(
      presetId,
      currentPresetId,
      this.context,
      this.restBoneValues,
      this.bones,
      this.baseTransforms,
      autoPlay,
    );
    this.elapsedTime = 0;
    if (result.preset !== null) {
      this.activePreset = result.preset;
    } else if (presetId === null) {
      this.activePreset = null;
    }
    this.isPlaying = result.shouldPlay;
  }

  getActivePreset(): AnimationPreset | null {
    return this.activePreset;
  }

  play(): void {
    this.isPlaying = true;
  }

  pause(): void {
    this.isPlaying = false;
  }

  stop(): void {
    this.isPlaying = false;
    this.activePreset = null;
    this.elapsedTime = 0;
    this.context.entityState.frame_counter = 0;
    this.reset();
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  setSpeed(speed: number): void {
    this.speed = clampAnimationSpeed(speed);
  }

  getSpeed(): number {
    return this.speed;
  }

  getEntityState(): EntityState {
    return this.context.entityState;
  }

  updateEntityState(updates: Partial<EntityState>): void {
    Object.assign(this.context.entityState, updates);
  }

  setHeadOrientation(yaw: number, pitch: number): void {
    this.context.entityState.head_yaw = yaw;
    this.context.entityState.head_pitch = pitch;
  }

  setSwingDirection(direction: number): void {
    this.context.entityState.swing_direction = Math.max(0, Math.min(3, Math.floor(direction)));
  }

  getSwingDirection(): number {
    return this.context.entityState.swing_direction;
  }

  getVariable(name: string): number {
    return this.context.variables[name] ?? 0;
  }

  setVariable(name: string, value: number): void {
    this.context.variables[name] = value;
  }

  getVariableSnapshot(): Record<string, number> {
    return { ...this.context.variables };
  }

  setVariableSnapshot(vars: Record<string, number>): void {
    this.context.variables = { ...vars };
  }

  getRandomCacheSnapshot(): Array<[number, number]> {
    return Array.from(this.context.randomCache.entries());
  }

  setRandomCacheSnapshot(snapshot: Array<[number, number]>): void {
    this.context.randomCache.clear();
    for (const [key, value] of snapshot) {
      this.context.randomCache.set(key, value);
    }
  }

  getBoneValue(boneName: string, property: string): number {
    return this.context.boneValues[boneName]?.[property] ?? 0;
  }

  tick(deltaTime: number): boolean {
    const result = tickAnimation({
      initialized: this.initialized,
      speed: this.speed,
      elapsedTime: this.elapsedTime,
      isPlaying: this.isPlaying,
      activePreset: this.activePreset,
      context: this.context,
      animationLayers: this.animationLayers,
      bones: this.bones,
      baseTransforms: this.baseTransforms,
      triggerManagerUpdate: (d, s) => this.triggerManager.update(d, s),
      poseManagerUpdate: (s) => this.poseManager.update(s),
      evaluateAndApply: (p, t, o, r) => this.evaluateAndApply(p, t, o, r),
      applyRootOverlay: () => this.applyRootOverlay(),
    }, deltaTime);
    this.elapsedTime = result.newElapsedTime;
    this.isPlaying = result.newIsPlaying;
    return result.result;
  }

  tickWithExternalState(deltaTime: number, externalState: EntityState): boolean {
    return tickAnimationWithExternalState({
      initialized: this.initialized,
      speed: this.speed,
      context: this.context,
      animationLayers: this.animationLayers,
      bones: this.bones,
      baseTransforms: this.baseTransforms,
      poseManagerUpdate: (s) => this.poseManager.update(s),
      evaluateAndApply: (p, t, o, r) => this.evaluateAndApply(p, t, o, r),
      applyRootOverlay: () => this.applyRootOverlay(),
    }, deltaTime, externalState, (overlay) => { this.rootOverlay = overlay; });
  }

  private evaluateAndApply(
    poseBoneInputOverrides: Record<string, Record<string, number>>,
    triggerBoneInputOverrides: Record<string, Record<string, number>>,
    rootOverlay: { x: number; y: number; z: number; rx: number; ry: number; rz: number },
    forceRuleIndex: number | null,
  ): void {
    const result = evaluateAndApplyTransforms({
      context: this.context,
      animationLayers: this.animationLayers,
      bones: this.bones,
      baseTransforms: this.baseTransforms,
      restBoneValues: this.restBoneValues,
      rotationInputReads: this.rotationInputReads,
      rotationInputUsage: this.rotationInputUsage,
      rotationAxesByBone: this.rotationAxesByBone,
      poseBoneInputOverrides,
      triggerBoneInputOverrides,
      featureBoneInputOverrides: this.poseManager.getFeatureBoneInputOverrides(),
      rootOverlay,
      forceRuleIndex,
      modelGroup: this.modelGroup,
      rigCorrectionState: this.rigCorrectionState,
      baseRootPosition: this.baseRootPosition,
      baseRootRotation: this.baseRootRotation,
      warnedMissingBones: this.warnedMissingBones,
      entityId: this.entityId,
      hasLoggedAnimationSummary: this.hasLoggedAnimationSummary,
      debugFrameCount: this.debugFrameCount,
    });

    this.hasLoggedAnimationSummary = result.hasLoggedAnimationSummary;
    this.debugFrameCount = result.debugFrameCount;
    this.rootOverlay = result.rootOverlay;
  }

  reset(): void {
    resetAllBones(this.bones, this.baseTransforms);
    this.context = createAnimationContext();
    this.context.boneValues = cloneRestBoneValues(this.restBoneValues);
    this.elapsedTime = 0;
    this.triggerManager.reset();
    this.poseManager.reset();
    this.rootOverlay = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 };
    this.modelGroup.position.copy(this.baseRootPosition);
    this.modelGroup.rotation.copy(this.baseRootRotation);
  }

  resetState(): void {
    this.context.entityState = { ...DEFAULT_ENTITY_STATE };
    this.context.variables = {};
    this.context.boneValues = cloneRestBoneValues(this.restBoneValues);
    this.triggerManager.reset();
    this.context.randomCache.clear();
  }

  private applyRootOverlay(): void {
    this.modelGroup.position.set(
      this.baseRootPosition.x + this.rootOverlay.x,
      this.baseRootPosition.y + this.rootOverlay.y,
      this.baseRootPosition.z + this.rootOverlay.z,
    );
    this.modelGroup.rotation.set(
      this.baseRootRotation.x + this.rootOverlay.rx,
      this.baseRootRotation.y + this.rootOverlay.ry,
      this.baseRootRotation.z + this.rootOverlay.rz,
      this.baseRootRotation.order,
    );
  }

  dispose(): void {
    this.animationLayers = [];
    this.bones.clear();
    this.baseTransforms.clear();
    this.warnedMissingBones.clear();
    this.activePreset = null;
    this.isPlaying = false;
    this.initialized = false;
  }
}

export function createAnimationEngine(
  modelGroup: THREE.Group,
  animationLayers?: AnimationLayer[],
  entityId?: string,
): AnimationEngine {
  return new AnimationEngine(modelGroup, animationLayers, entityId);
}
