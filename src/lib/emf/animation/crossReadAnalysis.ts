/**
 * Cross-Read Analysis for Animation Expressions
 *
 * Analyzes animation expressions to determine which bones reference
 * translation/rotation channels from other bones. Used to detect
 * entity-space coordinates and pose-dependent channels.
 */

import type * as THREE from "three";
import type { ASTNode, ParsedExpression } from "./types";
import type { BoneWithUserData } from "@/lib/emf/types";

/**
 * Compiled animation structure (matches AnimationEngine's internal type).
 */
interface CompiledAnimation {
  targetType: "bone" | "var" | "render";
  targetName: string;
  propertyName: string;
  expression: ParsedExpression;
}

export interface CrossReadResult {
  /** Bones that read translation channels from other bones, by axis */
  translationCrossReads: Map<string, Set<"x" | "y" | "z">>;
  /** Bones that read rotation channels from other bones, by axis */
  rotationCrossReads: Map<string, Set<"x" | "y" | "z">>;
  /** Translation channel dependencies (target -> set of sources) */
  translationChannelDeps: Map<string, Set<string>>;
}

function recordAxis(
  map: Map<string, Set<"x" | "y" | "z">>,
  boneName: string,
  axis: "x" | "y" | "z",
): void {
  const set = map.get(boneName) ?? new Set<"x" | "y" | "z">();
  set.add(axis);
  map.set(boneName, set);
}

function processTranslationRef(
  bone: string,
  prop: string,
  writingBone: string,
  writingProp: string,
  isTranslationWrite: boolean,
  translationCrossReads: Map<string, Set<"x" | "y" | "z">>,
  translationChannelDeps: Map<string, Set<string>>,
): void {
  const axis = prop[1] as "x" | "y" | "z";
  if (bone !== writingBone) {
    recordAxis(translationCrossReads, bone, axis);
  }

  const shouldRecordDep =
    isTranslationWrite &&
    (writingProp === "tx" || writingProp === "ty" || writingProp === "tz") &&
    bone !== writingBone;

  if (shouldRecordDep) {
    const key = `${writingBone}.${writingProp}`;
    const deps = translationChannelDeps.get(key) ?? new Set<string>();
    deps.add(`${bone}.${prop}`);
    translationChannelDeps.set(key, deps);
  }
}

function processRotationRef(
  bone: string,
  prop: string,
  writingBone: string,
  rotationCrossReads: Map<string, Set<"x" | "y" | "z">>,
): void {
  const axis = prop[1] as "x" | "y" | "z";
  if (bone !== writingBone) {
    recordAxis(rotationCrossReads, bone, axis);
  }
}

function processVariableNode(
  name: string,
  writingBone: string,
  writingProp: string,
  isTranslationWrite: boolean,
  translationCrossReads: Map<string, Set<"x" | "y" | "z">>,
  rotationCrossReads: Map<string, Set<"x" | "y" | "z">>,
  translationChannelDeps: Map<string, Set<string>>,
): void {
  const dot = name.indexOf(".");
  if (dot === -1) return;

  const bone = name.slice(0, dot);
  const prop = name.slice(dot + 1);
  if (bone === "var" || bone === "render" || bone === "varb") return;

  if (prop === "tx" || prop === "ty" || prop === "tz") {
    processTranslationRef(
      bone,
      prop,
      writingBone,
      writingProp,
      isTranslationWrite,
      translationCrossReads,
      translationChannelDeps,
    );
  }

  if (prop === "rx" || prop === "ry" || prop === "rz") {
    processRotationRef(bone, prop, writingBone, rotationCrossReads);
  }
}

/**
 * Collect cross-bone references from animation layers.
 */
