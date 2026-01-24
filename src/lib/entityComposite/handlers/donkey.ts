import type { AssetId } from "@state";
import type { EntityHandler, EntityHandlerResult } from "./types";
import { getToggle, stripNamespace } from "./utils";

export const donkeyHandler: EntityHandler = (context): EntityHandlerResult | null => {
  const { folderRoot, all } = context;

  if (folderRoot !== "donkey") return null;

  const findEquipment = (path: string): AssetId | null => {
    for (const id of all) {
      const stripped = stripNamespace(id);
      if (stripped === `entity/equipment/${path}`) return id;
    }
    return null;
  };

  const donkeySaddleTexture = findEquipment("donkey_saddle/saddle");

  const controls = [];

  if (donkeySaddleTexture) {
    controls.push({
      kind: "toggle" as const,
      id: "donkey.saddle",
      label: "Saddle",
      defaultValue: false,
    });
  }

  controls.push({
    kind: "toggle" as const,
    id: "donkey.chest",
    label: "Chest",
    defaultValue: false,
  });

  const getBoneRenderOverrides = (
    state: Parameters<NonNullable<EntityHandlerResult["getBoneRenderOverrides"]>>[0],
  ) => {
    const hasChest = getToggle(state, "donkey.chest", false);
    if (hasChest) return {};

    const donkeyChestBones = [
      "left_chest",
      "right_chest",
      "left_chest2",
      "right_chest2",
      "mule_left_chest",
      "mule_right_chest",
    ];
    const overrides: Record<string, { visible: boolean }> = {};
    for (const bone of donkeyChestBones) overrides[bone] = { visible: false };
    return overrides;
  };

  const getEntityStateOverrides = donkeySaddleTexture
    ? (state: Parameters<NonNullable<EntityHandlerResult["getEntityStateOverrides"]>>[0]) => {
        const saddleEnabled = getToggle(state, "donkey.saddle", false);
        return { is_ridden: saddleEnabled };
      }
    : undefined;

  const getLayerContributions = donkeySaddleTexture
    ? (state: Parameters<NonNullable<EntityHandlerResult["getLayerContributions"]>>[0]) => {
        if (!getToggle(state, "donkey.saddle", false)) return [];

        return [
          {
            id: "donkey_saddle",
            label: "Saddle",
            kind: "cemModel" as const,
            cemEntityTypeCandidates: ["donkey_saddle"],
            textureAssetId: donkeySaddleTexture,
            blend: "normal" as const,
            zIndex: 135,
            opacity: 1,
            materialMode: { kind: "default" as const },
            boneAliasMap: {
              headpiece: "head",
              noseband: "head",
              left_bit: "head",
              right_bit: "head",
              left_rein: "head",
              right_rein: "head",
              saddle: "body",
            },
          },
        ];
      }
    : undefined;

  return {
    controls,
    getBoneRenderOverrides,
    ...(getEntityStateOverrides ? { getEntityStateOverrides } : {}),
    ...(getLayerContributions ? { getLayerContributions } : {}),
  };
};
