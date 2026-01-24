/**
 * JEMInspector - Interactive debugging tool for JEM entity models
 *
 * Provides a GUI for inspecting and modifying JEM model parts in real-time.
 * Uses lil-gui to create an interactive panel with:
 * - Hierarchical model part tree
 * - Live transform editing (position, rotation, scale)
 * - JEM source data viewing
 * - Comparison between JEM data and Three.js transforms
 * - Export corrected JEM files
 */

import { GUI } from "lil-gui";
import * as THREE from "three";
import type { JEMFile } from "./jemLoader";
import type {
  JEMInspectorConfig,
  JEMInspectorTransformControls,
} from "./JEMInspectorTypes";
import {
  createTransformPanel,
  findJEMPart,
  calculateChanges,
} from "./JEMInspectorHelpers";
import {
  buildHierarchyTree,
  createDataPanel,
  createComparisonPanel,
} from "./JEMInspectorPanels";

export class JEMInspector {
  private gui: GUI;
  private scene: THREE.Scene;
  private jemData: JEMFile;
  private rootGroup: THREE.Group;
  private selectedPart: THREE.Object3D | null = null;
  private currentHighlight: THREE.BoxHelper | null = null;
  private selectedFolder: GUI | null = null;
  private folderLabels: Map<GUI, string> = new Map();
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

    // Create main GUI
    this.gui = new GUI({
      width: 400,
      title: "JEM Model Inspector",
      closeFolders: false,
    });

    // Position in top-right corner
    this.gui.domElement.style.position = "absolute";
    this.gui.domElement.style.top = "10px";
    this.gui.domElement.style.right = "10px";
    this.gui.domElement.style.zIndex = "1000";

