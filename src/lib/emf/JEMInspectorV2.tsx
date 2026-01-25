/**
 * JEMInspectorV2 - React-based interactive debugging tool for JEM entity models
 *
 * Uses a custom tree view (Babylon inspector style) for hierarchy navigation
 * and lil-gui for transform controls panel.
 */

import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import { GUI } from "lil-gui";
import * as THREE from "three";
import { JEMTreeView } from "./JEMTreeView";
import styles from "./JEMInspectorV2.module.scss";
import type { JEMFile, JEMModelPart } from "./types";
import type {
  JEMInspectorConfig,
  JEMInspectorTransformControls,
} from "./JEMInspectorV2Types";
import { createTransformPanel } from "./JEMInspectorV2Helpers";

export class JEMInspectorV2 {
  private containerElement: HTMLDivElement;
  private reactRoot: Root;
  private gui: GUI;
  private scene: THREE.Scene;
  private jemData: JEMFile;
  private rootGroup: THREE.Group;
  private selectedObject: THREE.Object3D | null = null;
  private currentHighlight: THREE.BoxHelper | null = null;
  private transformControls: JEMInspectorTransformControls | null = null;
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
          onSelect={(object: THREE.Object3D) => this.selectPart(object)}
        />
      </div>,
    );
  }

  private createTransformPanel() {
    this.transformControls = createTransformPanel(this.gui, {
      updateWorldPosition: () => this.updateWorldPosition(),
      updateChangesLog: () => this.updateChangesLog(),
      updateHighlight: () => this.updateHighlight(),
      getSelectedObject: () => this.selectedObject,
      findJEMPart: (name: string) => this.findJEMPart(name),
    });
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

  private findJEMPart(name: string): JEMModelPart | null {
    const searchModels = (models: JEMModelPart[]): JEMModelPart | null => {
      for (const model of models) {
        if (model.id === name || model.part === name) return model;
        if (model.submodels) {
          const found = searchModels(model.submodels);
          if (found) return found;
        }
      }
      return null;
    };

    return searchModels(this.jemData.models ?? []);
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
