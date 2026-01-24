/**
 * Rest Bone Values Builder
 *
 * Builds rest-pose bone values in CEM space for seeding animation context.
 * These values ensure expressions that read other bones see meaningful defaults.
 */

import type * as THREE from "three";
import type { BoneWithUserData } from "@/lib/emf/types";

type BoneMap = Map<string, THREE.Object3D>;
type BaseTransformMap = Map<string, { position: THREE.Vector3; rotation: THREE.Euler; scale: THREE.Vector3 }>;

/** CEM Y origin in pixels (Minecraft coordinate space) */
const CEM_Y_ORIGIN_PX = 24;

interface TranslationSeedConfig {
  reads: Set<"tx" | "ty" | "tz"> | undefined;
  pivots: Set<"tx" | "ty" | "tz">;
  localPxX: number;
  localPxY: number;
  localPxZ: number;
  invertAxis: string;
  isRoot: boolean;
}

function getInvertAxis(bone: THREE.Object3D): string {
  return typeof (bone as BoneWithUserData).userData?.invertAxis === "string"
    ? ((bone as BoneWithUserData).userData.invertAxis as string)
    : "";
}

function getLocalPixelCoords(position: THREE.Vector3): { x: number; y: number; z: number } {
  return {
    x: position.x * 16,
    y: position.y * 16,
    z: position.z * 16,
  };
}

function computeTxValue(
  localPxX: number,
  invertAxis: string,
  shouldSeed: boolean,
): number {
  if (!shouldSeed) return 0;
  return invertAxis.includes("x") ? -localPxX : localPxX;
}

function computeTzValue(
  localPxZ: number,
  invertAxis: string,
  shouldSeed: boolean,
): number {
  if (!shouldSeed) return 0;
  return invertAxis.includes("z") ? -localPxZ : localPxZ;
}

function computeTyValue(
  localPxY: number,
  invertAxis: string,
  shouldSeed: boolean,
  isRoot: boolean,
): number {
  if (!shouldSeed) return 0;

  if (!isRoot) {
    return invertAxis.includes("y") ? -localPxY : localPxY;
  }

  if (invertAxis.includes("y")) {
    return CEM_Y_ORIGIN_PX - localPxY;
  }
  return localPxY + CEM_Y_ORIGIN_PX;
}

function seedTranslationChannels(
  rest: Record<string, number>,
  config: TranslationSeedConfig,
): void {
  const { reads, pivots, localPxX, localPxY, localPxZ, invertAxis, isRoot } = config;

  if (!reads || reads.size === 0) return;

  if (reads.has("tx")) {
    rest.tx = computeTxValue(localPxX, invertAxis, pivots.has("tx"));
  }

  if (reads.has("tz")) {
    rest.tz = computeTzValue(localPxZ, invertAxis, pivots.has("tz"));
  }

  if (reads.has("ty")) {
    const shouldSeed = pivots.has("ty") || (isRoot && Math.abs(localPxY) >= 10);
    rest.ty = computeTyValue(localPxY, invertAxis, shouldSeed, isRoot);
  }
}

function processRootPivotOnlyBone(
  rest: Record<string, number>,
  config: TranslationSeedConfig,
): void {
  seedTranslationChannels(rest, config);
}

function processNonRootPivotOnlyBone(
  rest: Record<string, number>,
  localPxX: number,
  localPxY: number,
  localPxZ: number,
  invertAxis: string,
): void {
  rest.tx = invertAxis.includes("x") ? -localPxX : localPxX;
  rest.tz = invertAxis.includes("z") ? -localPxZ : localPxZ;
  rest.ty = invertAxis.includes("y") ? -localPxY : localPxY;
}

function processGeometryBone(
  rest: Record<string, number>,
  config: TranslationSeedConfig,
): void {
  seedTranslationChannels(rest, config);
}

function getOriginPx(bone: THREE.Object3D): [number, number, number] | null {
  return Array.isArray((bone as BoneWithUserData).userData?.originPx)
    ? ((bone as BoneWithUserData).userData.originPx as [number, number, number])
    : null;
}

function hasLocalBoxes(bone: THREE.Object3D): boolean {
  const boxesGroup = (bone as BoneWithUserData).userData?.boxesGroup as THREE.Object3D | undefined;
  return !!boxesGroup && boxesGroup.children.length > 0;
}

