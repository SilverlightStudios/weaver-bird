/**
 * Generic mob states handler
 *
 * Provides common entity state controls (aggressive, hurt, etc.) for entities
 * that don't have a specific handler. These states are used by animation
 * expressions in JEM/JPM files to modify poses.
 *
 * This handler detects entity types that commonly use these states and adds
 * the appropriate controls. For entities with specific handlers (horse, sheep,
 * etc.), those handlers take precedence.
 */

import type { EntityHandler, EntityHandlerResult } from "./types";
import type { EntityFeatureStateView } from "../types";
import { getToggle, getSelect } from "./utils";

// Entities known to have aggressive state animations
const AGGRESSIVE_ENTITIES = new Set([
  "bee",
  "wolf",
  "polar_bear",
  "iron_golem",
  "zombie_pigman",
  "zombified_piglin",
  "panda",
  "dolphin",
  "goat",
  "warden",
  "spider",
  "cave_spider",
]);

// Entities known to have baby/child variants
const CHILD_ENTITIES = new Set([
  "zombie",
  "husk",
  "drowned",
  "zombie_villager",
  "pig",
  "cow",
  "chicken",
  "mooshroom",
  "wolf",
  "cat",
  "ocelot",
  "rabbit",
  "polar_bear",
  "turtle",
  "panda",
  "fox",
  "bee",
  "hoglin",
  "zoglin",
  "strider",
  "goat",
  "axolotl",
  "frog",
  "tadpole",
  "camel",
  "sniffer",
  "armadillo",
]);

// Entities known to have sitting state
const SITTING_ENTITIES = new Set([
  "wolf",
  "cat",
  "parrot",
  "fox",
]);

// Entities known to have swimming/water state
const WATER_ENTITIES = new Set([
  "axolotl",
  "dolphin",
  "turtle",
  "guardian",
  "elder_guardian",
  "squid",
  "glow_squid",
]);

// Entities known to have sneaking state
const SNEAKING_ENTITIES = new Set([
  "cat",
  "fox",
]);

// Entities known to have sleeping state
const SLEEPING_ENTITIES = new Set([
  "fox",
  "villager",
  "cat",
]);

export const mobStatesHandler: EntityHandler = (context): EntityHandlerResult | null => {
  const { folderRoot, leaf, dir } = context;

  // Derive entity type from folder structure
  const entityType = dir ? folderRoot : leaf;

  // Check if this entity has any state controls we can provide
  const hasAggressive = AGGRESSIVE_ENTITIES.has(entityType);
  const hasChild = CHILD_ENTITIES.has(entityType);
  const hasSitting = SITTING_ENTITIES.has(entityType);
  const hasWater = WATER_ENTITIES.has(entityType);
  const hasSneaking = SNEAKING_ENTITIES.has(entityType);
  const hasSleeping = SLEEPING_ENTITIES.has(entityType);

  // If no applicable states, don't provide controls
  if (!hasAggressive && !hasChild && !hasSitting && !hasWater && !hasSneaking && !hasSleeping) {
    return null;
  }

  const controls: EntityHandlerResult["controls"] = [];

  if (hasAggressive) {
    controls.push({
      kind: "toggle",
      id: `${entityType}.aggressive`,
      label: "Aggressive",
      defaultValue: false,
      description: "Shows the entity in an aggressive/angry state",
    });
  }

  if (hasChild) {
    controls.push({
      kind: "toggle",
      id: `${entityType}.baby`,
      label: "Baby",
      defaultValue: false,
      description: "Shows the baby/child variant of the entity",
    });
  }

  if (hasSitting) {
    controls.push({
      kind: "toggle",
      id: `${entityType}.sitting`,
      label: "Sitting",
      defaultValue: false,
      description: "Shows the entity in a sitting pose",
    });
  }

  if (hasWater) {
    controls.push({
      kind: "toggle",
      id: `${entityType}.in_water`,
      label: "In Water",
      defaultValue: false,
      description: "Shows the entity as if swimming in water",
    });
  }

  if (hasSneaking) {
    controls.push({
      kind: "toggle",
      id: `${entityType}.sneaking`,
      label: "Sneaking",
      defaultValue: false,
      description: "Shows the entity in a sneaking/crouching pose",
    });
  }

  if (hasSleeping) {
    controls.push({
      kind: "toggle",
      id: `${entityType}.sleeping`,
      label: "Sleeping",
      defaultValue: false,
      description: "Shows the entity in a sleeping pose",
    });
  }

  // Common state controls for most mobs
  controls.push({
    kind: "select",
    id: `${entityType}.movement`,
    label: "Movement",
    defaultValue: "idle",
    options: [
      { value: "idle", label: "Idle" },
      { value: "walking", label: "Walking" },
      { value: "running", label: "Running" },
    ],
    description: "Controls the movement animation state",
  });

  const getEntityStateOverrides = (state: EntityFeatureStateView) => {
    const overrides: Record<string, boolean | number> = {};

    if (hasAggressive) {
      const aggressive = getToggle(state, `${entityType}.aggressive`, false);
      overrides.is_aggressive = aggressive;
      if (aggressive) {
        overrides.anger_time = 100;
        overrides.anger_time_start = 100;
      }
    }

    if (hasChild) {
      overrides.is_child = getToggle(state, `${entityType}.baby`, false);
    }

    if (hasSitting) {
      overrides.is_sitting = getToggle(state, `${entityType}.sitting`, false);
    }

    if (hasWater) {
      overrides.is_in_water = getToggle(state, `${entityType}.in_water`, false);
    }

    if (hasSneaking) {
      overrides.is_sneaking = getToggle(state, `${entityType}.sneaking`, false);
    }

    if (hasSleeping) {
      // Sleeping typically uses death_time or a custom variable in some packs
      const sleeping = getToggle(state, `${entityType}.sleeping`, false);
      if (sleeping) {
        overrides.is_sleeping = true;
      }
    }

    // Movement state
    const movement = getSelect(state, `${entityType}.movement`, "idle");
    switch (movement) {
      case "walking":
        overrides.limb_speed = 0.5;
        break;
      case "running":
        overrides.limb_speed = 1.0;
        overrides.is_sprinting = true;
        break;
      default:
        overrides.limb_speed = 0;
    }

    return overrides;
  };

  return {
    controls,
    getEntityStateOverrides,
  };
};
