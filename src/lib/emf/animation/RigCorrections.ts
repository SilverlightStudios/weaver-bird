/**
 * Rig Corrections
 *
 * Handles inference and application of rig corrections for entity models
 * where the authored animation pose expects small torso offsets.
 */

import * as THREE from "three";
import type { BoneMap } from "./boneController";

/**
 * Rig correction state
 */
export interface RigCorrectionState {
  /** Offset corrections by bone name */
  offsets: Map<string, THREE.Vector3>;
  /** Whether inference has been attempted */
  didInfer: boolean;
}

/**
 * Create initial rig correction state
 */
export function createRigCorrectionState(): RigCorrectionState {
  return {
    offsets: new Map(),
    didInfer: false,
  };
}

/**
 * Apply rig corrections to bones
 */
export function applyRigCorrections(
  state: RigCorrectionState,
  bones: BoneMap,
): void {
  if (state.offsets.size === 0) return;
  for (const [boneName, offset] of state.offsets) {
    const bone = bones.get(boneName);
    if (!bone) continue;
    bone.position.add(offset);
  }
}

interface TorsoInfo {
  mesh: THREE.Object3D;
  box: THREE.Box3;
  volume: number;
  size: THREE.Vector3;
}

interface LimbCandidate {
  bone: THREE.Object3D;
  box: THREE.Box3;
  volume: number;
}

function findTorsoMesh(modelGroup: THREE.Group): TorsoInfo | null {
  let torsoMesh: THREE.Object3D | null = null;
  let torsoBox: THREE.Box3 | null = null;
  let torsoVolume = 0;

  modelGroup.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    box.getSize(size);
    const volume = Math.max(0, size.x) * Math.max(0, size.y) * Math.max(0, size.z);
    if (volume > torsoVolume + 1e-9) {
      torsoVolume = volume;
      torsoMesh = obj;
      torsoBox = box;
    }
  });

  if (!torsoMesh || !torsoBox || torsoVolume <= 1e-9) return null;

  const size = new THREE.Vector3();
  torsoBox.getSize(size);

  return { mesh: torsoMesh, box: torsoBox, volume: torsoVolume, size };
}

function findTorsoRoot(torsoMesh: THREE.Object3D, modelGroup: THREE.Group): THREE.Object3D | null {
  let torsoRoot: THREE.Object3D | null = torsoMesh;
  while (torsoRoot && torsoRoot.parent && torsoRoot.parent !== modelGroup) {
    torsoRoot = torsoRoot.parent;
  }
  return (torsoRoot && torsoRoot.parent === modelGroup) ? torsoRoot : null;
}

function collectLimbCandidates(
  modelGroup: THREE.Group,
  torsoRoot: THREE.Object3D,
  torsoBox: THREE.Box3,
  torsoSize: THREE.Vector3,
  torsoVolume: number,
): LimbCandidate[] {
  const limbCandidates: LimbCandidate[] = [];

  for (const child of modelGroup.children) {
    if (child === torsoRoot) continue;

    let hasMeshDescendant = false;
    child.traverse((obj) => {
      if (obj instanceof THREE.Mesh) hasMeshDescendant = true;
    });
    if (!hasMeshDescendant) continue;

    const box = new THREE.Box3().setFromObject(child);
    const size = new THREE.Vector3();
    box.getSize(size);
    const volume = Math.max(0, size.x) * Math.max(0, size.y) * Math.max(0, size.z);
    if (volume <= 1e-9) continue;

    if (box.max.y > torsoBox.min.y + torsoSize.y * 0.75) continue;
    if (volume > torsoVolume * 0.8) continue;

    limbCandidates.push({ bone: child, box, volume });
  }

  return limbCandidates;
}

function computeRigOffset(
  torsoBox: THREE.Box3,
  torsoSize: THREE.Vector3,
  limbs: LimbCandidate[],
): THREE.Vector3 | null {
  const limbUnion = new THREE.Box3();
  for (const limb of limbs) limbUnion.union(limb.box);

  const limbSize = new THREE.Vector3();
  limbUnion.getSize(limbSize);

  const gapY = torsoBox.min.y - limbUnion.max.y;
  const protrusionZ = limbUnion.max.z - torsoBox.max.z;

  if (gapY <= 0.03 || protrusionZ <= 0.25) return null;

  const offset = new THREE.Vector3(0, 0, 0);

  const desiredOverlapY = limbSize.y * 0.75;
  if (gapY > 0.03) {
    offset.y -= gapY + desiredOverlapY;
  }

  const desiredProtrusionZ = torsoSize.z * 0.3;
  if (protrusionZ > desiredProtrusionZ + 0.03) {
    offset.z += protrusionZ - desiredProtrusionZ;
  }

  offset.y = THREE.MathUtils.clamp(offset.y, -0.4, 0.2);
  offset.z = THREE.MathUtils.clamp(offset.z, -0.4, 0.4);

  return offset.lengthSq() < 1e-6 ? null : offset;
}

/**
 * Infer rig corrections from the current pose
 *
 * Analyzes the model group to detect if the torso and limbs are separated
 * and calculates offset corrections to make them overlap naturally.
 *
 * @returns true if corrections were inferred and applied
 */
export function inferRigCorrections(
  state: RigCorrectionState,
  modelGroup: THREE.Group,
): boolean {
  if (state.didInfer) return false;
  state.didInfer = true;

  const torsoInfo = findTorsoMesh(modelGroup);
  if (!torsoInfo) return false;

  const torsoRoot = findTorsoRoot(torsoInfo.mesh, modelGroup);
  if (!torsoRoot) return false;

  const limbCandidates = collectLimbCandidates(
    modelGroup,
    torsoRoot,
    torsoInfo.box,
    torsoInfo.size,
    torsoInfo.volume,
  );
  if (limbCandidates.length < 4) return false;

  limbCandidates.sort((a, b) => a.volume - b.volume);
  const limbs = limbCandidates.slice(0, 6);

  const offset = computeRigOffset(torsoInfo.box, torsoInfo.size, limbs);
  if (!offset) return false;

  state.offsets.set(torsoRoot.name, offset);
  return true;
}
