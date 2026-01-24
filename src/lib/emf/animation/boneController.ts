import type * as THREE from "three";
import type { BoneTransform } from "./types";
import {
  logBoneDebugInfo,
  logFinalPosition,
  logBoneHierarchy,
  logBaseTransforms,
  shouldLogBone,
  incrementFrameCount,
} from "./boneDebug";
import {
  PIXELS_PER_UNIT,
  extractBoneUserData,
  getBoneProperty as getBonePropertyUtil,
  normalizeRotation as normalizeRotationUtil,
  smoothRotation as smoothRotationUtil,
  type BoneUserDataConfig,
} from "./boneControllerUtils";
import {
  parseBoneProperty as parseBonePropertyImpl,
  isBoneTransformProperty as isBoneTransformPropertyImpl,
  createBoneTransform as createBoneTransformImpl,
  mergeBoneTransforms as mergeBoneTransformsImpl,
  BoneTransformAccumulator as BoneTransformAccumulatorImpl,
} from "./boneTransforms";

export const DEBUG_ANIMATIONS = false;

export type BoneMap = Map<string, THREE.Object3D>;

type BoneWithUserData = THREE.Object3D & {
  userData: BoneUserDataConfig;
};

export interface BaseTransforms {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  visible: boolean;
  boxesVisible: boolean;
}

export type BaseTransformMap = Map<string, BaseTransforms>;

function applyRotationAxis(bone: THREE.Object3D, axis: "x" | "y" | "z", value: number, config: BoneUserDataConfig, base: BaseTransforms | undefined): void {
  const offsets = { x: config.rotationOffsetX, y: config.rotationOffsetY, z: config.rotationOffsetZ };
  const adjusted = value - offsets[axis];
  const invertSign = config.invertAxis.includes(axis) ? -1 : 1;
  bone.rotation[axis] = config.absoluteRotationAxes.includes(axis)
    ? invertSign * adjusted
    : (base?.rotation[axis] ?? 0) + invertSign * adjusted;
}

function applyTranslationAxis(bone: THREE.Object3D, axis: "x" | "y" | "z", value: number, config: BoneUserDataConfig, base: BaseTransforms | undefined): void {
  const offsets = { x: config.translationOffsetXPx, y: config.translationOffsetYPx, z: config.translationOffsetZPx };
  const unitValue = (value - offsets[axis]) / PIXELS_PER_UNIT;
  const addSign = config.invertAxis.includes(axis) ? -1 : 1;
  const absSign = config.absoluteAxes.includes(axis) && config.invertAxis.includes(axis) ? -1 : 1;

  if (!config.absoluteAxes.includes(axis)) {
    bone.position[axis] = (base?.position[axis] ?? 0) + addSign * unitValue;
    return;
  }

  if (axis === "y" && !config.isLocalAbsolute) {
    const originY = config.invertAxis.includes("y")
      ? config.cemYOriginPx / PIXELS_PER_UNIT - unitValue
      : unitValue - config.cemYOriginPx / PIXELS_PER_UNIT;
    bone.position.y = originY - config.parentOriginPx[1] / PIXELS_PER_UNIT;
  } else {
    const idx = axis === "x" ? 0 : axis === "z" ? 2 : 1;
    bone.position[axis] = config.isLocalAbsolute
      ? absSign * unitValue
      : absSign * unitValue - config.parentOriginPx[idx] / PIXELS_PER_UNIT;
  }
}

function applyRotationTransforms(
  bone: THREE.Object3D,
  transforms: BoneTransform,
  config: BoneUserDataConfig,
  base: BaseTransforms | undefined,
): void {
  if (transforms.rx !== undefined) applyRotationAxis(bone, "x", transforms.rx, config, base);
  if (transforms.ry !== undefined) applyRotationAxis(bone, "y", transforms.ry, config, base);
  if (transforms.rz !== undefined) applyRotationAxis(bone, "z", transforms.rz, config, base);
}

function applyScaleAndVisibility(
  bone: THREE.Object3D,
  transforms: BoneTransform,
  base: BaseTransforms | undefined,
): void {
  if (transforms.sx !== undefined) bone.scale.x = (base?.scale.x ?? 1) * transforms.sx;
  if (transforms.sy !== undefined) bone.scale.y = (base?.scale.y ?? 1) * transforms.sy;
  if (transforms.sz !== undefined) bone.scale.z = (base?.scale.z ?? 1) * transforms.sz;
  if (transforms.visible !== undefined) bone.visible = transforms.visible;
  if (transforms.visible_boxes !== undefined) {
    const { boxesGroup } = (bone as BoneWithUserData).userData;
    if (boxesGroup) boxesGroup.visible = transforms.visible_boxes;
  }
}

