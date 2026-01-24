/**
 * Rotation Normalization
 *
 * Normalizes rotation channels by detecting absolute vs additive semantics
 * and computing baseline offsets for proper animation application.
 */

import type * as THREE from "three";
import type { BoneWithUserData } from "@/lib/emf/types";

type Axis = "x" | "y" | "z";
type RotProp = "rx" | "ry" | "rz";

export interface RotationNormalizationConfig {
  bones: Map<string, THREE.Object3D>;
  baseTransforms: Map<string, { position: THREE.Vector3; rotation: THREE.Euler; scale: THREE.Vector3 }>;
  rotationAxesByBone: Map<string, Set<Axis>>;
  selfRotationReads: Map<string, Set<RotProp>>;
  baselineBoneValues: Map<string, number>;
  baselineBoneValuesWater: Map<string, number>;
  directRotationCopyTargets: Map<string, string>;
  getBaselineBoneValue: (boneName: string, prop: string) => number;
}

/**
 * Normalize rotation channels for all animated bones.
 */
export function normalizeRotationAxes(config: RotationNormalizationConfig): void {
  const {
    bones,
    baseTransforms,
    rotationAxesByBone,
    selfRotationReads,
    baselineBoneValuesWater,
    directRotationCopyTargets,
    getBaselineBoneValue,
  } = config;

  for (const [boneName, axesSet] of rotationAxesByBone) {
    const bone = bones.get(boneName);
    if (!bone) continue;

    const userData = ((bone as BoneWithUserData).userData ?? {}) as Record<string, unknown>;
    const base = baseTransforms.get(boneName);
    const boxesGroup = (bone as BoneWithUserData).userData?.boxesGroup as THREE.Object3D | undefined;
    const hasLocalBoxes = !!boxesGroup && boxesGroup.children.length > 0;

    const invertAxis = typeof userData.invertAxis === "string" ? (userData.invertAxis as string) : "";
    const signs = {
      x: invertAxis.includes("x") ? -1 : 1,
      y: invertAxis.includes("y") ? -1 : 1,
      z: invertAxis.includes("z") ? -1 : 1,
    };

    const selfReads = selfRotationReads.get(boneName);
    const isDirectCopy = (axis: Axis) => directRotationCopyTargets.has(`${boneName}.r${axis}`);

    const ctx: RotationBoneContext = {
      boneName,
      bone,
      userData,
      base,
      hasLocalBoxes,
      signs,
      selfReads,
      baselineBoneValuesWater,
      getBaselineBoneValue,
    };

    // Apply normalization passes for each axis
    for (const axis of ["x", "y", "z"] as const) {
      if (!axesSet.has(axis)) continue;

      ensureAbsoluteRotation(axis, ctx);
      ensureAbsoluteWhenBaselineMatchesRest(axis, ctx);

      if (!isDirectCopy(axis)) {
        ensureRotationOffsetForPivotOnlyBaseline(axis, ctx);
        ensureRotationOffsetWhenBaselineDuplicatesChildRest(axis, ctx, bones, baseTransforms);
        ensureRotationOffsetForModerateBaselineOnPivotBone(axis, ctx, baseTransforms);
        ensureRotationOffsetForLargeBaseline(axis, ctx);
      }
    }

    (bone as BoneWithUserData).userData = userData;
  }
}

interface RotationBoneContext {
  boneName: string;
  bone: THREE.Object3D;
  userData: Record<string, unknown>;
  base: { rotation: THREE.Euler } | undefined;
  hasLocalBoxes: boolean;
  signs: Record<Axis, number>;
  selfReads: Set<RotProp> | undefined;
  baselineBoneValuesWater: Map<string, number>;
  getBaselineBoneValue: (boneName: string, prop: string) => number;
}

function getAbsoluteRotationAxes(userData: Record<string, unknown>): string {
  return typeof userData.absoluteRotationAxes === "string"
    ? (userData.absoluteRotationAxes as string)
    : "";
}

function setRotationOffset(userData: Record<string, unknown>, axis: Axis, value: number): void {
  const prop = `rotationOffset${axis.toUpperCase()}`;
  if (typeof userData[prop] !== "number") {
    userData[prop] = value;
  }
}

function getRestRotation(base: { rotation: THREE.Euler } | undefined, axis: Axis, sign: number): number {
  if (!base) return 0;
  const rot = axis === "x" ? base.rotation.x : axis === "y" ? base.rotation.y : base.rotation.z;
  return sign * rot;
}

