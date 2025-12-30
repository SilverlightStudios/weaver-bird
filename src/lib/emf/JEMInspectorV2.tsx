/**
 * JEMInspectorV2 - React-based interactive debugging tool for JEM entity models
 *
 * Uses a custom tree view (Babylon inspector style) for hierarchy navigation
 * and lil-gui for transform controls panel.
 */

import { createRoot, Root } from "react-dom/client";
import { GUI } from "lil-gui";
import * as THREE from "three";
import { JEMTreeView } from "./JEMTreeView";
import styles from "./JEMInspectorV2.module.scss";

interface JEMInspectorConfig {
  scene: THREE.Scene;
  jemData: any;
  rootGroup: THREE.Group;
}

export class JEMInspectorV2 {
  private containerElement: HTMLDivElement;
  private reactRoot: Root;
  private gui: GUI;
  private scene: THREE.Scene;
  private jemData: any;
  private rootGroup: THREE.Group;
  private selectedObject: THREE.Object3D | null = null;
  private currentHighlight: THREE.BoxHelper | null = null;
  private transformControls: {
    state: any;
    changesState: any;
  } | null = null;
  private originalValues: {
    posX: number;
    posY: number;
    posZ: number;
    rotX: number;
    rotY: number;
    rotZ: number;
    scaleX: number;
    scaleY: number;
    scaleZ: number;
  } | null = null;

  constructor(config: JEMInspectorConfig) {
    this.scene = config.scene;
    this.jemData = config.jemData;
    this.rootGroup = config.rootGroup;

    // Create container element
    this.containerElement = document.createElement("div");
    this.containerElement.className = styles.inspectorContainer;
    document.body.appendChild(this.containerElement);

    // Create React root and render tree view
    this.reactRoot = createRoot(this.containerElement);
    this.renderTreeView();

    // Create lil-gui for transform controls
    this.gui = new GUI({
      width: 350,
      title: "Selected Part",
      closeFolders: false,
    });

    this.gui.domElement.style.position = "absolute";
    this.gui.domElement.style.top = "10px";
    this.gui.domElement.style.right = "10px";
    this.gui.domElement.style.zIndex = "1001";

    this.createTransformPanel();
  }

  private renderTreeView() {
    this.reactRoot.render(
      <div className={styles.treeViewWrapper}>
        <JEMTreeView
          rootGroup={this.rootGroup}
          selectedObject={this.selectedObject}
          onSelect={(object) => this.selectPart(object)}
        />
      </div>,
    );
  }

