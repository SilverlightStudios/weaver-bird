import * as THREE from "three";
import type { BoneTransform } from "./types";

const PIXELS_PER_UNIT = 16;
const CEM_Y_ORIGIN = 24;

export const DEBUG_ANIMATIONS = false;

let frameCount = 0;

const MAX_LOG_FRAMES = 3;

const BONES_TO_LOG = ["head", "headwear", "body", "left_arm", "right_arm"];

export type BoneMap = Map<string, THREE.Object3D>;

export interface BaseTransforms {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  visible: boolean;
}

export type BaseTransformMap = Map<string, BaseTransforms>;

/**
 * Build a map of bone names to Three.js objects for quick lookup.
 *
 * With our nested hierarchy, bones are organized as a proper tree structure:
 * - Parent bones contain child bones as Three.js children
 * - When a parent rotates/translates, children automatically follow
 * - This eliminates the need for manual parent transform propagation
 *
 * @param root The root Three.js group containing all bones
 * @returns A Map of bone names to their Three.js objects
 */
export function buildBoneMap(root: THREE.Group): BoneMap {
  const bones: BoneMap = new Map();

  root.traverse((obj) => {
    if (obj.name && obj.name !== "jem_entity") {
      bones.set(obj.name, obj);
    }
  });

  if (DEBUG_ANIMATIONS) {
    console.log("[BoneController] Built bone map with", bones.size, "bones:");
    console.log("[BoneController] Hierarchy (nested structure):");
    root.updateMatrixWorld(true);

    // Log hierarchy with indentation to show nesting
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
          logBoneTree(
            child,
            obj.name && obj.name !== "jem_entity" ? indent + 1 : indent,
          );
        }
      }
    };
    logBoneTree(root, 0);
  }

  return bones;
}

export function storeBaseTransforms(bones: BoneMap): BaseTransformMap {
  const baseTransforms: BaseTransformMap = new Map();

  for (const [name, bone] of bones) {
    baseTransforms.set(name, {
      position: bone.position.clone(),
      rotation: bone.rotation.clone(),
      scale: bone.scale.clone(),
      visible: bone.visible,
    });
  }

  if (DEBUG_ANIMATIONS) {
    console.log("[BoneController] Stored base transforms:");
    for (const [name, base] of baseTransforms) {
      console.log(
        `  - ${name}: base_pos=[${base.position.x.toFixed(3)}, ${base.position.y.toFixed(3)}, ${base.position.z.toFixed(3)}]`,
      );
    }
  }

  return baseTransforms;
}

export function resetBone(
  bone: THREE.Object3D,
  baseTransform: BaseTransforms,
): void {
  bone.position.copy(baseTransform.position);
  bone.rotation.copy(baseTransform.rotation);
  bone.scale.copy(baseTransform.scale);
  bone.visible = baseTransform.visible;
}

export function resetAllBones(
  bones: BoneMap,
  baseTransforms: BaseTransformMap,
): void {
  for (const [name, bone] of bones) {
    const base = baseTransforms.get(name);
    if (base) {
      resetBone(bone, base);
    }
  }
}

/**
 * Apply animation transforms to a bone.
 *
 * With our nested Three.js hierarchy, parent transforms automatically propagate
 * to children. We only need to apply the animation offset to each bone's LOCAL
 * transform - Three.js handles combining them in world space.
 *
 * @param bone The Three.js object to transform
 * @param transforms The animation transforms to apply (tx, ty, tz, rx, ry, rz, sx, sy, sz)
 * @param baseTransform The bone's original rest pose transform
 */