function createBaseBoneValues(
  bone: THREE.Object3D,
  base: { position: THREE.Vector3; rotation: THREE.Euler; scale: THREE.Vector3 } | undefined,
): Record<string, number> {
  return {
    tx: 0,
    ty: 0,
    tz: 0,
    rx: base?.rotation.x ?? 0,
    ry: base?.rotation.y ?? 0,
    rz: base?.rotation.z ?? 0,
    sx: base?.scale.x ?? 1,
    sy: base?.scale.y ?? 1,
    sz: base?.scale.z ?? 1,
    visible: bone.visible ? 1 : 0,
  };
}

interface ProcessBoneParams {
  bone: THREE.Object3D;
  name: string;
  base: { position: THREE.Vector3; rotation: THREE.Euler; scale: THREE.Vector3 } | undefined;
  modelGroup: THREE.Group;
  selfReads: Map<string, Set<"tx" | "ty" | "tz">>;
  pivotSeeds: Map<string, Set<"tx" | "ty" | "tz">>;
  rest: Record<string, number>;
}

function processPivotOnlyBone(params: ProcessBoneParams): void {
  const { bone, name, base, modelGroup, selfReads, pivotSeeds, rest } = params;
  if (!base) return;

  const isRoot = bone.parent === modelGroup;
  const reads = selfReads.get(name);
  const pivots = pivotSeeds.get(name) ?? new Set<"tx" | "ty" | "tz">();
  const invertAxis = getInvertAxis(bone);
  const { x: localPxX, y: localPxY, z: localPxZ } = getLocalPixelCoords(base.position);

  if (isRoot) {
    processRootPivotOnlyBone(rest, {
      reads,
      pivots,
      localPxX,
      localPxY,
      localPxZ,
      invertAxis,
      isRoot,
    });
  } else {
    processNonRootPivotOnlyBone(rest, localPxX, localPxY, localPxZ, invertAxis);
  }
}

function processBoneWithOrigin(params: ProcessBoneParams, baseTransforms: BaseTransformMap): void {
  const { bone, name, modelGroup, selfReads, pivotSeeds, rest } = params;
  const reads = selfReads.get(name);
  if (!reads || reads.size === 0) return;

  const pivots = pivotSeeds.get(name) ?? new Set<"tx" | "ty" | "tz">();
  const invertAxis = getInvertAxis(bone);
  const baseLocal = baseTransforms.get(name)?.position;
  const { x: localPxX, y: localPxY, z: localPxZ } = baseLocal
    ? getLocalPixelCoords(baseLocal)
    : { x: 0, y: 0, z: 0 };
  const isRoot = bone.parent === modelGroup;

  processGeometryBone(rest, {
    reads,
    pivots,
    localPxX,
    localPxY,
    localPxZ,
    invertAxis,
    isRoot,
  });
}

/**
 * Build rest-pose bone values in CEM space.
 * Used to seed `context.boneValues` so expressions that read other bones
 * see meaningful defaults even when those bones are never assigned in JPM.
 */
export function buildRestBoneValues(
  bones: BoneMap,
  baseTransforms: BaseTransformMap,
  modelGroup: THREE.Group,
  selfReads: Map<string, Set<"tx" | "ty" | "tz">> = new Map(),
  pivotSeeds: Map<string, Set<"tx" | "ty" | "tz">> = new Map(),
): Record<string, Record<string, number>> {
  const rest: Record<string, Record<string, number>> = {};

  for (const [name, bone] of bones) {
    const base = baseTransforms.get(name);
    const boneValues = createBaseBoneValues(bone, base);
    rest[name] = boneValues;

    const params: ProcessBoneParams = {
      bone,
      name,
      base,
      modelGroup,
      selfReads,
      pivotSeeds,
      rest: boneValues,
    };

    if (!hasLocalBoxes(bone)) {
      processPivotOnlyBone(params);
    } else if (getOriginPx(bone)) {
      processBoneWithOrigin(params, baseTransforms);
    }
  }

  return rest;
}

/**
 * Clone rest bone values for use in a new context.
 */
export function cloneRestBoneValues(
  restBoneValues: Record<string, Record<string, number>>,
): Record<string, Record<string, number>> {
  const clone: Record<string, Record<string, number>> = {};
  for (const [boneName, values] of Object.entries(restBoneValues)) {
    clone[boneName] = { ...values };
  }
  return clone;
}
