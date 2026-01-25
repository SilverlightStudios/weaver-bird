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

  if (boneName === "headwear" || boneName === "head2") {
    console.log(`[DEBUG] computeAdditiveOffsets for ${boneName}:`, {
      isRoot,
      axesSet: Array.from(axesSet),
      absoluteAxes,
      parentName: bone.parent?.name,
    });
  }

  for (const axis of ["x", "y", "z"] as const) {
    if (!axesSet.has(axis)) continue;

    const channel = `${boneName}.t${axis}`;
    const prop = `t${axis}` as "tx" | "ty" | "tz";

    if (boneName === "headwear" && axis === "y") {
      console.log(`[DEBUG] computeAdditiveOffsets headwear.ty checks:`, {
        absoluteAxesHasY: absoluteAxes.includes("y"),
        poseDependentHas: poseDependentChannels.has(channel),
        derivedFromInputOnlyHas: derivedFromInputOnly.has(channel),
      });
    }

    // Skip absolute channels for all axes
    if (absoluteAxes.includes(axis)) continue;

    // Special handling for Y axis - always call normalizeTranslationY even for pose-dependent channels
    // Y normalization needs to happen to prevent the head from floating above the body
    if (axis === "y") {
      // derivedFromInputOnly should still skip Y axis (vanilla placeholders)
      if (derivedFromInputOnly.has(channel)) continue;
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

    // For X and Z: skip pose-dependent and input-only derived channels
    if (poseDependentChannels.has(channel)) continue;
    if (derivedFromInputOnly.has(channel)) continue;

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