export function applyBoneTransform(
  bone: THREE.Object3D,
  transforms: BoneTransform,
  baseTransform?: BaseTransforms,
): void {
  const base = baseTransform;
  const boneName = bone.name;

  const hasTranslation =
    transforms.tx !== undefined ||
    transforms.ty !== undefined ||
    transforms.tz !== undefined;
  const hasRotation =
    transforms.rx !== undefined ||
    transforms.ry !== undefined ||
    transforms.rz !== undefined;
  const hasScale =
    transforms.sx !== undefined ||
    transforms.sy !== undefined ||
    transforms.sz !== undefined;

  const shouldLog =
    DEBUG_ANIMATIONS &&
    frameCount < MAX_LOG_FRAMES &&
    (BONES_TO_LOG.length === 0 || BONES_TO_LOG.includes(boneName));

  if (shouldLog && (hasTranslation || hasRotation || hasScale)) {
    console.log(
      `\n[BoneController] Frame ${frameCount + 1} - Bone "${boneName}":`,
    );

    if (base) {
      const basePxX = base.position.x * PIXELS_PER_UNIT;
      const basePxY = base.position.y * PIXELS_PER_UNIT;
      const basePxZ = base.position.z * PIXELS_PER_UNIT;
      console.log(`  BASE (from JEM loader):`);
      console.log(
        `    Position (Three.js units): [${base.position.x.toFixed(3)}, ${base.position.y.toFixed(3)}, ${base.position.z.toFixed(3)}]`,
      );
      console.log(
        `    Position (pixels): [${basePxX.toFixed(1)}, ${basePxY.toFixed(1)}, ${basePxZ.toFixed(1)}]`,
      );
      const degX = (base.rotation.x * 180) / Math.PI;
      const degY = (base.rotation.y * 180) / Math.PI;
      const degZ = (base.rotation.z * 180) / Math.PI;
      console.log(
        `    Rotation (degrees): [${degX.toFixed(1)}°, ${degY.toFixed(1)}°, ${degZ.toFixed(1)}°]`,
      );
    } else {
      console.log(`  BASE: No base transform available`);
    }

    if (hasTranslation) {
      console.log(`  ANIMATION OFFSET (pixels):`);
      console.log(
        `    tx=${transforms.tx !== undefined ? transforms.tx.toFixed(3) : "none"}`,
      );
      console.log(
        `    ty=${transforms.ty !== undefined ? transforms.ty.toFixed(3) : "none"}`,
      );
      console.log(
        `    tz=${transforms.tz !== undefined ? transforms.tz.toFixed(3) : "none"}`,
      );
    }

    if (hasRotation) {
      console.log(`  ANIMATION ROTATION (radians):`);
      const rxDeg =
        transforms.rx !== undefined
          ? ((transforms.rx * 180) / Math.PI).toFixed(1) + "°"
          : "none";
      const ryDeg =
        transforms.ry !== undefined
          ? ((transforms.ry * 180) / Math.PI).toFixed(1) + "°"
          : "none";
      const rzDeg =
        transforms.rz !== undefined
          ? ((transforms.rz * 180) / Math.PI).toFixed(1) + "°"
          : "none";
      console.log(`    rx=${rxDeg}, ry=${ryDeg}, rz=${rzDeg}`);
    }
  }

  const userData = (bone as any).userData || {};
  const absoluteAxes: string =
    typeof userData.absoluteTranslationAxes === "string"
      ? userData.absoluteTranslationAxes
      : userData.absoluteTranslation === true
        ? "xyz"
        : "";

  const invertAxis =
    typeof userData.invertAxis === "string"
      ? (userData.invertAxis as string)
      : "";

  const absoluteRotationAxes: string =
    typeof userData.absoluteRotationAxes === "string"
      ? (userData.absoluteRotationAxes as string)
      : userData.absoluteRotation === true
        ? "xyz"
        : "";

  const absoluteSpace =
    typeof userData.absoluteTranslationSpace === "string"
      ? (userData.absoluteTranslationSpace as string)
      : "entity";
  const isLocalAbsolute = absoluteSpace === "local";

  const parentOriginPx = Array.isArray((bone.parent as any)?.userData?.originPx)
    ? ((bone.parent as any).userData.originPx as [number, number, number])
    : ([0, 0, 0] as [number, number, number]);

  // Absolute translations are authored as rotationPoint values in CEM space.
  // We still need to convert them into our Three.js coordinate system.
  const absSignX =
    absoluteAxes.includes("x") && invertAxis.includes("x") ? -1 : 1;
  const absSignZ =
    absoluteAxes.includes("z") && invertAxis.includes("z") ? -1 : 1;

  // Apply inversion to additive translations as well (needed for Fresh Animations)
  const addSignX = invertAxis.includes("x") ? -1 : 1;
  const addSignY = invertAxis.includes("y") ? -1 : 1;
  const addSignZ = invertAxis.includes("z") ? -1 : 1;

  if (transforms.tx !== undefined) {
    const baseX = base?.position.x ?? 0;
    const value = transforms.tx / PIXELS_PER_UNIT;
    if (absoluteAxes.includes("x")) {
      bone.position.x = isLocalAbsolute
        ? absSignX * value
        : absSignX * value - parentOriginPx[0] / PIXELS_PER_UNIT;
    } else {
      bone.position.x = baseX + addSignX * value;
    }
  }

  if (transforms.ty !== undefined) {
    const baseY = base?.position.y ?? 0;
    const value = transforms.ty / PIXELS_PER_UNIT;
    if (absoluteAxes.includes("y")) {
      if (isLocalAbsolute) {
        bone.position.y = addSignY * value;
      } else {
        const cemYOriginPx =
          typeof userData.cemYOriginPx === "number"
            ? (userData.cemYOriginPx as number)
            : CEM_Y_ORIGIN;
        // CEM `ty` is rotationPointY (Y-down). Our scene uses Y-up with the feet at 0.
        // For inverted-Y parts (common in JEM: invertAxis="xy"), convert via (24 - ty).
        const originY = invertAxis.includes("y")
          ? cemYOriginPx / PIXELS_PER_UNIT - value
          : value - cemYOriginPx / PIXELS_PER_UNIT;
        bone.position.y = originY - parentOriginPx[1] / PIXELS_PER_UNIT;
      }
    } else {
      bone.position.y = baseY + addSignY * value;
    }
  }

  if (transforms.tz !== undefined) {
    const baseZ = base?.position.z ?? 0;
    const value = transforms.tz / PIXELS_PER_UNIT;
    if (absoluteAxes.includes("z")) {
      bone.position.z = isLocalAbsolute
        ? absSignZ * value
        : absSignZ * value - parentOriginPx[2] / PIXELS_PER_UNIT;
    } else {
      bone.position.z = baseZ + addSignZ * value;
    }
  }

  if (shouldLog && hasTranslation) {
    const finalPxX = bone.position.x * PIXELS_PER_UNIT;
    const finalPxY = bone.position.y * PIXELS_PER_UNIT;
    const finalPxZ = bone.position.z * PIXELS_PER_UNIT;
    console.log(
      `  FINAL POSITION (${absoluteAxes ? `ABSOLUTE(${absoluteAxes})` : "ADDITIVE"}):`,
    );
    console.log(
      `    Three.js units: [${bone.position.x.toFixed(3)}, ${bone.position.y.toFixed(3)}, ${bone.position.z.toFixed(3)}]`,
    );
    console.log(
      `    Pixels: [${finalPxX.toFixed(1)}, ${finalPxY.toFixed(1)}, ${finalPxZ.toFixed(1)}]`,
    );
  }

  // Apply rotation transforms with invertAxis consideration
  const rotSignX = invertAxis.includes("x") ? -1 : 1;
  const rotSignY = invertAxis.includes("y") ? -1 : 1;
  const rotSignZ = invertAxis.includes("z") ? -1 : 1;

  if (transforms.rx !== undefined) {
    bone.rotation.x = absoluteRotationAxes.includes("x")
      ? rotSignX * transforms.rx
      : (base?.rotation.x ?? 0) + rotSignX * transforms.rx;
  }
  if (transforms.ry !== undefined) {
    bone.rotation.y = absoluteRotationAxes.includes("y")
      ? rotSignY * transforms.ry
      : (base?.rotation.y ?? 0) + rotSignY * transforms.ry;
  }
  if (transforms.rz !== undefined) {
    bone.rotation.z = absoluteRotationAxes.includes("z")
      ? rotSignZ * transforms.rz
      : (base?.rotation.z ?? 0) + rotSignZ * transforms.rz;
  }

  if (transforms.sx !== undefined) {
    bone.scale.x = (base?.scale.x ?? 1) * transforms.sx;
  }
  if (transforms.sy !== undefined) {
    bone.scale.y = (base?.scale.y ?? 1) * transforms.sy;
  }
  if (transforms.sz !== undefined) {
    bone.scale.z = (base?.scale.z ?? 1) * transforms.sz;
  }

  if (transforms.visible !== undefined) {
    bone.visible = transforms.visible;
  }

  if (shouldLog && (hasTranslation || hasRotation || hasScale)) {
    frameCount++;
  }
}

