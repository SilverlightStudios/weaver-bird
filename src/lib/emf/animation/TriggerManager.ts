/**
 * Trigger Manager
 *
 * Handles trigger-based animations (attack, hurt, death, etc.)
 * and their effects on entity state and bone inputs.
 */

import type { EntityState } from "./types";
import { getTriggerDefinition } from "./triggers";
import type { CompiledAnimation } from "./AnimationCompiler";
import {
  updateTimeCounters,
  applyAttackTrigger,
  applyHurtTrigger,
  applyDeathTrigger,
  applyHorseRearingTrigger,
  applyEatTrigger,
} from "./TriggerManagerHelpers";

/**
 * Active trigger state
 */
interface ActiveTrigger {
  id: string;
  elapsedSec: number;
  durationSec: number;
}

/**
 * Root overlay for model-level transforms
 */
interface RootOverlay {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
}

/**
 * Result of trigger update
 */
export interface TriggerUpdateResult {
  /** Bone input overrides from active triggers */
  boneInputOverrides: Record<string, Record<string, number>>;
  /** Root-level transform overlay */
  rootOverlay: RootOverlay;
  /** Forced rule_index override (for eat trigger) */
  forceRuleIndex: number | null;
}

/**
 * Manages animation triggers and their effects
 */
export class TriggerManager {
  private activeTriggers: ActiveTrigger[] = [];
  private inferredEatRuleIndex: number | null = null;
  private animationDurationTicks: number;
  private expressionChecker: (needle: string) => boolean;

  constructor(
    animationDurationTicks: number,
    expressionChecker: (needle: string) => boolean,
  ) {
    this.animationDurationTicks = animationDurationTicks;
    this.expressionChecker = expressionChecker;
  }

  /**
   * Play a trigger animation
   */
  playTrigger(triggerId: string, entityState: EntityState): void {
    const def = getTriggerDefinition(triggerId);
    if (!def) {
      console.warn(`[TriggerManager] Unknown trigger: ${triggerId}`);
      return;
    }

    // Apply trigger-specific entity state changes
    switch (def.id) {
      case "trigger.interact":
        // Bell-like behavior: start interaction animation.
        // Set `ticks = 1` to kick off animation based on `ticks > 0`.
        entityState.ticks = 1; // Start at 1 to trigger animation
        break;
      case "trigger.hurt":
        // Ensure hurt_time >= 10 for `is_hurt` to remain true initially.
        entityState.hurt_time = Math.max(
          entityState.hurt_time,
          10,
        );
        entityState.is_hurt = true;
        break;
      case "trigger.death":
        // Ensure death_time >= 20 for visible death animation.
        entityState.death_time = Math.max(
          entityState.death_time,
          20,
        );
        entityState.health = 0;
        break;
      default:
        break;
    }

    // Use extracted duration for interact trigger (e.g., bell swing duration)
    let { durationSec } = def;
    if (def.id === "trigger.interact") {
      // Convert ticks to seconds
      durationSec = this.animationDurationTicks / 20;
    }

    this.activeTriggers.push({
      id: def.id,
      elapsedSec: 0,
      durationSec,
    });
  }

  /**
   * Update trigger state and generate bone input overrides
   */
  update(deltaSec: number, entityState: EntityState): TriggerUpdateResult {
    const dtTicks = deltaSec * 20;
    updateTimeCounters(entityState, dtTicks, this.animationDurationTicks);

    const boneInputOverrides: Record<string, Record<string, number>> = {};
    const rootOverlay: RootOverlay = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 };
    let forceRuleIndex: number | null = null;

    const next: ActiveTrigger[] = [];
    for (const trig of this.activeTriggers) {
      const elapsedSec = trig.elapsedSec + deltaSec;
      const t = trig.durationSec > 0 ? Math.min(1, elapsedSec / trig.durationSec) : 1;

      switch (trig.id) {
        case "trigger.attack":
          applyAttackTrigger(t, entityState);
          break;
        case "trigger.hurt":
          applyHurtTrigger(t, rootOverlay);
          break;
        case "trigger.death":
          applyDeathTrigger(t, rootOverlay);
          break;
        case "trigger.horse_rearing":
          applyHorseRearingTrigger(t, boneInputOverrides);
          break;
        case "trigger.eat":
          if (this.inferredEatRuleIndex !== null) {
            forceRuleIndex = this.inferredEatRuleIndex;
          }
          applyEatTrigger(t, entityState, boneInputOverrides, this.expressionChecker);
          break;
      }

      if (elapsedSec < trig.durationSec) {
        next.push({ ...trig, elapsedSec });
      }
    }

    this.activeTriggers = next;

    return {
      boneInputOverrides,
      rootOverlay,
      forceRuleIndex,
    };
  }

  /**
   * Infer eat rule index from animation layers
   */
  inferEatRuleIndex(animationLayers: CompiledAnimation[][]): void {
    for (const layer of animationLayers) {
      for (const a of layer) {
        if (a.targetType !== "bone") continue;
        if (a.targetName !== "varb") continue;
        if (a.propertyName !== "index_eat") continue;
        const expr = a.expression;
        const src = "source" in expr && typeof expr.source === "string" ? expr.source : "";
        const match = src.match(/rule_index\s*==\s*(\d+)/);
        if (match) {
          this.inferredEatRuleIndex = Number(match[1]);
          return;
        }
      }
    }
  }

  /**
   * Reset all trigger state
   */
  reset(): void {
    this.activeTriggers = [];
  }

  /**
   * Check if any triggers are active
   */
  hasActiveTriggers(): boolean {
    return this.activeTriggers.length > 0;
  }
}