function ensureAbsoluteRotation(axis: Axis, ctx: RotationBoneContext): void {
  const prop = `r${axis}` as RotProp;
  if (!ctx.selfReads?.has(prop)) return;

  const existing = getAbsoluteRotationAxes(ctx.userData);
  if (!existing.includes(axis)) {
    ctx.userData.absoluteRotationAxes = existing + axis;
  }
}

function ensureAbsoluteWhenBaselineMatchesRest(axis: Axis, ctx: RotationBoneContext): void {
  const prop = `r${axis}` as RotProp;
  const baseline = ctx.getBaselineBoneValue(ctx.boneName, prop);
  const rest = getRestRotation(ctx.base, axis, ctx.signs[axis]);

  if (Math.abs(baseline - rest) > 1e-4) return;

  const existing = getAbsoluteRotationAxes(ctx.userData);
  if (!existing.includes(axis)) {
    ctx.userData.absoluteRotationAxes = existing + axis;
  }
}

function ensureRotationOffsetForPivotOnlyBaseline(axis: Axis, ctx: RotationBoneContext): void {
  if (ctx.hasLocalBoxes) return;
  if (getAbsoluteRotationAxes(ctx.userData).includes(axis)) return;

  const prop = `r${axis}` as RotProp;
  const baseline = ctx.getBaselineBoneValue(ctx.boneName, prop);
  const baseRot = ctx.base?.rotation[axis] ?? 0;
  const baseRotCem = ctx.signs[axis] * baseRot;

  if (Math.abs(baseRotCem) < 0.75) return;

  const effectiveBaseline = baseline + baseRotCem;
  // Pivot-only bones with large baked rotations often author absolute-looking values
  if (Math.abs(effectiveBaseline) < 1.25) return;

  setRotationOffset(ctx.userData, axis, effectiveBaseline);
}

function ensureRotationOffsetWhenBaselineDuplicatesChildRest(
  axis: Axis,
  ctx: RotationBoneContext,
  _bones: Map<string, THREE.Object3D>,
  baseTransforms: Map<string, { rotation: THREE.Euler }>,
): void {
  if (getAbsoluteRotationAxes(ctx.userData).includes(axis)) return;

  const prop = `r${axis}` as RotProp;
  const baseline = ctx.getBaselineBoneValue(ctx.boneName, prop);
  if (Math.abs(baseline) < 0.4) return;

  const boneRest = ctx.base?.rotation[axis] ?? 0;
  // If the parent bone already has a non-zero rest rotation, allow the authored baseline
  if (Math.abs(boneRest) > 1e-4) return;

  const matchesChildRest = (obj: THREE.Object3D): boolean => {
    const childBase = baseTransforms.get(obj.name);
    if (!childBase) return false;

    const childInvertAxis =
      typeof (obj as BoneWithUserData).userData?.invertAxis === "string"
        ? ((obj as BoneWithUserData).userData.invertAxis as string)
        : "";
    const childSign = childInvertAxis.includes(axis) ? -1 : 1;
    const childRest = childSign * (childBase.rotation[axis] ?? 0);
    return Math.abs(childRest - baseline) <= 1e-4;
  };

  const stack: THREE.Object3D[] = [...ctx.bone.children];
  while (stack.length > 0) {
    const next = stack.pop()!;
    if (matchesChildRest(next)) {
      setRotationOffset(ctx.userData, axis, baseline);
      return;
    }
    stack.push(...next.children);
  }
}

function ensureRotationOffsetForLargeBaseline(axis: Axis, ctx: RotationBoneContext): void {
  if (getAbsoluteRotationAxes(ctx.userData).includes(axis)) return;

  const prop = `r${axis}` as RotProp;
  const baseline = ctx.getBaselineBoneValue(ctx.boneName, prop);

  // Only treat very large baselines (typically ±90°) as calibration constants
  // Heuristic: treat baselines above ~72° as calibration constants
  if (Math.abs(baseline) < 1.25) return;

  // If the in-water baseline is small, the large default baseline likely comes from
  // an alternate state pose rather than a calibration constant
  const water = ctx.baselineBoneValuesWater.get(`${ctx.boneName}.${prop}`) ?? 0;
  if (Math.abs(water) < 1.25) return;

  setRotationOffset(ctx.userData, axis, baseline);
}