export function collectCrossReads(
  animationLayers: ReadonlyArray<ReadonlyArray<CompiledAnimation>>,
): CrossReadResult {
  const translationCrossReads = new Map<string, Set<"x" | "y" | "z">>();
  const rotationCrossReads = new Map<string, Set<"x" | "y" | "z">>();
  const translationChannelDeps = new Map<string, Set<string>>();

  const collectRefs = (
    node: ASTNode,
    writingBone: string,
    writingProp: string,
    isTranslationWrite: boolean,
  ): void => {
    switch (node.type) {
      case "Variable":
        processVariableNode(
          node.name,
          writingBone,
          writingProp,
          isTranslationWrite,
          translationCrossReads,
          rotationCrossReads,
          translationChannelDeps,
        );
        return;
      case "UnaryOp":
        collectRefs(node.operand, writingBone, writingProp, isTranslationWrite);
        return;
      case "BinaryOp":
        collectRefs(node.left, writingBone, writingProp, isTranslationWrite);
        collectRefs(node.right, writingBone, writingProp, isTranslationWrite);
        return;
      case "FunctionCall":
        for (const arg of node.args) collectRefs(arg, writingBone, writingProp, isTranslationWrite);
        return;
      case "Ternary":
        collectRefs(node.condition, writingBone, writingProp, isTranslationWrite);
        collectRefs(node.consequent, writingBone, writingProp, isTranslationWrite);
        collectRefs(node.alternate, writingBone, writingProp, isTranslationWrite);
        return;
      default:
        return;
    }
  };

  for (const layer of animationLayers) {
    for (const anim of layer) {
      if (anim.targetType !== "bone") continue;
      if (!("ast" in anim.expression)) continue;
      const isTranslationWrite =
        anim.propertyName === "tx" || anim.propertyName === "ty" || anim.propertyName === "tz";
      collectRefs(anim.expression.ast, anim.targetName, anim.propertyName, isTranslationWrite);
    }
  }

  return { translationCrossReads, rotationCrossReads, translationChannelDeps };
}

/**
 * Check if a bone is an "input-only" translation bone (placeholder for vanilla-driven values).
 */
export function isInputOnlyTranslationBone(
  boneName: string,
  bones: Map<string, THREE.Object3D>,
  modelGroup: THREE.Group,
  translationAxesByBone: Map<string, Set<"x" | "y" | "z">>,
): boolean {
  const bone = bones.get(boneName);
  if (!bone) return false;
  if (bone.parent !== modelGroup) return false;
  // No local boxes/meshes on this bone (placeholder)
  const boxesGroup = (bone as BoneWithUserData).userData?.boxesGroup as THREE.Object3D | undefined;
  const hasLocalBoxes = !!boxesGroup && boxesGroup.children.length > 0;
  if (hasLocalBoxes) return false;
  // Not authored in this JPM (read-only input)
  return !translationAxesByBone.has(boneName);
}

/**
 * Find channels derived from input-only translation bones.
 */
export function findDerivedFromInputOnlyBones(
  translationChannelDeps: Map<string, Set<string>>,
  bones: Map<string, THREE.Object3D>,
  modelGroup: THREE.Group,
  translationAxesByBone: Map<string, Set<"x" | "y" | "z">>,
): Set<string> {
  const derived = new Set<string>();
  for (const [target, deps] of translationChannelDeps) {
    for (const dep of deps) {
      const dot = dep.indexOf(".");
      const bone = dot === -1 ? dep : dep.slice(0, dot);
      if (isInputOnlyTranslationBone(bone, bones, modelGroup, translationAxesByBone)) {
        derived.add(target);
        break;
      }
    }
  }
  return derived;
}

/**
 * Find pose-dependent translation channels (baseline differs between idle/walking).
 */
export function findPoseDependentChannels(
  translationCrossReads: Map<string, Set<"x" | "y" | "z">>,
  baselineBoneValues: Map<string, number>,
  altBaselineValues: Map<string, number>,
  tolerancePx = 0.75,
): Set<string> {
  const poseDependentChannels = new Set<string>();
  for (const [boneName, axes] of translationCrossReads) {
    for (const axis of axes) {
      const key = `${boneName}.t${axis}`;
      const alt = altBaselineValues.get(key);
      if (typeof alt !== "number") continue;
      const base = baselineBoneValues.get(key) ?? 0;
      if (Math.abs(base - alt) > tolerancePx) {
        poseDependentChannels.add(key);
      }
    }
  }
  return poseDependentChannels;
}

/**
 * Find small shared ty channels (small offsets read by other bones).
 */
export function findSmallSharedTyChannels(
  translationCrossReads: Map<string, Set<"x" | "y" | "z">>,
  baselineBoneValues: Map<string, number>,
  threshold = 3,
): Set<string> {
  const smallSharedChannels = new Set<string>();
  for (const [boneName, axes] of translationCrossReads) {
    if (!axes.has("y")) continue;
    const key = `${boneName}.ty`;
    const base = baselineBoneValues.get(key) ?? 0;
    if (Math.abs(base) < threshold) {
      smallSharedChannels.add(key);
    }
  }
  return smallSharedChannels;
}
