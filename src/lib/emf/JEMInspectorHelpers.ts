/**
 * Helper functions for JEMInspector transform panel creation and utilities
 */
import type { GUI } from "lil-gui";
import * as THREE from "three";
import type {
  TransformControlsState,
  ChangesState,
  JEMInspectorTransformControls,
} from "./JEMInspectorTypes";

interface TransformPanelCallbacks {
  updateWorldPosition: () => void;
  updateChangesLog: () => void;
  getSelectedPart: () => THREE.Object3D | null;
}

export function createTransformPanel(
  folder: GUI,
  callbacks: TransformPanelCallbacks
): JEMInspectorTransformControls {
  // Add info message
  const infoState = {
    info: "⚠️ Animations paused in debug mode",
  };
  folder.add(infoState, "info").name("").disable();

  // State that will be updated when a part is selected
  const state: TransformControlsState = {
    partName: "None selected",
    posX: 0,
    posY: 0,
    posZ: 0,
    inverseX: false,
    inverseY: false,
    inverseZ: false,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    worldPosX: 0,
    worldPosY: 0,
    worldPosZ: 0,
  };

  folder.add(state, "partName").name("Selected Part").disable();

  // Position controls
  const posFolder = folder.addFolder("Position (Local)");
  const posXCtrl = posFolder
    .add(state, "posX", -1, 1, 0.001)
    .name("X")
    .onChange((value: number) => {
      const part = callbacks.getSelectedPart();
      if (part) {
        part.position.x = value;
        callbacks.updateWorldPosition();
        callbacks.updateChangesLog();
      }
    });
  const posYCtrl = posFolder
    .add(state, "posY", -1, 1, 0.001)
    .name("Y")
    .onChange((value: number) => {
      const part = callbacks.getSelectedPart();
      if (part) {
        part.position.y = value;
        callbacks.updateWorldPosition();
        callbacks.updateChangesLog();
      }
    });
  const posZCtrl = posFolder
    .add(state, "posZ", -1, 1, 0.001)
    .name("Z")
    .onChange((value: number) => {
      const part = callbacks.getSelectedPart();
      if (part) {
        part.position.z = value;
        callbacks.updateWorldPosition();
        callbacks.updateChangesLog();
      }
    });

  // Inverse axis controls
  const inverseFolder = folder.addFolder("Inverse Axis");
  addInverseAxisControls(inverseFolder, state, callbacks);

  // Rotation controls
  const rotFolder = folder.addFolder("Rotation (Degrees)");
  const rotXCtrl = rotFolder
    .add(state, "rotX", -180, 180, 1)
    .name("X")
    .onChange((value: number) => {
      const part = callbacks.getSelectedPart();
      if (part) {
        part.rotation.x = THREE.MathUtils.degToRad(value);
        callbacks.updateChangesLog();
      }
    });
  const rotYCtrl = rotFolder
    .add(state, "rotY", -180, 180, 1)
    .name("Y")
    .onChange((value: number) => {
      const part = callbacks.getSelectedPart();
      if (part) {
        part.rotation.y = THREE.MathUtils.degToRad(value);
        callbacks.updateChangesLog();
      }
    });
  const rotZCtrl = rotFolder
    .add(state, "rotZ", -180, 180, 1)
    .name("Z")
    .onChange((value: number) => {
      const part = callbacks.getSelectedPart();
      if (part) {
        part.rotation.z = THREE.MathUtils.degToRad(value);
        callbacks.updateChangesLog();
      }
    });

  // Scale controls
  const scaleFolder = folder.addFolder("Scale");
  addScaleControls(scaleFolder, state, callbacks);

  // World position (read-only)
  const worldFolder = folder.addFolder("World Position (Read-Only)");
  worldFolder.add(state, "worldPosX").name("World X").disable().listen();
  worldFolder.add(state, "worldPosY").name("World Y").disable().listen();
  worldFolder.add(state, "worldPosZ").name("World Z").disable().listen();

  // Changes log
  const changesFolder = folder.addFolder("📝 Changes Made");
  const changesState: ChangesState = {
    changes: "No changes yet",
  };
  changesFolder.add(changesState, "changes").name("").disable();

  return {
    state,
    posXCtrl,
    posYCtrl,
    posZCtrl,
    rotXCtrl,
    rotYCtrl,
    rotZCtrl,
    changesState,
  };
}

function addInverseAxisControls(
  folder: GUI,
  state: TransformControlsState,
  callbacks: TransformPanelCallbacks
) {
  folder
    .add(state, "inverseX")
    .name("Inverse X")
    .onChange((value: boolean) => {
      const part = callbacks.getSelectedPart();
      if (part) {
        part.scale.x = value
          ? -Math.abs(part.scale.x)
          : Math.abs(part.scale.x);
      }
    });
  folder
    .add(state, "inverseY")
    .name("Inverse Y")
    .onChange((value: boolean) => {
      const part = callbacks.getSelectedPart();
      if (part) {
        part.scale.y = value
          ? -Math.abs(part.scale.y)
          : Math.abs(part.scale.y);
      }
    });
  folder
    .add(state, "inverseZ")
    .name("Inverse Z")
    .onChange((value: boolean) => {
      const part = callbacks.getSelectedPart();
      if (part) {
        part.scale.z = value
          ? -Math.abs(part.scale.z)
          : Math.abs(part.scale.z);
      }
    });
}

function addScaleControls(
  folder: GUI,
  state: TransformControlsState,
  callbacks: TransformPanelCallbacks
) {
  folder
    .add(state, "scaleX", 0.1, 5, 0.1)
    .name("X")
    .onChange((value: number) => {
      const part = callbacks.getSelectedPart();
      if (part) {
        part.scale.x = value;
        callbacks.updateChangesLog();
      }
    });
  folder
    .add(state, "scaleY", 0.1, 5, 0.1)
    .name("Y")
    .onChange((value: number) => {
      const part = callbacks.getSelectedPart();
      if (part) {
        part.scale.y = value;
        callbacks.updateChangesLog();
      }
    });
  folder
    .add(state, "scaleZ", 0.1, 5, 0.1)
    .name("Z")
    .onChange((value: number) => {
      const part = callbacks.getSelectedPart();
      if (part) {
        part.scale.z = value;
        callbacks.updateChangesLog();
      }
    });
}

// Re-export utility functions from JEMInspectorUtils
export { findJEMPart, calculateChanges } from "./JEMInspectorUtils";
