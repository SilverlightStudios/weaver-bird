/**
 * CEM Animation Engine
 *
 * Main orchestrator for entity model animations.
 * Handles compiling expressions, managing state, and applying transforms.
 */

import * as THREE from "three";
import type {
  AnimationContext,
  AnimationLayer,
  EntityState,
  ParsedExpression,
  BoneTransform,
} from "./types";
import {
  createAnimationContext,
  DEFAULT_ENTITY_STATE,
  clampAnimationSpeed,
} from "./types";
import { compileExpression, isConstantExpression } from "./expressionParser";
import { safeEvaluate } from "./expressionEvaluator";
import {
  BoneMap,
  BaseTransformMap,
  buildBoneMap,
  storeBaseTransforms,
  resetAllBones,
  parseBoneProperty,
  isBoneTransformProperty,
  applyBoneTransform,
  createBoneTransform,
  DEBUG_ANIMATIONS,
} from "./boneController";
import type { AnimationPreset } from "./entityState";
import { getPresetById } from "./entityState";
import { getTriggerDefinition } from "./triggers";

/**
 * Compiled animation expression with metadata.
 */
interface CompiledAnimation {
  /** Original property path (e.g., "head.rx") */
  property: string;
  /** Target type: "bone", "var", or "render" */
  targetType: "bone" | "var" | "render";
  /** Target name (bone name, variable name, or render property) */
  targetName: string;
  /** Property name (rx, ry, hy, shadow_size, etc.) */
  propertyName: string;
  /** Compiled expression */
  expression: ParsedExpression;
}

/**
 * Animation engine for a single entity model.
 */
export class AnimationEngine {
  /** Compiled animations organized by layer */
  private animationLayers: CompiledAnimation[][] = [];

  /**
   * Baseline (tick 0) values for bone properties, used to normalize transforms
   * without relying on bone-name special cases.
   */
  private baselineBoneValues: Map<string, number> = new Map();

  /** Tracks which bones animate translation axes (tx/ty/tz). */
  private translationAxesByBone: Map<string, Set<"x" | "y" | "z">> = new Map();

  /** Tracks which bones animate rotation axes (rx/ry/rz). */
  private rotationAxesByBone: Map<string, Set<"x" | "y" | "z">> = new Map();

  /**
   * Rest-pose bone values in CEM space, used to seed `context.boneValues` so
   * expressions that read other bones (e.g. `var.Nty = neck.ty`) see meaningful
   * defaults even when those bones are never assigned in JPM.
   */
  private restBoneValues: Record<string, Record<string, number>> = {};

  private activeTriggers: Array<{
    id: string;
    elapsedSec: number;
    durationSec: number;
  }> = [];

  private boneInputOverrides: Record<string, Record<string, number>> = {};

  private inferredEatRuleIndex: number | null = null;

