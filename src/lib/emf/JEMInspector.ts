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

import { GUI, type Controller } from "lil-gui";
import * as THREE from "three";
import type { JEMFile, JEMModelPart } from "./jemLoader";

interface JEMInspectorConfig {
  scene: THREE.Scene;
  jemData: JEMFile; // Original JEM file data
  rootGroup: THREE.Group; // Root entity group from jemToThreeJS
}

interface TransformControlsState {
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

interface ChangesState {
  changes: string;
}

interface JEMInspectorTransformControls {
  state: TransformControlsState;
  posXCtrl: Controller;
  posYCtrl: Controller;
  posZCtrl: Controller;
  rotXCtrl: Controller;
  rotYCtrl: Controller;
  rotZCtrl: Controller;
  changesState: ChangesState;
}

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
    this.buildHierarchyTree(this.rootGroup, hierarchyFolder, 0);
  }

  /**
   * Recursively build tree view of parts
   */
  private buildHierarchyTree(
    parent: THREE.Object3D,
    folder: GUI,
    depth: number,
  ) {
    parent.children.forEach((child, index) => {
      const label = child.name || `Part_${index}`;

      // Store reference to child for closure
      const childRef = child;

      // Skip "Part_0" if it's the only child - merge with parent
      if (
        parent.children.length === 1 &&
        label === "Part_0" &&
        child.children.length > 0
      ) {
        // Don't create a folder for Part_0, just add its children directly
        this.buildHierarchyTree(child, folder, depth);
        return;
      }

      // Create a folder for this part
      const partFolder = folder.addFolder(label);
      this.folderLabels.set(partFolder, label);

      // Add click listener to folder title for selection (Babylon inspector style)
      const titleElement = partFolder.domElement.querySelector(".title");
      if (titleElement) {
        titleElement.addEventListener("click", () => {
          console.log(`[JEMInspector] Folder title clicked: ${label}`);

          // Deselect previous folder
          if (this.selectedFolder && this.selectedFolder !== partFolder) {
            const prevLabel = this.folderLabels.get(this.selectedFolder);
            if (prevLabel) this.selectedFolder.title(prevLabel);
          }

          // Select this part
          this.selectPart(childRef);

          // Update title to show selection
          partFolder.title(`${label} - selected`);
          this.selectedFolder = partFolder;
        });
      }

      // Recursively add children inside this folder
      if (child.children.length > 0) {
        this.buildHierarchyTree(child, partFolder, depth + 1);
      }
    });
  }

  /**
   * Create panel for viewing JEM source data
   */
  private createDataPanel() {
    const dataFolder = this.gui.addFolder("📋 JEM Source Data");

    const state = {
      copyJSON: () => {
        if (this.selectedPart) {
          const jemPart = this.findJEMPart(this.selectedPart.name);
          if (jemPart) {
            navigator.clipboard.writeText(JSON.stringify(jemPart, null, 2)).catch(err => {
              console.error("Failed to copy JEM data:", err);
            });
            console.log("Copied JEM data:", jemPart);
          }
        }
      },
      showInConsole: () => {
        if (this.selectedPart) {
          const jemPart = this.findJEMPart(this.selectedPart.name);
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

    dataFolder.add(state, "copyJSON").name("📄 Copy JEM JSON");
    dataFolder.add(state, "showInConsole").name("🖥️ Log to Console");
  }

  /**
   * Create panel for live transform editing
   */
  private createTransformPanel() {
    const transformFolder = this.gui.addFolder("🔧 Live Transforms");

    // Add info message
    const infoState = {
      info: "⚠️ Animations paused in debug mode",
    };
    transformFolder.add(infoState, "info").name("").disable();

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

    transformFolder.add(state, "partName").name("Selected Part").disable();

    const posFolder = transformFolder.addFolder("Position (Local)");
    const posXCtrl = posFolder
      .add(state, "posX", -1, 1, 0.001)
      .name("X")
      .onChange((value: number) => {
        if (this.selectedPart) {
          this.selectedPart.position.x = value;
          this.updateWorldPosition();
          this.updateChangesLog();
        }
      });
    const posYCtrl = posFolder
      .add(state, "posY", -1, 1, 0.001)
      .name("Y")
      .onChange((value: number) => {
        if (this.selectedPart) {
          this.selectedPart.position.y = value;
          this.updateWorldPosition();
          this.updateChangesLog();
        }
      });
    const posZCtrl = posFolder
      .add(state, "posZ", -1, 1, 0.001)
      .name("Z")
      .onChange((value: number) => {
        if (this.selectedPart) {
          this.selectedPart.position.z = value;
          this.updateWorldPosition();
          this.updateChangesLog();
        }
      });

    // Inverse checkboxes
    const inverseFolder = transformFolder.addFolder("Inverse Axis");
    inverseFolder
      .add(state, "inverseX")
      .name("Inverse X")
      .onChange((value: boolean) => {
        if (this.selectedPart) {
          this.selectedPart.scale.x = value
            ? -Math.abs(this.selectedPart.scale.x)
            : Math.abs(this.selectedPart.scale.x);
        }
      });
    inverseFolder
      .add(state, "inverseY")
      .name("Inverse Y")
      .onChange((value: boolean) => {
        if (this.selectedPart) {
          this.selectedPart.scale.y = value
            ? -Math.abs(this.selectedPart.scale.y)
            : Math.abs(this.selectedPart.scale.y);
        }
      });
    inverseFolder
      .add(state, "inverseZ")
      .name("Inverse Z")
      .onChange((value: boolean) => {
        if (this.selectedPart) {
          this.selectedPart.scale.z = value
            ? -Math.abs(this.selectedPart.scale.z)
            : Math.abs(this.selectedPart.scale.z);
        }
      });

    const rotFolder = transformFolder.addFolder("Rotation (Degrees)");
    const rotXCtrl = rotFolder
      .add(state, "rotX", -180, 180, 1)
      .name("X")
      .onChange((value: number) => {
        if (this.selectedPart) {
          this.selectedPart.rotation.x = THREE.MathUtils.degToRad(value);
          this.updateChangesLog();
        }
      });
    const rotYCtrl = rotFolder
      .add(state, "rotY", -180, 180, 1)
      .name("Y")
      .onChange((value: number) => {
        if (this.selectedPart) {
          this.selectedPart.rotation.y = THREE.MathUtils.degToRad(value);
          this.updateChangesLog();
        }
      });
    const rotZCtrl = rotFolder
      .add(state, "rotZ", -180, 180, 1)
      .name("Z")
      .onChange((value: number) => {
        if (this.selectedPart) {
          this.selectedPart.rotation.z = THREE.MathUtils.degToRad(value);
          this.updateChangesLog();
        }
      });

    const scaleFolder = transformFolder.addFolder("Scale");
    scaleFolder
      .add(state, "scaleX", 0.1, 5, 0.1)
      .name("X")
      .onChange((value: number) => {
        if (this.selectedPart) {
          this.selectedPart.scale.x = value;
          this.updateChangesLog();
        }
      });
    scaleFolder
      .add(state, "scaleY", 0.1, 5, 0.1)
      .name("Y")
      .onChange((value: number) => {
        if (this.selectedPart) {
          this.selectedPart.scale.y = value;
          this.updateChangesLog();
        }
      });
    scaleFolder
      .add(state, "scaleZ", 0.1, 5, 0.1)
      .name("Z")
      .onChange((value: number) => {
        if (this.selectedPart) {
          this.selectedPart.scale.z = value;
          this.updateChangesLog();
        }
      });

    const worldFolder = transformFolder.addFolder("World Position (Read-Only)");
    worldFolder.add(state, "worldPosX").name("World X").disable().listen();
    worldFolder.add(state, "worldPosY").name("World Y").disable().listen();
    worldFolder.add(state, "worldPosZ").name("World Z").disable().listen();

    // Changes log
    const changesFolder = transformFolder.addFolder("📝 Changes Made");
    const changesState: ChangesState = {
      changes: "No changes yet",
    };
    changesFolder.add(changesState, "changes").name("").disable();

    // Store controllers for updates
    this.transformControls = {
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

  /**
   * Create panel for comparing JEM vs Three.js data
   */
  private createComparisonPanel() {
    const compFolder = this.gui.addFolder("🔍 JEM vs Three.js Comparison");

    const state = {
      exportCorrectedJEM: () => {
        const correctedJEM = this.exportToJEMFormat();
        navigator.clipboard.writeText(JSON.stringify(correctedJEM, null, 2)).catch(err => {
          console.error("Failed to export corrected JEM:", err);
        });
        console.log("Corrected JEM exported to clipboard");
      },
      showDifferences: () => {
        if (this.selectedPart) {
          const jemPart = this.findJEMPart(this.selectedPart.name);
          if (jemPart) {
            const threePart = this.selectedPart;

            console.log("=== JEM vs Three.js Comparison ===");
            console.table({
              "JEM translate X": jemPart.translate?.[0] || 0,
              "Three.js position X": threePart.position.x,
              "Difference X":
                threePart.position.x - (jemPart.translate?.[0] || 0),
              "JEM translate Y": jemPart.translate?.[1] || 0,
              "Three.js position Y": threePart.position.y,
              "Difference Y":
                threePart.position.y - (jemPart.translate?.[1] || 0),
              "JEM translate Z": jemPart.translate?.[2] || 0,
              "Three.js position Z": threePart.position.z,
              "Difference Z":
                threePart.position.z - (jemPart.translate?.[2] || 0),
            });
          }
        }
      },
    };

    compFolder.add(state, "exportCorrectedJEM").name("💾 Export Corrected JEM");
    compFolder.add(state, "showDifferences").name("📊 Show Differences");
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
    state.partName = part.name || "Unnamed";
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

  /**
   * Find JEM part data by name
   */
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

    return searchModels(this.jemData.models || []);
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