export function buildBoneMap(root: THREE.Group): BoneMap {
  const bones: BoneMap = new Map();

  root.traverse((obj) => {
    if (obj.name && obj.name !== "jem_entity") {
      bones.set(obj.name, obj);
    }
  });

  if (DEBUG_ANIMATIONS) {
    logBoneHierarchy(root, bones.size);
  }

  return bones;
}

export function storeBaseTransforms(bones: BoneMap): BaseTransformMap {
  const baseTransforms: BaseTransformMap = new Map();

  for (const [name, bone] of bones) {
    const { boxesGroup } = (bone as BoneWithUserData).userData;
    baseTransforms.set(name, {
      position: bone.position.clone(),
      rotation: bone.rotation.clone(),
      scale: bone.scale.clone(),
      visible: bone.visible,
      boxesVisible: boxesGroup?.visible ?? true,
    });
  }

  if (DEBUG_ANIMATIONS) {
    logBaseTransforms(baseTransforms);
  }

  return baseTransforms;
}

export function resetBone(bone: THREE.Object3D, baseTransform: BaseTransforms): void {
  bone.position.copy(baseTransform.position);
  bone.rotation.copy(baseTransform.rotation);
  bone.scale.copy(baseTransform.scale);
  bone.visible = baseTransform.visible;
  const { boxesGroup } = (bone as BoneWithUserData).userData;
  if (boxesGroup) boxesGroup.visible = baseTransform.boxesVisible;
}

export function resetAllBones(bones: BoneMap, baseTransforms: BaseTransformMap): void {
  for (const [name, bone] of bones) {
    const base = baseTransforms.get(name);
    if (base) resetBone(bone, base);
  }
}

function applyTranslations(
  bone: THREE.Object3D,
  transforms: BoneTransform,
  config: BoneUserDataConfig,
  base: BaseTransforms | undefined,
): boolean {
  let hasTranslation = false;
  if (transforms.tx !== undefined) {
    applyTranslationAxis(bone, "x", transforms.tx, config, base);
    hasTranslation = true;
  }
  if (transforms.ty !== undefined) {
    applyTranslationAxis(bone, "y", transforms.ty, config, base);
    hasTranslation = true;
  }
  if (transforms.tz !== undefined) {
    applyTranslationAxis(bone, "z", transforms.tz, config, base);
    hasTranslation = true;
  }
  return hasTranslation;
}

function logTransformIfNeeded(
  shouldLog: boolean,
  bone: THREE.Object3D,
  transforms: BoneTransform,
  baseTransform: BaseTransforms | undefined,
  config: BoneUserDataConfig,
  hasTranslation: boolean,
): void {
  const hasTrans = transforms.tx !== undefined || transforms.ty !== undefined || transforms.tz !== undefined;
  const hasRot = transforms.rx !== undefined || transforms.ry !== undefined || transforms.rz !== undefined;
  const hasScale = transforms.sx !== undefined || transforms.sy !== undefined || transforms.sz !== undefined;

  if (!shouldLog || !(hasTrans || hasRot || hasScale)) return;

  logBoneDebugInfo(bone.name, baseTransform, transforms, hasTrans, hasRot);
  if (hasTranslation) logFinalPosition(bone, config.absoluteAxes);
  incrementFrameCount();
}

export function applyBoneTransform(
  bone: THREE.Object3D,
  transforms: BoneTransform,
  baseTransform?: BaseTransforms,
): void {
  const config = extractBoneUserData(bone);
  const shouldLog = shouldLogBone(bone.name, DEBUG_ANIMATIONS);

  const hasTranslation = applyTranslations(bone, transforms, config, baseTransform);
  applyRotationTransforms(bone, transforms, config, baseTransform);
  applyScaleAndVisibility(bone, transforms, baseTransform);

  logTransformIfNeeded(shouldLog, bone, transforms, baseTransform, config, hasTranslation);
}

// Re-export transform functions from boneTransforms file
export const parseBoneProperty = parseBonePropertyImpl;
export const isBoneTransformProperty = isBoneTransformPropertyImpl;
export const createBoneTransform = createBoneTransformImpl;
export const mergeBoneTransforms = mergeBoneTransformsImpl;
export const BoneTransformAccumulator = BoneTransformAccumulatorImpl;

// Re-export utility functions from utils file
export const getBoneProperty = getBonePropertyUtil;
export const normalizeRotation = normalizeRotationUtil;
export const smoothRotation = smoothRotationUtil;