export function parseBoneProperty(
  propertyPath: string,
): { target: string; property: string } | null {
  const dotIndex = propertyPath.indexOf(".");
  if (dotIndex === -1) {
    return null;
  }

  return {
    target: propertyPath.substring(0, dotIndex),
    property: propertyPath.substring(dotIndex + 1),
  };
}

export function isBoneTransformProperty(property: string): boolean {
  return [
    "tx",
    "ty",
    "tz",
    "rx",
    "ry",
    "rz",
    "sx",
    "sy",
    "sz",
    "visible",
    "visible_boxes",
  ].includes(property);
}

export function createBoneTransform(
  property: string,
  value: number,
): BoneTransform {
  const transform: BoneTransform = {};

  switch (property) {
    case "tx":
      transform.tx = value;
      break;
    case "ty":
      transform.ty = value;
      break;
    case "tz":
      transform.tz = value;
      break;
    case "rx":
      transform.rx = value;
      break;
    case "ry":
      transform.ry = value;
      break;
    case "rz":
      transform.rz = value;
      break;
    case "sx":
      transform.sx = value;
      break;
    case "sy":
      transform.sy = value;
      break;
    case "sz":
      transform.sz = value;
      break;
    case "visible":
      transform.visible = value !== 0;
      break;
    case "visible_boxes":
      transform.visible_boxes = value !== 0;
      break;
  }

  return transform;
}

