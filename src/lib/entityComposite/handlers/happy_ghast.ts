import type { AssetId } from "@state";
import type { EntityHandler, EntityHandlerResult } from "./types";
import { getToggle, getSelect, stripNamespace, stableUnique, titleLabel } from "./utils";

export const happyGhastHandler: EntityHandler = (context): EntityHandlerResult | null => {
  const { folderRoot, all, ns } = context;

  if (folderRoot !== "happy_ghast") return null;

  const findEquipment = (path: string): AssetId | null => {
    for (const id of all) {
      const stripped = stripNamespace(id);
      if (stripped === `entity/equipment/${path}`) return id;
    }
    return null;
  };

  let happyGhastHarnessColors: string[] = [];
  for (const id of all) {
    if (!id.startsWith(`${ns}:entity/equipment/happy_ghast_body/`)) continue;
    const leafName = stripNamespace(id).split("/").pop();
    if (!leafName || !leafName.endsWith("_harness")) continue;
    happyGhastHarnessColors.push(leafName.replace(/_harness$/, ""));
  }
  happyGhastHarnessColors = stableUnique(happyGhastHarnessColors);

  if (happyGhastHarnessColors.length === 0) return null;

  const controls = [
    {
      kind: "toggle" as const,
      id: "happy_ghast.harness",
      label: "Harness",
      defaultValue: false,
    },
    {
      kind: "select" as const,
      id: "happy_ghast.harness_color",
      label: "Harness Color",
      defaultValue: happyGhastHarnessColors.includes("brown")
        ? "brown"
        : happyGhastHarnessColors[0]!,
      options: happyGhastHarnessColors.map((c) => ({
        value: c,
        label: titleLabel(c),
      })),
    },
  ];

  const getLayerContributions = (
    state: Parameters<NonNullable<EntityHandlerResult["getLayerContributions"]>>[0],
  ) => {
    const enabled = getToggle(state, "happy_ghast.harness", false);
    if (!enabled) return [];

    const color = getSelect(state, "happy_ghast.harness_color", happyGhastHarnessColors[0]!);
    const tex = findEquipment(`happy_ghast_body/${color}_harness`);
    if (!tex) return [];

    return [
      {
        id: "happy_ghast_harness",
        label: "Harness",
        kind: "cemModel" as const,
        cemEntityTypeCandidates: ["happy_ghast_harness"],
        textureAssetId: tex,
        blend: "normal" as const,
        zIndex: 140,
        opacity: 1,
        materialMode: { kind: "default" as const },
        boneAliasMap: { goggles: "body", harness: "body" },
      },
    ];
  };

  return {
    controls,
    getLayerContributions,
  };
};
