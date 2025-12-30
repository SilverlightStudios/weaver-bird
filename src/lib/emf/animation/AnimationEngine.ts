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
import { getPoseToggleDefinition } from "./poses";
import type { ASTNode } from "./types";

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
  private baselineBoneValuesWater: Map<string, number> = new Map();

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
  private selfTranslationReads: Map<string, Set<"tx" | "ty" | "tz">> = new Map();
  /**
   * Subset of `selfTranslationReads` that should be seeded with pivot-like
   * values (rather than 0) because the JPM uses them as base rotationPoint
   * terms (commonly seen as `bone.tz + 15`, etc).
   */
  private selfTranslationPivotSeeds: Map<string, Set<"tx" | "ty" | "tz">> =
    new Map();
  /**
   * Tracks which bones are read as rotation inputs (rx/ry/rz) in expressions.
   * Some JPMs (notably Fresh Animations sniffer) rely on vanilla leg swing
   * being present in `bone.rx` rather than authoring their own limb_swing math.
   */
  private rotationInputReads: Map<string, Set<"rx" | "ry" | "rz">> = new Map();
  /**
   * Tracks self-reads for rotation channels. When an expression reads its own
   * rotation (e.g. `leg.rx*(1-testing)+...`), it is usually constructing an
   * absolute value on top of vanilla inputs; treat that axis as absolute.
   */
  private selfRotationReads: Map<string, Set<"rx" | "ry" | "rz">> = new Map();

  private activeTriggers: Array<{
    id: string;
    elapsedSec: number;
    durationSec: number;
  }> = [];

  private triggerBoneInputOverrides: Record<string, Record<string, number>> = {};
  private poseBoneInputOverrides: Record<string, Record<string, number>> = {};
  private featureBoneInputOverrides: Record<string, Record<string, number>> = {};
  private poseEntityStateOverrides: Partial<EntityState> = {};
  private activePoseToggleIds: string[] = [];

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

    // Compile animations if provided (needed for rest-value seeding and normalization).
    if (animationLayers && animationLayers.length > 0) {
      const { reads, pivotSeeds, rotationInputs, selfRotationReads } =
        this.collectSelfTranslationReadUsage(animationLayers);
      this.selfTranslationReads = reads;
      this.selfTranslationPivotSeeds = pivotSeeds;
      this.rotationInputReads = rotationInputs;
      this.selfRotationReads = selfRotationReads;
      this.compileAnimations(animationLayers);
    }

    this.restBoneValues = this.buildRestBoneValues(
      this.selfTranslationReads,
      this.selfTranslationPivotSeeds,
    );
    this.context.boneValues = this.cloneRestBoneValues();

    if (this.animationLayers.length > 0) {
      this.applyNeutralInputDefaultsFromAnimations();
      this.inferredEatRuleIndex = this.inferEatRuleIndexFromAnimations();
      this.initializeTransformNormalization();
    }

    this.initialized = true;
  }

  setPoseToggles(toggleIds: string[] | null | undefined): void {
    const next = (toggleIds ?? []).filter((id) => !!getPoseToggleDefinition(id));
    this.activePoseToggleIds = next;
  }

  setFeatureBoneInputOverrides(
    overrides: Record<string, Record<string, number>> | null | undefined,
  ): void {
    this.featureBoneInputOverrides = overrides ? { ...overrides } : {};
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

  private buildRestBoneValues(
    selfReads: Map<string, Set<"tx" | "ty" | "tz">> = new Map(),
    pivotSeeds: Map<string, Set<"tx" | "ty" | "tz">> = new Map(),
  ): Record<string, Record<string, number>> {
    const rest: Record<string, Record<string, number>> = {};
    const CEM_Y_ORIGIN_PX = 24;

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

      // For "pivot-only" bones (no local boxes on this bone), seed translation
      // values in the same units JPM expects when reading other bones.
      //
      // Important: the values expected by CEM expressions are *CEM-space* pivots
      // (including `invertAxis` and the 24px Y origin), not the raw parsed origin.
      const boxesGroup = (bone as any)?.userData?.boxesGroup as
        | THREE.Object3D
        | undefined;
      const hasLocalBoxes = !!boxesGroup && boxesGroup.children.length > 0;
      if (!hasLocalBoxes && base) {
        // Root pivot-only bones are often placeholders for vanilla-driven inputs
        // (e.g. blaze `stick*`), and we don't have vanilla runtime values here.
        // Default them to 0 rather than baking in their authored rest position.
        const isRoot = bone.parent === this.modelGroup;
        if (isRoot) continue;

        const invertAxis =
          typeof (bone as any)?.userData?.invertAxis === "string"
            ? ((bone as any).userData.invertAxis as string)
            : "";
        const localPxX = base.position.x * 16;
        const localPxY = base.position.y * 16;
        const localPxZ = base.position.z * 16;

        rest[name].tx = invertAxis.includes("x") ? -localPxX : localPxX;
        rest[name].tz = invertAxis.includes("z") ? -localPxZ : localPxZ;
        rest[name].ty = invertAxis.includes("y") ? -localPxY : localPxY;
      } else if (originPx) {
        // Some JPMs read translation channels on geometry bones as inputs
        // (e.g. `leg.tz` used as a base pivot term). Seed only those channels
        // that are referenced in expressions to avoid changing unrelated rigs.
        const reads = selfReads.get(name);
        if (reads && reads.size > 0) {
          const pivots = pivotSeeds.get(name) ?? new Set<"tx" | "ty" | "tz">();
          const invertAxis =
            typeof (bone as any)?.userData?.invertAxis === "string"
              ? ((bone as any).userData.invertAxis as string)
              : "";

          const baseLocal = this.baseTransforms.get(name)?.position;
          const localPxX = (baseLocal?.x ?? 0) * 16;
          const localPxY = (baseLocal?.y ?? 0) * 16;
          const localPxZ = (baseLocal?.z ?? 0) * 16;

          // OptiFine's `*.t?` reads are in CEM-space pivot coordinates. For X/Z
          // this is sign-flipped by invertAxis; for Y on root parts it behaves
          // like a rotationPointY (24 - y) when invertAxis includes Y.
          if (reads.has("tx")) {
            rest[name].tx = pivots.has("tx")
              ? invertAxis.includes("x")
                ? -localPxX
                : localPxX
              : 0;
          }
          if (reads.has("tz")) {
            rest[name].tz = pivots.has("tz")
              ? invertAxis.includes("z")
                ? -localPxZ
                : localPxZ
              : 0;
          }
          if (reads.has("ty")) {
            const isRoot = bone.parent === this.modelGroup;
            // Cross-bone reads like `rod1.ty = stick1.ty + 4` rely on input bones
            // (often roots) being seeded with their rotationPoint-like values even
            // if we don't detect an explicit self-pivot pattern.
            const shouldSeedPivot =
              pivots.has("ty") || (isRoot && Math.abs(localPxY) >= 10);
            if (!shouldSeedPivot) {
              rest[name].ty = 0;
            } else if (invertAxis.includes("y") && isRoot) {
              rest[name].ty = CEM_Y_ORIGIN_PX - localPxY;
            } else if (isRoot) {
              rest[name].ty = localPxY + CEM_Y_ORIGIN_PX;
            } else {
              rest[name].ty = invertAxis.includes("y") ? -localPxY : localPxY;
            }
          }
        }
      }
    }

    return rest;
  }

  private collectSelfTranslationReadUsage(
    layers: ReadonlyArray<AnimationLayer>,
  ): {
    reads: Map<string, Set<"tx" | "ty" | "tz">>;
    pivotSeeds: Map<string, Set<"tx" | "ty" | "tz">>;
    rotationInputs: Map<string, Set<"rx" | "ry" | "rz">>;
    selfRotationReads: Map<string, Set<"rx" | "ry" | "rz">>;
  } {
    const reads = new Map<string, Set<"tx" | "ty" | "tz">>();
    const pivotSeeds = new Map<string, Set<"tx" | "ty" | "tz">>();
    const rotationInputs = new Map<string, Set<"rx" | "ry" | "rz">>();
    const selfRotationReads = new Map<string, Set<"rx" | "ry" | "rz">>();

    for (const layer of layers) {
      for (const [propertyPath, exprSource] of Object.entries(layer)) {
        const parsedProp = parseBoneProperty(propertyPath);
        if (!parsedProp) continue;
        const targetBone = parsedProp.target;
        if (targetBone === "var" || targetBone === "render" || targetBone === "varb")
          continue;

        try {
          const parsed = compileExpression(exprSource);
          if (isConstantExpression(parsed)) continue;

          const getTranslationVar = (
            node: ASTNode,
          ): { bone: string; prop: "tx" | "ty" | "tz" } | null => {
            if (node.type !== "Variable") return null;
            const name = node.name;
            const dot = name.indexOf(".");
            if (dot === -1) return null;
            const bone = name.slice(0, dot);
            if (bone === "var" || bone === "render" || bone === "varb") return null;
            const prop = name.slice(dot + 1) as "tx" | "ty" | "tz";
            if (prop !== "tx" && prop !== "ty" && prop !== "tz") return null;
            return { bone, prop };
          };
          const getRotationVar = (
            node: ASTNode,
          ): { bone: string; prop: "rx" | "ry" | "rz" } | null => {
            if (node.type !== "Variable") return null;
            const name = node.name;
            const dot = name.indexOf(".");
            if (dot === -1) return null;
            const bone = name.slice(0, dot);
            const prop = name.slice(dot + 1) as "rx" | "ry" | "rz";
            if (bone === "var" || bone === "render" || bone === "varb") return null;
            return prop === "rx" || prop === "ry" || prop === "rz" ? { bone, prop } : null;
          };

          const markRead = (boneName: string, prop: "tx" | "ty" | "tz") => {
            const set = reads.get(boneName) ?? new Set<"tx" | "ty" | "tz">();
            set.add(prop);
            reads.set(boneName, set);
          };
          const markPivot = (boneName: string, prop: "tx" | "ty" | "tz") => {
            const set =
              pivotSeeds.get(boneName) ?? new Set<"tx" | "ty" | "tz">();
            set.add(prop);
            pivotSeeds.set(boneName, set);
          };

          const markRotationInput = (bone: string, prop: "rx" | "ry" | "rz") => {
            const set = rotationInputs.get(bone) ?? new Set<"rx" | "ry" | "rz">();
            set.add(prop);
            rotationInputs.set(bone, set);
          };
          const markSelfRotationRead = (prop: "rx" | "ry" | "rz") => {
            const set =
              selfRotationReads.get(targetBone) ??
              new Set<"rx" | "ry" | "rz">();
            set.add(prop);
            selfRotationReads.set(targetBone, set);
          };

          const containsTranslationVar = (
            node: ASTNode,
            boneName: string,
            prop: "tx" | "ty" | "tz",
          ): boolean => {
            let found = false;
            const visit = (n: ASTNode): void => {
              if (found) return;
              switch (n.type) {
                case "Variable":
                  found = n.name === `${boneName}.${prop}`;
                  return;
                case "UnaryOp":
                  visit(n.operand);
                  return;
                case "BinaryOp":
                  visit(n.left);
                  visit(n.right);
                  return;
                case "FunctionCall":
                  for (const arg of n.args) visit(arg);
                  return;
                case "Ternary":
                  visit(n.condition);
                  visit(n.consequent);
                  visit(n.alternate);
                  return;
                default:
                  return;
              }
            };
            visit(node);
            return found;
          };

          const visitWithTarget = (node: ASTNode): void => {
            switch (node.type) {
              case "Literal":
                return;

              case "Variable": {
                const tv = getTranslationVar(node);
                if (tv) markRead(tv.bone, tv.prop);
                const rot = getRotationVar(node);
                if (rot) {
                  markRotationInput(rot.bone, rot.prop);
                  if (rot.bone === targetBone) markSelfRotationRead(rot.prop);
                }
                return;
              }

              case "UnaryOp":
                visitWithTarget(node.operand);
                return;

              case "BinaryOp":
                // Heuristic: if a translation channel is used in an explicit
                // `bone.t? +/- <large literal>` form, it likely expects the
                // bone's rest pivot value rather than a 0-offset seed.
                if (node.operator === "+" || node.operator === "-") {
                  const leftVar = getTranslationVar(node.left);
                  const rightVar = getTranslationVar(node.right);

                  const literalValue =
                    node.left.type === "Literal"
                      ? node.left.value
                      : node.right.type === "Literal"
                        ? node.right.value
                        : null;
                  const tv = leftVar ?? rightVar;

                  if (tv && typeof literalValue === "number") {
                    if (Math.abs(literalValue) >= 3) markPivot(tv.bone, tv.prop);
                  }
                }
                visitWithTarget(node.left);
                visitWithTarget(node.right);
                return;

              case "FunctionCall":
                if (node.name === "if" && node.args.length >= 3) {
                  const consequent = node.args[1];
                  const alternate = node.args[2];
                  for (const prop of ["tx", "ty", "tz"] as const) {
                    const consequentLiteral =
                      consequent.type === "Literal" ? consequent.value : null;
                    const alternateLiteral =
                      alternate.type === "Literal" ? alternate.value : null;
                    const isRootBone = this.bones.get(targetBone)?.parent === this.modelGroup;
                    const userData = (this.bones.get(targetBone) as any)?.userData ?? {};
                    const invertAxis =
                      typeof userData.invertAxis === "string" ? (userData.invertAxis as string) : "";
                    const basePos = this.baseTransforms.get(targetBone)?.position;
                    const localPxY = (basePos?.y ?? 0) * 16;
                    const expectedRotationPointY =
                      invertAxis.includes("y") ? 24 - localPxY : localPxY + 24;
                    const isExpectedRotationPointY =
                      prop === "ty" &&
                      isRootBone &&
                      Math.abs(expectedRotationPointY) >= 3;

                    const shouldTreatAsPivotLiteral = (literalValue: number): boolean => {
                      // Default: require a "large" literal (typical pivot coords like 15, 17, etc).
                      if (Math.abs(literalValue) >= 10) return true;
                      // Special-case `ty` for root bones: allow small literals when they
                      // match the part's authored rotationPointY (24 - baseY).
                      if (isExpectedRotationPointY) {
                        return Math.abs(literalValue - expectedRotationPointY) <= 2;
                      }
                      return false;
                    };

                    // Heuristic: when `if(..., 15, bone.ty*(...))`, the
                    // translation channel is being used as a vanilla pivot
                    // input (rotationPoint-like), so seed it as such.
                    if (
                      typeof consequentLiteral === "number" &&
                      shouldTreatAsPivotLiteral(consequentLiteral) &&
                      containsTranslationVar(alternate, targetBone, prop)
                    ) {
                      markPivot(targetBone, prop);
                    }
                    if (
                      typeof alternateLiteral === "number" &&
                      shouldTreatAsPivotLiteral(alternateLiteral) &&
                      containsTranslationVar(consequent, targetBone, prop)
                    ) {
                      markPivot(targetBone, prop);
                    }
                  }
                }
                for (const arg of node.args) visitWithTarget(arg);
                return;

              case "Ternary":
                visitWithTarget(node.condition);
                visitWithTarget(node.consequent);
                visitWithTarget(node.alternate);
                return;

              default:
                return;
            }
          };
          visitWithTarget(parsed.ast);
        } catch {
          // Ignore parse errors; compilation will surface them later.
        }
      }
    }

    return { reads, pivotSeeds, rotationInputs, selfRotationReads };
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
	    this.baselineBoneValuesWater.clear();

	    const baselineContext = createAnimationContext();
	    baselineContext.boneValues = this.cloneRestBoneValues();
    // Baselines should reflect the first evaluation performed by tick(0), which
    // increments the frame counter before evaluating expressions.
    baselineContext.entityState.frame_counter = 1;
    baselineContext.entityState.frame_time = 0;
    this.applyVanillaRotationInputSeeding(baselineContext);

		    const baselineTransforms = this.evaluateLayersToTransforms(baselineContext);

	    // Some rigs (notably Fresh Animations humanoids) use cross-bone translation reads
	    // (e.g. `headwear.tx = body.tx`) where the baseline differs between pose-like
	    // conditions (idle vs walking). Subtracting a single baseline can amplify
	    // motion when those conditions switch. To detect this, we sample a second
	    // baseline with walking-like limb values.
	    const altBaselineValues = new Map<string, number>();
	    {
	      const altContext = createAnimationContext();
	      altContext.boneValues = this.cloneRestBoneValues();
	      altContext.entityState.frame_counter = 1;
	      altContext.entityState.frame_time = 0;
	      altContext.entityState.limb_speed = 0.4;
	      altContext.entityState.limb_swing = 0;
	      this.applyVanillaRotationInputSeeding(altContext);
		      const altTransforms = this.evaluateLayersToTransforms(altContext);
	      for (const [boneName, transform] of altTransforms) {
	        if (transform.tx !== undefined)
	          altBaselineValues.set(`${boneName}.tx`, transform.tx);
	        if (transform.ty !== undefined)
	          altBaselineValues.set(`${boneName}.ty`, transform.ty);
	        if (transform.tz !== undefined)
	          altBaselineValues.set(`${boneName}.tz`, transform.tz);
	      }
	    }

	    // For aquatic entities, many rigs include "on ground" fallback poses that
	    // use large angles (e.g. dolphins flopping). These should not be treated
	    // as calibration constants for the in-water pose, so capture a second
	    // baseline with `is_in_water=true`.
	    {
	      const waterContext = createAnimationContext();
	      waterContext.boneValues = this.cloneRestBoneValues();
	      waterContext.entityState.frame_counter = 1;
	      waterContext.entityState.frame_time = 0;
	      waterContext.entityState.is_in_water = true;
	      waterContext.entityState.is_on_ground = false;
	      this.applyVanillaRotationInputSeeding(waterContext);
	      const waterTransforms = this.evaluateLayersToTransforms(waterContext);
	      for (const [boneName, transform] of waterTransforms) {
	        if (transform.rx !== undefined)
	          this.baselineBoneValuesWater.set(`${boneName}.rx`, transform.rx);
	        if (transform.ry !== undefined)
	          this.baselineBoneValuesWater.set(`${boneName}.ry`, transform.ry);
	        if (transform.rz !== undefined)
	          this.baselineBoneValuesWater.set(`${boneName}.rz`, transform.rz);
	      }
	    }

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
	    // Some rigs (notably Fresh Animations humanoids) author translations in
	    // entity-space by explicitly referencing other bones' translation channels
	    // (e.g. `arm.tx = body.tx + cos(body.ry)*5`). These should be treated as
	    // absolute rotationPoint-like values rather than additive offsets, or the
	    // model will drift as the referenced bone moves.
		    const translationCrossReadsByBone = new Map<string, Set<"x" | "y" | "z">>();
		    const rotationCrossReadsByBone = new Map<string, Set<"x" | "y" | "z">>();
		    const translationChannelDeps = new Map<string, Set<string>>();

    const recordAxis = (
      map: Map<string, Set<"x" | "y" | "z">>,
      boneName: string,
      axis: "x" | "y" | "z",
    ) => {
      const set = map.get(boneName) ?? new Set<"x" | "y" | "z">();
      set.add(axis);
      map.set(boneName, set);
    };

	    const collectRefs = (
	      node: ASTNode,
	      opts: {
	        writingBone: string;
	        writingProp: "tx" | "ty" | "tz" | "rx" | "ry" | "rz" | string;
	        isTranslationWrite: boolean;
	      },
	    ): void => {
      switch (node.type) {
        case "Variable": {
          const name = node.name;
          const dot = name.indexOf(".");
          if (dot === -1) return;
          const bone = name.slice(0, dot);
          const prop = name.slice(dot + 1);
	          if (bone === "var" || bone === "render" || bone === "varb") return;
	          if (prop === "tx" || prop === "ty" || prop === "tz") {
	            const axis = prop[1] as "x" | "y" | "z";
	            if (bone !== opts.writingBone) {
	              recordAxis(translationCrossReadsByBone, bone, axis);
	            }
	            if (
	              opts.isTranslationWrite &&
	              (opts.writingProp === "tx" ||
	                opts.writingProp === "ty" ||
	                opts.writingProp === "tz") &&
	              bone !== opts.writingBone
	            ) {
	              const key = `${opts.writingBone}.${opts.writingProp}`;
	              const deps = translationChannelDeps.get(key) ?? new Set<string>();
	              deps.add(`${bone}.${prop}`);
	              translationChannelDeps.set(key, deps);
	            }

	          }
	          if (prop === "rx" || prop === "ry" || prop === "rz") {
	            const axis = prop[1] as "x" | "y" | "z";
	            if (bone !== opts.writingBone) {
	              recordAxis(rotationCrossReadsByBone, bone, axis);
	            }
	          }
	          return;
	        }
        case "UnaryOp":
          collectRefs(node.operand, opts);
          return;
        case "BinaryOp":
          collectRefs(node.left, opts);
          collectRefs(node.right, opts);
          return;
        case "FunctionCall":
          for (const arg of node.args) collectRefs(arg, opts);
          return;
        case "Ternary":
          collectRefs(node.condition, opts);
          collectRefs(node.consequent, opts);
          collectRefs(node.alternate, opts);
          return;
        default:
          return;
      }
    };

	    for (const layer of this.animationLayers) {
	      for (const anim of layer) {
	        if (anim.targetType !== "bone") continue;
	        if (!("ast" in anim.expression)) continue;
	        const isTranslationWrite =
	          anim.propertyName === "tx" || anim.propertyName === "ty" || anim.propertyName === "tz";
	        collectRefs(anim.expression.ast, {
	          writingBone: anim.targetName,
	          writingProp: anim.propertyName,
	          isTranslationWrite,
	        });
	      }
	    }

	    // Some rigs read translation channels from placeholder bones that are
	    // normally populated by vanilla runtime code (e.g. blaze `stick*`).
	    // When a JPM derives authored channels from these placeholders (e.g.
	    // `rod1.ty = stick1.ty + 4`), subtracting a baseline collapses the rig.
	    const isInputOnlyTranslationBone = (boneName: string): boolean => {
	      const bone = this.bones.get(boneName);
	      if (!bone) return false;
	      if (bone.parent !== this.modelGroup) return false;
	      // No local boxes/meshes on this bone (placeholder).
	      const boxesGroup = (bone as any)?.userData?.boxesGroup as
	        | THREE.Object3D
	        | undefined;
	      const hasLocalBoxes = !!boxesGroup && boxesGroup.children.length > 0;
	      if (hasLocalBoxes) return false;
	      // Not authored in this JPM (read-only input).
	      return !this.translationAxesByBone.has(boneName);
	    };

	    const derivedFromInputOnlyTranslationTargets = new Set<string>();
	    for (const [target, deps] of translationChannelDeps) {
	      for (const dep of deps) {
	        const dot = dep.indexOf(".");
	        const bone = dot === -1 ? dep : dep.slice(0, dot);
	        if (isInputOnlyTranslationBone(bone)) {
	          derivedFromInputOnlyTranslationTargets.add(target);
	          break;
	        }
	      }
	    }
		    // If a translation channel is used as an entity-space source (read by other
		    // bones) and its baseline differs meaningfully between idle and walking-like
		    // contexts, subtracting a single baseline offset can exaggerate motion when
		    // conditions switch. Treat such channels (and any channels derived from them)
	    // as "authored" and do not baseline-normalize them.
	    const poseDependentTranslationChannels = new Set<string>();
	    const poseDeltaTolerancePx = 0.75;
	    for (const [boneName, axes] of translationCrossReadsByBone) {
	      for (const axis of axes) {
	        const key = `${boneName}.t${axis}` as const;
	        const alt = altBaselineValues.get(key);
	        if (typeof alt !== "number") continue;
	        const base = this.baselineBoneValues.get(key) ?? 0;
	        if (Math.abs(base - alt) > poseDeltaTolerancePx) {
	          poseDependentTranslationChannels.add(`${boneName}.t${axis}`);
	        }
	      }
	    }

	    if (poseDependentTranslationChannels.size > 0 && translationChannelDeps.size > 0) {
	      let changed = true;
	      while (changed) {
	        changed = false;
	        for (const [target, deps] of translationChannelDeps) {
	          if (poseDependentTranslationChannels.has(target)) continue;
	          for (const dep of deps) {
	            if (poseDependentTranslationChannels.has(dep)) {
	              poseDependentTranslationChannels.add(target);
	              changed = true;
	              break;
	            }
	          }
	        }
	      }
	    }

	    // Some rigs author small `ty` offsets (e.g. head/body bob) that are read by
	    // other bones (`body.ty = head.ty + ...`). Baseline-normalizing the source
	    // but not the derived channels causes attachment drift (e.g. headwear).
	    // Treat these channels (and any channels derived from them) as authored and
	    // do not baseline-normalize them.
	    const smallSharedTyChannels = new Set<string>();
	    for (const [boneName, axes] of translationCrossReadsByBone) {
	      if (!axes.has("y")) continue;
	      const key = `${boneName}.ty`;
	      const base = this.baselineBoneValues.get(key) ?? 0;
	      if (Math.abs(base) < 3) smallSharedTyChannels.add(key);
	    }

	    if (smallSharedTyChannels.size > 0 && translationChannelDeps.size > 0) {
	      let changed = true;
	      while (changed) {
	        changed = false;
	        for (const [target, deps] of translationChannelDeps) {
	          if (smallSharedTyChannels.has(target)) continue;
	          for (const dep of deps) {
	            if (smallSharedTyChannels.has(dep)) {
	              smallSharedTyChannels.add(target);
	              changed = true;
	              break;
	            }
	          }
	        }
	      }
	    }

	    for (const [boneName, axesSet] of this.translationAxesByBone) {
	      const bone = this.bones.get(boneName);
	      if (!bone) continue;

      const userData = (bone as any).userData ?? {};
      const getAbsoluteAxes = (): string =>
        typeof userData.absoluteTranslationAxes === "string"
          ? (userData.absoluteTranslationAxes as string)
          : userData.absoluteTranslation === true
            ? "xyz"
            : "";

	      const isRoot = bone.parent === this.modelGroup;

	      // Infer "local-absolute" translation semantics when the JPM baseline value
	      // matches the bone's rest local pivot (common for attached subparts like
	      // sniffer ears). This avoids double-applying the bone's base translate.
	      const invertAxis =
	        typeof userData.invertAxis === "string" ? (userData.invertAxis as string) : "";
	      const base = this.baseTransforms.get(boneName);
	      const localPxX = (base?.position.x ?? 0) * 16;
	      const localPxY = (base?.position.y ?? 0) * 16;
	      const localPxZ = (base?.position.z ?? 0) * 16;
	      const expectedCemX = invertAxis.includes("x") ? -localPxX : localPxX;
	      const expectedCemY = invertAxis.includes("y") ? -localPxY : localPxY;
	      const expectedCemZ = invertAxis.includes("z") ? -localPxZ : localPxZ;
	      const originPx = Array.isArray(userData.originPx)
	        ? (userData.originPx as [number, number, number])
	        : ([0, 0, 0] as [number, number, number]);
	      const expectedCemEntityX = invertAxis.includes("x") ? -originPx[0] : originPx[0];
	      const expectedCemEntityZ = invertAxis.includes("z") ? -originPx[2] : originPx[2];

	      const tolerancePx = 0.75;

	      const ensureEntityAbsolute = (axis: "x" | "z") => {
	        if (getAbsoluteAxes().includes(axis)) return;
	        const baseline = this.getBaselineBoneValue(boneName, `t${axis}`);
	        const expected =
	          axis === "x" ? expectedCemEntityX : expectedCemEntityZ;
	        // Avoid classifying zero-origin bones where this yields no real signal.
	        if (Math.abs(expected) < 1.5) return;
	        if (Math.abs(baseline) < 1.5) return;
	        if (Math.abs(baseline - expected) > tolerancePx) return;

	        const existing =
	          typeof userData.absoluteTranslationAxes === "string"
	            ? (userData.absoluteTranslationAxes as string)
	            : "";
	        if (!existing.includes(axis)) {
	          userData.absoluteTranslationAxes = existing + axis;
	        }
	        userData.absoluteTranslationSpace = "entity";
	      };

	      const ensureLocalAbsolute = (axis: "x" | "y" | "z") => {
	        if (getAbsoluteAxes().includes(axis)) return;
	        const baseline = this.getBaselineBoneValue(boneName, `t${axis}`);
	        const expected =
	          axis === "x" ? expectedCemX : axis === "y" ? expectedCemY : expectedCemZ;
        // Avoid misclassifying small additive offsets (e.g. mane2.tz=1.2).
        if (Math.abs(expected) < 3) return;
        if (Math.abs(baseline) < 3) return;
        if (Math.abs(baseline - expected) > tolerancePx) return;

        const existing =
          typeof userData.absoluteTranslationAxes === "string"
            ? (userData.absoluteTranslationAxes as string)
            : "";
        if (!existing.includes(axis)) {
          userData.absoluteTranslationAxes = existing + axis;
        }
	        userData.absoluteTranslationSpace = "local";
	      };

      const ensureRotationPointYAbsolute = () => {
        if (!axesSet.has("y")) return;
        if (getAbsoluteAxes().includes("y")) return;
        if (!isRoot) return;
        const baseline = this.getBaselineBoneValue(boneName, "ty");
        // For invertAxis="y", rotationPointY maps via (24 - ty).
        const expected = invertAxis.includes("y")
          ? 24 - localPxY
          : localPxY + 24;
        if (Math.abs(expected) < 3) return;
        if (Math.abs(baseline) < 3) return;
        if (Math.abs(baseline - expected) > tolerancePx) return;

        const existing = getAbsoluteAxes();
        userData.absoluteTranslationAxes = existing.includes("y")
          ? existing
          : existing + "y";
        if (typeof userData.absoluteTranslationSpace !== "string") {
          userData.absoluteTranslationSpace = "entity";
        }
        // Entity-space absolute (rotationPointY) uses the default 24px origin.
        delete userData.translationOffsetYPx;
        delete userData.translationOffsetY;
      };

	      if (axesSet.has("x")) ensureEntityAbsolute("x");
	      if (axesSet.has("y")) ensureRotationPointYAbsolute();
	      if (axesSet.has("z")) ensureEntityAbsolute("z");
	      if (axesSet.has("x")) ensureLocalAbsolute("x");
	      if (axesSet.has("y")) ensureLocalAbsolute("y");
	      if (axesSet.has("z")) ensureLocalAbsolute("z");

		      if (axesSet.has("x")) {
		        const channel = `${boneName}.tx`;
		        if (getAbsoluteAxes().includes("x")) {
		          // Absolute channels should remain absolute; do not normalize.
		        } else if (poseDependentTranslationChannels.has(channel)) {
		          // Pose-dependent channel: avoid baseline subtraction.
		        } else if (derivedFromInputOnlyTranslationTargets.has(channel)) {
		          // Derived from vanilla-driven placeholders: avoid baseline subtraction.
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
				        if (getAbsoluteAxes().includes("y")) {
				          // Absolute channels should remain absolute; do not normalize.
				        } else if (smallSharedTyChannels.has(channel)) {
				          // Authored small offsets (and their derived channels): do not baseline-normalize.
				        } else if (derivedFromInputOnlyTranslationTargets.has(channel)) {
				          // Derived from vanilla-driven placeholders: avoid baseline subtraction.
				        } else if (
				          typeof userData.translationOffsetYPx !== "number" &&
				          typeof userData.translationOffsetY !== "number"
				        ) {
				          const ty0 = this.getBaselineBoneValue(boneName, "ty");
				          const isConstant = isConstantByChannel.get(channel) === true;

				          // Some rigs author child ty constants that effectively cancel a
				          // parent's 24px-origin (e.g. villager arms_rotation.ty≈-24.8).
				          // Treat these as baselines even if constant-only, or the part
				          // will jump upward by ~24px when applied additively.
				          const parentOriginPx = Array.isArray(
				            (bone.parent as any)?.userData?.originPx,
				          )
				            ? (((bone.parent as any).userData.originPx as [
				                number,
				                number,
				                number,
				              ]) satisfies [number, number, number])
				            : ([0, 0, 0] as [number, number, number]);
				          const cancelsParentOriginY =
				            !isRoot &&
				            invertAxis.includes("y") &&
				            parentOriginPx[1] >= 16 &&
				            Math.abs(ty0) >= 8 &&
				            Math.abs(ty0 + parentOriginPx[1]) <= 2;

				          if (cancelsParentOriginY) {
				            if (Math.abs(ty0) > 1e-6) userData.translationOffsetYPx = ty0;
				          } else if (!isConstant) {
				            if (Math.abs(ty0) > 1e-6) userData.translationOffsetYPx = ty0;
				          }
				        }
				      }

		      if (axesSet.has("z")) {
		        const channel = `${boneName}.tz`;
		        if (getAbsoluteAxes().includes("z")) {
		          // Absolute channels should remain absolute; do not normalize.
		        } else if (poseDependentTranslationChannels.has(channel)) {
		          // Pose-dependent channel: avoid baseline subtraction.
		        } else if (derivedFromInputOnlyTranslationTargets.has(channel)) {
		          // Derived from vanilla-driven placeholders: avoid baseline subtraction.
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

	    // Rotations are applied in authored CEM space. Only mark axes as absolute
	    // when the JPM expression explicitly self-reads `bone.r?` (meaning it
	    // already includes the vanilla/base rotation input we seeded).
		    for (const [boneName, axesSet] of this.rotationAxesByBone) {
		      const bone = this.bones.get(boneName);
		      if (!bone) continue;

		      const userData = (bone as any).userData ?? {};
		      const base = this.baseTransforms.get(boneName);
		      const invertAxis =
		        typeof userData.invertAxis === "string"
		          ? (userData.invertAxis as string)
		          : "";
		      const signX = invertAxis.includes("x") ? -1 : 1;
		      const signY = invertAxis.includes("y") ? -1 : 1;
		      const signZ = invertAxis.includes("z") ? -1 : 1;
		      const selfReads = this.selfRotationReads.get(boneName);
		      const ensureAbsoluteRotation = (axis: "x" | "y" | "z") => {
		        const prop = `r${axis}` as "rx" | "ry" | "rz";
		        if (!selfReads?.has(prop)) return;
	        const existing =
	          typeof userData.absoluteRotationAxes === "string"
	            ? (userData.absoluteRotationAxes as string)
	            : "";
	        if (!existing.includes(axis)) {
		          userData.absoluteRotationAxes = existing + axis;
		        }
		      };

		      const ensureAbsoluteWhenBaselineMatchesRest = (axis: "x" | "y" | "z") => {
		        const prop = `r${axis}` as "rx" | "ry" | "rz";
		        const baseline = this.getBaselineBoneValue(boneName, prop);
		        const rest =
		          axis === "x"
		            ? signX * (base?.rotation.x ?? 0)
		            : axis === "y"
		              ? signY * (base?.rotation.y ?? 0)
		              : signZ * (base?.rotation.z ?? 0);
		        if (Math.abs(baseline - rest) > 1e-4) return;

		        const existing =
		          typeof userData.absoluteRotationAxes === "string"
		            ? (userData.absoluteRotationAxes as string)
		            : "";
		        if (!existing.includes(axis)) {
		          userData.absoluteRotationAxes = existing + axis;
		        }
		      };

		      const ensureRotationOffsetWhenBaselineDuplicatesChildRest = (
		        axis: "x" | "y" | "z",
		      ) => {
		        const absAxes: string =
		          typeof userData.absoluteRotationAxes === "string"
		            ? (userData.absoluteRotationAxes as string)
		            : "";
		        if (absAxes.includes(axis)) return;

		        const prop = `r${axis}` as "rx" | "ry" | "rz";
		        const baseline = this.getBaselineBoneValue(boneName, prop);
		        if (Math.abs(baseline) < 0.4) return;

		        const boneRest =
		          axis === "x"
		            ? base?.rotation.x ?? 0
		            : axis === "y"
		              ? base?.rotation.y ?? 0
		              : base?.rotation.z ?? 0;
		        // If the parent bone already has a non-zero rest rotation, allow the
		        // authored baseline to apply on top (it's more likely a true pose).
		        if (Math.abs(boneRest) > 1e-4) return;

		        const matchesChildRest = (obj: THREE.Object3D): boolean => {
		          const childBase = this.baseTransforms.get(obj.name);
		          if (!childBase) return false;
		          const childInvertAxis =
		            typeof (obj as any).userData?.invertAxis === "string"
		              ? ((obj as any).userData.invertAxis as string)
		              : "";
		          const childSign =
		            axis === "x"
		              ? childInvertAxis.includes("x")
		                ? -1
		                : 1
		              : axis === "y"
		                ? childInvertAxis.includes("y")
		                  ? -1
		                  : 1
		                : childInvertAxis.includes("z")
		                  ? -1
		                  : 1;
		          const childRest =
		            axis === "x"
		              ? childSign * (childBase.rotation.x ?? 0)
		              : axis === "y"
		                ? childSign * (childBase.rotation.y ?? 0)
		                : childSign * (childBase.rotation.z ?? 0);
		          return Math.abs(childRest - baseline) <= 1e-4;
		        };

		        const stack: THREE.Object3D[] = [...bone.children];
		        while (stack.length > 0) {
		          const next = stack.pop()!;
		          if (matchesChildRest(next)) {
		            if (axis === "x") userData.rotationOffsetX = baseline;
		            if (axis === "y") userData.rotationOffsetY = baseline;
		            if (axis === "z") userData.rotationOffsetZ = baseline;
		            return;
		          }
		          stack.push(...next.children);
		        }
		      };

			      const ensureRotationOffsetForLargeBaseline = (axis: "x" | "y" | "z") => {
			        const absAxes: string =
			          typeof userData.absoluteRotationAxes === "string"
			            ? (userData.absoluteRotationAxes as string)
			            : "";
		        if (absAxes.includes(axis)) return;

		        const prop = `r${axis}` as "rx" | "ry" | "rz";
		        const baseline = this.getBaselineBoneValue(boneName, prop);
		        // Only treat very large baselines (typically ±90°) as "rest calibration"
		        // constants; smaller angles are often intentional idle poses.
		        // Heuristic: treat baselines above ~72° as calibration constants.
		        // This catches common coordinate-space corrections (≈75–180°) while
		        // preserving intentional limb poses like axolotl leg splay (≈70°).
		        if (Math.abs(baseline) < 1.25) return;
		        // If the in-water baseline is small, the large default baseline likely
		        // comes from an alternate state pose (e.g. on-ground flop) rather than
		        // a calibration constant. Don't convert it into a rotationOffset.
		        const water =
		          this.baselineBoneValuesWater.get(`${boneName}.${prop}`) ?? 0;
		        if (Math.abs(water) < 1.25) return;

		        if (axis === "x" && typeof userData.rotationOffsetX !== "number") {
		          userData.rotationOffsetX = baseline;
		        }
		        if (axis === "y" && typeof userData.rotationOffsetY !== "number") {
		          userData.rotationOffsetY = baseline;
		        }
			        if (axis === "z" && typeof userData.rotationOffsetZ !== "number") {
			          userData.rotationOffsetZ = baseline;
			        }
			      };

			      const ensureRotationOffsetForModerateBaselineOnPivotBone = (
			        axis: "x" | "y" | "z",
			      ) => {
			        const absAxes: string =
			          typeof userData.absoluteRotationAxes === "string"
			            ? (userData.absoluteRotationAxes as string)
			            : "";
			        if (absAxes.includes(axis)) return;

			        const prop = `r${axis}` as "rx" | "ry" | "rz";
			        const baseline = this.getBaselineBoneValue(boneName, prop);
			        // Only consider moderate angles (≈30–65°) that often represent
			        // baked posture on pivot-only bones (e.g. villager arms root),
			        // not extreme calibration constants (handled elsewhere).
			        const absBaseline = Math.abs(baseline);
			        if (absBaseline < 0.52 || absBaseline > 1.15) return;

			        const boneRest =
			          axis === "x"
			            ? base?.rotation.x ?? 0
			            : axis === "y"
			              ? base?.rotation.y ?? 0
			              : base?.rotation.z ?? 0;
			        if (Math.abs(boneRest) > 1e-4) return;

			        const originPx = Array.isArray(userData.originPx)
			          ? (userData.originPx as [number, number, number])
			          : ([0, 0, 0] as [number, number, number]);
			        // Focus on large-pivot bones (biped/villager roots are at 24px).
			        if (originPx[1] < 16) return;

			        // Only apply when a descendant has a substantial rest rotation on
			        // the same axis, indicating this is a posture pivot rather than
			        // a true limb bone.
			        const hasRotatedDescendant = (obj: THREE.Object3D): boolean => {
			          const childBase = this.baseTransforms.get(obj.name);
			          if (childBase) {
			            const childRest =
			              axis === "x"
			                ? childBase.rotation.x ?? 0
			                : axis === "y"
			                  ? childBase.rotation.y ?? 0
			                  : childBase.rotation.z ?? 0;
			            if (Math.abs(childRest) > 0.35) return true;
			          }
			          for (const c of obj.children) {
			            if (hasRotatedDescendant(c)) return true;
			          }
			          return false;
			        };
			        if (!hasRotatedDescendant(bone)) return;

			        if (axis === "x" && typeof userData.rotationOffsetX !== "number") {
			          userData.rotationOffsetX = baseline;
			        }
			        if (axis === "y" && typeof userData.rotationOffsetY !== "number") {
			          userData.rotationOffsetY = baseline;
			        }
			        if (axis === "z" && typeof userData.rotationOffsetZ !== "number") {
			          userData.rotationOffsetZ = baseline;
			        }
			      };

			      if (axesSet.has("x")) ensureAbsoluteRotation("x");
			      if (axesSet.has("y")) ensureAbsoluteRotation("y");
			      if (axesSet.has("z")) ensureAbsoluteRotation("z");
			      if (axesSet.has("x")) ensureAbsoluteWhenBaselineMatchesRest("x");
		      if (axesSet.has("y")) ensureAbsoluteWhenBaselineMatchesRest("y");
		      if (axesSet.has("z")) ensureAbsoluteWhenBaselineMatchesRest("z");
			      if (axesSet.has("x")) ensureRotationOffsetWhenBaselineDuplicatesChildRest("x");
			      if (axesSet.has("y")) ensureRotationOffsetWhenBaselineDuplicatesChildRest("y");
			      if (axesSet.has("z")) ensureRotationOffsetWhenBaselineDuplicatesChildRest("z");
			      if (axesSet.has("x")) ensureRotationOffsetForModerateBaselineOnPivotBone("x");
			      if (axesSet.has("y")) ensureRotationOffsetForModerateBaselineOnPivotBone("y");
			      if (axesSet.has("z")) ensureRotationOffsetForModerateBaselineOnPivotBone("z");
			      if (axesSet.has("x")) ensureRotationOffsetForLargeBaseline("x");
			      if (axesSet.has("y")) ensureRotationOffsetForLargeBaseline("y");
			      if (axesSet.has("z")) ensureRotationOffsetForLargeBaseline("z");

			      (bone as any).userData = userData;
		    }
		  }

  private applyVanillaRotationInputSeeding(
    context: AnimationContext = this.context,
  ): void {
    if (this.rotationInputReads.size === 0) return;

    const state = context.entityState;
    const swingAmount =
      Math.sin(state.limb_swing * 0.6662) * 1.4 * state.limb_speed;

    const setInput = (
      boneName: string,
      desiredThreeEuler: Partial<THREE.Euler>,
    ) => {
      const reads = this.rotationInputReads.get(boneName);
      if (!reads || reads.size === 0) return;
      const bone = this.bones.get(boneName);
      if (!bone) return;
      const base = this.baseTransforms.get(boneName);
      const userData = (bone as any).userData ?? {};
      const invertAxis =
        typeof userData.invertAxis === "string" ? (userData.invertAxis as string) : "";
      const signX = invertAxis.includes("x") ? -1 : 1;
      const signY = invertAxis.includes("y") ? -1 : 1;
      const signZ = invertAxis.includes("z") ? -1 : 1;

      const x = desiredThreeEuler.x ?? base?.rotation.x ?? 0;
      const y = desiredThreeEuler.y ?? base?.rotation.y ?? 0;
      const z = desiredThreeEuler.z ?? base?.rotation.z ?? 0;

      // Convert Three-space rotations into the CEM-space values expected by
      // `bone.r?` reads (inverse of the sign applied in applyBoneTransform).
      const cemRx = signX * x;
      const cemRy = signY * y;
      const cemRz = signZ * z;

      context.boneValues[boneName] = {
        ...(context.boneValues[boneName] ?? {}),
        ...(reads.has("rx") ? { rx: cemRx } : {}),
        ...(reads.has("ry") ? { ry: cemRy } : {}),
        ...(reads.has("rz") ? { rz: cemRz } : {}),
      };
    };

    // Head bones.
    const yawRad = (state.head_yaw * Math.PI) / 180;
    const pitchRad = (state.head_pitch * Math.PI) / 180;
    for (const headName of ["head", "headwear"]) {
      const base = this.baseTransforms.get(headName);
      if (!base) continue;
      setInput(headName, {
        x: base.rotation.x + pitchRad,
        y: base.rotation.y + yawRad,
        z: base.rotation.z,
      });
    }

    // Humanoid limbs.
    const humanoid: Array<[string, number]> = [
      ["right_arm", swingAmount],
      ["left_arm", -swingAmount],
      ["right_leg", -swingAmount],
      ["left_leg", swingAmount],
    ];
    for (const [name, deltaX] of humanoid) {
      const base = this.baseTransforms.get(name);
      if (!base) continue;
      setInput(name, { x: base.rotation.x + deltaX });
    }

    // Quadruped legs (leg1-leg4).
    const quad: Array<[string, number]> = [
      ["leg1", swingAmount],
      ["leg3", swingAmount],
      ["leg2", -swingAmount],
      ["leg4", -swingAmount],
    ];
    for (const [name, deltaX] of quad) {
      const base = this.baseTransforms.get(name);
      if (!base) continue;
      setInput(name, { x: base.rotation.x + deltaX });
    }

    // Directional legs (front/back).
    const directional: Array<[string, number]> = [
      ["front_left_leg", swingAmount],
      ["front_right_leg", -swingAmount],
      ["back_left_leg", -swingAmount],
      ["back_right_leg", swingAmount],
      // Alternate naming (common on some exporters/converters)
      ["left_front_leg", swingAmount],
      ["right_front_leg", -swingAmount],
      ["left_hind_leg", -swingAmount],
      ["right_hind_leg", swingAmount],
      ["left_rear_leg", -swingAmount],
      ["right_rear_leg", swingAmount],
      // Multi-leg rigs (sniffer) use a tripod gait.
      ["middle_left_leg", -swingAmount],
      ["middle_right_leg", swingAmount],
    ];
    for (const [name, deltaX] of directional) {
      const base = this.baseTransforms.get(name);
      if (!base) continue;
      setInput(name, { x: base.rotation.x + deltaX });
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
    this.updatePoseOverlays();

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

    // When no CEM animation layers are present, keep the rig stable by
    // re-applying the rest pose each frame. This prevents "sticky" transforms
    // when switching feature toggles that affect visibility/attachment.
    resetAllBones(this.bones, this.baseTransforms);

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

    // Banner sway (standing + wall). Banners have no "walking" but do sway in vanilla.
    const bannerCloth = this.bones.get("slate") ?? this.bones.get("flag");
    if (bannerCloth) {
      const base = this.baseTransforms.get(bannerCloth.name);
      const t = state.age / 20; // seconds-ish
      const swayX = Math.sin(t * 2.0) * 0.025;
      const swayZ = Math.cos(t * 2.6) * 0.006;
      bannerCloth.rotation.x = (base?.rotation.x ?? 0) + swayX;
      bannerCloth.rotation.z = (base?.rotation.z ?? 0) + swayZ;
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
    const rightLeg = this.bones.get("right_leg") ?? this.bones.get("right_shoe");
    if (rightLeg) {
      const base = this.baseTransforms.get(rightLeg.name);
      rightLeg.rotation.x = (base?.rotation.x ?? 0) - swingAmount;
      foundAny = true;
    }

    const leftLeg = this.bones.get("left_leg") ?? this.bones.get("left_shoe");
    if (leftLeg) {
      const base = this.baseTransforms.get(leftLeg.name);
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

    // Also try vanilla Mojang naming (common on some exporters/converters)
    // left_front_leg/right_front_leg + left_hind_leg/right_hind_leg (or *_rear_leg)
    const leftFrontLeg = this.bones.get("left_front_leg");
    if (leftFrontLeg) {
      const base = this.baseTransforms.get("left_front_leg");
      leftFrontLeg.rotation.x = (base?.rotation.x ?? 0) + swingAmount;
    }

    const rightFrontLeg = this.bones.get("right_front_leg");
    if (rightFrontLeg) {
      const base = this.baseTransforms.get("right_front_leg");
      rightFrontLeg.rotation.x = (base?.rotation.x ?? 0) - swingAmount;
    }

    const leftHindLeg = this.bones.get("left_hind_leg") ?? this.bones.get("left_rear_leg");
    if (leftHindLeg) {
      const base = this.baseTransforms.get(leftHindLeg.name);
      leftHindLeg.rotation.x = (base?.rotation.x ?? 0) - swingAmount;
    }

    const rightHindLeg = this.bones.get("right_hind_leg") ?? this.bones.get("right_rear_leg");
    if (rightHindLeg) {
      const base = this.baseTransforms.get(rightHindLeg.name);
      rightHindLeg.rotation.x = (base?.rotation.x ?? 0) + swingAmount;
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

  // ==========================================================================
  // Rig Corrections (universal heuristics)
  // ==========================================================================

  /**
   * Some rigs author limb translations such that the "torso" and limbs only line
   * up after applying a small additional offset (common in multi-mode rigs like
   * axolotl). We keep this data-driven to avoid per-part name hacks.
   *
   * Offsets are applied after evaluating the JPM each frame (so they don't
   * affect expression inputs), and are stored per-bone in local space.
   */
  private rigCorrectionOffsets = new Map<string, THREE.Vector3>();
  private didInferRigCorrections = false;

  private applyRigCorrections(): void {
    if (this.rigCorrectionOffsets.size === 0) return;
    for (const [boneName, offset] of this.rigCorrectionOffsets) {
      const bone = this.bones.get(boneName);
      if (!bone) continue;
      bone.position.add(offset);
    }
  }

  private inferRigCorrectionsFromCurrentPose(): boolean {
    // Run only once per engine instance.
    if (this.didInferRigCorrections) return false;
    this.didInferRigCorrections = true;

    // Collect mesh bounds and find a "torso" mesh (largest by AABB volume).
    let torsoMesh: THREE.Object3D | null = null;
    let torsoBox: THREE.Box3 | null = null;
    let torsoVolume = 0;
    this.modelGroup.traverse((obj) => {
      if ((obj as any).isMesh !== true) return;
      const box = new THREE.Box3().setFromObject(obj);
      const size = new THREE.Vector3();
      box.getSize(size);
      const volume = Math.max(0, size.x) * Math.max(0, size.y) * Math.max(0, size.z);
      if (volume > torsoVolume + 1e-9) {
        torsoVolume = volume;
        torsoMesh = obj;
        torsoBox = box;
      }
    });
	    if (!torsoMesh || !torsoBox || torsoVolume <= 1e-9) return false;

	    const torsoMeshResolved = torsoMesh as THREE.Object3D;
	    const torsoBoxResolved = torsoBox as THREE.Box3;

	    const torsoSize = new THREE.Vector3();
	    torsoBoxResolved.getSize(torsoSize);

	    // The correction is applied to the direct child of the modelGroup that owns
	    // the torso mesh, so the torso (and its attachments) move together.
	    let torsoRoot: THREE.Object3D | null = torsoMeshResolved;
	    while (torsoRoot && torsoRoot.parent && torsoRoot.parent !== this.modelGroup) {
	      torsoRoot = torsoRoot.parent;
	    }
	    if (!torsoRoot || torsoRoot.parent !== this.modelGroup) return false;

    // Identify likely limb roots among top-level siblings: smaller volumes,
    // below the torso, and not part of the torso subtree.
    const limbCandidates: Array<{ bone: THREE.Object3D; box: THREE.Box3; volume: number }> =
      [];
    for (const child of this.modelGroup.children) {
      if (child === torsoRoot) continue;

      let hasMeshDescendant = false;
      child.traverse((obj) => {
        if ((obj as any).isMesh === true) hasMeshDescendant = true;
      });
      if (!hasMeshDescendant) continue;

      const box = new THREE.Box3().setFromObject(child);
      const size = new THREE.Vector3();
      box.getSize(size);
      const volume = Math.max(0, size.x) * Math.max(0, size.y) * Math.max(0, size.z);
      if (volume <= 1e-9) continue;

      // Must be plausibly below the torso's lower half.
	      if (box.max.y > torsoBoxResolved.min.y + torsoSize.y * 0.75) continue;
      // Prefer smaller elements (legs/limbs) over large sibling shells.
      if (volume > torsoVolume * 0.8) continue;

      limbCandidates.push({ bone: child, box, volume });
    }
    if (limbCandidates.length < 4) return false;

    limbCandidates.sort((a, b) => a.volume - b.volume);
    const limbs = limbCandidates.slice(0, 6); // keep a few smallest (legs often dominate)

    const limbUnion = new THREE.Box3();
    for (const limb of limbs) limbUnion.union(limb.box);

    const limbSize = new THREE.Vector3();
    limbUnion.getSize(limbSize);

    // Compute gaps (positive means separated).
	    const gapY = torsoBoxResolved.min.y - limbUnion.max.y;
	    const protrusionZ = limbUnion.max.z - torsoBoxResolved.max.z;

    // Only intervene when there's a clear vertical separation AND the limbs
    // protrude far beyond the torso (avoids affecting typical quadrupeds where
    // legs overlap into the torso volume).
    if (gapY <= 0.03) return false;
    if (protrusionZ <= 0.25) return false;

    const offset = new THREE.Vector3(0, 0, 0);

    // Aim for legs to overlap into the torso a bit (Minecraft rigs usually do).
    const desiredOverlapY = limbSize.y * 0.75;
    if (gapY > 0.03) {
      offset.y -= gapY + desiredOverlapY;
    }

    // Keep some forward limb protrusion, but cap extreme cases.
    const desiredProtrusionZ = torsoSize.z * 0.3;
    if (protrusionZ > desiredProtrusionZ + 0.03) {
      offset.z += protrusionZ - desiredProtrusionZ;
    }

    // Clamp to avoid pathological shifts on unusual rigs.
    offset.y = THREE.MathUtils.clamp(offset.y, -0.4, 0.2);
    offset.z = THREE.MathUtils.clamp(offset.z, -0.4, 0.4);
    if (offset.lengthSq() < 1e-6) return false;

    this.rigCorrectionOffsets.set(torsoRoot.name, offset);
    return true;
  }

  /**
   * Evaluate all animation expressions and apply to bones.
   */
  private evaluateAndApply(): void {
    // OptiFine evaluates CEM expressions against the model's rest pose each
    // frame. Resetting here prevents transforms from "sticking" when switching
    // presets or when an animation does not author every channel every frame.
    resetAllBones(this.bones, this.baseTransforms);
    this.context.boneValues = this.cloneRestBoneValues();

    // Seed bone rotation inputs with vanilla-style values where expressions
    // read `bone.rx/ry/rz` (e.g., sniffer legs depend on vanilla limb swing).
    this.applyVanillaRotationInputSeeding();

    for (const [boneName, props] of Object.entries(
      this.poseBoneInputOverrides,
    )) {
      this.context.boneValues[boneName] = {
        ...(this.context.boneValues[boneName] ?? {}),
        ...props,
      };
    }
    for (const [boneName, props] of Object.entries(
      this.featureBoneInputOverrides,
    )) {
      this.context.boneValues[boneName] = {
        ...(this.context.boneValues[boneName] ?? {}),
        ...props,
      };
    }
    for (const [boneName, props] of Object.entries(this.triggerBoneInputOverrides)) {
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

    // Apply any post-eval rig corrections (do not affect expression inputs).
    this.applyRigCorrections();

    this.modelGroup.updateMatrixWorld(true);

    // Infer and apply rig corrections once, based on the first posed frame.
    // This handles rigs where the authored animation pose expects a small
    // additional torso offset relative to independent limbs.
    const inferred = this.inferRigCorrectionsFromCurrentPose();
    if (inferred) {
      this.applyRigCorrections();
      this.modelGroup.updateMatrixWorld(true);
    }

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
    this.triggerBoneInputOverrides = {};
    this.poseBoneInputOverrides = {};
    this.featureBoneInputOverrides = {};
    this.activePoseToggleIds = [];
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
    this.triggerBoneInputOverrides = {};
    this.context.randomCache.clear();
  }

  private updatePoseOverlays(): void {
    this.poseBoneInputOverrides = {};
    this.poseEntityStateOverrides = {};

    for (const toggleId of this.activePoseToggleIds) {
      const def = getPoseToggleDefinition(toggleId);
      if (!def) continue;
      if (def.entityStateOverrides) {
        Object.assign(
          this.poseEntityStateOverrides,
          def.entityStateOverrides(this.context.entityState),
        );
      }
      if (def.boneInputs) {
        const inputs = def.boneInputs(this.context.entityState);
        for (const [boneName, props] of Object.entries(inputs)) {
          this.poseBoneInputOverrides[boneName] = {
            ...(this.poseBoneInputOverrides[boneName] ?? {}),
            ...props,
          };
        }
      }
    }

    Object.assign(this.context.entityState, this.poseEntityStateOverrides);
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
    this.triggerBoneInputOverrides = {};
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
        this.triggerBoneInputOverrides.neck ??= {};
        this.triggerBoneInputOverrides.neck.ty = value;
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
          this.triggerBoneInputOverrides.neck ??= {};
          this.triggerBoneInputOverrides.neck.ty = value;
        }

        // Sheep/cow-family: driven by placeholder `head.rx` (and often compared to head_pitch).
        if (this.expressionMentions("head.rx")) {
          const headPitchRad = (this.context.entityState.head_pitch * Math.PI) / 180;
          // Push away from `torad(head_pitch)` to satisfy `head.rx - torad(head_pitch) != 0`.
          const value = headPitchRad + 1.2 * envelope;
          this.triggerBoneInputOverrides.head ??= {};
          this.triggerBoneInputOverrides.head.rx = value;
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
