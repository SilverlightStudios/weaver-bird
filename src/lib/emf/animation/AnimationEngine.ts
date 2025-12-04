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
import { createAnimationContext, DEFAULT_ENTITY_STATE } from "./types";
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
    this.speed = Math.max(0.1, Math.min(3.0, speed));
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
      this.evaluateAndApply();
      return true;
    }

    return this.isPlaying;
  }

  /**
   * Evaluate all animation expressions and apply to bones.
   */
  private evaluateAndApply(): void {
    // Accumulated transforms per bone
    const boneTransforms: Map<string, BoneTransform> = new Map();

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

    // Apply accumulated transforms to bones
    for (const [boneName, transform] of boneTransforms) {
      const bone = this.bones.get(boneName);
      if (bone) {
        const base = this.baseTransforms.get(boneName);
        applyBoneTransform(bone, transform, base);
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