    this.createPanels();
  }

  private createPanels() {
    this.createHierarchyPanel();
    this.createDataPanel();
    this.createTransformPanel();
    this.createComparisonPanel();
  }

  /**
   * Create hierarchical tree view of model parts
   */
  private createHierarchyPanel() {
    const hierarchyFolder = this.gui.addFolder("📁 Model Hierarchy");
    hierarchyFolder.open();

    // Build tree from root group
    buildHierarchyTree(this.rootGroup, hierarchyFolder, 0, {
      selectPart: (part) => this.selectPart(part),
      getSelectedFolder: () => this.selectedFolder,
      setSelectedFolder: (folder) => {
        this.selectedFolder = folder;
      },
      getFolderLabel: (folder) => this.folderLabels.get(folder),
      setFolderLabel: (folder, label) => this.folderLabels.set(folder, label),
    });
  }

  /**
   * Create panel for viewing JEM source data
   */
  private createDataPanel() {
    const dataFolder = this.gui.addFolder("📋 JEM Source Data");

    createDataPanel(dataFolder, {
      getSelectedPart: () => this.selectedPart,
      findJEMPart: (name) => this.findJEMPart(name),
    });
  }

  /**
   * Create panel for live transform editing
   */
  private createTransformPanel() {
    const transformFolder = this.gui.addFolder("🔧 Live Transforms");

    this.transformControls = createTransformPanel(transformFolder, {
      updateWorldPosition: () => this.updateWorldPosition(),
      updateChangesLog: () => this.updateChangesLog(),
      getSelectedPart: () => this.selectedPart,
    });
  }

  /**
   * Create panel for comparing JEM vs Three.js data
   */
  private createComparisonPanel() {
    const compFolder = this.gui.addFolder("🔍 JEM vs Three.js Comparison");

    createComparisonPanel(compFolder, {
      getSelectedPart: () => this.selectedPart,
      findJEMPart: (name) => this.findJEMPart(name),
      exportToJEMFormat: () => this.exportToJEMFormat(),
    });
  }

  /**
   * Select a part for inspection
   */
  private selectPart(part: THREE.Object3D) {
    console.log(`[JEMInspector] selectPart called with:`, part.name);
    this.selectedPart = part;

    if (!this.transformControls) {
      console.warn("[JEMInspector] No transform controls available");
      return;
    }

    // Store original values for change tracking
    this.originalValues = {
      posX: part.position.x,
      posY: part.position.y,
      posZ: part.position.z,
      rotX: THREE.MathUtils.radToDeg(part.rotation.x),
      rotY: THREE.MathUtils.radToDeg(part.rotation.y),
      rotZ: THREE.MathUtils.radToDeg(part.rotation.z),
      scaleX: Math.abs(part.scale.x),
      scaleY: Math.abs(part.scale.y),
      scaleZ: Math.abs(part.scale.z),
    };

    // Update transform panel
    const { state, changesState } = this.transformControls;
    state.partName = part.name ?? "Unnamed";
    state.posX = part.position.x;
    state.posY = part.position.y;
    state.posZ = part.position.z;
    state.inverseX = part.scale.x < 0;
    state.inverseY = part.scale.y < 0;
    state.inverseZ = part.scale.z < 0;
    state.rotX = THREE.MathUtils.radToDeg(part.rotation.x);
    state.rotY = THREE.MathUtils.radToDeg(part.rotation.y);
    state.rotZ = THREE.MathUtils.radToDeg(part.rotation.z);
    state.scaleX = Math.abs(part.scale.x);
    state.scaleY = Math.abs(part.scale.y);
    state.scaleZ = Math.abs(part.scale.z);

    // Reset changes log
    changesState.changes = "No changes yet";

    // Force GUI to update display
    this.gui
      .controllersRecursive()
      .forEach((controller) => controller.updateDisplay());

    // Calculate world position
    this.updateWorldPosition();

    // Highlight in scene
    this.highlightPart(part);

    console.log(
      `[JEMInspector] Selected part: ${part.name}, position: ${part.position.x}, ${part.position.y}, ${part.position.z}`,
    );
  }

  /**
   * Update world position display
   */
  private updateWorldPosition() {
    if (!this.selectedPart || !this.transformControls) return;

    const worldPos = new THREE.Vector3();
    this.selectedPart.getWorldPosition(worldPos);

    const { state } = this.transformControls;
    state.worldPosX = parseFloat(worldPos.x.toFixed(3));
    state.worldPosY = parseFloat(worldPos.y.toFixed(3));
    state.worldPosZ = parseFloat(worldPos.z.toFixed(3));
  }

  /**
   * Update the changes log showing what has been modified
   */
  private updateChangesLog() {
    if (!this.selectedPart || !this.transformControls || !this.originalValues)
      return;

    const { state, changesState } = this.transformControls;
    const changes = calculateChanges(state, this.originalValues);

    // Update changes display
    changesState.changes =
      changes.length > 0 ? changes.join(", ") : "No changes yet";

    // Force GUI update
    this.gui
      .controllersRecursive()
      .forEach((controller) => controller.updateDisplay());
  }

  /**
   * Find JEM part data by name
   */
  private findJEMPart(name: string) {
    return findJEMPart(this.jemData, name);
  }

  /**
   * Highlight selected part with bounding box
   */
  private highlightPart(part: THREE.Object3D) {
    // Remove previous highlight
    if (this.currentHighlight) {
      this.currentHighlight.parent?.remove(this.currentHighlight);
      this.currentHighlight.dispose();
      this.currentHighlight = null;
    }

    // Add new highlight
    if (part instanceof THREE.Mesh || part instanceof THREE.Group) {
      this.currentHighlight = new THREE.BoxHelper(part, 0x00ff00);
      this.scene.add(this.currentHighlight);
    }
  }

  /**
   * Export current Three.js state back to JEM format
   */
  private exportToJEMFormat(): JEMFile {
    // Deep clone JEM data
    const corrected = JSON.parse(JSON.stringify(this.jemData)) as JEMFile;

    // TODO: Walk through Three.js scene and update translate values
    // This would require mapping Three.js objects back to JEM parts

    return corrected;
  }

  /**
   * Show the inspector
   */
  show() {
    this.gui.show();
  }

  /**
   * Hide the inspector
   */
  hide() {
    this.gui.hide();
  }

  /**
   * Destroy the inspector and clean up
   */
  dispose() {
    if (this.currentHighlight) {
      this.currentHighlight.parent?.remove(this.currentHighlight);
      this.currentHighlight.dispose();
      this.currentHighlight = null;
    }

    this.gui.destroy();
  }
}
