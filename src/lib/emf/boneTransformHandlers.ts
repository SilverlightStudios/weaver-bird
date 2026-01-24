import type * as THREE from "three";
import type { BoneWithUserData } from "./types";

interface BoneTransformContext {
  obj: THREE.Group;
  isQuadruped: boolean;
  hasHorseFamilyRig: boolean;
  hasNegativeHead2TyBaseline: boolean;
}

function mergeAbsoluteAxes(existing: string, want: string): string {
  return want.split("").reduce((acc, axis) => (acc.includes(axis) ? acc : acc + axis), existing);
}

function getExistingAbsoluteAxes(userData: Record<string, unknown>): string {
  return typeof userData.absoluteTranslationAxes === "string"
    ? (userData.absoluteTranslationAxes as string)
    : "";
}

export function applyEyesTransform(obj: THREE.Group): void {
  if (obj.name !== "eyes") return;
  const existing = getExistingAbsoluteAxes(obj.userData);
  obj.userData.absoluteTranslationAxes = existing.includes("z") ? existing : `${existing}z`;
  obj.userData.absoluteTranslationSpace = "local";
}

export function applyBodyRotationTransform(obj: THREE.Group): void {
  if (obj.name !== "body_rotation" || obj.parent?.name !== "body") return;
  obj.userData.absoluteTranslationAxes = "z";
  obj.userData.cemYOriginPx = 0;
}

export function applyEyeTransform(obj: THREE.Group): void {
  if (!["left_eye", "right_eye"].includes(obj.name)) return;
  if (!["head2", "eyes"].includes(obj.parent?.name ?? "")) return;

  const existing = getExistingAbsoluteAxes(obj.userData);
  obj.userData.absoluteTranslationAxes = mergeAbsoluteAxes(existing, "xyz");
  obj.userData.absoluteTranslationSpace = "local";

  const parentOriginPx = Array.isArray((obj.parent as BoneWithUserData | null)?.userData?.originPx)
    ? ((obj.parent as BoneWithUserData).userData.originPx as [number, number, number])
    : null;
  if (parentOriginPx) obj.userData.cemYOriginPx = parentOriginPx[1];
}

export function applyMouthTransform(obj: THREE.Group): void {
  if (obj.name !== "mouth" || obj.parent?.name !== "snout") return;

  const existing = getExistingAbsoluteAxes(obj.userData);
  obj.userData.absoluteTranslationAxes = mergeAbsoluteAxes(existing, "xyz");
  obj.userData.absoluteTranslationSpace = "local";
}

export function applyCoatTransform(obj: THREE.Group, isQuadruped: boolean): void {
  if (!isQuadruped || obj.name !== "coat" || obj.parent?.name !== "body") return;

  const existing = getExistingAbsoluteAxes(obj.userData);
  obj.userData.absoluteTranslationAxes = mergeAbsoluteAxes(existing, "y");
  obj.userData.cemYOriginPx = 0;
}

export function applyHorseNeck2Transform(obj: THREE.Group, hasHorseFamilyRig: boolean): void {
  if (!hasHorseFamilyRig || obj.name !== "neck2" || obj.parent?.name !== "body") return;

  const existing = getExistingAbsoluteAxes(obj.userData);
  obj.userData.absoluteTranslationAxes = mergeAbsoluteAxes(existing, "yz");
  obj.userData.cemYOriginPx = 0;
}

export function applyHorseTail2Transform(obj: THREE.Group, hasHorseFamilyRig: boolean): void {
  if (!hasHorseFamilyRig || obj.name !== "tail2" || obj.parent?.name !== "body") return;

  const existing = getExistingAbsoluteAxes(obj.userData);
  obj.userData.absoluteTranslationAxes = mergeAbsoluteAxes(existing, "y");
  obj.userData.cemYOriginPx = 0;
}

export function applyHeadpieceNeckTransform(obj: THREE.Group): void {
  if (obj.name !== "headpiece_neck" || obj.parent?.name !== "saddle") return;

  const existing = getExistingAbsoluteAxes(obj.userData);
  obj.userData.absoluteTranslationAxes = mergeAbsoluteAxes(existing, "yz");
  obj.userData.cemYOriginPx = 0;
}

export function applySnoutTransform(obj: THREE.Group): void {
  const isSnout2 = obj.name === "snout2" && obj.parent?.name === "head2";
  const isHeadpieceSnout = obj.name === "headpiece_snout" && obj.parent?.name === "headpiece_head";
  if (!isSnout2 && !isHeadpieceSnout) return;

  const existing = getExistingAbsoluteAxes(obj.userData);
  obj.userData.absoluteTranslationAxes = mergeAbsoluteAxes(existing, "y");
  obj.userData.absoluteTranslationSpace = "local";
}

export function applyPupilTransform(obj: THREE.Group): void {
  if (!obj.name.endsWith("_pupil")) return;
  if (!["right_eye", "left_eye"].includes(obj.parent?.name ?? "")) return;

  const existing = getExistingAbsoluteAxes(obj.userData);
  obj.userData.absoluteTranslationAxes = mergeAbsoluteAxes(existing, "xyz");
  obj.userData.absoluteTranslationSpace = "local";
}

export function applyNoseTusksTransform(obj: THREE.Group): void {
  if (!["nose", "tusks"].includes(obj.name)) return;
  if (!["head", "head2"].includes(obj.parent?.name ?? "")) return;

  const existing = getExistingAbsoluteAxes(obj.userData);
  obj.userData.absoluteTranslationAxes = mergeAbsoluteAxes(existing, "y");
  obj.userData.absoluteTranslationSpace = "local";
}

export function applyCatTail3Transform(obj: THREE.Group): void {
  if (obj.name !== "tail3" || obj.parent?.name !== "body") return;

  const existing = getExistingAbsoluteAxes(obj.userData);
  obj.userData.absoluteTranslationAxes = mergeAbsoluteAxes(existing, "yz");
  obj.userData.cemYOriginPx = 0;
}

export function applyQuadrupedHead2Transform(
  obj: THREE.Group,
  isQuadruped: boolean,
  hasNegativeHead2TyBaseline: boolean,
): void {
  if (!isQuadruped || obj.name !== "head2" || obj.parent?.name !== "body") return;

  const isBodyRotationRig =
    Array.isArray(obj.parent?.children) &&
    obj.parent.children.some((c) => c.name === "body_rotation");

  if (isBodyRotationRig || !hasNegativeHead2TyBaseline) return;

  const existing = getExistingAbsoluteAxes(obj.userData);
  obj.userData.absoluteTranslationAxes = mergeAbsoluteAxes(existing, "xyz");
  obj.userData.cemYOriginPx = 0;
}

export function applyBoneTransformHandlers(context: BoneTransformContext): void {
  const { obj, isQuadruped, hasHorseFamilyRig, hasNegativeHead2TyBaseline } = context;

  applyEyesTransform(obj);
  applyBodyRotationTransform(obj);
  applyEyeTransform(obj);
  applyMouthTransform(obj);
  applyCoatTransform(obj, isQuadruped);
  applyHorseNeck2Transform(obj, hasHorseFamilyRig);
  applyHorseTail2Transform(obj, hasHorseFamilyRig);
  applyHeadpieceNeckTransform(obj);
  applySnoutTransform(obj);
  applyPupilTransform(obj);
  applyNoseTusksTransform(obj);
  applyCatTail3Transform(obj);
  applyQuadrupedHead2Transform(obj, isQuadruped, hasNegativeHead2TyBaseline);
}
