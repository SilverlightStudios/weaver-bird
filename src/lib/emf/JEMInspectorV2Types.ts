/**
 * Type definitions for JEMInspectorV2
 */
import type * as THREE from "three";
import type { JEMFile } from "./types";

export interface JEMInspectorConfig {
  scene: THREE.Scene;
  jemData: JEMFile;
  rootGroup: THREE.Group;
}

export interface TransformControlsState {
  partName: string;
  posX: number;
  posY: number;
  posZ: number;
  inverseX: boolean;
  inverseY: boolean;
  inverseZ: boolean;
  rotX: number;
  rotY: number;
  rotZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  worldPosX: number;
  worldPosY: number;
  worldPosZ: number;
}

export interface ChangesState {
  changes: string;
}

export interface JEMInspectorTransformControls {
  state: TransformControlsState;
  changesState: ChangesState;
}
