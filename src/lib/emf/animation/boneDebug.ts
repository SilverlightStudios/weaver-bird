import * as THREE from "three";
import type { BoneTransform } from "./types";
import type { BaseTransforms } from "./boneController";

const PIXELS_PER_UNIT = 16;

export let frameCount = 0;
const MAX_LOG_FRAMES = 3;
const BONES_TO_LOG = ["head", "headwear", "body", "left_arm", "right_arm"];

export function incrementFrameCount(): void {
  frameCount++;
}

export function shouldLogBone(boneName: string, debugEnabled: boolean): boolean {
  return (
    debugEnabled &&
    frameCount < MAX_LOG_FRAMES &&
    (BONES_TO_LOG.length === 0 || BONES_TO_LOG.includes(boneName))
  );
}

export function logBoneDebugInfo(
  boneName: string,
  baseTransform: BaseTransforms | undefined,
  transforms: BoneTransform,
  hasTranslation: boolean,
  hasRotation: boolean,
): void {
  console.log(`\n[BoneController] Frame ${frameCount + 1} - Bone "${boneName}":`);

  if (baseTransform) {
    const basePxX = baseTransform.position.x * PIXELS_PER_UNIT;
    const basePxY = baseTransform.position.y * PIXELS_PER_UNIT;
    const basePxZ = baseTransform.position.z * PIXELS_PER_UNIT;
    console.log(`  BASE (from JEM loader):`);
    console.log(
      `    Position (Three.js units): [${baseTransform.position.x.toFixed(3)}, ${baseTransform.position.y.toFixed(3)}, ${baseTransform.position.z.toFixed(3)}]`,
    );
    console.log(
      `    Position (pixels): [${basePxX.toFixed(1)}, ${basePxY.toFixed(1)}, ${basePxZ.toFixed(1)}]`,
    );
    const degX = (baseTransform.rotation.x * 180) / Math.PI;
    const degY = (baseTransform.rotation.y * 180) / Math.PI;
    const degZ = (baseTransform.rotation.z * 180) / Math.PI;
    console.log(
      `    Rotation (degrees): [${degX.toFixed(1)}°, ${degY.toFixed(1)}°, ${degZ.toFixed(1)}°]`,
    );
  } else {
    console.log(`  BASE: No base transform available`);
  }

  if (hasTranslation) {
    console.log(`  ANIMATION OFFSET (pixels):`);
    console.log(`    tx=${transforms.tx !== undefined ? transforms.tx.toFixed(3) : "none"}`);
    console.log(`    ty=${transforms.ty !== undefined ? transforms.ty.toFixed(3) : "none"}`);
    console.log(`    tz=${transforms.tz !== undefined ? transforms.tz.toFixed(3) : "none"}`);
  }

  if (hasRotation) {
    console.log(`  ANIMATION ROTATION (radians):`);
    const rxDeg =
      transforms.rx !== undefined ? `${((transforms.rx * 180) / Math.PI).toFixed(1)}°` : "none";
    const ryDeg =
      transforms.ry !== undefined ? `${((transforms.ry * 180) / Math.PI).toFixed(1)}°` : "none";
    const rzDeg =
      transforms.rz !== undefined ? `${((transforms.rz * 180) / Math.PI).toFixed(1)}°` : "none";
    console.log(`    rx=${rxDeg}, ry=${ryDeg}, rz=${rzDeg}`);
  }
}

export function logFinalPosition(bone: THREE.Object3D, absoluteAxes: string): void {
  const finalPxX = bone.position.x * PIXELS_PER_UNIT;
  const finalPxY = bone.position.y * PIXELS_PER_UNIT;
  const finalPxZ = bone.position.z * PIXELS_PER_UNIT;
  console.log(`  FINAL POSITION (${absoluteAxes ? `ABSOLUTE(${absoluteAxes})` : "ADDITIVE"}):`);
  console.log(
    `    Three.js units: [${bone.position.x.toFixed(3)}, ${bone.position.y.toFixed(3)}, ${bone.position.z.toFixed(3)}]`,
  );
  console.log(`    Pixels: [${finalPxX.toFixed(1)}, ${finalPxY.toFixed(1)}, ${finalPxZ.toFixed(1)}]`);
}

export function logBoneHierarchy(root: THREE.Group, bonesCount: number): void {
  console.log("[BoneController] Built bone map with", bonesCount, "bones:");
  console.log("[BoneController] Hierarchy (nested structure):");
  root.updateMatrixWorld(true);

  const logBoneTree = (obj: THREE.Object3D, indent: number) => {
    if (obj.name && obj.name !== "jem_entity") {
      const prefix = "  ".repeat(indent);
      const worldPos = new THREE.Vector3();
      obj.getWorldPosition(worldPos);
      console.log(
        `${prefix}- ${obj.name}: local=[${obj.position.x.toFixed(3)}, ${obj.position.y.toFixed(3)}, ${obj.position.z.toFixed(3)}], world=[${worldPos.x.toFixed(3)}, ${worldPos.y.toFixed(3)}, ${worldPos.z.toFixed(3)}]`,
      );
    }
    for (const child of obj.children) {
      if (child instanceof THREE.Group || child.name) {
        logBoneTree(child, obj.name && obj.name !== "jem_entity" ? indent + 1 : indent);
      }
    }
  };
  logBoneTree(root, 0);
}

export function logBaseTransforms(baseTransforms: Map<string, BaseTransforms>): void {
  console.log("[BoneController] Stored base transforms:");
  for (const [name, base] of baseTransforms) {
    console.log(
      `  - ${name}: base_pos=[${base.position.x.toFixed(3)}, ${base.position.y.toFixed(3)}, ${base.position.z.toFixed(3)}]`,
    );
  }
}
