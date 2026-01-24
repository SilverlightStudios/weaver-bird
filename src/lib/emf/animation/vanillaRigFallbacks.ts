/**
 * Vanilla Rig Fallback Animations
 *
 * Provides vanilla-style fallback animations when no CEM animations are present.
 * Handles different entity types with their specific bone naming conventions.
 */

import type * as THREE from "three";
import type { EntityState } from "./types";
import { applyBoneRotation, applyLegRotations } from "./vanillaRigFallbackHelpers";

type BoneMap = Map<string, THREE.Object3D>;
type BaseTransformMap = Map<string, { position: THREE.Vector3; rotation: THREE.Euler; scale: THREE.Vector3 }>;

function applyHeadRotation(bones: BoneMap, baseTransforms: BaseTransformMap, state: EntityState): void {
  const head = bones.get("head");
  if (!head) return;

  const base = baseTransforms.get("head");
  const yawRad = (state.head_yaw * Math.PI) / 180;
  const pitchRad = (state.head_pitch * Math.PI) / 180;
  head.rotation.y = (base?.rotation.y ?? 0) + yawRad;
  head.rotation.x = (base?.rotation.x ?? 0) + pitchRad;
}

function applyHurtAnimation(bones: BoneMap, baseTransforms: BaseTransformMap, state: EntityState): void {
  if (state.hurt_time <= 0) return;

  const hurtWobble = Math.sin(state.hurt_time * 0.5) * 0.3;
  const body = bones.get("body");
  if (body) {
    const base = baseTransforms.get("body");
    body.rotation.z = (base?.rotation.z ?? 0) + hurtWobble;
  }
}

function applyDeathAnimation(bones: BoneMap, baseTransforms: BaseTransformMap, state: EntityState): void {
  if (state.death_time <= 0) return;

  const deathProgress = Math.min(state.death_time / 20, 1);
  const deathAngle = (deathProgress * Math.PI) / 2;
  const body = bones.get("body");
  if (body) {
    const base = baseTransforms.get("body");
    body.rotation.x = (base?.rotation.x ?? 0) + deathAngle;
  }
}

function applyBannerSway(bones: BoneMap, baseTransforms: BaseTransformMap, state: EntityState): void {
  const bannerCloth = bones.get("slate") ?? bones.get("flag");
  if (!bannerCloth) return;

  const base = baseTransforms.get(bannerCloth.name);
  const t = state.age / 20;
  const swayX = Math.sin(t * 2.0) * 0.025;
  const swayZ = Math.cos(t * 2.6) * 0.006;
  bannerCloth.rotation.x = (base?.rotation.x ?? 0) + swayX;
  bannerCloth.rotation.z = (base?.rotation.z ?? 0) + swayZ;
}

/**
 * Apply vanilla-style fallback animations when no CEM animations are present.
 */
export function applyVanillaFallback(
  bones: BoneMap,
  baseTransforms: BaseTransformMap,
  state: EntityState,
): void {
  applyHeadRotation(bones, baseTransforms, state);

  const swingAmount = Math.sin(state.limb_swing * 0.6662) * 1.4 * state.limb_speed;
  const hasHumanoidLimbs = applyHumanoidLimbs(bones, baseTransforms, swingAmount);

  if (!hasHumanoidLimbs) {
    applyQuadrupedLegs(bones, baseTransforms, swingAmount);
  }

  applyWingFlap(bones, baseTransforms, state);
  applyHurtAnimation(bones, baseTransforms, state);
  applyDeathAnimation(bones, baseTransforms, state);
  applyBannerSway(bones, baseTransforms, state);
}

/**
 * Apply humanoid limb animations (arms and legs).
 * @returns true if humanoid limbs were found and animated
 */
export function applyHumanoidLimbs(
  bones: BoneMap,
  baseTransforms: BaseTransformMap,
  swingAmount: number,
): boolean {
  let foundAny = false;

  const limbRotations: Array<[string, number]> = [
    ["right_arm", swingAmount],
    ["left_arm", -swingAmount],
    ["right_leg", -swingAmount],
    ["right_shoe", -swingAmount],
    ["left_leg", swingAmount],
    ["left_shoe", swingAmount],
  ];

  for (const [limbName, delta] of limbRotations) {
    if (applyBoneRotation(bones, baseTransforms, limbName, "x", delta)) {
      foundAny = true;
    }
  }

  return foundAny;
}

/**
 * Apply quadruped leg animations (leg1-leg4 pattern).
 * Used by creeper, pig, cow, sheep, and other 4-legged entities.
 */
export function applyQuadrupedLegs(
  bones: BoneMap,
  baseTransforms: BaseTransformMap,
  swingAmount: number,
): void {
  const legRotations: Array<[string, number]> = [
    // Standard numbered legs
    ["leg1", swingAmount],
    ["leg3", swingAmount],
    ["leg2", -swingAmount],
    ["leg4", -swingAmount],
    // Directional naming (horse, cat)
    ["front_left_leg", swingAmount],
    ["front_right_leg", -swingAmount],
    ["back_left_leg", -swingAmount],
    ["back_right_leg", swingAmount],
    // Mojang naming
    ["left_front_leg", swingAmount],
    ["right_front_leg", -swingAmount],
    ["left_hind_leg", -swingAmount],
    ["left_rear_leg", -swingAmount],
    ["right_hind_leg", swingAmount],
    ["right_rear_leg", swingAmount],
  ];

  applyLegRotations(bones, baseTransforms, legRotations);
}

/**
 * Apply wing flapping animation for flying entities.
 */
