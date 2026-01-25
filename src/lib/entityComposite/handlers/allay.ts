import type { EntityHandler, EntityHandlerResult } from "./types";
import { getToggle } from "./utils";

export const allayHandler: EntityHandler = (context): EntityHandlerResult | null => {
  const { folderRoot, entityType } = context;

  if (folderRoot !== "allay" && entityType !== "allay") return null;

  const controls = [
    {
      kind: "toggle" as const,
      id: "allay.holding_item",
      label: "Holding Item",
      defaultValue: false,
    },
    {
      kind: "toggle" as const,
      id: "allay.dancing",
      label: "Dancing (Jukebox)",
      defaultValue: false,
    },
  ];

  const getBoneInputOverrides = (
    state: Parameters<NonNullable<EntityHandlerResult["getBoneInputOverrides"]>>[0],
  ) => {
    const holding = getToggle(state, "allay.holding_item", false);
    const dancing = getToggle(state, "allay.dancing", false);
    const overrides: Record<string, Record<string, number>> = holding
      ? { right_arm: { rx: -1 } }
      : {};
    if (dancing) {
      overrides.head = { rz: Math.PI / 18 };
    }
    return overrides;
  };

  const getEntityStateOverrides = (
    state: Parameters<NonNullable<EntityHandlerResult["getEntityStateOverrides"]>>[0],
  ) => {
    const holding = getToggle(state, "allay.holding_item", false);
    return holding ? { is_in_hand: true } : {};
  };

  return {
    controls,
    getBoneInputOverrides,
    getEntityStateOverrides,
  };
};
