/**
 * Helper functions for AnimationsTab
 */
import { ANIMATION_PRESETS } from "@lib/emf/animation/entityState";
import { ANIMATION_TRIGGERS, POSE_TOGGLES } from "@lib/emf/animation";
import type { AnimationTrigger } from "@constants/animations";

export function getTriggerIcon(trigger: AnimationTrigger): string {
  switch (trigger) {
    case 'interact': return '👆';
    case 'always': return '🔄';
    case 'redstone': return '⚡';
    case 'damage': return '💥';
    case 'walk': return '🚶';
    default: return '🎬';
  }
}

export function getTriggerDescription(trigger: AnimationTrigger): string {
  switch (trigger) {
    case 'interact': return 'Plays when player interacts';
    case 'always': return 'Loops continuously';
    case 'redstone': return 'Plays when redstone powered';
    case 'damage': return 'Plays when damaged';
    case 'walk': return 'Plays when moving';
    default: return `Trigger: ${trigger}`;
  }
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function getVisiblePresets(availableAnimationPresets: string[] | null) {
  return availableAnimationPresets === null
    ? ANIMATION_PRESETS
    : ANIMATION_PRESETS.filter((p) => availableAnimationPresets.includes(p.id));
}

export function getVisibleTriggers(availableAnimationTriggers: string[] | null) {
  return availableAnimationTriggers === null
    ? []
    : ANIMATION_TRIGGERS.filter((t) => availableAnimationTriggers.includes(t.id));
}

export function getVisiblePoseToggles(availablePoseToggles: string[] | null) {
  return availablePoseToggles === null
    ? []
    : POSE_TOGGLES.filter((p) => availablePoseToggles.includes(p.id));
}

export function getHiddenPresetIds(availableAnimationTriggers: string[] | null): Set<string> {
  const hiddenPresetIds = new Set<string>();
  if (availableAnimationTriggers?.includes("trigger.hurt")) hiddenPresetIds.add("hurt");
  if (availableAnimationTriggers?.includes("trigger.death")) hiddenPresetIds.add("dying");
  if (availableAnimationTriggers?.includes("trigger.attack")) hiddenPresetIds.add("attacking");
  return hiddenPresetIds;
}

export function filterPresets(
  visiblePresets: typeof ANIMATION_PRESETS,
  hiddenPresetIds: Set<string>
) {
  return visiblePresets.filter((p) => !hiddenPresetIds.has(p.id));
}
