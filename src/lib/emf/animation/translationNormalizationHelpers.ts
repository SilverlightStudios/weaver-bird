/**
 * Helper functions for translation normalization
 */

import type * as THREE from "three";
import type { BoneWithUserData } from "@/lib/emf/types";

type Axis = "x" | "y" | "z";

export interface BoneNormalizationContext {
  boneName: string;
  bone: THREE.Object3D;
  userData: Record<string, unknown>;
  isRoot: boolean;
  invertAxis: string;
  localPxX: number;
  localPxY: number;
  localPxZ: number;
  expectedCemX: number;
  expectedCemY: number;
  expectedCemZ: number;
  expectedCemEntityX: number;
  expectedCemEntityZ: number;
  getBaselineBoneValue: (boneName: string, prop: string) => number;
}

export function createBoneNormalizationContext(
  boneName: string,
  bone: THREE.Object3D,
  userData: Record<string, unknown>,
  isRoot: boolean,
  baseTransforms: Map<string, { position: THREE.Vector3 }>,
  getBaselineBoneValue: (boneName: string, prop: string) => number,
): BoneNormalizationContext {
  const invertAxis = typeof userData.invertAxis === "string" ? (userData.invertAxis as string) : "";
  const base = baseTransforms.get(boneName);
  const localPxX = (base?.position.x ?? 0) * 16;
  const localPxY = (base?.position.y ?? 0) * 16;
  const localPxZ = (base?.position.z ?? 0) * 16;
  const expectedCemX = invertAxis.includes("x") ? -localPxX : localPxX;
  const expectedCemY = invertAxis.includes("y") ? -localPxY : localPxY;
  const expectedCemZ = invertAxis.includes("z") ? -localPxZ : localPxZ;
  const originPx = Array.isArray(userData.originPx)
    ? (userData.originPx as [number, number, number])
    : [0, 0, 0];
  const expectedCemEntityX = invertAxis.includes("x") ? -originPx[0] : originPx[0];
  const expectedCemEntityZ = invertAxis.includes("z") ? -originPx[2] : originPx[2];

  return {
    boneName,
    bone,
    userData,
    isRoot,
    invertAxis,
    localPxX,
    localPxY,
    localPxZ,
    expectedCemX,
    expectedCemY,
    expectedCemZ,
    expectedCemEntityX,
    expectedCemEntityZ,
    getBaselineBoneValue,
  };
}

export function getAbsoluteAxes(userData: Record<string, unknown>): string {
  if (typeof userData.absoluteTranslationAxes === "string") {
    return userData.absoluteTranslationAxes as string;
  }
  return userData.absoluteTranslation === true ? "xyz" : "";
}

const TOLERANCE_PX = 0.75;

export function ensureEntityAbsolute(axis: "x" | "z", ctx: BoneNormalizationContext): void {
  if (getAbsoluteAxes(ctx.userData).includes(axis)) return;

  const baseline = ctx.getBaselineBoneValue(ctx.boneName, `t${axis}`);
  const expected = axis === "x" ? ctx.expectedCemEntityX : ctx.expectedCemEntityZ;

  // Avoid classifying zero-origin bones where this yields no real signal
  if (Math.abs(expected) < 1.5) return;
  if (Math.abs(baseline) < 1.5) return;
  if (Math.abs(baseline - expected) > TOLERANCE_PX) return;

  const existing = getAbsoluteAxes(ctx.userData);
  if (!existing.includes(axis)) {
    ctx.userData.absoluteTranslationAxes = existing + axis;
  }
  ctx.userData.absoluteTranslationSpace = "entity";
}

export function ensureLocalAbsolute(axis: Axis, ctx: BoneNormalizationContext): void {
  if (getAbsoluteAxes(ctx.userData).includes(axis)) return;

  const baseline = ctx.getBaselineBoneValue(ctx.boneName, `t${axis}`);
  const expected =
    axis === "x" ? ctx.expectedCemX : axis === "y" ? ctx.expectedCemY : ctx.expectedCemZ;

  // Avoid misclassifying small additive offsets
  if (Math.abs(expected) < 3) return;
  if (Math.abs(baseline) < 3) return;
  if (Math.abs(baseline - expected) > TOLERANCE_PX) return;

  const existing = getAbsoluteAxes(ctx.userData);
  if (!existing.includes(axis)) {
    ctx.userData.absoluteTranslationAxes = existing + axis;
  }
  ctx.userData.absoluteTranslationSpace = "local";
}

export function ensureRotationPointYAbsolute(ctx: BoneNormalizationContext): void {
  if (getAbsoluteAxes(ctx.userData).includes("y")) return;
  if (!ctx.isRoot) return;

  const baseline = ctx.getBaselineBoneValue(ctx.boneName, "ty");
  const expected = ctx.invertAxis.includes("y") ? 24 - ctx.localPxY : ctx.localPxY + 24;

  if (Math.abs(expected) < 3) return;
  if (Math.abs(baseline) < 3) return;
  if (Math.abs(baseline - expected) > TOLERANCE_PX) return;

  const existing = getAbsoluteAxes(ctx.userData);
  ctx.userData.absoluteTranslationAxes = existing.includes("y") ? existing : `${existing}y`;
  if (typeof ctx.userData.absoluteTranslationSpace !== "string") {
    ctx.userData.absoluteTranslationSpace = "entity";
  }
  // Entity-space absolute (rotationPointY) uses the default 24px origin
  delete ctx.userData.translationOffsetYPx;
  delete ctx.userData.translationOffsetY;
}

export function normalizeTranslationY(
  boneName: string,
  bone: THREE.Object3D,
  userData: Record<string, unknown>,
  isRoot: boolean,
  invertAxis: string,
  getBaselineBoneValue: (boneName: string, prop: string) => number,
  isConstantByChannel: Map<string, boolean>,
  smallSharedTyChannels: Set<string>,
): void {
  const channel = `${boneName}.ty`;

  if (smallSharedTyChannels.has(channel)) return;
  if (typeof userData.translationOffsetYPx === "number") return;
  if (typeof userData.translationOffsetY === "number") return;

  const ty0 = getBaselineBoneValue(boneName, "ty");
  const isConstant = isConstantByChannel.get(channel) === true;

  // Some rigs author child ty constants that effectively cancel a parent's 24px-origin
  const parentOriginPx = Array.isArray(
    (bone.parent as BoneWithUserData | null)?.userData?.originPx,
  )
    ? ((bone.parent as BoneWithUserData).userData.originPx as [number, number, number])
    : [0, 0, 0];

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
