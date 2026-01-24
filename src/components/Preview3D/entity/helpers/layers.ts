/**
 * Overlay layer synchronization helper functions
 */
import * as THREE from "three";
import type { BoneUserData } from "@/lib/emf/types";
import type { LayerGroupEntry } from "../types";
import { resolveBaseBone } from "./bones";

export type { BoneUserData, LayerGroupEntry };

export interface SyncOverlayLayersContext {
  entityGroup: THREE.Group;
  baseBoneMap: Map<string, THREE.Object3D>;
  overlayBoneMaps: Record<string, Map<string, THREE.Object3D>>;
  energySwirlMaterials: THREE.Material[];
  layerBoneRenderOverrides: Record<string, Partial<Record<string, { visible?: boolean }>> | null>;
  layerBoneAliasMaps: Record<string, Record<string, string> | null>;
  layerBonePositionOffsets: Record<string, Partial<Record<string, { x: number; y: number; z: number }>> | null>;
  layerBoneScaleMultipliers: Record<string, Partial<Record<string, { x: number; y: number; z: number }>> | null>;
  overlayAnimatedBones: Record<string, Set<string>>;
  layerGroups: LayerGroupEntry[];
  tmpWorldCopyParentInv: THREE.Matrix4;
  tmpWorldCopyLocal: THREE.Matrix4;
  tmpOverlayPosOffset: THREE.Vector3;
  tmpOverlayScale: THREE.Vector3;
}

/** Update energy swirl UV offsets based on time */
function updateEnergySwirlUVs(materials: THREE.Material[]): void {
  if (materials.length === 0) return;
  const nowSec = performance.now() / 1000;
  for (const mat of materials) {
    const userData = mat.userData as BoneUserData;
    const cfg = userData?.energySwirl;
    const { map } = mat as THREE.MeshStandardMaterial;
    if (cfg && map) {
      map.offset.x = (nowSec * cfg.uPerSec) % 1;
      map.offset.y = (nowSec * cfg.vPerSec) % 1;
    }
  }
}

/** Copy world transform from source to destination object */
function copyWorldTransform(
  src: THREE.Object3D,
  dst: THREE.Object3D,
  tmpParentInv: THREE.Matrix4,
  tmpLocal: THREE.Matrix4,
): void {
  const { parent } = dst;
  if (parent) {
    tmpParentInv.copy(parent.matrixWorld).invert();
    tmpLocal.multiplyMatrices(tmpParentInv, src.matrixWorld);
    tmpLocal.decompose(dst.position, dst.quaternion, dst.scale);
  } else {
    src.matrixWorld.decompose(dst.position, dst.quaternion, dst.scale);
  }
}

/** Apply position offset to a bone */
function applyPositionOffset(
  dst: THREE.Object3D,
  offset: { x: number; y: number; z: number },
  tmpOverlayPosOffset: THREE.Vector3,
): void {
  dst.position.add(tmpOverlayPosOffset.set(offset.x, offset.y, offset.z));
}

/** Apply scale multiplier to a bone */
function applyScaleMultiplier(
  dst: THREE.Object3D,
  multiplier: { x: number; y: number; z: number },
  tmpOverlayScale: THREE.Vector3,
): void {
  dst.scale.multiply(tmpOverlayScale.set(multiplier.x, multiplier.y, multiplier.z));
}

/** Apply visibility overrides to overlay bones */
function applyOverlayVisibilityOverrides(
  overlayBones: Map<string, THREE.Object3D>,
  overrides: Partial<Record<string, { visible?: boolean }>> | null,
): void {
  if (!overrides) return;
  const wildcard = overrides["*"];
  if (wildcard && typeof wildcard.visible === "boolean") {
    for (const [, obj] of overlayBones) {
      obj.visible = wildcard.visible;
    }
  }
  for (const [boneName, props] of Object.entries(overrides)) {
    if (boneName === "*" || !props) continue;
    const obj = overlayBones.get(boneName);
    if (obj && typeof props.visible === "boolean") {
      obj.visible = props.visible;
    }
  }
}

/** Sync a single overlay layer bone to base pose */
function syncOverlayBone(
  name: string,
  dst: THREE.Object3D,
  src: THREE.Object3D | null,
  shouldSync: boolean,
  posOffsets: Partial<Record<string, { x: number; y: number; z: number }>> | null,
  scaleMults: Partial<Record<string, { x: number; y: number; z: number }>> | null,
  tmpWorldCopyParentInv: THREE.Matrix4,
  tmpWorldCopyLocal: THREE.Matrix4,
  tmpOverlayPosOffset: THREE.Vector3,
  tmpOverlayScale: THREE.Vector3,
): void {
  // Sync transform from base bone to overlay bone (matching old behavior)
  if (shouldSync && src) {
    copyWorldTransform(src, dst, tmpWorldCopyParentInv, tmpWorldCopyLocal);
    dst.visible = src.visible;
  }

  // Apply optional position offset from layer config
  const pos = posOffsets?.[name] ?? posOffsets?.["*"];
  if (pos) {
    applyPositionOffset(dst, pos, tmpOverlayPosOffset);
  }

  // Apply optional scale multiplier from layer config
  const mul = scaleMults?.[name] ?? scaleMults?.["*"];
  if (mul) {
    applyScaleMultiplier(dst, mul, tmpOverlayScale);
  }

  // Ensure parent world matrices are correct for child bones processed later
  dst.updateMatrixWorld(false);
}

/** Sync overlay layer bones to base entity pose */
export function syncOverlayLayers(ctx: SyncOverlayLayersContext): void {
  updateEnergySwirlUVs(ctx.energySwirlMaterials);

  for (const layer of ctx.layerGroups) {
    layer.group.position.copy(ctx.entityGroup.position);
    layer.group.rotation.copy(ctx.entityGroup.rotation);
    layer.group.scale.copy(ctx.entityGroup.scale);
    layer.group.updateMatrixWorld(true);

    const overlayBones = ctx.overlayBoneMaps[layer.id];
    if (!overlayBones) continue;

    const overrides = ctx.layerBoneRenderOverrides[layer.id] ?? null;
    const aliasMap = ctx.layerBoneAliasMaps[layer.id] ?? null;
    const posOffsets = ctx.layerBonePositionOffsets[layer.id] ?? null;
    const scaleMults = ctx.layerBoneScaleMultipliers[layer.id] ?? null;
    const animatedBones = ctx.overlayAnimatedBones[layer.id];

    for (const [name, dst] of overlayBones) {
      const shouldSync = !animatedBones || !animatedBones.has(name);
      const src = shouldSync ? resolveBaseBone(name, ctx.baseBoneMap, aliasMap) : null;
      syncOverlayBone(
        name, dst, src, shouldSync, posOffsets, scaleMults,
        ctx.tmpWorldCopyParentInv, ctx.tmpWorldCopyLocal,
        ctx.tmpOverlayPosOffset, ctx.tmpOverlayScale,
      );
    }

    applyOverlayVisibilityOverrides(overlayBones, overrides);
    layer.group.updateMatrixWorld(true);
  }
}
