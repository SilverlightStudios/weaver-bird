import type * as THREE from "three";

type BoneMap = Map<string, THREE.Object3D>;
type BaseTransformMap = Map<string, { position: THREE.Vector3; rotation: THREE.Euler; scale: THREE.Vector3 }>;

/**
 * Apply rotation to a bone if it exists
 */
export function applyBoneRotation(
  bones: BoneMap,
  baseTransforms: BaseTransformMap,
  boneName: string,
  axis: "x" | "y" | "z",
  delta: number,
): boolean {
  const bone = bones.get(boneName);
  if (!bone) return false;

  const base = baseTransforms.get(boneName);
  bone.rotation[axis] = (base?.rotation[axis] ?? 0) + delta;
  return true;
}

/**
 * Apply rotation to a bone from an array of possible names
 */
export function applyBoneRotationMultiName(
  bones: BoneMap,
  baseTransforms: BaseTransformMap,
  boneNames: string[],
  axis: "x" | "y" | "z",
  delta: number,
): boolean {
  for (const boneName of boneNames) {
    const bone = bones.get(boneName);
    if (bone) {
      const base = baseTransforms.get(boneName);
      bone.rotation[axis] = (base?.rotation[axis] ?? 0) + delta;
      return true;
    }
  }
  return false;
}

/**
 * Apply multiple leg rotations from a list of leg names and their swing amounts
 */
export function applyLegRotations(
  bones: BoneMap,
  baseTransforms: BaseTransformMap,
  legConfigs: Array<[string, number]>,
): void {
  for (const [legName, swingAmount] of legConfigs) {
    applyBoneRotation(bones, baseTransforms, legName, "x", swingAmount);
  }
}
