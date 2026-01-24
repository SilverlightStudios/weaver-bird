/**
 * Processing functions for translation normalization
 */

import type * as THREE from "three";
import type { BoneNormalizationContext } from "./translationNormalizationHelpers";
import {
  ensureEntityAbsolute,
  ensureLocalAbsolute,
  ensureRotationPointYAbsolute,
  getAbsoluteAxes,
  normalizeTranslationY,
} from "./translationNormalizationHelpers";

type Axis = "x" | "y" | "z";

/**
 * First pass: detect absolute translation semantics
 */
export function detectAbsoluteSemantics(
  axesSet: Set<Axis>,
  ctx: BoneNormalizationContext,
): void {
  // Detect entity-absolute semantics for X and Z
  for (const axis of ["x", "z"] as const) {
    if (axesSet.has(axis)) {
      ensureEntityAbsolute(axis, ctx);
    }
  }

  // Detect rotation point Y absolute for root bones
  if (axesSet.has("y")) {
    ensureRotationPointYAbsolute(ctx);
  }

  // Detect local-absolute semantics for all axes
  for (const axis of ["x", "y", "z"] as const) {
    if (axesSet.has(axis)) {
      ensureLocalAbsolute(axis, ctx);
    }
  }
}

/**
 * Second pass: compute additive offsets for non-absolute channels
 */
export function computeAdditiveOffsets(
  boneName: string,
  bone: THREE.Object3D,
  userData: Record<string, unknown>,
  isRoot: boolean,
  axesSet: Set<Axis>,
  ctx: BoneNormalizationContext,
  isConstantByChannel: Map<string, boolean>,
  poseDependentChannels: Set<string>,
  derivedFromInputOnly: Set<string>,
  smallSharedTyChannels: Set<string>,
): void {
  const absoluteAxes = getAbsoluteAxes(userData);

  for (const axis of ["x", "y", "z"] as const) {
    if (!axesSet.has(axis)) continue;

    const channel = `${boneName}.t${axis}`;
    const prop = `t${axis}` as "tx" | "ty" | "tz";

    // Skip channels that should remain as-is
    if (absoluteAxes.includes(axis)) continue;
    if (poseDependentChannels.has(channel)) continue;
    if (derivedFromInputOnly.has(channel)) continue;

    // Special handling for Y axis
    if (axis === "y") {
      normalizeTranslationY(
        boneName,
        bone,
        userData,
        isRoot,
        ctx.invertAxis,
        ctx.getBaselineBoneValue,
        isConstantByChannel,
        smallSharedTyChannels,
      );
      continue;
    }

    // X and Z axes: compute offset if not constant
    processXZAxisOffset(axis, boneName, channel, prop, userData, ctx, isConstantByChannel);
  }
}

/**
 * Process X or Z axis offset computation
 */
function processXZAxisOffset(
  axis: "x" | "z",
  boneName: string,
  channel: string,
  prop: "tx" | "tz",
  userData: Record<string, unknown>,
  ctx: BoneNormalizationContext,
  isConstantByChannel: Map<string, boolean>,
): void {
  const offsetProp = axis === "x" ? "translationOffsetXPx" : "translationOffsetZPx";
  const offsetPropAlt = axis === "x" ? "translationOffsetX" : "translationOffsetZ";

  if (
    typeof userData[offsetProp] !== "number" &&
    typeof userData[offsetPropAlt] !== "number" &&
    isConstantByChannel.get(channel) !== true
  ) {
    const baseline = ctx.getBaselineBoneValue(boneName, prop);
    if (Math.abs(baseline) > 1e-6) {
      userData[offsetProp] = baseline;
    }
  }
}
