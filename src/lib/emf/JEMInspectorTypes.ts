/**
 * Type definitions for JEMInspector
 */
import type { Controller } from "lil-gui";
import type * as THREE from "three";
import type { JEMFile } from "./jemLoader";

export interface JEMInspectorConfig {
  scene: THREE.Scene;
  jemData: JEMFile; // Original JEM file data
  rootGroup: THREE.Group; // Root entity group from jemToThreeJS
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
  posXCtrl: Controller;
  posYCtrl: Controller;
  posZCtrl: Controller;
  rotXCtrl: Controller;
  rotYCtrl: Controller;
  rotZCtrl: Controller;
  changesState: ChangesState;
}