function ensureRotationOffsetForModerateBaselineOnPivotBone(
  axis: Axis,
  ctx: RotationBoneContext,
  baseTransforms: Map<string, { rotation: THREE.Euler }>,
): void {
  if (getAbsoluteRotationAxes(ctx.userData).includes(axis)) return;

  const prop = `r${axis}` as RotProp;
  const baseline = ctx.getBaselineBoneValue(ctx.boneName, prop);

  // Only consider moderate angles (≈30–65°)
  const absBaseline = Math.abs(baseline);
  if (absBaseline < 0.52 || absBaseline > 1.15) return;

  const boneRest = ctx.base?.rotation[axis] ?? 0;
  if (Math.abs(boneRest) > 1e-4) return;

  const originPx = Array.isArray(ctx.userData.originPx)
    ? (ctx.userData.originPx as [number, number, number])
    : [0, 0, 0];
  // Focus on large-pivot bones (biped/villager roots are at 24px)
  if (originPx[1] < 16) return;

  // Only apply when a descendant has a substantial rest rotation
  const hasRotatedDescendant = (obj: THREE.Object3D): boolean => {
    const childBase = baseTransforms.get(obj.name);
    if (childBase) {
      const childRest = childBase.rotation[axis] ?? 0;
      if (Math.abs(childRest) > 0.35) return true;
    }
    for (const c of obj.children) {
      if (hasRotatedDescendant(c)) return true;
    }
    return false;
  };

  if (!hasRotatedDescendant(ctx.bone)) return;

  setRotationOffset(ctx.userData, axis, baseline);
}

/**
 * Apply direct rotation copy overrides for bones that directly copy another bone's rotation.
 */
function applyAbsoluteRotationAxis(
  targetUserData: Record<string, unknown>,
  sourceUserData: Record<string, unknown>,
  axis: Axis
): void {
  const sourceAbsAxes = getAbsoluteRotationAxes(sourceUserData);
  if (!sourceAbsAxes.includes(axis)) return;

  const existingAbs = getAbsoluteRotationAxes(targetUserData);
  if (!existingAbs.includes(axis)) {
    targetUserData.absoluteRotationAxes = existingAbs + axis;
  }
}

function copyRotationOffset(
  targetUserData: Record<string, unknown>,
  sourceUserData: Record<string, unknown>,
  axis: Axis,
  targetBoneName: string,
  sourceBoneName: string,
  baseTransforms: Map<string, { rotation: THREE.Euler }>
): void {
  const offsetProp = `rotationOffset${axis.toUpperCase()}`;
  const sourceOffset = sourceUserData[offsetProp];

  if (typeof sourceOffset !== "number") return;
  if (typeof targetUserData[offsetProp] === "number") return;

  const targetBase = baseTransforms.get(targetBoneName);
  const sourceBase = baseTransforms.get(sourceBoneName);
  const targetRest = targetBase?.rotation[axis] ?? 0;
  const sourceRest = sourceBase?.rotation[axis] ?? 0;

  // Copy the offset, adjusting for any difference in rest poses
  targetUserData[offsetProp] = sourceOffset + (sourceRest - targetRest);
}

export function applyDirectRotationCopyOverrides(
  directRotationCopyTargets: Map<string, string>,
  bones: Map<string, THREE.Object3D>,
  baseTransforms: Map<string, { rotation: THREE.Euler }>,
): void {
  for (const [targetKey, sourceBoneName] of directRotationCopyTargets) {
    const dot = targetKey.indexOf(".");
    if (dot === -1) continue;

    const targetBoneName = targetKey.slice(0, dot);
    const prop = targetKey.slice(dot + 1);
    const axis = prop[1] as Axis;

    const targetBone = bones.get(targetBoneName);
    const sourceBone = bones.get(sourceBoneName);
    if (!targetBone || !sourceBone) continue;

    const targetUserData = (targetBone as BoneWithUserData).userData ?? {};
    const sourceUserData = (sourceBone as BoneWithUserData).userData ?? {};

    applyAbsoluteRotationAxis(targetUserData, sourceUserData, axis);
    copyRotationOffset(targetUserData, sourceUserData, axis, targetBoneName, sourceBoneName, baseTransforms);

    (targetBone as BoneWithUserData).userData = targetUserData;
  }
}
