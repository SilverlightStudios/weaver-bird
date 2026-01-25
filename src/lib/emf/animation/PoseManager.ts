/**
 * Pose Manager
 *
 * Handles pose toggles and feature bone input overrides.
 */

import type { EntityState } from "./types";
import { getPoseToggleDefinition } from "./poses";

/**
 * Result of pose update
 */
export interface PoseUpdateResult {
  /** Bone input overrides from active pose toggles */
  boneInputOverrides: Record<string, Record<string, number>>;
  /** Entity state overrides from active pose toggles */
  entityStateOverrides: Partial<EntityState>;
}

/**
 * Manages pose toggles and their effects
 */
export class PoseManager {
  private activePoseToggleIds: string[] = [];
  private featureBoneInputOverrides: Record<string, Record<string, number>> = {};

  /**
   * Set active pose toggles
   */
  setPoseToggles(toggleIds: string[] | null | undefined): void {
    const next = (toggleIds ?? []).filter((id) => !!getPoseToggleDefinition(id));
    this.activePoseToggleIds = next;
  }

  /**
   * Set feature bone input overrides (external system overrides)
   */
  setFeatureBoneInputOverrides(
    overrides: Record<string, Record<string, number>> | null | undefined,
  ): void {
    this.featureBoneInputOverrides = overrides ? { ...overrides } : {};
  }

  /**
   * Get feature bone input overrides
   */
  getFeatureBoneInputOverrides(): Record<string, Record<string, number>> {
    return this.featureBoneInputOverrides;
  }

  /**
   * Update pose state and generate bone input overrides
   */
  update(entityState: EntityState): PoseUpdateResult {
    const boneInputOverrides: Record<string, Record<string, number>> = {};
    const entityStateOverrides: Partial<EntityState> = {};

    for (const toggleId of this.activePoseToggleIds) {
      const def = getPoseToggleDefinition(toggleId);
      if (!def) continue;
      if (def.entityStateOverrides) {
        Object.assign(entityStateOverrides, def.entityStateOverrides(entityState));
      }
      if (def.boneInputs) {
        const inputs = def.boneInputs(entityState);
        for (const [boneName, props] of Object.entries(inputs)) {
          boneInputOverrides[boneName] = {
            ...(boneInputOverrides[boneName] ?? {}),
            ...props,
          };
        }
      }
    }

    return {
      boneInputOverrides,
      entityStateOverrides,
    };
  }

  /**
   * Reset all pose state
   */
  reset(): void {
    this.activePoseToggleIds = [];
  }
}