  private createTransformPanel() {
    // Add info message
    const infoState = {
      info: "⚠️ Animations paused in debug mode",
    };
    this.gui.add(infoState, "info").name("").disable();

    // State for selected part
    const state = {
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

    this.gui.add(state, "partName").name("Part Name").disable();

    // Position controls
    const posFolder = this.gui.addFolder("Position (Local)");
    posFolder
      .add(state, "posX", -2, 2, 0.001)
      .name("X")
      .onChange((value: number) => {
        if (this.selectedObject) {
          this.selectedObject.position.x = value;
          this.updateWorldPosition();
          this.updateChangesLog();
          this.updateHighlight();
        }
      });
    posFolder
      .add(state, "posY", -2, 2, 0.001)
      .name("Y")
      .onChange((value: number) => {
        if (this.selectedObject) {
          this.selectedObject.position.y = value;
          this.updateWorldPosition();
          this.updateChangesLog();
          this.updateHighlight();
        }
      });
    posFolder
      .add(state, "posZ", -2, 2, 0.001)
      .name("Z")
      .onChange((value: number) => {
        if (this.selectedObject) {
          this.selectedObject.position.z = value;
          this.updateWorldPosition();
          this.updateChangesLog();
          this.updateHighlight();
        }
      });
    posFolder.open();

    // Inverse axis controls
    const inverseFolder = this.gui.addFolder("Inverse Axis");
    inverseFolder
      .add(state, "inverseX")
      .name("Inverse X")
      .onChange((value: boolean) => {
        if (this.selectedObject) {
          this.selectedObject.scale.x = value
            ? -Math.abs(this.selectedObject.scale.x)
            : Math.abs(this.selectedObject.scale.x);
        }
      });
    inverseFolder
      .add(state, "inverseY")
      .name("Inverse Y")
      .onChange((value: boolean) => {
        if (this.selectedObject) {
          this.selectedObject.scale.y = value
            ? -Math.abs(this.selectedObject.scale.y)
            : Math.abs(this.selectedObject.scale.y);
        }
      });
    inverseFolder
      .add(state, "inverseZ")
      .name("Inverse Z")
      .onChange((value: boolean) => {
        if (this.selectedObject) {
          this.selectedObject.scale.z = value
            ? -Math.abs(this.selectedObject.scale.z)
            : Math.abs(this.selectedObject.scale.z);
        }
      });

    // Rotation controls
    const rotFolder = this.gui.addFolder("Rotation (Degrees)");
    rotFolder
      .add(state, "rotX", -180, 180, 1)
      .name("X")
      .onChange((value: number) => {
        if (this.selectedObject) {
          this.selectedObject.rotation.x = THREE.MathUtils.degToRad(value);
          this.updateChangesLog();
          this.updateHighlight();
        }
      });
    rotFolder
      .add(state, "rotY", -180, 180, 1)
      .name("Y")
      .onChange((value: number) => {
        if (this.selectedObject) {
          this.selectedObject.rotation.y = THREE.MathUtils.degToRad(value);
          this.updateChangesLog();
          this.updateHighlight();
        }
      });
    rotFolder
      .add(state, "rotZ", -180, 180, 1)
      .name("Z")
      .onChange((value: number) => {
        if (this.selectedObject) {
          this.selectedObject.rotation.z = THREE.MathUtils.degToRad(value);
          this.updateChangesLog();
          this.updateHighlight();
        }
      });
    rotFolder.open();

    // Scale controls
    const scaleFolder = this.gui.addFolder("Scale");
    scaleFolder
      .add(state, "scaleX", 0.1, 5, 0.1)
      .name("X")
      .onChange((value: number) => {
        if (this.selectedObject) {
          const sign = this.selectedObject.scale.x < 0 ? -1 : 1;
          this.selectedObject.scale.x = value * sign;
          this.updateChangesLog();
          this.updateHighlight();
        }
      });
    scaleFolder
      .add(state, "scaleY", 0.1, 5, 0.1)
      .name("Y")
      .onChange((value: number) => {
        if (this.selectedObject) {
          const sign = this.selectedObject.scale.y < 0 ? -1 : 1;
          this.selectedObject.scale.y = value * sign;
          this.updateChangesLog();
          this.updateHighlight();
        }
      });
    scaleFolder
      .add(state, "scaleZ", 0.1, 5, 0.1)
      .name("Z")
      .onChange((value: number) => {
        if (this.selectedObject) {
          const sign = this.selectedObject.scale.z < 0 ? -1 : 1;
          this.selectedObject.scale.z = value * sign;
          this.updateChangesLog();
          this.updateHighlight();
        }
      });
    scaleFolder.open();

    // World position (read-only)
    const worldFolder = this.gui.addFolder("World Position (Read-Only)");
    worldFolder.add(state, "worldPosX").name("World X").disable().listen();
    worldFolder.add(state, "worldPosY").name("World Y").disable().listen();
    worldFolder.add(state, "worldPosZ").name("World Z").disable().listen();

    // Changes log
    const changesFolder = this.gui.addFolder("📝 Changes Made");
    const changesState = {
      changes: "No changes yet",
    };
    changesFolder.add(changesState, "changes").name("").disable();
    changesFolder.open();

    // JEM Source Data
    const dataFolder = this.gui.addFolder("📋 JEM Source Data");
    const dataState = {
      copyJSON: () => {
        if (this.selectedObject) {
          const jemPart = this.findJEMPart(this.selectedObject.name);
          if (jemPart) {
            navigator.clipboard.writeText(JSON.stringify(jemPart, null, 2));
            console.log("Copied JEM data:", jemPart);
          }
        }
      },
      showInConsole: () => {
        if (this.selectedObject) {
          const jemPart = this.findJEMPart(this.selectedObject.name);
          if (jemPart) {
            console.log("JEM Part Data:", jemPart);
            console.table({
              id: jemPart.id,
              translateX: jemPart.translate?.[0],
              translateY: jemPart.translate?.[1],
              translateZ: jemPart.translate?.[2],
              invertAxis: jemPart.invertAxis,
              boxes: jemPart.boxes?.length || 0,
              submodels: jemPart.submodels?.length || 0,
            });
          }
        }
      },
    };
    dataFolder.add(dataState, "copyJSON").name("📄 Copy JEM JSON");
    dataFolder.add(dataState, "showInConsole").name("🖥️ Log to Console");

    // Store references
    this.transformControls = {
      state,
      changesState,
    };
  }

  private selectPart(object: THREE.Object3D) {
    console.log("[JEMInspectorV2] Selecting part:", object.name);
    this.selectedObject = object;

    if (!this.transformControls) return;

    // Store original values for change tracking
    this.originalValues = {
      posX: object.position.x,
      posY: object.position.y,
      posZ: object.position.z,
      rotX: THREE.MathUtils.radToDeg(object.rotation.x),
      rotY: THREE.MathUtils.radToDeg(object.rotation.y),
      rotZ: THREE.MathUtils.radToDeg(object.rotation.z),
      scaleX: Math.abs(object.scale.x),
      scaleY: Math.abs(object.scale.y),
      scaleZ: Math.abs(object.scale.z),
    };

    // Update transform panel
    const { state, changesState } = this.transformControls;
    state.partName = object.name || "Unnamed";
    state.posX = object.position.x;
    state.posY = object.position.y;
    state.posZ = object.position.z;
    state.inverseX = object.scale.x < 0;
    state.inverseY = object.scale.y < 0;
    state.inverseZ = object.scale.z < 0;
    state.rotX = THREE.MathUtils.radToDeg(object.rotation.x);
    state.rotY = THREE.MathUtils.radToDeg(object.rotation.y);
    state.rotZ = THREE.MathUtils.radToDeg(object.rotation.z);
    state.scaleX = Math.abs(object.scale.x);
    state.scaleY = Math.abs(object.scale.y);
    state.scaleZ = Math.abs(object.scale.z);

    // Reset changes log
    changesState.changes = "No changes yet";

    // Update GUI display
    this.gui
      .controllersRecursive()
      .forEach((controller) => controller.updateDisplay());

    // Calculate world position
    this.updateWorldPosition();

    // Highlight in 3D scene
    this.highlightPart(object);

    // Re-render tree view to update selection
    this.renderTreeView();
  }

  private updateWorldPosition() {
    if (!this.selectedObject || !this.transformControls) return;

    const worldPos = new THREE.Vector3();
    this.selectedObject.getWorldPosition(worldPos);

    const { state } = this.transformControls;
    state.worldPosX = parseFloat(worldPos.x.toFixed(3));
    state.worldPosY = parseFloat(worldPos.y.toFixed(3));
    state.worldPosZ = parseFloat(worldPos.z.toFixed(3));
  }

  private updateHighlight() {
    if (this.currentHighlight) {
      this.currentHighlight.update();
    }
  }

  private updateChangesLog() {
    if (!this.selectedObject || !this.transformControls || !this.originalValues)
      return;

    const { state, changesState } = this.transformControls;
    const changes: string[] = [];

    // Check position changes
    if (Math.abs(state.posX - this.originalValues.posX) > 0.001) {
      changes.push(
        `Pos X: ${this.originalValues.posX.toFixed(3)} → ${state.posX.toFixed(3)}`,
      );
    }
    if (Math.abs(state.posY - this.originalValues.posY) > 0.001) {
      changes.push(
        `Pos Y: ${this.originalValues.posY.toFixed(3)} → ${state.posY.toFixed(3)}`,
      );
    }
    if (Math.abs(state.posZ - this.originalValues.posZ) > 0.001) {
      changes.push(
        `Pos Z: ${this.originalValues.posZ.toFixed(3)} → ${state.posZ.toFixed(3)}`,
      );
    }

    // Check rotation changes
    if (Math.abs(state.rotX - this.originalValues.rotX) > 0.1) {
      changes.push(
        `Rot X: ${this.originalValues.rotX.toFixed(1)}° → ${state.rotX.toFixed(1)}°`,
      );
    }
    if (Math.abs(state.rotY - this.originalValues.rotY) > 0.1) {
      changes.push(
        `Rot Y: ${this.originalValues.rotY.toFixed(1)}° → ${state.rotY.toFixed(1)}°`,
      );
    }
    if (Math.abs(state.rotZ - this.originalValues.rotZ) > 0.1) {
      changes.push(
        `Rot Z: ${this.originalValues.rotZ.toFixed(1)}° → ${state.rotZ.toFixed(1)}°`,
      );
    }

    // Check scale changes
    if (Math.abs(state.scaleX - this.originalValues.scaleX) > 0.01) {
      changes.push(
        `Scale X: ${this.originalValues.scaleX.toFixed(2)} → ${state.scaleX.toFixed(2)}`,
      );
    }
    if (Math.abs(state.scaleY - this.originalValues.scaleY) > 0.01) {
      changes.push(
        `Scale Y: ${this.originalValues.scaleY.toFixed(2)} → ${state.scaleY.toFixed(2)}`,
      );
    }
    if (Math.abs(state.scaleZ - this.originalValues.scaleZ) > 0.01) {
      changes.push(
        `Scale Z: ${this.originalValues.scaleZ.toFixed(2)} → ${state.scaleZ.toFixed(2)}`,
      );
    }

    // Update changes display
    if (changes.length > 0) {
      changesState.changes = changes.join(", ");
    } else {
      changesState.changes = "No changes yet";
    }

    // Force GUI update
    this.gui
      .controllersRecursive()
      .forEach((controller) => controller.updateDisplay());
  }

  private findJEMPart(name: string): any {
    const searchModels = (models: any[]): any => {
      for (const model of models) {
        if (model.id === name || model.part === name) return model;
        if (model.submodels) {
          const found = searchModels(model.submodels);
          if (found) return found;
        }
      }
      return null;
    };

    return searchModels(this.jemData.models || []);
  }

  private highlightPart(object: THREE.Object3D) {
    // Remove previous highlight
    if (this.currentHighlight) {
      this.currentHighlight.parent?.remove(this.currentHighlight);
      this.currentHighlight.dispose();
      this.currentHighlight = null;
    }

    // Add new highlight
    if (object instanceof THREE.Mesh || object instanceof THREE.Group) {
      this.currentHighlight = new THREE.BoxHelper(object, 0x00ff00);
      this.scene.add(this.currentHighlight);
    }
  }

  dispose() {
    // Clean up highlight
    if (this.currentHighlight) {
      this.currentHighlight.parent?.remove(this.currentHighlight);
      this.currentHighlight.dispose();
      this.currentHighlight = null;
    }

    // Clean up GUI
    this.gui.destroy();

    // Clean up React
    this.reactRoot.unmount();

    // Remove container
    if (this.containerElement.parentNode) {
      this.containerElement.parentNode.removeChild(this.containerElement);
    }
  }
}
