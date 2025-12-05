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
import { createAnimationContext, DEFAULT_ENTITY_STATE, clampAnimationSpeed } from "./types";
import { compileExpression } from "./expressionParser";
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
  constructor(
    modelGroup: THREE.Group,
    animationLayers?: AnimationLayer[]
  ) {
    // Build bone map from model
    this.bones = buildBoneMap(modelGroup);

    // Store base transforms for reset
    this.baseTransforms = storeBaseTransforms(this.bones);

    // Initialize context
    this.context = createAnimationContext();

    // Compile animations if provided
    if (animationLayers && animationLayers.length > 0) {
      this.compileAnimations(animationLayers);
    }

    this.initialized = true;
  }

  /**
   * Compile animation expressions from JEM animation layers.
   */
  private compileAnimations(layers: AnimationLayer[]): void {
    this.animationLayers = [];

    for (const layer of layers) {
      const compiledLayer: CompiledAnimation[] = [];

      for (const [property, expression] of Object.entries(layer)) {
        try {
          const compiled = this.compileProperty(property, expression);
          if (compiled) {
            compiledLayer.push(compiled);
          }
        } catch (error) {
          console.warn(
            `[AnimationEngine] Failed to compile: ${property} = ${expression}`,
            error
          );
        }
      }

      if (compiledLayer.length > 0) {
        this.animationLayers.push(compiledLayer);
      }
    }

    console.log(
      `[AnimationEngine] Compiled ${this.animationLayers.length} animation layers with ${this.animationLayers.reduce((sum, l) => sum + l.length, 0)} expressions`
    );
  }

  /**
   * Compile a single property expression.
   */
  private compileProperty(
    property: string,
    expression: string | number
  ): CompiledAnimation | null {
    const parsed = parseBoneProperty(property);
    if (!parsed) {
      console.warn(
        `[AnimationEngine] Invalid property format: ${property}`
      );
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
    if (presetId === null) {
      this.activePreset = null;
      return;
    }

    const preset = getPresetById(presetId);
    if (!preset) {
      console.warn(`[AnimationEngine] Unknown preset: ${presetId}`);
      return;
    }

    this.activePreset = preset;
    this.elapsedTime = 0;

    // Apply preset setup
    if (preset.setup) {
      const setupState = preset.setup();
      Object.assign(this.context.entityState, setupState);
    }

    if (autoPlay) {
      this.isPlaying = true;
    }
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
          scaledDelta
        );
        Object.assign(this.context.entityState, updates);
      }
    }

    // Always update frame_time for expression evaluation
    this.context.entityState.frame_time = scaledDelta;

    // Evaluate animations and apply to bones
    if (this.animationLayers.length > 0) {
      try {
        this.evaluateAndApply();
      } catch (error) {
        // Log error but don't crash - animation will just skip this frame
        console.error("[AnimationEngine] Error during animation evaluation:", error);
      }
      return true;
    }

    // Fallback: Apply vanilla-style animations if no CEM animations
    if (this.isPlaying && this.activePreset) {
      this.applyVanillaFallback();
      return true;
    }

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
    const swingAmount = Math.sin(state.limb_swing * 0.6662) * 1.4 * state.limb_speed;

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
    // Accumulated transforms per bone
    const boneTransforms: Map<string, BoneTransform> = new Map();

    // Log animation summary once
    if (DEBUG_ANIMATIONS && !this.hasLoggedAnimationSummary) {
      console.log("[AnimationEngine] Animation layers summary:");
      for (let i = 0; i < this.animationLayers.length; i++) {
        const layer = this.animationLayers[i];
        console.log(`  Layer ${i}: ${layer.length} expressions`);
        for (const anim of layer) {
          if (anim.targetType === "bone" && (anim.propertyName === "tx" || anim.propertyName === "ty" || anim.propertyName === "tz")) {
            console.log(`    - ${anim.targetName}.${anim.propertyName} (translation)`);
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
            // Bone transform - accumulate
            if (isBoneTransformProperty(animation.propertyName)) {
              let transform = boneTransforms.get(animation.targetName);
              if (!transform) {
                transform = {};
                boneTransforms.set(animation.targetName, transform);
              }
              const partial = createBoneTransform(animation.propertyName, value);
              Object.assign(transform, partial);

              // Log translation values
              if (shouldLogThisFrame && (animation.propertyName === "tx" || animation.propertyName === "ty" || animation.propertyName === "tz")) {
                console.log(`[AnimationEngine] Frame ${this.debugFrameCount}: ${animation.targetName}.${animation.propertyName} = ${value.toFixed(3)}`);
              }

              // Also store in context for expression references
              if (!this.context.boneValues[animation.targetName]) {
                this.context.boneValues[animation.targetName] = {};
              }
              this.context.boneValues[animation.targetName][animation.propertyName] = value;
            }
            break;
        }
      }
    }

    // Log final transforms before applying
    if (shouldLogThisFrame) {
      console.log(`[AnimationEngine] Frame ${this.debugFrameCount}: Accumulated transforms for ${boneTransforms.size} bones`);
      for (const [boneName, transform] of boneTransforms) {
        if (transform.tx !== undefined || transform.ty !== undefined || transform.tz !== undefined) {
          console.log(`  ${boneName}: tx=${transform.tx?.toFixed(3)}, ty=${transform.ty?.toFixed(3)}, tz=${transform.tz?.toFixed(3)}`);
        }
      }
    }

    // Apply accumulated transforms to bones
    for (const [boneName, transform] of boneTransforms) {
      const bone = this.bones.get(boneName);
      if (bone) {
        const base = this.baseTransforms.get(boneName);

        // Get parent's animation transforms if the parent is also animated
        let parentTransform: BoneTransform | undefined;
        const parentName = bone.parent?.name;
        if (parentName && boneTransforms.has(parentName)) {
          parentTransform = boneTransforms.get(parentName);
          if (shouldLogThisFrame) {
            console.log(`[AnimationEngine] ${boneName} has animated parent: ${parentName}`);
          }
        }

        applyBoneTransform(bone, transform, base, parentTransform);
      } else if (!this.warnedMissingBones.has(boneName)) {
        // Warn once per missing bone to avoid log spam
        console.warn(
          `[AnimationEngine] Animation references missing bone: "${boneName}". ` +
          `Available bones: ${Array.from(this.bones.keys()).join(", ")}`
        );
        this.warnedMissingBones.add(boneName);
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
    this.elapsedTime = 0;
  }

  /**
   * Reset entity state to defaults.
   */
  resetState(): void {
    this.context.entityState = { ...DEFAULT_ENTITY_STATE };
    this.context.variables = {};
    this.context.boneValues = {};
    this.context.randomCache.clear();
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
  animationLayers?: AnimationLayer[]
): AnimationEngine {
  return new AnimationEngine(modelGroup, animationLayers);
}