export function applyWingFlap(
  bones: BoneMap,
  baseTransforms: BaseTransformMap,
  state: EntityState,
): void {
  const flapSpeed = state.limb_speed > 0 ? 10 : 3;
  const flapAmount = Math.sin(state.age * flapSpeed) * 0.5;

  const wingRotations: Array<[string, number]> = [
    ["left_wing", -flapAmount],
    ["right_wing", flapAmount],
    ["outer_left_wing", -flapAmount * 0.5],
    ["outer_right_wing", flapAmount * 0.5],
  ];

  for (const [wingName, delta] of wingRotations) {
    applyBoneRotation(bones, baseTransforms, wingName, "z", delta);
  }
}

interface RotationSigns {
  x: number;
  y: number;
  z: number;
}

function getRotationSigns(bone: THREE.Object3D): RotationSigns {
  const userData = (bone as { userData?: Record<string, unknown> }).userData ?? {};
  const invertAxis = typeof userData.invertAxis === "string" ? userData.invertAxis : "";
  return {
    x: invertAxis.includes("x") ? -1 : 1,
    y: invertAxis.includes("y") ? -1 : 1,
    z: invertAxis.includes("z") ? -1 : 1,
  };
}

function getRotationAngles(
  desiredThreeEuler: Partial<{ x: number; y: number; z: number }>,
  base: { rotation: THREE.Euler } | undefined,
): { x: number; y: number; z: number } {
  return {
    x: desiredThreeEuler.x ?? base?.rotation.x ?? 0,
    y: desiredThreeEuler.y ?? base?.rotation.y ?? 0,
    z: desiredThreeEuler.z ?? base?.rotation.z ?? 0,
  };
}

function buildRotationValues(
  reads: Set<"rx" | "ry" | "rz">,
  signs: RotationSigns,
  angles: { x: number; y: number; z: number },
): Partial<{ rx: number; ry: number; rz: number }> {
  return {
    ...(reads.has("rx") ? { rx: signs.x * angles.x } : {}),
    ...(reads.has("ry") ? { ry: signs.y * angles.y } : {}),
    ...(reads.has("rz") ? { rz: signs.z * angles.z } : {}),
  };
}

/**
 * Seed vanilla rotation inputs into context bone values.
 * Used when expressions read rotation channels as inputs.
 */
export function seedVanillaRotationInputs(
  bones: BoneMap,
  baseTransforms: BaseTransformMap,
  rotationInputReads: Map<string, Set<"rx" | "ry" | "rz">>,
  rotationInputUsage: Map<string, { bone: boolean; var: boolean }>,
  rotationAxesByBone: Map<string, Set<"x" | "y" | "z">>,
  state: EntityState,
  boneValues: Record<string, Record<string, number>>,
): void {
  if (rotationInputReads.size === 0) return;

  const swingAmount = Math.sin(state.limb_swing * 0.6662) * 1.4 * state.limb_speed;

  const setInput = (boneName: string, desiredThreeEuler: Partial<{ x: number; y: number; z: number }>) => {
    const reads = rotationInputReads.get(boneName);
    if (!reads || reads.size === 0) return;

    const usage = rotationInputUsage.get(boneName);
    if (usage && rotationAxesByBone.has(boneName) && !usage.bone) return;

    const bone = bones.get(boneName);
    if (!bone) return;

    const base = baseTransforms.get(boneName);
    const signs = getRotationSigns(bone);
    const angles = getRotationAngles(desiredThreeEuler, base);
    const rotationValues = buildRotationValues(reads, signs, angles);

    boneValues[boneName] = {
      ...(boneValues[boneName] ?? {}),
      ...rotationValues,
    };
  };

  // Head bones
  const yawRad = (state.head_yaw * Math.PI) / 180;
  const pitchRad = (state.head_pitch * Math.PI) / 180;
  for (const headName of ["head", "headwear"]) {
    const base = baseTransforms.get(headName);
    if (!base) continue;
    setInput(headName, {
      x: base.rotation.x + pitchRad,
      y: base.rotation.y + yawRad,
      z: base.rotation.z,
    });
  }

  // Humanoid limbs
  const humanoid: Array<[string, number]> = [
    ["right_arm", swingAmount],
    ["left_arm", -swingAmount],
    ["right_leg", -swingAmount],
    ["left_leg", swingAmount],
  ];
  for (const [name, deltaX] of humanoid) {
    const base = baseTransforms.get(name);
    if (!base) continue;
    setInput(name, { x: base.rotation.x + deltaX });
  }

  // Quadruped legs (leg1-leg4)
  const quad: Array<[string, number]> = [
    ["leg1", swingAmount],
    ["leg3", swingAmount],
    ["leg2", -swingAmount],
    ["leg4", -swingAmount],
  ];
  for (const [name, deltaX] of quad) {
    const base = baseTransforms.get(name);
    if (!base) continue;
    setInput(name, { x: base.rotation.x + deltaX });
  }

  // Directional legs
  const directional: Array<[string, number]> = [
    ["front_left_leg", swingAmount],
    ["front_right_leg", -swingAmount],
    ["back_left_leg", -swingAmount],
    ["back_right_leg", swingAmount],
    ["left_front_leg", swingAmount],
    ["right_front_leg", -swingAmount],
    ["left_hind_leg", -swingAmount],
    ["right_hind_leg", swingAmount],
    ["left_rear_leg", -swingAmount],
    ["right_rear_leg", swingAmount],
    ["middle_left_leg", -swingAmount],
    ["middle_right_leg", swingAmount],
  ];
  for (const [name, deltaX] of directional) {
    const base = baseTransforms.get(name);
    if (!base) continue;
    setInput(name, { x: base.rotation.x + deltaX });
  }
}
