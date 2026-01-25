import type * as THREE from "three";
import type { BoneWithUserData } from "../types";

export const PIXELS_PER_UNIT = 16;
export const CEM_Y_ORIGIN = 24;

export interface BoneUserDataConfig {
  absoluteAxes: string;
  invertAxis: string;
  translationOffsetXPx: number;
  translationOffsetYPx: number;
  translationOffsetZPx: number;
  absoluteRotationAxes: string;
  isLocalAbsolute: boolean;
  parentOriginPx: [number, number, number];
  cemYOriginPx: number;
  rotationOffsetX: number;
  rotationOffsetY: number;
  rotationOffsetZ: number;
}

function getStringValue(value: unknown, defaultValue: string): string {
  return typeof value === "string" ? value : defaultValue;
}

function getNumberValue(value: unknown, defaultValue: number): number {
  return typeof value === "number" ? value : defaultValue;
}

function getTranslationOffset(userData: Record<string, unknown>, axis: string): number {
  const pxKey = `translationOffset${axis}Px`;
  const key = `translationOffset${axis}`;
  return getNumberValue(userData[pxKey], getNumberValue(userData[key], 0));
}

export function extractBoneUserData(bone: THREE.Object3D): BoneUserDataConfig {
  const { userData } = bone as BoneWithUserData;

  const absoluteAxes = getStringValue(
    userData.absoluteTranslationAxes,
    userData.absoluteTranslation === true ? "xyz" : "",
  );

  const absoluteRotationAxes = getStringValue(
    userData.absoluteRotationAxes,
    userData.absoluteRotation === true ? "xyz" : "",
  );

  const absoluteSpace = getStringValue(userData.absoluteTranslationSpace, "entity");
  const parentOriginPx = Array.isArray((bone.parent as BoneWithUserData | null)?.userData?.originPx)
    ? ((bone.parent as BoneWithUserData).userData.originPx as [number, number, number])
    : ([0, 0, 0] as [number, number, number]);

  return {
    absoluteAxes,
    invertAxis: getStringValue(userData.invertAxis, ""),
    translationOffsetXPx: getTranslationOffset(userData, "X"),
    translationOffsetYPx: getTranslationOffset(userData, "Y"),
    translationOffsetZPx: getTranslationOffset(userData, "Z"),
    absoluteRotationAxes,
    isLocalAbsolute: absoluteSpace === "local",
    parentOriginPx,
    cemYOriginPx: getNumberValue(userData.cemYOriginPx, CEM_Y_ORIGIN),
    rotationOffsetX: getNumberValue(userData.rotationOffsetX, 0),
    rotationOffsetY: getNumberValue(userData.rotationOffsetY, 0),
    rotationOffsetZ: getNumberValue(userData.rotationOffsetZ, 0),
  };
}

export function getBoneProperty(bone: THREE.Object3D, property: string): number | undefined {
  if (property === "tx") return bone.position.x * PIXELS_PER_UNIT;
  if (property === "ty") return bone.position.y * PIXELS_PER_UNIT;
  if (property === "tz") return bone.position.z * PIXELS_PER_UNIT;
  if (property === "rx") return bone.rotation.x;
  if (property === "ry") return bone.rotation.y;
  if (property === "rz") return bone.rotation.z;
  if (property === "sx") return bone.scale.x;
  if (property === "sy") return bone.scale.y;
  if (property === "sz") return bone.scale.z;
  return undefined;
}

export function normalizeRotation(radians: number): number {
  const TWO_PI = Math.PI * 2;
  let normalized = radians % TWO_PI;
  if (normalized > Math.PI) normalized -= TWO_PI;
  else if (normalized < -Math.PI) normalized += TWO_PI;
  return normalized;
}

export function smoothRotation(current: number, target: number, speed: number): number {
  return current + normalizeRotation(target - current) * speed;
}
