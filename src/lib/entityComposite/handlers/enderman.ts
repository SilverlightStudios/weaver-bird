import type { EntityHandler, EntityHandlerResult } from "./types";
import type { EntityFeatureStateView } from "../types";
import { getToggle } from "./utils";

export const endermanHandler: EntityHandler = (context): EntityHandlerResult | null => {
  const { folderRoot } = context;

  if (folderRoot !== "enderman") return null;

  const controls: EntityHandlerResult["controls"] = [
    {
      kind: "toggle",
      id: "enderman.aggressive",
      label: "Aggressive",
      defaultValue: false,
      description: "When enabled, the enderman shows its angry state (screaming, jaw open)",
    },
    {
      kind: "toggle",
      id: "enderman.carrying_block",
      label: "Carrying Block",
      defaultValue: false,
      description: "When enabled, the enderman holds a block",
    },
  ];

  const getEntityStateOverrides = (
    state: EntityFeatureStateView,
  ) => {
    const aggressive = getToggle(state, "enderman.aggressive", false);
    const carryingBlock = getToggle(state, "enderman.carrying_block", false);
    return {
      is_aggressive: aggressive,
      // Carrying block is typically detected via right_arm.rx in animations
      // but we set is_in_hand for compatibility with some packs
      is_in_hand: carryingBlock,
    };
  };

  // For carrying block, we need to adjust arm positions
  const getBoneInputOverrides = (
    state: EntityFeatureStateView,
  ) => {
    const carryingBlock = getToggle(state, "enderman.carrying_block", false);
    if (!carryingBlock) return {};

    // Set arm rotation to indicate holding something (rx < -0.49 triggers var.carry in FA)
    return {
      right_arm: { rx: -0.6 },
      left_arm: { rx: -0.6 },
    };
  };

  return {
    controls,
    getEntityStateOverrides,
    getBoneInputOverrides,
  };
};
