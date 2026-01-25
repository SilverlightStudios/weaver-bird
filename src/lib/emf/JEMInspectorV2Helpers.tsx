/**
 * Helper functions for JEMInspectorV2 transform panel creation
 */
import type { GUI } from "lil-gui";
import * as THREE from "three";
import type { TransformControlsState, ChangesState, JEMInspectorTransformControls } from "./JEMInspectorV2Types";

interface TransformPanelCallbacks {
  updateWorldPosition: () => void;
  updateChangesLog: () => void;
  updateHighlight: () => void;
  getSelectedObject: () => THREE.Object3D | null;
  findJEMPart: (name: string) => unknown;
}

export function createTransformPanel(
  gui: GUI,
  callbacks: TransformPanelCallbacks
): JEMInspectorTransformControls {
  // Add info message
  const infoState = { info: "⚠️ Animations paused in debug mode" };
  gui.add(infoState, "info").name("").disable();

  // State for selected part
  const state: TransformControlsState = {
    partName: "None selected",
    posX: 0, posY: 0, posZ: 0,
    inverseX: false, inverseY: false, inverseZ: false,
    rotX: 0, rotY: 0, rotZ: 0,
    scaleX: 1, scaleY: 1, scaleZ: 1,
    worldPosX: 0, worldPosY: 0, worldPosZ: 0,
  };

  gui.add(state, "partName").name("Part Name").disable();

  // Position controls
  const posFolder = gui.addFolder("Position (Local)");
  addPositionControls(posFolder, state, callbacks);
  posFolder.open();

  // Inverse axis controls
  const inverseFolder = gui.addFolder("Inverse Axis");
  addInverseAxisControls(inverseFolder, state, callbacks);

  // Rotation controls
  const rotFolder = gui.addFolder("Rotation (Degrees)");
  addRotationControls(rotFolder, state, callbacks);
  rotFolder.open();

  // Scale controls
  const scaleFolder = gui.addFolder("Scale");
  addScaleControls(scaleFolder, state, callbacks);
  scaleFolder.open();

  // World position (read-only)
  const worldFolder = gui.addFolder("World Position (Read-Only)");
  worldFolder.add(state, "worldPosX").name("World X").disable().listen();
  worldFolder.add(state, "worldPosY").name("World Y").disable().listen();
  worldFolder.add(state, "worldPosZ").name("World Z").disable().listen();

  // Changes log
  const changesFolder = gui.addFolder("📝 Changes Made");
  const changesState: ChangesState = { changes: "No changes yet" };
  changesFolder.add(changesState, "changes").name("").disable();
  changesFolder.open();

  // JEM Source Data
  addJEMDataFolder(gui, callbacks);

  return { state, changesState };
}

function addPositionControls(
  folder: GUI,
  state: TransformControlsState,
  callbacks: TransformPanelCallbacks
) {
  folder.add(state, "posX", -2, 2, 0.001).name("X").onChange((value: number) => {
    const obj = callbacks.getSelectedObject();
    if (obj) {
      obj.position.x = value;
      callbacks.updateWorldPosition();
      callbacks.updateChangesLog();
      callbacks.updateHighlight();
    }
  });
  folder.add(state, "posY", -2, 2, 0.001).name("Y").onChange((value: number) => {
    const obj = callbacks.getSelectedObject();
    if (obj) {
      obj.position.y = value;
      callbacks.updateWorldPosition();
      callbacks.updateChangesLog();
      callbacks.updateHighlight();
    }
  });
  folder.add(state, "posZ", -2, 2, 0.001).name("Z").onChange((value: number) => {
    const obj = callbacks.getSelectedObject();
    if (obj) {
      obj.position.z = value;
      callbacks.updateWorldPosition();
      callbacks.updateChangesLog();
      callbacks.updateHighlight();
    }
  });
}

function addInverseAxisControls(
  folder: GUI,
  state: TransformControlsState,
  callbacks: TransformPanelCallbacks
) {
  folder.add(state, "inverseX").name("Inverse X").onChange((value: boolean) => {
    const obj = callbacks.getSelectedObject();
    if (obj) {
      obj.scale.x = value ? -Math.abs(obj.scale.x) : Math.abs(obj.scale.x);
    }
  });
  folder.add(state, "inverseY").name("Inverse Y").onChange((value: boolean) => {
    const obj = callbacks.getSelectedObject();
    if (obj) {
      obj.scale.y = value ? -Math.abs(obj.scale.y) : Math.abs(obj.scale.y);
    }
  });
  folder.add(state, "inverseZ").name("Inverse Z").onChange((value: boolean) => {
    const obj = callbacks.getSelectedObject();
    if (obj) {
      obj.scale.z = value ? -Math.abs(obj.scale.z) : Math.abs(obj.scale.z);
    }
  });
}

