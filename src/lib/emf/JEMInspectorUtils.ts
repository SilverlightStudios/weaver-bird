/**
 * Utility functions for JEMInspector (finding parts, calculating changes)
 */
import type { TransformControlsState } from "./JEMInspectorTypes";
import type { JEMFile, JEMModelPart } from "./jemLoader";

/**
 * Find JEM part data by name
 */
export function findJEMPart(
  jemData: JEMFile,
  name: string
): JEMModelPart | null {
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

  return searchModels(jemData.models ?? []);
}

/**
 * Calculate changes between original and current values
 */
export function calculateChanges(
  state: TransformControlsState,
  originalValues: {
    posX: number;
    posY: number;
    posZ: number;
    rotX: number;
    rotY: number;
    rotZ: number;
    scaleX: number;
    scaleY: number;
    scaleZ: number;
  }
): string[] {
  const changes: string[] = [];

  // Check position changes
  if (Math.abs(state.posX - originalValues.posX) > 0.001) {
    changes.push(
      `Pos X: ${originalValues.posX.toFixed(3)} → ${state.posX.toFixed(3)}`
    );
  }
  if (Math.abs(state.posY - originalValues.posY) > 0.001) {
    changes.push(
      `Pos Y: ${originalValues.posY.toFixed(3)} → ${state.posY.toFixed(3)}`
    );
  }
  if (Math.abs(state.posZ - originalValues.posZ) > 0.001) {
    changes.push(
      `Pos Z: ${originalValues.posZ.toFixed(3)} → ${state.posZ.toFixed(3)}`
    );
  }

  // Check rotation changes
  if (Math.abs(state.rotX - originalValues.rotX) > 0.1) {
    changes.push(
      `Rot X: ${originalValues.rotX.toFixed(1)}° → ${state.rotX.toFixed(1)}°`
    );
  }
  if (Math.abs(state.rotY - originalValues.rotY) > 0.1) {
    changes.push(
      `Rot Y: ${originalValues.rotY.toFixed(1)}° → ${state.rotY.toFixed(1)}°`
    );
  }
  if (Math.abs(state.rotZ - originalValues.rotZ) > 0.1) {
    changes.push(
      `Rot Z: ${originalValues.rotZ.toFixed(1)}° → ${state.rotZ.toFixed(1)}°`
    );
  }

  // Check scale changes
  if (Math.abs(state.scaleX - originalValues.scaleX) > 0.01) {
    changes.push(
      `Scale X: ${originalValues.scaleX.toFixed(2)} → ${state.scaleX.toFixed(2)}`
    );
  }
  if (Math.abs(state.scaleY - originalValues.scaleY) > 0.01) {
    changes.push(
      `Scale Y: ${originalValues.scaleY.toFixed(2)} → ${state.scaleY.toFixed(2)}`
    );
  }
  if (Math.abs(state.scaleZ - originalValues.scaleZ) > 0.01) {
    changes.push(
      `Scale Z: ${originalValues.scaleZ.toFixed(2)} → ${state.scaleZ.toFixed(2)}`
    );
  }

  return changes;
}
