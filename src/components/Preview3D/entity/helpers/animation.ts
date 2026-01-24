/**
 * Animation helper functions
 */
import type * as THREE from "three";
import { compileExpression, isConstantExpression } from "@lib/emf/animation";
import type { AnimationLayer } from "@lib/emf/jemLoader";
import type { AnimationKeyframe, VanillaAnimation } from "@constants/animations";

/**
 * Interpolate between keyframes based on normalized time (0-1).
 * Supports both linear and smooth (cubic) interpolation.
 */
export function interpolateKeyframes(keyframes: AnimationKeyframe[], normalizedTime: number): number {
  if (keyframes.length === 0) return 0;
  if (keyframes.length === 1) return keyframes[0].value;

  let prevKeyframe = keyframes[0];
  let nextKeyframe = keyframes[keyframes.length - 1];

  for (let i = 0; i < keyframes.length - 1; i++) {
    if (normalizedTime >= keyframes[i].time && normalizedTime <= keyframes[i + 1].time) {
      prevKeyframe = keyframes[i];
      nextKeyframe = keyframes[i + 1];
      break;
    }
  }

  if (normalizedTime < prevKeyframe.time) return prevKeyframe.value;
  if (normalizedTime > nextKeyframe.time) return nextKeyframe.value;

  const timeDelta = nextKeyframe.time - prevKeyframe.time;
  const t = timeDelta === 0 ? 0 : (normalizedTime - prevKeyframe.time) / timeDelta;

  const interpolationType = nextKeyframe.interpolation || "linear";
  const easedT = interpolationType === "smooth"
    ? (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
    : t;

  return prevKeyframe.value + (nextKeyframe.value - prevKeyframe.value) * easedT;
}

/** Apply vanilla keyframe animations to bones */
export function applyVanillaKeyframeAnimation(
  vanillaAnim: VanillaAnimation,
  baseBoneMap: Map<string, THREE.Object3D>,
  normalizedTime: number,
): void {
  if (!vanillaAnim.parts) return;

  for (const [partName, partAnim] of Object.entries(vanillaAnim.parts)) {
    const bone = baseBoneMap.get(partName);
    if (!bone) continue;
    if (partAnim.rotationX) {
      bone.rotation.x = (interpolateKeyframes(partAnim.rotationX, normalizedTime) * Math.PI) / 180;
    }
    if (partAnim.rotationY) {
      bone.rotation.y = (interpolateKeyframes(partAnim.rotationY, normalizedTime) * Math.PI) / 180;
    }
    if (partAnim.rotationZ) {
      bone.rotation.z = (interpolateKeyframes(partAnim.rotationZ, normalizedTime) * Math.PI) / 180;
    }
    if (partAnim.positionX) {
      bone.position.x = interpolateKeyframes(partAnim.positionX, normalizedTime) / 16;
    }
    if (partAnim.positionY) {
      bone.position.y = interpolateKeyframes(partAnim.positionY, normalizedTime) / 16;
    }
    if (partAnim.positionZ) {
      bone.position.z = interpolateKeyframes(partAnim.positionZ, normalizedTime) / 16;
    }
  }
}

/** Check if all animation layers contain only constant expressions */
export function areAnimationLayersStatic(layers: AnimationLayer[] | null | undefined): boolean {
  if (!layers || layers.length === 0) return false;
  for (const layer of layers) {
    for (const expr of Object.values(layer)) {
      if (typeof expr === "number") continue;
      if (typeof expr !== "string") return false;
      try {
        const parsed = compileExpression(expr);
        if (!isConstantExpression(parsed)) return false;
      } catch {
        return false;
      }
    }
  }
  return true;
}

/** Collect animated bone names from animation layers */
export function collectAnimatedBones(layers: AnimationLayer[] | null | undefined): Set<string> {
  const out = new Set<string>();
  if (!layers) return out;
  for (const layer of layers) {
    if (!layer || typeof layer !== "object") continue;
    for (const key of Object.keys(layer)) {
      const dot = key.indexOf(".");
      if (dot === -1) continue;
      const target = key.slice(0, dot);
      if (target && target !== "var" && target !== "varb" && target !== "render") {
        out.add(target);
      }
    }
  }
  return out;
}