  private baseRootPosition: THREE.Vector3;
  private baseRootRotation: THREE.Euler;
  private rootOverlay: {
    x: number;
    y: number;
    z: number;
    rx: number;
    ry: number;
    rz: number;
  } = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 };

  /** Reference to the model group for matrix updates */
  private modelGroup: THREE.Group;

  /** Bone name to Three.js object mapping */
  private bones: BoneMap;

  /** Base transforms for resetting */
  private baseTransforms: BaseTransformMap;

  /** Animation evaluation context */
  private context: AnimationContext;

  /** Currently active preset */
  private activePreset: AnimationPreset | null = null;

  /** Whether animation is playing */
  private isPlaying: boolean = false;

  /** Playback speed multiplier */
  private speed: number = 1.0;

  /** Total elapsed time since animation started */
  private elapsedTime: number = 0;

  /** Whether the engine has been initialized */
  private initialized: boolean = false;

  /** Set of bone names that have been warned about (to avoid spam) */
  private warnedMissingBones: Set<string> = new Set();

  /**
   * Create a new animation engine.
   *
   * @param modelGroup The Three.js group containing the entity model
   * @param animationLayers Raw animation layers from JEM file
   */
  constructor(modelGroup: THREE.Group, animationLayers?: AnimationLayer[]) {
    // Store reference to model group
    this.modelGroup = modelGroup;
    this.baseRootPosition = modelGroup.position.clone();
    this.baseRootRotation = modelGroup.rotation.clone();

    // Build bone map from model
    this.bones = buildBoneMap(modelGroup);

    // Store base transforms for reset
    this.baseTransforms = storeBaseTransforms(this.bones);

    // Initialize context
    this.context = createAnimationContext();
    this.restBoneValues = this.buildRestBoneValues();
    this.context.boneValues = this.cloneRestBoneValues();

    // Compile animations if provided
    if (animationLayers && animationLayers.length > 0) {
      this.compileAnimations(animationLayers);
      this.applyNeutralInputDefaultsFromAnimations();
      this.inferredEatRuleIndex = this.inferEatRuleIndexFromAnimations();
      this.initializeTransformNormalization();
    }

    this.initialized = true;
  }

  playTrigger(triggerId: string): void {
    const def = getTriggerDefinition(triggerId);
    if (!def) {
      console.warn(`[AnimationEngine] Unknown trigger: ${triggerId}`);
      return;
    }

    switch (def.id) {
      case "trigger.hurt":
        // Hurt time counts down in ticks (0-10).
        this.context.entityState.hurt_time = Math.max(
          this.context.entityState.hurt_time,
          10,
        );
        this.context.entityState.is_hurt = true;
        break;
      case "trigger.death":
        // Death time counts down in ticks (0-20).
        this.context.entityState.death_time = Math.max(
          this.context.entityState.death_time,
          20,
        );
        this.context.entityState.health = 0;
        break;
      default:
        break;
    }

    this.activeTriggers.push({
      id: def.id,
      elapsedSec: 0,
      durationSec: def.durationSec,
    });
  }

  private applyNeutralInputDefaultsFromAnimations(): void {
    // Some JPMs (notably Fresh Animations horse-family) read `neck.ty` as an
    // external vanilla-driven input but never assign it in the JPM. Defaulting
    // that value to 0 triggers rearing; defaulting it to the JEM pivot triggers
    // eating. Neutral is `4` (as used in FA expressions), so seed that when we
    // detect a read-without-write reference.
    const writesNeckTy = this.animationLayers.some((layer) =>
      layer.some(
        (a) =>
          a.targetType === "bone" &&
          a.targetName === "neck" &&
          a.propertyName === "ty",
      ),
    );
    if (writesNeckTy) return;

    const readsNeckTy = this.animationLayers.some((layer) =>
      layer.some((a) => {
        const expr: any = a.expression as any;
        const src =
          typeof expr?.source === "string" ? (expr.source as string) : "";
        return src.includes("neck.ty");
      }),
    );
    if (!readsNeckTy) return;

    this.restBoneValues.neck ??= {};
    this.restBoneValues.neck.ty = 4;
  }

  private expressionMentions(needle: string): boolean {
    for (const layer of this.animationLayers) {
      for (const a of layer) {
        const expr: any = a.expression as any;
        const src = typeof expr?.source === "string" ? (expr.source as string) : "";
        if (src.includes(needle)) return true;
      }
    }
    return false;
  }

  private buildRestBoneValues(): Record<string, Record<string, number>> {
    const rest: Record<string, Record<string, number>> = {};

    for (const [name, bone] of this.bones) {
      const base = this.baseTransforms.get(name);
      const originPx = Array.isArray((bone as any)?.userData?.originPx)
        ? ((bone as any).userData.originPx as [number, number, number])
        : null;

      rest[name] = {
        tx: 0,
        ty: 0,
        tz: 0,
        rx: base?.rotation.x ?? 0,
        ry: base?.rotation.y ?? 0,
        rz: base?.rotation.z ?? 0,
        sx: base?.scale.x ?? 1,
        sy: base?.scale.y ?? 1,
        sz: base?.scale.z ?? 1,
        visible: bone.visible ? 1 : 0,
      };

      // For "placeholder" bones (no mesh geometry anywhere under them), seed
      // translation values in the same units JPM expects when reading other
      // bones (e.g., `neck.ty`, `head.rx` used as vanilla input drivers).
      let hasMeshDescendant = false;
      bone.traverse((obj) => {
        if (obj !== bone && (obj as any).isMesh === true) hasMeshDescendant = true;
      });
      if (!hasMeshDescendant && originPx) {
        // Seed with origin-based values (CEM-space pivot coordinates).
        rest[name].tx = originPx[0];
        rest[name].ty = originPx[1];
        rest[name].tz = originPx[2];
      }
    }

    return rest;
  }

  private cloneRestBoneValues(): Record<string, Record<string, number>> {
    const clone: Record<string, Record<string, number>> = {};
    for (const [boneName, values] of Object.entries(this.restBoneValues)) {
      clone[boneName] = { ...values };
    }
    return clone;
  }

  /**
   * Get the baseline (tick 0) value for a bone property, if available.
   * Baselines are evaluated in the default context before the first tick.
   */
  getBaselineBoneValue(boneName: string, property: string): number {
    return this.baselineBoneValues.get(`${boneName}.${property}`) ?? 0;
  }

  /**
   * Compile animation expressions from JEM animation layers.
   */
  private compileAnimations(layers: AnimationLayer[]): void {
    this.animationLayers = [];
    this.translationAxesByBone.clear();
    this.rotationAxesByBone.clear();

    for (const layer of layers) {
      const compiledLayer: CompiledAnimation[] = [];

      for (const [property, expression] of Object.entries(layer)) {
        try {
          const compiled = this.compileProperty(property, expression);
          if (compiled) {
            compiledLayer.push(compiled);

            if (
              compiled.targetType === "bone" &&
              (compiled.propertyName === "tx" ||
                compiled.propertyName === "ty" ||
                compiled.propertyName === "tz")
            ) {
              const axis = compiled.propertyName[1] as "x" | "y" | "z";
              const set =
                this.translationAxesByBone.get(compiled.targetName) ??
                new Set<"x" | "y" | "z">();
              set.add(axis);
              this.translationAxesByBone.set(compiled.targetName, set);
            }

            if (
              compiled.targetType === "bone" &&
              (compiled.propertyName === "rx" ||
                compiled.propertyName === "ry" ||
                compiled.propertyName === "rz")
            ) {
              const axis = compiled.propertyName[1] as "x" | "y" | "z";
              const set =
                this.rotationAxesByBone.get(compiled.targetName) ??
                new Set<"x" | "y" | "z">();
              set.add(axis);
              this.rotationAxesByBone.set(compiled.targetName, set);
            }
          }
        } catch (error) {
          console.warn(
            `[AnimationEngine] Failed to compile: ${property} = ${expression}`,
            error,
          );
        }
      }

      if (compiledLayer.length > 0) {
        this.animationLayers.push(compiledLayer);
      }
    }

    console.log(
      `[AnimationEngine] Compiled ${this.animationLayers.length} animation layers with ${this.animationLayers.reduce((sum, l) => sum + l.length, 0)} expressions`,
    );
  }

  private evaluateLayersToTransforms(
    context: AnimationContext,
  ): Map<string, BoneTransform> {
    const boneTransforms: Map<string, BoneTransform> = new Map();

    for (const layer of this.animationLayers) {
      for (const animation of layer) {
        const value = safeEvaluate(animation.expression, context, 0);

        switch (animation.targetType) {
          case "var":
            context.variables[animation.propertyName] = value;
            break;
          case "render":
            break;
          case "bone":
            // OptiFine supports boolean variables via `varb.*`. Treat these like
            // variables rather than bone transforms.
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
              Object.assign(
                transform,
                createBoneTransform(animation.propertyName, value),
              );

              if (!context.boneValues[animation.targetName]) {
                context.boneValues[animation.targetName] = {};
              }
              context.boneValues[animation.targetName][
                animation.propertyName
              ] = value;
            }
            break;
        }
      }
    }

    return boneTransforms;
  }

  /**
   * Infer translation/rotation normalization for CEM animations.
   *
   * Strategy:
   * - Evaluate animations once in the default context ("tick 0") to capture
   *   baseline values (as authored in JPM).
   * - For any bone axis that is animated in translation, treat it as an
   *   absolute rotationPoint-like channel and calibrate offsets so the baseline
   *   evaluates to the model's rest pose (no name-based heuristics).
   * - For any bone axis that is animated in rotation, store baseline offsets so
   *   the baseline evaluates to the model's rest pose.
   */
  private initializeTransformNormalization(): void {
    this.baselineBoneValues.clear();

    const baselineContext = createAnimationContext();
    baselineContext.boneValues = this.cloneRestBoneValues();
    // Baselines should reflect the first evaluation performed by tick(0), which
    // increments the frame counter before evaluating expressions.
    baselineContext.entityState.frame_counter = 1;
    baselineContext.entityState.frame_time = 0;

    const baselineTransforms = this.evaluateLayersToTransforms(baselineContext);

    for (const [boneName, transform] of baselineTransforms) {
      if (transform.tx !== undefined)
        this.baselineBoneValues.set(`${boneName}.tx`, transform.tx);
      if (transform.ty !== undefined)
        this.baselineBoneValues.set(`${boneName}.ty`, transform.ty);
      if (transform.tz !== undefined)
        this.baselineBoneValues.set(`${boneName}.tz`, transform.tz);
      if (transform.rx !== undefined)
        this.baselineBoneValues.set(`${boneName}.rx`, transform.rx);
      if (transform.ry !== undefined)
        this.baselineBoneValues.set(`${boneName}.ry`, transform.ry);
      if (transform.rz !== undefined)
        this.baselineBoneValues.set(`${boneName}.rz`, transform.rz);
    }

    // Determine which channels are constant-only (these are often intended as
    // authored offsets and should not be normalized away).
    const isConstantByChannel = new Map<string, boolean>();
    for (const layer of this.animationLayers) {
      for (const anim of layer) {
        if (anim.targetType !== "bone") continue;
        if (!isBoneTransformProperty(anim.propertyName)) continue;
        isConstantByChannel.set(
          `${anim.targetName}.${anim.propertyName}`,
          isConstantExpression(anim.expression),
        );
      }
    }

    // Normalize additive translations by subtracting tick(0) baselines.
    for (const [boneName, axesSet] of this.translationAxesByBone) {
      const bone = this.bones.get(boneName);
      if (!bone) continue;

      const userData = (bone as any).userData ?? {};
      const absoluteAxes: string =
        typeof userData.absoluteTranslationAxes === "string"
          ? (userData.absoluteTranslationAxes as string)
          : userData.absoluteTranslation === true
            ? "xyz"
            : "";

      if (axesSet.has("x")) {
        const channel = `${boneName}.tx`;
        if (absoluteAxes.includes("x")) {
          // Absolute channels should remain absolute; do not normalize.
        } else if (
          typeof userData.translationOffsetXPx !== "number" &&
          typeof userData.translationOffsetX !== "number" &&
          isConstantByChannel.get(channel) !== true
        ) {
          const tx0 = this.getBaselineBoneValue(boneName, "tx");
          if (Math.abs(tx0) > 1e-6) userData.translationOffsetXPx = tx0;
        }
      }

      if (axesSet.has("y")) {
        const channel = `${boneName}.ty`;
        if (absoluteAxes.includes("y")) {
          // Absolute channels should remain absolute; do not normalize.
        } else if (
          typeof userData.translationOffsetYPx !== "number" &&
          typeof userData.translationOffsetY !== "number" &&
          isConstantByChannel.get(channel) !== true
        ) {
          const ty0 = this.getBaselineBoneValue(boneName, "ty");
          if (Math.abs(ty0) > 1e-6) userData.translationOffsetYPx = ty0;
        }
      }

      if (axesSet.has("z")) {
        const channel = `${boneName}.tz`;
        if (absoluteAxes.includes("z")) {
          // Absolute channels should remain absolute; do not normalize.
        } else if (
          typeof userData.translationOffsetZPx !== "number" &&
          typeof userData.translationOffsetZ !== "number" &&
          isConstantByChannel.get(channel) !== true
        ) {
          const tz0 = this.getBaselineBoneValue(boneName, "tz");
          if (Math.abs(tz0) > 1e-6) userData.translationOffsetZPx = tz0;
        }
      }

      (bone as any).userData = userData;
    }

    // Normalize additive rotations by subtracting tick(0) baselines.
    for (const [boneName, axesSet] of this.rotationAxesByBone) {
      const bone = this.bones.get(boneName);
      if (!bone) continue;

      const userData = (bone as any).userData ?? {};
      const absoluteRotationAxes: string =
        typeof userData.absoluteRotationAxes === "string"
          ? (userData.absoluteRotationAxes as string)
          : userData.absoluteRotation === true
            ? "xyz"
            : "";

      if (axesSet.has("x")) {
        const channel = `${boneName}.rx`;
        if (absoluteRotationAxes.includes("x")) {
          // Absolute channels should remain absolute; do not normalize.
        } else if (
          typeof userData.rotationOffsetX !== "number" &&
          isConstantByChannel.get(channel) !== true
        ) {
          const rx0 = this.getBaselineBoneValue(boneName, "rx");
          if (Math.abs(rx0) > 1e-6) userData.rotationOffsetX = rx0;
        }
      }
      if (axesSet.has("y")) {
        const channel = `${boneName}.ry`;
        if (absoluteRotationAxes.includes("y")) {
          // Absolute channels should remain absolute; do not normalize.
        } else if (
          typeof userData.rotationOffsetY !== "number" &&
          isConstantByChannel.get(channel) !== true
        ) {
          const ry0 = this.getBaselineBoneValue(boneName, "ry");
          if (Math.abs(ry0) > 1e-6) userData.rotationOffsetY = ry0;
        }
      }
      if (axesSet.has("z")) {
        const channel = `${boneName}.rz`;
        if (absoluteRotationAxes.includes("z")) {
          // Absolute channels should remain absolute; do not normalize.
        } else if (
          typeof userData.rotationOffsetZ !== "number" &&
          isConstantByChannel.get(channel) !== true
        ) {
          const rz0 = this.getBaselineBoneValue(boneName, "rz");
          if (Math.abs(rz0) > 1e-6) userData.rotationOffsetZ = rz0;
        }
      }

      (bone as any).userData = userData;
    }
  }

  /**
   * Compile a single property expression.
   */
  private compileProperty(
    property: string,
    expression: string | number,
  ): CompiledAnimation | null {
    const parsed = parseBoneProperty(property);
    if (!parsed) {
      console.warn(`[AnimationEngine] Invalid property format: ${property}`);
      return null;
    }

    const { target, property: propName } = parsed;

    // Determine target type
    let targetType: "bone" | "var" | "render";
    if (target === "var") {
      targetType = "var";
    } else if (target === "render") {
      targetType = "render";
    } else {
      targetType = "bone";
    }

    // Compile the expression
    const compiledExpr = compileExpression(expression);

    return {
      property,
      targetType,
      targetName: target,
      propertyName: propName,
      expression: compiledExpr,
    };
  }

  /**
   * Check if this engine has animations.
   */
  hasAnimations(): boolean {
    return this.animationLayers.length > 0;
  }

  /**
   * Get the number of animation layers.
   */
  getLayerCount(): number {
    return this.animationLayers.length;
  }

  /**
   * Get the total number of compiled expressions.
   */
  getExpressionCount(): number {
    return this.animationLayers.reduce((sum, layer) => sum + layer.length, 0);
  }

  /**
   * Get list of bone names in the model.
   */
  getBoneNames(): string[] {
    return Array.from(this.bones.keys());
  }

  // ==========================================================================
  // Playback Control
  // ==========================================================================

  /**
   * Set the active animation preset.
   *
   * @param presetId Preset ID or null to clear
   * @param autoPlay Whether to start playing immediately
   */
  setPreset(presetId: string | null, autoPlay: boolean = true): void {
    const currentPresetId = this.activePreset?.id ?? null;

    // If we're just toggling play/pause for the same preset, don't reset state.
    if (presetId === currentPresetId) {
      this.isPlaying = autoPlay && presetId !== null;
      return;
    }

    let preset: AnimationPreset | null = null;
    if (presetId !== null) {
      const found = getPresetById(presetId);
      if (!found) {
        console.warn(`[AnimationEngine] Unknown preset: ${presetId}`);
        return;
      }
      preset = found;
    }

    // Preserve identity + manual controls across preset changes.
    const preservedId = this.context.entityState.id;
    const preservedHeadYaw = this.context.entityState.head_yaw;
    const preservedHeadPitch = this.context.entityState.head_pitch;

    // Reset state when switching presets so booleans like `is_riding` don't stick.
    this.context.entityState = {
      ...DEFAULT_ENTITY_STATE,
      id: preservedId,
      head_yaw: preservedHeadYaw,
      head_pitch: preservedHeadPitch,
    };
    this.context.variables = {};
    this.context.boneValues = this.cloneRestBoneValues();
    this.context.randomCache.clear();

    // Reset timing counters for the new preset.
    this.elapsedTime = 0;
    this.context.entityState.frame_counter = 0;

    // Clearing preset stops playback and returns to rest pose.
    if (presetId === null) {
      this.activePreset = null;
      this.isPlaying = false;
      resetAllBones(this.bones, this.baseTransforms);
      return;
    }

    this.activePreset = preset;

    // Apply preset setup
    if (preset?.setup) {
      const setupState = preset.setup();
      Object.assign(this.context.entityState, setupState);
    }

    this.isPlaying = autoPlay;
  }

  /**
   * Get the currently active preset.
   */
  getActivePreset(): AnimationPreset | null {
    return this.activePreset;
  }

  /**
   * Start or resume animation playback.
   */
  play(): void {
    this.isPlaying = true;
  }

  /**
   * Pause animation playback.
   */
  pause(): void {
    this.isPlaying = false;
  }

  /**
   * Stop animation and reset to rest pose.
   */
  stop(): void {
    this.isPlaying = false;
    this.activePreset = null;
    this.elapsedTime = 0;
    this.context.entityState.frame_counter = 0;
    this.reset();
  }

  /**
   * Check if animation is playing.
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Set playback speed multiplier.
   */
  setSpeed(speed: number): void {
    this.speed = clampAnimationSpeed(speed);
  }

  /**
   * Get current playback speed.
   */
  getSpeed(): number {
    return this.speed;
  }

  // ==========================================================================
  // State Management
  // ==========================================================================

  /**
   * Get the current entity state.
   */
  getEntityState(): EntityState {
    return this.context.entityState;
  }

  /**
   * Update entity state values.
   */
  updateEntityState(updates: Partial<EntityState>): void {
    Object.assign(this.context.entityState, updates);
  }

  /**
   * Set head orientation (for manual control).
   */
  setHeadOrientation(yaw: number, pitch: number): void {
    this.context.entityState.head_yaw = yaw;
    this.context.entityState.head_pitch = pitch;
  }

  /**
   * Get a custom variable value.
   */
  getVariable(name: string): number {
    return this.context.variables[name] ?? 0;
  }

  /**
   * Set a custom variable value.
   */
  setVariable(name: string, value: number): void {
    this.context.variables[name] = value;
  }

  /**
   * Get a bone's current animated value.
   */
  getBoneValue(boneName: string, property: string): number {
    return this.context.boneValues[boneName]?.[property] ?? 0;
  }

  // ==========================================================================
  // Animation Tick
  // ==========================================================================

  /**
   * Tick the animation forward by deltaTime seconds.
   * Call this from your render loop (e.g., useFrame in React Three Fiber).
   *
   * @param deltaTime Time since last frame in seconds
   * @returns True if animation was updated
   */
  tick(deltaTime: number): boolean {
    if (!this.initialized) {
      return false;
    }

    // Apply playback speed
    const scaledDelta = deltaTime * this.speed;

    // Update preset state if playing
    if (this.isPlaying && this.activePreset) {
      this.elapsedTime += scaledDelta;

      // Check if non-looping animation has finished
      if (
        !this.activePreset.loop &&
        this.activePreset.duration > 0 &&
        this.elapsedTime >= this.activePreset.duration
      ) {
        this.isPlaying = false;
      } else {
        // Apply preset update function
        const updates = this.activePreset.update(
          this.context.entityState,
          scaledDelta,
        );
        Object.assign(this.context.entityState, updates);
      }
    }

    // Always update frame_time and frame_counter for expression evaluation
    this.context.entityState.frame_time = scaledDelta;
    this.context.entityState.frame_counter++;

    this.updateTriggerOverlays(scaledDelta);

    // Evaluate animations and apply to bones
    if (this.animationLayers.length > 0) {
      try {
        this.evaluateAndApply();
      } catch (error) {
        // Log error but don't crash - animation will just skip this frame
        console.error(
          "[AnimationEngine] Error during animation evaluation:",
          error,
        );
      }
      return true;
    }

    // Fallback: Apply vanilla-style animations if no CEM animations
    if (this.isPlaying && this.activePreset) {
      this.applyVanillaFallback();
      return true;
    }

    // Apply root overlay even if no CEM animations are present.
    this.applyRootOverlay();
    return this.isPlaying;
  }

  /**
   * Apply vanilla-style fallback animations when no CEM animations are present.
   * Handles different entity types with their specific bone naming conventions:
   * - Humanoids: left_arm, right_arm, left_leg, right_leg
   * - Quadrupeds/Creeper: leg1, leg2, leg3, leg4
   * - Flying entities: left_wing, right_wing
   */
  private applyVanillaFallback(): void {
    const state = this.context.entityState;

    // Head rotation based on head_yaw and head_pitch
    const head = this.bones.get("head");
    if (head) {
      const base = this.baseTransforms.get("head");
      // Convert degrees to radians
      const yawRad = (state.head_yaw * Math.PI) / 180;
      const pitchRad = (state.head_pitch * Math.PI) / 180;
      head.rotation.y = (base?.rotation.y ?? 0) + yawRad;
      head.rotation.x = (base?.rotation.x ?? 0) + pitchRad;
    }

    // Calculate swing amount for walking animation
    const swingAmount =
      Math.sin(state.limb_swing * 0.6662) * 1.4 * state.limb_speed;

    // Try humanoid limbs first (zombie, piglin, skeleton, etc.)
    const hasHumanoidLimbs = this.applyHumanoidLimbs(swingAmount);

    // If no humanoid limbs, try quadruped legs (creeper, pig, cow, etc.)
    if (!hasHumanoidLimbs) {
      this.applyQuadrupedLegs(swingAmount);
    }

    // Apply wing flapping for flying entities (allay, bat, parrot, etc.)
    this.applyWingFlap(state);

    // Hurt animation - wobble the body
    if (state.hurt_time > 0) {
      const hurtWobble = Math.sin(state.hurt_time * 0.5) * 0.3;
      const body = this.bones.get("body");
      if (body) {
        const base = this.baseTransforms.get("body");
        body.rotation.z = (base?.rotation.z ?? 0) + hurtWobble;
      }
    }

    // Death animation - fall over
    if (state.death_time > 0) {
      const deathProgress = Math.min(state.death_time / 20, 1);
      const deathAngle = (deathProgress * Math.PI) / 2; // Rotate up to 90 degrees
      const body = this.bones.get("body");
      if (body) {
        const base = this.baseTransforms.get("body");
        body.rotation.x = (base?.rotation.x ?? 0) + deathAngle;
      }
    }
  }

  /**
   * Apply humanoid limb animations (arms and legs).
   * @returns true if humanoid limbs were found and animated
   */
  private applyHumanoidLimbs(swingAmount: number): boolean {
    let foundAny = false;

    // Arms swing opposite to legs
    const rightArm = this.bones.get("right_arm");
    if (rightArm) {
      const base = this.baseTransforms.get("right_arm");
      rightArm.rotation.x = (base?.rotation.x ?? 0) + swingAmount;
      foundAny = true;
    }

    const leftArm = this.bones.get("left_arm");
    if (leftArm) {
      const base = this.baseTransforms.get("left_arm");
      leftArm.rotation.x = (base?.rotation.x ?? 0) - swingAmount;
      foundAny = true;
    }

    // Legs swing opposite to each other
    const rightLeg = this.bones.get("right_leg");
    if (rightLeg) {
      const base = this.baseTransforms.get("right_leg");
      rightLeg.rotation.x = (base?.rotation.x ?? 0) - swingAmount;
      foundAny = true;
    }

    const leftLeg = this.bones.get("left_leg");
    if (leftLeg) {
      const base = this.baseTransforms.get("left_leg");
      leftLeg.rotation.x = (base?.rotation.x ?? 0) + swingAmount;
      foundAny = true;
    }

    return foundAny;
  }

  /**
   * Apply quadruped leg animations (leg1-leg4 pattern).
   * Used by creeper, pig, cow, sheep, and other 4-legged entities.
   * leg1/leg3 are typically front legs, leg2/leg4 are back legs (or vice versa)
   */
  private applyQuadrupedLegs(swingAmount: number): void {
    // Front legs (or diagonal pair) swing one direction
    const leg1 = this.bones.get("leg1");
    if (leg1) {
      const base = this.baseTransforms.get("leg1");
      leg1.rotation.x = (base?.rotation.x ?? 0) + swingAmount;
    }

    const leg3 = this.bones.get("leg3");
    if (leg3) {
      const base = this.baseTransforms.get("leg3");
      leg3.rotation.x = (base?.rotation.x ?? 0) + swingAmount;
    }

    // Back legs (or other diagonal pair) swing opposite direction
    const leg2 = this.bones.get("leg2");
    if (leg2) {
      const base = this.baseTransforms.get("leg2");
      leg2.rotation.x = (base?.rotation.x ?? 0) - swingAmount;
    }

    const leg4 = this.bones.get("leg4");
    if (leg4) {
      const base = this.baseTransforms.get("leg4");
      leg4.rotation.x = (base?.rotation.x ?? 0) - swingAmount;
    }

    // Also try directional naming (used by horse, cat)
    // front_left_leg, front_right_leg, back_left_leg, back_right_leg
    const frontLeftLeg = this.bones.get("front_left_leg");
    if (frontLeftLeg) {
      const base = this.baseTransforms.get("front_left_leg");
      frontLeftLeg.rotation.x = (base?.rotation.x ?? 0) + swingAmount;
    }

    const frontRightLeg = this.bones.get("front_right_leg");
    if (frontRightLeg) {
      const base = this.baseTransforms.get("front_right_leg");
      frontRightLeg.rotation.x = (base?.rotation.x ?? 0) - swingAmount;
    }

    const backLeftLeg = this.bones.get("back_left_leg");
    if (backLeftLeg) {
      const base = this.baseTransforms.get("back_left_leg");
      backLeftLeg.rotation.x = (base?.rotation.x ?? 0) - swingAmount;
    }

    const backRightLeg = this.bones.get("back_right_leg");
    if (backRightLeg) {
      const base = this.baseTransforms.get("back_right_leg");
      backRightLeg.rotation.x = (base?.rotation.x ?? 0) + swingAmount;
    }
  }

  /**
   * Apply wing flapping animation for flying entities.
   * Uses the age variable for continuous flapping when moving.
   */
  private applyWingFlap(state: EntityState): void {
    // Only flap wings when moving (limb_speed > 0) or always for flying entities
    const flapSpeed = state.limb_speed > 0 ? 10 : 3; // Faster when moving
    const flapAmount = Math.sin(state.age * flapSpeed) * 0.5;

    const leftWing = this.bones.get("left_wing");
    if (leftWing) {
      const base = this.baseTransforms.get("left_wing");
      leftWing.rotation.z = (base?.rotation.z ?? 0) - flapAmount;
    }

    const rightWing = this.bones.get("right_wing");
    if (rightWing) {
      const base = this.baseTransforms.get("right_wing");
      rightWing.rotation.z = (base?.rotation.z ?? 0) + flapAmount;
    }

    // Handle outer wings (bat has outer_left_wing, outer_right_wing)
    const outerLeftWing = this.bones.get("outer_left_wing");
    if (outerLeftWing) {
      const base = this.baseTransforms.get("outer_left_wing");
      outerLeftWing.rotation.z = (base?.rotation.z ?? 0) - flapAmount * 0.5;
    }

    const outerRightWing = this.bones.get("outer_right_wing");
    if (outerRightWing) {
      const base = this.baseTransforms.get("outer_right_wing");
      outerRightWing.rotation.z = (base?.rotation.z ?? 0) + flapAmount * 0.5;
    }
  }

  /** Track if we've logged animation summary */
  private hasLoggedAnimationSummary = false;

  /** Frame counter for debug logging */
  private debugFrameCount = 0;

  /**
   * Evaluate all animation expressions and apply to bones.
   */
  private evaluateAndApply(): void {
    // OptiFine evaluates CEM expressions against the model's rest pose each
    // frame. Resetting here prevents transforms from "sticking" when switching
    // presets or when an animation does not author every channel every frame.
    resetAllBones(this.bones, this.baseTransforms);
    this.context.boneValues = this.cloneRestBoneValues();
    for (const [boneName, props] of Object.entries(this.boneInputOverrides)) {
      this.context.boneValues[boneName] = {
        ...(this.context.boneValues[boneName] ?? {}),
        ...props,
      };
    }

    // Accumulated transforms per bone
    const boneTransforms: Map<string, BoneTransform> = new Map();

    // Log animation summary once
    if (DEBUG_ANIMATIONS && !this.hasLoggedAnimationSummary) {
      console.log("[AnimationEngine] Animation layers summary:");
      for (let i = 0; i < this.animationLayers.length; i++) {
        const layer = this.animationLayers[i];
        console.log(`  Layer ${i}: ${layer.length} expressions`);
        for (const anim of layer) {
          if (
            anim.targetType === "bone" &&
            (anim.propertyName === "tx" ||
              anim.propertyName === "ty" ||
              anim.propertyName === "tz")
          ) {
            console.log(
              `    - ${anim.targetName}.${anim.propertyName} (translation)`,
            );
          }
        }
      }
      this.hasLoggedAnimationSummary = true;
    }

    this.debugFrameCount++;
    const shouldLogThisFrame = DEBUG_ANIMATIONS && this.debugFrameCount <= 3;

    // Process each layer in order
    for (const layer of this.animationLayers) {
      for (const animation of layer) {
        // Evaluate the expression
        const value = safeEvaluate(animation.expression, this.context, 0);

        // Apply based on target type
        switch (animation.targetType) {
          case "var":
            // Store in variables for later expressions
            this.context.variables[animation.propertyName] = value;
            break;

          case "render":
            // Render properties (shadow, leash offset) - store but don't apply
            // Could be used for shadow rendering if implemented
            break;

          case "bone":
            // OptiFine supports boolean variables via `varb.*`. Treat these like
            // variables rather than bone transforms.
            if (animation.targetName === "varb") {
              this.context.boneValues.varb ??= {};
              this.context.boneValues.varb[animation.propertyName] = value;
              break;
            }
            // Bone transform - accumulate
            if (isBoneTransformProperty(animation.propertyName)) {
              let transform = boneTransforms.get(animation.targetName);
              if (!transform) {
                transform = {};
                boneTransforms.set(animation.targetName, transform);
              }
              const partial = createBoneTransform(
                animation.propertyName,
                value,
              );
              Object.assign(transform, partial);

              // Log translation values
              if (
                shouldLogThisFrame &&
                (animation.propertyName === "tx" ||
                  animation.propertyName === "ty" ||
                  animation.propertyName === "tz")
              ) {
                console.log(
                  `[AnimationEngine] Frame ${this.debugFrameCount}: ${animation.targetName}.${animation.propertyName} = ${value.toFixed(3)}`,
                );
              }

              // Also store in context for expression references
              if (!this.context.boneValues[animation.targetName]) {
                this.context.boneValues[animation.targetName] = {};
              }
              this.context.boneValues[animation.targetName][
                animation.propertyName
              ] = value;
            }
            break;
        }
      }
    }

    // Log final transforms before applying
    if (shouldLogThisFrame) {
      console.log(
        `[AnimationEngine] Frame ${this.debugFrameCount}: Accumulated transforms for ${boneTransforms.size} bones`,
      );
      for (const [boneName, transform] of boneTransforms) {
        if (
          transform.tx !== undefined ||
          transform.ty !== undefined ||
          transform.tz !== undefined
        ) {
          console.log(
            `  ${boneName}: tx=${transform.tx?.toFixed(3)}, ty=${transform.ty?.toFixed(3)}, tz=${transform.tz?.toFixed(3)}`,
          );
        }
      }
    }

    // Apply accumulated transforms to bones
    // With nested Three.js hierarchy, parent transforms automatically propagate
    // to children - we just apply each bone's animation offset to its local transform
    for (const [boneName, transform] of boneTransforms) {
      const bone = this.bones.get(boneName);
      if (bone) {
        const base = this.baseTransforms.get(boneName);
        applyBoneTransform(bone, transform, base);
      } else if (!this.warnedMissingBones.has(boneName)) {
        // Warn once per missing bone to avoid log spam
        console.warn(
          `[AnimationEngine] Animation references missing bone: "${boneName}". ` +
            `Available bones: ${Array.from(this.bones.keys()).join(", ")}`,
        );
        this.warnedMissingBones.add(boneName);
      }
    }

    // If key vanilla parts are animated as root-level bones, they do not inherit
    // body rotations via the scene graph. OptiFine/Minecraft applies implicit
    // vanilla hierarchy for rotations, so we emulate that here by applying the
    // body's animation rotation offset to those bones.
    const bodyTransform = boneTransforms.get("body");
    if (
      bodyTransform &&
      (bodyTransform.rx !== undefined ||
        bodyTransform.ry !== undefined ||
        bodyTransform.rz !== undefined)
    ) {
      const bodyBone = this.bones.get("body");
      if (bodyBone) {
        const order = bodyBone.rotation.order || "ZYX";
        const animEuler = new THREE.Euler(
          bodyTransform.rx ?? 0,
          bodyTransform.ry ?? 0,
          bodyTransform.rz ?? 0,
          order,
        );
        const bodyAnimQuat = new THREE.Quaternion().setFromEuler(animEuler);

        const vanillaChildren = [
          "head",
          "headwear",
          "left_arm",
          "right_arm",
          "left_leg",
          "right_leg",
        ];

        for (const childName of vanillaChildren) {
          const child = this.bones.get(childName);
          if (!child) continue;
          // Only apply if the bone is still a direct child of the model root
          // (i.e., it was skipped during applyVanillaHierarchy).
          if (child.parent !== this.modelGroup) continue;
          // Only apply to bones that were animated this frame to avoid accumulation.
          if (!boneTransforms.has(childName)) continue;

          child.quaternion.premultiply(bodyAnimQuat);
          child.rotation.setFromQuaternion(
            child.quaternion,
            child.rotation.order,
          );
        }
      }
    }

    this.modelGroup.updateMatrixWorld(true);
    this.applyRootOverlay();

    if (shouldLogThisFrame) {
      console.log(`[AnimationEngine] World positions AFTER animation:`);
      const bonesToCheck = ["head", "headwear", "head2", "left_ear2", "nose"];
      for (const boneName of bonesToCheck) {
        const bone = this.bones.get(boneName);
        if (bone) {
          const worldPos = new THREE.Vector3();
          bone.getWorldPosition(worldPos);
          console.log(
            `  ${boneName}: local=[${bone.position.x.toFixed(3)}, ${bone.position.y.toFixed(3)}, ${bone.position.z.toFixed(3)}], world=[${worldPos.x.toFixed(3)}, ${worldPos.y.toFixed(3)}, ${worldPos.z.toFixed(3)}]`,
          );
        }
      }
    }
  }

  // ==========================================================================
  // Reset
  // ==========================================================================

  /**
   * Reset all bones to their base (rest) pose.
   */
  reset(): void {
    resetAllBones(this.bones, this.baseTransforms);
    this.context = createAnimationContext();
    this.context.boneValues = this.cloneRestBoneValues();
    this.elapsedTime = 0;
    this.activeTriggers = [];
    this.boneInputOverrides = {};
    this.rootOverlay = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 };
    this.modelGroup.position.copy(this.baseRootPosition);
    this.modelGroup.rotation.copy(this.baseRootRotation);
  }

  /**
   * Reset entity state to defaults.
   */
  resetState(): void {
    this.context.entityState = { ...DEFAULT_ENTITY_STATE };
    this.context.variables = {};
    this.context.boneValues = this.cloneRestBoneValues();
    this.activeTriggers = [];
    this.boneInputOverrides = {};
    this.context.randomCache.clear();
  }

  private updateTriggerOverlays(deltaSec: number): void {
    // Decay time-based vanilla state counters (measured in ticks).
    const dtTicks = deltaSec * 20;
    if (this.context.entityState.hurt_time > 0) {
      this.context.entityState.hurt_time = Math.max(
        0,
        this.context.entityState.hurt_time - dtTicks,
      );
      this.context.entityState.is_hurt = this.context.entityState.hurt_time > 0;
    }
    if (this.context.entityState.death_time > 0) {
      this.context.entityState.death_time = Math.max(
        0,
        this.context.entityState.death_time - dtTicks,
      );
    }

    // Build per-frame bone input overrides from active triggers.
    this.boneInputOverrides = {};
    this.rootOverlay = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 };
    const baseRuleIndex = this.context.entityState.rule_index;
    let forceRuleIndex: number | null = null;

    const next: typeof this.activeTriggers = [];
    for (const trig of this.activeTriggers) {
      const elapsedSec = trig.elapsedSec + deltaSec;
      const t =
        trig.durationSec > 0 ? Math.min(1, elapsedSec / trig.durationSec) : 1;

      if (trig.id === "trigger.attack") {
        // One-shot swing: 0 -> 1 -> 0.
        const swing = Math.sin(Math.PI * t);
        this.context.entityState.swing_progress = swing;
      }

      if (trig.id === "trigger.hurt") {
        const envelope = Math.sin(Math.PI * t);
        // Small pop-up like vanilla hurt knockback.
        this.rootOverlay.y += 0.06 * envelope;
      }

      if (trig.id === "trigger.death") {
        const envelope = Math.sin((Math.PI / 2) * t); // ease-out
        // Fall/roll to the side with a small lateral kick.
        this.rootOverlay.x += 0.12 * envelope;
        this.rootOverlay.y += 0.02 * envelope;
        this.rootOverlay.rz += 1.1 * envelope;
      }

      if (trig.id === "trigger.horse_rearing") {
        // Drive vanilla input `neck.ty` towards a value < 4 to trigger var.rearing.
        // Neutral is 4; target is -4 (full rear).
        const envelope = Math.sin(Math.PI * t);
        const neutral = 4;
        const target = -4;
        const value = neutral + (target - neutral) * envelope;
        this.boneInputOverrides.neck ??= {};
        this.boneInputOverrides.neck.ty = value;
      }

      if (trig.id === "trigger.eat") {
        const envelope = Math.sin(Math.PI * t);

        if (this.inferredEatRuleIndex !== null) {
          forceRuleIndex = this.inferredEatRuleIndex;
        }

        // Horse-family: driven by `neck.ty` input and `var.eating`.
        if (this.expressionMentions("neck.ty")) {
          const neutral = 4;
          const target = 11;
          const value = neutral + (target - neutral) * envelope;
          this.boneInputOverrides.neck ??= {};
          this.boneInputOverrides.neck.ty = value;
        }

        // Sheep/cow-family: driven by placeholder `head.rx` (and often compared to head_pitch).
        if (this.expressionMentions("head.rx")) {
          const headPitchRad = (this.context.entityState.head_pitch * Math.PI) / 180;
          // Push away from `torad(head_pitch)` to satisfy `head.rx - torad(head_pitch) != 0`.
          const value = headPitchRad + 1.2 * envelope;
          this.boneInputOverrides.head ??= {};
          this.boneInputOverrides.head.rx = value;
        }
      }

      if (elapsedSec < trig.durationSec) {
        next.push({ ...trig, elapsedSec });
      }
    }

    this.activeTriggers = next;

    if (forceRuleIndex !== null) {
      this.context.entityState.rule_index = forceRuleIndex;
    } else {
      this.context.entityState.rule_index = baseRuleIndex;
    }
  }

  private inferEatRuleIndexFromAnimations(): number | null {
    for (const layer of this.animationLayers) {
      for (const a of layer) {
        if (a.targetType !== "bone") continue;
        if (a.targetName !== "varb") continue;
        if (a.propertyName !== "index_eat") continue;
        const expr: any = a.expression as any;
        const src = typeof expr?.source === "string" ? (expr.source as string) : "";
        const match = src.match(/rule_index\\s*==\\s*(\\d+)/);
        if (match) return Number(match[1]);
      }
    }
    return null;
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

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * Dispose of the animation engine.
   * Call this when the entity is removed from the scene.
   */
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

/**
 * Create an animation engine for an entity model.
 *
 * @param modelGroup The Three.js group containing the entity model
 * @param animationLayers Optional animation layers from JEM file
 * @returns New AnimationEngine instance
 */
export function createAnimationEngine(
  modelGroup: THREE.Group,
  animationLayers?: AnimationLayer[],
): AnimationEngine {
  return new AnimationEngine(modelGroup, animationLayers);
}
