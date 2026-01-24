/**
 * Vanilla Input Seeding
 *
 * Seeds bone rotation inputs with vanilla-style values for expressions
 * that read bone.rx/ry/rz (e.g., sniffer legs depend on vanilla limb swing).
 */

import type * as THREE from "three";
import type { AnimationContext } from "./types";
import type { BoneMap, BaseTransformMap } from "./boneController";
import type { BoneWithUserData } from "@/lib/emf/types";

interface AxisSigns {
  x: number;
  y: number;
  z: number;
}

function getAxisSigns(bone: THREE.Object3D): AxisSigns {
  const userData = (bone as BoneWithUserData).userData ?? {};
  const invertAxis = typeof userData.invertAxis === "string" ? userData.invertAxis : "";
  return {
    x: invertAxis.includes("x") ? -1 : 1,
    y: invertAxis.includes("y") ? -1 : 1,
    z: invertAxis.includes("z") ? -1 : 1,
  };
}

function getEulerAngles(
  desiredThreeEuler: Partial<THREE.Euler>,
  base: { rotation: THREE.Euler } | undefined,
): { x: number; y: number; z: number } {
  return {
    x: desiredThreeEuler.x ?? base?.rotation.x ?? 0,
    y: desiredThreeEuler.y ?? base?.rotation.y ?? 0,
    z: desiredThreeEuler.z ?? base?.rotation.z ?? 0,
  };
}

function buildCEMRotationValues(
  reads: Set<"rx" | "ry" | "rz">,
  signs: AxisSigns,
  angles: { x: number; y: number; z: number },
): Partial<{ rx: number; ry: number; rz: number }> {
  return {
    ...(reads.has("rx") ? { rx: signs.x * angles.x } : {}),
    ...(reads.has("ry") ? { ry: signs.y * angles.y } : {}),
    ...(reads.has("rz") ? { rz: signs.z * angles.z } : {}),
  };
}

/**
 * Apply vanilla rotation input seeding to context
 *
 * Populates context.boneValues with vanilla-style rotation inputs
 * for bones that are read by animation expressions.
 */
export function applyVanillaRotationInputSeeding(
  context: AnimationContext,
  bones: BoneMap,
  baseTransforms: BaseTransformMap,
  rotationInputReads: Map<string, Set<"rx" | "ry" | "rz">>,
  rotationInputUsage: Map<string, { bone: boolean; var: boolean }>,
  rotationAxesByBone: Map<string, Set<"x" | "y" | "z">>,
): void {
  if (rotationInputReads.size === 0) return;

  const state = context.entityState;
  const swingAmount = Math.sin(state.limb_swing * 0.6662) * 1.4 * state.limb_speed;

  const setInput = (boneName: string, desiredThreeEuler: Partial<THREE.Euler>) => {
    const reads = rotationInputReads.get(boneName);
    if (!reads || reads.size === 0) return;

    const usage = rotationInputUsage.get(boneName);
    if (usage && rotationAxesByBone.has(boneName) && !usage.bone) return;

    const bone = bones.get(boneName);
    if (!bone) return;

    const base = baseTransforms.get(boneName);
    const signs = getAxisSigns(bone);
    const angles = getEulerAngles(desiredThreeEuler, base);
    const cemValues = buildCEMRotationValues(reads, signs, angles);

    context.boneValues[boneName] = {
      ...(context.boneValues[boneName] ?? {}),
      ...cemValues,
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

  // Directional legs (front/back)
  const directional: Array<[string, number]> = [
    ["front_left_leg", swingAmount],
    ["front_right_leg", -swingAmount],
    ["back_left_leg", -swingAmount],
    ["back_right_leg", swingAmount],
    // Alternate naming
    ["left_front_leg", swingAmount],
    ["right_front_leg", -swingAmount],
    ["left_hind_leg", -swingAmount],
    ["right_hind_leg", swingAmount],
    ["left_rear_leg", -swingAmount],
    ["right_rear_leg", swingAmount],
    // Multi-leg rigs (sniffer) use tripod gait
    ["middle_left_leg", -swingAmount],
    ["middle_right_leg", swingAmount],
  ];
  for (const [name, deltaX] of directional) {
    const base = baseTransforms.get(name);
    if (!base) continue;
    setInput(name, { x: base.rotation.x + deltaX });
  }
}