function addRotationControls(
  folder: GUI,
  state: TransformControlsState,
  callbacks: TransformPanelCallbacks
) {
  folder.add(state, "rotX", -180, 180, 1).name("X").onChange((value: number) => {
    const obj = callbacks.getSelectedObject();
    if (obj) {
      obj.rotation.x = THREE.MathUtils.degToRad(value);
      callbacks.updateChangesLog();
      callbacks.updateHighlight();
    }
  });
  folder.add(state, "rotY", -180, 180, 1).name("Y").onChange((value: number) => {
    const obj = callbacks.getSelectedObject();
    if (obj) {
      obj.rotation.y = THREE.MathUtils.degToRad(value);
      callbacks.updateChangesLog();
      callbacks.updateHighlight();
    }
  });
  folder.add(state, "rotZ", -180, 180, 1).name("Z").onChange((value: number) => {
    const obj = callbacks.getSelectedObject();
    if (obj) {
      obj.rotation.z = THREE.MathUtils.degToRad(value);
      callbacks.updateChangesLog();
      callbacks.updateHighlight();
    }
  });
}

function addScaleControls(
  folder: GUI,
  state: TransformControlsState,
  callbacks: TransformPanelCallbacks
) {
  folder.add(state, "scaleX", 0.1, 5, 0.1).name("X").onChange((value: number) => {
    const obj = callbacks.getSelectedObject();
    if (obj) {
      const sign = obj.scale.x < 0 ? -1 : 1;
      obj.scale.x = value * sign;
      callbacks.updateChangesLog();
      callbacks.updateHighlight();
    }
  });
  folder.add(state, "scaleY", 0.1, 5, 0.1).name("Y").onChange((value: number) => {
    const obj = callbacks.getSelectedObject();
    if (obj) {
      const sign = obj.scale.y < 0 ? -1 : 1;
      obj.scale.y = value * sign;
      callbacks.updateChangesLog();
      callbacks.updateHighlight();
    }
  });
  folder.add(state, "scaleZ", 0.1, 5, 0.1).name("Z").onChange((value: number) => {
    const obj = callbacks.getSelectedObject();
    if (obj) {
      const sign = obj.scale.z < 0 ? -1 : 1;
      obj.scale.z = value * sign;
      callbacks.updateChangesLog();
      callbacks.updateHighlight();
    }
  });
}

function addJEMDataFolder(gui: GUI, callbacks: TransformPanelCallbacks) {
  const dataFolder = gui.addFolder("📋 JEM Source Data");
  const dataState = {
    copyJSON: () => {
      const obj = callbacks.getSelectedObject();
      if (obj) {
        const jemPart = callbacks.findJEMPart(obj.name);
        if (jemPart) {
          void navigator.clipboard.writeText(JSON.stringify(jemPart, null, 2));
          console.log("Copied JEM data:", jemPart);
        }
      }
    },
    showInConsole: () => {
      const obj = callbacks.getSelectedObject();
      if (obj) {
        const jemPart = callbacks.findJEMPart(obj.name) as Record<string, unknown> | undefined;
        if (jemPart) {
          console.log("JEM Part Data:", jemPart);
          console.table({
            id: jemPart.id,
            translateX: Array.isArray(jemPart.translate) ? jemPart.translate[0] : undefined,
            translateY: Array.isArray(jemPart.translate) ? jemPart.translate[1] : undefined,
            translateZ: Array.isArray(jemPart.translate) ? jemPart.translate[2] : undefined,
            invertAxis: jemPart.invertAxis,
            boxes: Array.isArray(jemPart.boxes) ? jemPart.boxes.length : 0,
            submodels: Array.isArray(jemPart.submodels) ? jemPart.submodels.length : 0,
          });
        }
      }
    },
  };
  dataFolder.add(dataState, "copyJSON").name("📄 Copy JEM JSON");
  dataFolder.add(dataState, "showInConsole").name("🖥️ Log to Console");
}
