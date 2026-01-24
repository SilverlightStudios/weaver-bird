/**
 * Shared types for EntityModel and related hooks
 */
import type * as THREE from "three";
import type { AnimationEngine as AnimationEngineType } from "@lib/emf/animation/AnimationEngine";
import type { AnimationLayer } from "@lib/emf/jemLoader";

export interface EntityModelProps {
  assetId: string;
  positionOffset?: [number, number, number];
  entityTypeOverride?: string;
  parentEntityOverride?: string | null;
}

export interface PackInfo {
  id: string;
  path: string;
  is_zip: boolean;
  pack_format?: number;
}

export interface LayerGroupEntry {
  id: string;
  group: THREE.Group;
  dispose: "materials" | "all";
}

export interface ArmadilloPoseTransition {
  lastPose: "rolled" | "unrolled" | null;
  transition: null | {
    from: "rolled" | "unrolled";
    to: "rolled" | "unrolled";
    startSec: number;
    durSec: number;
  };
}

export interface OverlayEngineSnapshot {
  variables: Record<string, number>;
  randomCache: Array<[number, number]>;
}

export interface EntityModelRefs {
  groupRef: React.RefObject<THREE.Group>;
  animationEngineRef: React.MutableRefObject<AnimationEngineType | null>;
  currentEntityIdRef: React.MutableRefObject<string | undefined>;
  baseBoneMapRef: React.MutableRefObject<Map<string, THREE.Object3D>>;
  overlayBoneMapsRef: React.MutableRefObject<Record<string, Map<string, THREE.Object3D>>>;
  overlayEnginesRef: React.MutableRefObject<Record<string, AnimationEngineType>>;
  overlayEngineSnapshotsRef: React.MutableRefObject<Record<string, OverlayEngineSnapshot>>;
  overlayAnimationLayersRef: React.MutableRefObject<Record<string, AnimationLayer[] | null>>;
  overlayAnimationEntityIdsRef: React.MutableRefObject<Record<string, string | undefined>>;
  overlayAnimatedBonesRef: React.MutableRefObject<Record<string, Set<string>>>;
  layerBoneRenderOverridesRef: React.MutableRefObject<Record<string, Partial<Record<string, { visible?: boolean }>> | null>>;
  layerBoneAliasMapsRef: React.MutableRefObject<Record<string, Record<string, string> | null>>;
  layerBonePositionOffsetsRef: React.MutableRefObject<Record<string, Record<string, { x: number; y: number; z: number }> | null>>;
  layerBoneScaleMultipliersRef: React.MutableRefObject<Record<string, Record<string, { x: number; y: number; z: number }> | null>>;
  energySwirlMaterialsRef: React.MutableRefObject<THREE.Material[]>;
  armadilloPoseTransitionRef: React.MutableRefObject<ArmadilloPoseTransition>;
  layerGroupsRef: React.MutableRefObject<LayerGroupEntry[]>;
}
