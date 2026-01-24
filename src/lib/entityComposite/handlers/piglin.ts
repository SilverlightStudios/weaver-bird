import type { EntityHandler, EntityHandlerResult } from "./types";
import { getToggle, getSelect, stripNamespace, stableUnique, titleLabel, findAssetId } from "./utils";

export const piglinHandler: EntityHandler = (context): EntityHandlerResult | null => {
  const { folderRoot, entityType, all, ns } = context;

  const isPiglinLike = folderRoot === "piglin" && (entityType === "piglin" || entityType === "piglin_brute");
  if (!isPiglinLike) return null;

  let humanoidArmorMaterials: string[] = [];
  for (const id of all) {
    if (!id.startsWith(`${ns}:entity/equipment/humanoid/`)) continue;
    const leafName = stripNamespace(id).split("/").pop();
    if (!leafName) continue;
    humanoidArmorMaterials.push(leafName);
  }
  humanoidArmorMaterials = stableUnique(humanoidArmorMaterials);

  if (humanoidArmorMaterials.length === 0) return null;

  const controls = [
    {
      kind: "toggle" as const,
      id: "mob_armor.enabled",
      label: "Armor",
      defaultValue: false,
    },
    {
      kind: "select" as const,
      id: "mob_armor.material",
      label: "Armor Material",
      defaultValue: humanoidArmorMaterials.includes("diamond")
        ? "diamond"
        : humanoidArmorMaterials[0]!,
      options: humanoidArmorMaterials.map((m) => ({
        value: m,
        label: titleLabel(m),
      })),
    },
    {
      kind: "toggle" as const,
      id: "mob_armor.show_helmet",
      label: "Helmet",
      defaultValue: true,
    },
    {
      kind: "toggle" as const,
      id: "mob_armor.show_chestplate",
      label: "Chestplate",
      defaultValue: true,
    },
    {
      kind: "toggle" as const,
      id: "mob_armor.show_leggings",
      label: "Leggings",
      defaultValue: true,
    },
    {
      kind: "toggle" as const,
      id: "mob_armor.show_boots",
      label: "Boots",
      defaultValue: true,
    },
  ];

  const getLayerContributions = (
    state: Parameters<NonNullable<EntityHandlerResult["getLayerContributions"]>>[0],
  ) => {
    const enabled = getToggle(state, "mob_armor.enabled", false);
    if (!enabled) return [];

    const material = getSelect(state, "mob_armor.material", humanoidArmorMaterials[0]!);
    const layer1Tex = findAssetId(ns, [`entity/equipment/humanoid/${material}`], all);
    const layer2Tex = findAssetId(ns, [`entity/equipment/humanoid_leggings/${material}`], all);

    const showHelmet = getToggle(state, "mob_armor.show_helmet", true);
    const showChest = getToggle(state, "mob_armor.show_chestplate", true);
    const showBoots = getToggle(state, "mob_armor.show_boots", true);
    const showLeggings = getToggle(state, "mob_armor.show_leggings", true);

    const layer1Overrides: Record<string, { visible?: boolean }> =
      showHelmet && showChest && showBoots
        ? { "*": { visible: true } }
        : {
            "*": { visible: false },
            ...(showHelmet ? { head: { visible: true } } : {}),
            ...(showChest
              ? {
                  body: { visible: true },
                  left_arm: { visible: true },
                  right_arm: { visible: true },
                }
              : {}),
            ...(showBoots
              ? { left_shoe: { visible: true }, right_shoe: { visible: true } }
              : {}),
          };

    const layers = [];

    if (layer1Tex) {
      layers.push({
        id: "mob_armor_layer_1",
        label: "Armor",
        kind: "cemModel" as const,
        cemEntityTypeCandidates: ["armor_layer_1"],
        textureAssetId: layer1Tex,
        blend: "normal" as const,
        zIndex: 130,
        opacity: 1,
        materialMode: { kind: "default" as const },
        boneRenderOverrides: layer1Overrides,
        boneScaleMultipliers: { head: { x: 1.01, y: 1.01, z: 1.01 } },
      });
    }

    if (layer2Tex) {
      layers.push({
        id: "mob_armor_layer_2",
        label: "Leggings",
        kind: "cemModel" as const,
        cemEntityTypeCandidates: ["armor_layer_2"],
        textureAssetId: layer2Tex,
        blend: "normal" as const,
        zIndex: 125,
        opacity: 1,
        materialMode: { kind: "default" as const },
        boneRenderOverrides: { "*": { visible: !!showLeggings } },
      });
    }

    return layers;
  };

  return {
    controls,
    getLayerContributions,
  };
};
