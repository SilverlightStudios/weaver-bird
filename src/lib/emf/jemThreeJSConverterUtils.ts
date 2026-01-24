/**
 * Utility functions for JEM to Three.js conversion
 */

import * as THREE from "three";
import type { ParsedEntityModel } from "./jemLoader";

const PIXELS_PER_UNIT = 16;

/**
 * Configure texture filters for Minecraft-style rendering
 */
export function configureTextures(
  texture: THREE.Texture | null,
  textureMap: Record<string, THREE.Texture>,
): void {
  if (texture) {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
  }
  for (const tex of Object.values(textureMap)) {
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
  }
}

/**
 * Check if a value is a zero constant (number or string "0")
 */
function isZeroConst(expr: unknown): boolean {
  if (typeof expr === "number") return Math.abs(expr) < 1e-9;
  if (typeof expr !== "string") return false;
  const s = expr.trim();
  if (!/^-?\d+(\.\d+)?$/.test(s)) return false;
  const n = Number(s);
  return Number.isFinite(n) && Math.abs(n) < 1e-9;
}

/**
 * Check if model has zeroed body translation in animations
 */
export function hasZeroedBodyTranslation(model: ParsedEntityModel): boolean {
  return (
    Array.isArray(model.animations) &&
    model.animations.some((layer) => {
      if (!layer || typeof layer !== "object") return false;
      const rec = layer as Record<string, unknown>;
      return (
        isZeroConst(rec["body.tx"]) ||
        isZeroConst(rec["body.ty"]) ||
        isZeroConst(rec["body.tz"])
      );
    })
  );
}

/**
 * Mark translation semantics for humanoid limb bones
 */
export function markHumanoidLimbSemantics(
  rootGroups: Record<string, THREE.Group>,
): void {
  const hasHumanoidLimbs =
    !!rootGroups.left_arm &&
    !!rootGroups.right_arm &&
    !!rootGroups.left_leg &&
    !!rootGroups.right_leg;

  if (!hasHumanoidLimbs) return;

  // Arms: humanoid rigs author tx/ty as absolute rotationPoint values (e.g. ty≈2.5).
  for (const limbName of ["left_arm", "right_arm"]) {
    const limb = rootGroups[limbName];
    if (!limb) continue;
    const pivotYPx = limb.position.y * PIXELS_PER_UNIT;
    limb.userData.absoluteTranslationAxes = pivotYPx >= 16 ? "xy" : "x";
  }
}

/**
 * Detect if model is a quadruped
 */
export function detectQuadruped(rootGroups: Record<string, THREE.Group>): {
  isQuadruped: boolean;
  legNames: string[];
} {
  const hasQuadrupedLegs =
    !!rootGroups.leg1 &&
    !!rootGroups.leg2 &&
    !!rootGroups.leg3 &&
    !!rootGroups.leg4;
  const hasDirectionalLegs =
    !!rootGroups.front_left_leg &&
    !!rootGroups.front_right_leg &&
    !!rootGroups.back_left_leg &&
    !!rootGroups.back_right_leg;
  const hasMiddleLegs =
    !!rootGroups.middle_left_leg && !!rootGroups.middle_right_leg;

  // "Quadruped" defaults are intended for 4-legged rigs; multi-leg rigs (e.g.
  // sniffer with middle legs) author translations differently.
  const isQuadruped = (hasQuadrupedLegs || hasDirectionalLegs) && !hasMiddleLegs;

  const legNames = hasQuadrupedLegs
    ? ["leg1", "leg2", "leg3", "leg4"]
    : ["front_left_leg", "front_right_leg", "back_left_leg", "back_right_leg"];

  return { isQuadruped, legNames };
}

/**
 * Mark translation semantics for quadruped limb bones
 */
export function markQuadrupedLimbSemantics(
  rootGroups: Record<string, THREE.Group>,
  legNames: string[],
  hasZeroedBody: boolean,
): void {
  for (const legName of legNames) {
    const leg = rootGroups[legName];
    if (leg) leg.userData.absoluteTranslationAxes = "xyz";
  }

  const { body } = rootGroups;
  if (body && !hasZeroedBody) {
    body.userData.absoluteTranslationAxes = "xyz";
  }
}

