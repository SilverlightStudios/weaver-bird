/**
 * Helper functions for JEMInspector panel creation (hierarchy, data, comparison)
 */
import type { GUI } from "lil-gui";
import type * as THREE from "three";
import type { JEMFile, JEMModelPart } from "./jemLoader";

interface HierarchyCallbacks {
  selectPart: (part: THREE.Object3D) => void;
  getSelectedFolder: () => GUI | null;
  setSelectedFolder: (folder: GUI | null) => void;
  getFolderLabel: (folder: GUI) => string | undefined;
  setFolderLabel: (folder: GUI, label: string) => void;
}

interface DataPanelCallbacks {
  getSelectedPart: () => THREE.Object3D | null;
  findJEMPart: (name: string) => JEMModelPart | null;
}

interface ComparisonPanelCallbacks {
  getSelectedPart: () => THREE.Object3D | null;
  findJEMPart: (name: string) => JEMModelPart | null;
  exportToJEMFormat: () => JEMFile;
}

/**
 * Build hierarchical tree view of model parts
 */
export function buildHierarchyTree(
  parent: THREE.Object3D,
  folder: GUI,
  depth: number,
  callbacks: HierarchyCallbacks
) {
  parent.children.forEach((child, index) => {
    const label = child.name ?? `Part_${index}`;

    // Store reference to child for closure
    const childRef = child;

    // Skip "Part_0" if it's the only child - merge with parent
    if (
      parent.children.length === 1 &&
      label === "Part_0" &&
      child.children.length > 0
    ) {
      // Don't create a folder for Part_0, just add its children directly
      buildHierarchyTree(child, folder, depth, callbacks);
      return;
    }

    // Create a folder for this part
    const partFolder = folder.addFolder(label);
    callbacks.setFolderLabel(partFolder, label);

    // Add click listener to folder title for selection (Babylon inspector style)
    const titleElement = partFolder.domElement.querySelector(".title");
    if (titleElement) {
      titleElement.addEventListener("click", () => {
        console.log(`[JEMInspector] Folder title clicked: ${label}`);

        // Deselect previous folder
        const selectedFolder = callbacks.getSelectedFolder();
        if (selectedFolder && selectedFolder !== partFolder) {
          const prevLabel = callbacks.getFolderLabel(selectedFolder);
          if (prevLabel) selectedFolder.title(prevLabel);
        }

        // Select this part
        callbacks.selectPart(childRef);

        // Update title to show selection
        partFolder.title(`${label} - selected`);
        callbacks.setSelectedFolder(partFolder);
      });
    }

    // Recursively add children inside this folder
    if (child.children.length > 0) {
      buildHierarchyTree(child, partFolder, depth + 1, callbacks);
    }
  });
}

/**
 * Create panel for viewing JEM source data
 */
export function createDataPanel(folder: GUI, callbacks: DataPanelCallbacks) {
  const state = {
    copyJSON: () => {
      const part = callbacks.getSelectedPart();
      if (part) {
        const jemPart = callbacks.findJEMPart(part.name);
        if (jemPart) {
          void navigator.clipboard.writeText(JSON.stringify(jemPart, null, 2));
          console.log("Copied JEM data:", jemPart);
        }
      }
    },
    showInConsole: () => {
      const part = callbacks.getSelectedPart();
      if (part) {
        const jemPart = callbacks.findJEMPart(part.name);
        if (jemPart) {
          console.log("JEM Part Data:", jemPart);
          console.table({
            id: jemPart.id,
            translateX: jemPart.translate?.[0],
            translateY: jemPart.translate?.[1],
            translateZ: jemPart.translate?.[2],
            invertAxis: jemPart.invertAxis,
            boxes: jemPart.boxes?.length ?? 0,
            submodels: jemPart.submodels?.length ?? 0,
          });
        }
      }
    },
  };

  folder.add(state, "copyJSON").name("📄 Copy JEM JSON");
  folder.add(state, "showInConsole").name("🖥️ Log to Console");
}

/**
 * Create panel for comparing JEM vs Three.js data
 */
export function createComparisonPanel(
  folder: GUI,
  callbacks: ComparisonPanelCallbacks
) {
  const state = {
    exportCorrectedJEM: () => {
      const correctedJEM = callbacks.exportToJEMFormat();
      void navigator.clipboard.writeText(JSON.stringify(correctedJEM, null, 2));
      console.log("Corrected JEM exported to clipboard");
    },
    showDifferences: () => {
      const threePart = callbacks.getSelectedPart();
      if (threePart) {
        const jemPart = callbacks.findJEMPart(threePart.name);
        if (jemPart) {
          console.log("=== JEM vs Three.js Comparison ===");
          console.table({
            "JEM translate X": jemPart.translate?.[0] ?? 0,
            "Three.js position X": threePart.position.x,
            "Difference X":
              threePart.position.x - (jemPart.translate?.[0] ?? 0),
            "JEM translate Y": jemPart.translate?.[1] ?? 0,
            "Three.js position Y": threePart.position.y,
            "Difference Y":
              threePart.position.y - (jemPart.translate?.[1] ?? 0),
            "JEM translate Z": jemPart.translate?.[2] ?? 0,
            "Three.js position Z": threePart.position.z,
            "Difference Z":
              threePart.position.z - (jemPart.translate?.[2] ?? 0),
          });
        }
      }
    },
  };

  folder.add(state, "exportCorrectedJEM").name("💾 Export Corrected JEM");
  folder.add(state, "showDifferences").name("📊 Show Differences");
}