export function mergeBoneTransforms(
  ...transforms: BoneTransform[]
): BoneTransform {
  const result: BoneTransform = {};

  for (const transform of transforms) {
    if (transform.tx !== undefined) result.tx = transform.tx;
    if (transform.ty !== undefined) result.ty = transform.ty;
    if (transform.tz !== undefined) result.tz = transform.tz;
    if (transform.rx !== undefined) result.rx = transform.rx;
    if (transform.ry !== undefined) result.ry = transform.ry;
    if (transform.rz !== undefined) result.rz = transform.rz;
    if (transform.sx !== undefined) result.sx = transform.sx;
    if (transform.sy !== undefined) result.sy = transform.sy;
    if (transform.sz !== undefined) result.sz = transform.sz;
    if (transform.visible !== undefined) result.visible = transform.visible;
    if (transform.visible_boxes !== undefined)
      result.visible_boxes = transform.visible_boxes;
  }

  return result;
}

export class BoneTransformAccumulator {
  private transforms: Map<string, BoneTransform> = new Map();

  set(boneName: string, property: string, value: number): void {
    let transform = this.transforms.get(boneName);
    if (!transform) {
      transform = {};
      this.transforms.set(boneName, transform);
    }

    const partialTransform = createBoneTransform(property, value);
    Object.assign(transform, partialTransform);
  }

  get(boneName: string): BoneTransform | undefined {
    return this.transforms.get(boneName);
  }

  getAll(): Map<string, BoneTransform> {
    return this.transforms;
  }

  clear(): void {
    this.transforms.clear();
  }

  applyAll(bones: BoneMap, baseTransforms: BaseTransformMap): void {
    for (const [boneName, transform] of this.transforms) {
      const bone = bones.get(boneName);
      if (bone) {
        const base = baseTransforms.get(boneName);
        applyBoneTransform(bone, transform, base);
      }
    }
  }
}