/**
 * Extract bone references from an expression string
 */
function extractBoneReferences(expression: string): {
  refs: Set<string>;
  tRefs: Set<string>;
} {
  const refs = new Set<string>();
  const tRefs = new Set<string>();
  const re = /\b([A-Za-z0-9_]+)\.([tr])[xyz]\b/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(expression))) {
    const ref = m[1];
    const kind = m[2] as "t" | "r";
    if (!ref || ref === "var" || ref === "render" || ref === "varb") continue;
    refs.add(ref);
    if (kind === "t") tRefs.add(ref);
  }

  return { refs, tRefs };
}

/**
 * Process a single animation property
 */
function processAnimationProperty(
  property: string,
  expression: string | number,
  animatedBones: Set<string>,
  referencedBonesByTarget: Map<string, Set<string>>,
  referencedTranslationBonesByTarget: Map<string, Set<string>>,
): void {
  const dot = property.indexOf(".");
  if (dot === -1) return;

  const target = property.slice(0, dot);
  if (target === "var" || target === "render") return;

  animatedBones.add(target);

  if (typeof expression !== "string") return;

  const { refs, tRefs } = extractBoneReferences(expression);

  if (refs.size > 0) {
    const existingRefs = referencedBonesByTarget.get(target) ?? new Set<string>();
    for (const ref of refs) existingRefs.add(ref);
    referencedBonesByTarget.set(target, existingRefs);
  }

  if (tRefs.size > 0) {
    const existingTRefs = referencedTranslationBonesByTarget.get(target) ?? new Set<string>();
    for (const ref of tRefs) existingTRefs.add(ref);
    referencedTranslationBonesByTarget.set(target, existingTRefs);
  }
}

/**
 * Collect animated bones and their references from animation expressions
 */
export function collectAnimatedBones(model: ParsedEntityModel): {
  animatedBones: Set<string>;
  referencedBonesByTarget: Map<string, Set<string>>;
  referencedTranslationBonesByTarget: Map<string, Set<string>>;
} {
  const animatedBones = new Set<string>();
  const referencedBonesByTarget = new Map<string, Set<string>>();
  const referencedTranslationBonesByTarget = new Map<string, Set<string>>();

  if (!model.animations) {
    return { animatedBones, referencedBonesByTarget, referencedTranslationBonesByTarget };
  }

  for (const layer of model.animations) {
    for (const [property, expression] of Object.entries(layer)) {
      processAnimationProperty(
        property,
        expression,
        animatedBones,
        referencedBonesByTarget,
        referencedTranslationBonesByTarget,
      );
    }
  }

  return { animatedBones, referencedBonesByTarget, referencedTranslationBonesByTarget };
}

/**
 * Check if model has negative head2.ty baseline (horse family rigs)
 */
export function hasNegativeHead2TyBaseline(
  model: ParsedEntityModel,
  isQuadruped: boolean,
): boolean {
  if (!isQuadruped || !Array.isArray(model.animations)) return false;

  for (const layer of model.animations) {
    if (!layer || typeof layer !== "object") continue;
    const expr = (layer as Record<string, unknown>)["head2.ty"];

    if (typeof expr === "number") {
      if (expr <= -3) return true;
      continue;
    }

    if (typeof expr !== "string") continue;

    // Many FA quadruped rigs author head2.ty with a large leading negative
    // constant like `-20 ...` to indicate rotationPoint-like coordinates.
    if (/^\s*-\s*\d/.test(expr.trimStart())) return true;
  }

  return false;
}

/**
 * Refresh rest positions after hierarchy adjustments
 */
export function refreshRestPositions(root: THREE.Group): void {
  root.traverse((obj) => {
    if (obj instanceof THREE.Group && obj.name && obj.name !== "jem_entity") {
      obj.userData.restPosition = obj.position.clone();
    }
  });
}
