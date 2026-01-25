import type { AssetId } from "@state";
import type { EntityHandler, EntityHandlerResult } from "./types";
import { getToggle, stripNamespace } from "./utils";

export const camelHandler: EntityHandler = (context): EntityHandlerResult | null => {
  const { folderRoot, all } = context;

  if (folderRoot !== "camel") return null;

  const findEquipment = (path: string): AssetId | null => {
    for (const id of all) {
      const stripped = stripNamespace(id);
      if (stripped === `entity/equipment/${path}`) return id;
    }
    return null;
  };

  const camelSaddleTexture = findEquipment("camel_saddle/saddle");
  if (!camelSaddleTexture) return null;

  const controls = [
    {
      kind: "toggle" as const,
      id: "camel.saddle",
      label: "Saddle",
      defaultValue: false,
    },
  ];

  const getEntityStateOverrides = (
    state: Parameters<NonNullable<EntityHandlerResult["getEntityStateOverrides"]>>[0],
  ) => {
    const saddleEnabled = getToggle(state, "camel.saddle", false);
    return { is_ridden: saddleEnabled };
  };

  const getLayerContributions = (
    state: Parameters<NonNullable<EntityHandlerResult["getLayerContributions"]>>[0],
  ) => {
    if (!getToggle(state, "camel.saddle", false)) return [];

    return [
      {
        id: "camel_saddle",
        label: "Saddle",
        kind: "cemModel" as const,
        cemEntityTypeCandidates: ["camel_saddle"],
        textureAssetId: camelSaddleTexture,
        blend: "normal" as const,
        zIndex: 135,
        opacity: 1,
        materialMode: { kind: "default" as const },
        boneAliasMap: {
          saddle: "body",
          bridle: "head",
          reins: "head",
        },
      },
    ];
  };

  return {
    controls,
    getEntityStateOverrides,
    getLayerContributions,
  };
};
