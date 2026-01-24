import type { AssetId } from "@state";
import type { EntityHandler, EntityHandlerResult } from "./types";
import { getSelect, getEntityPath, getDirectEntityDirAndLeaf, stableUnique, titleLabel } from "./utils";
import { isEntityFeatureLayerTextureAssetId } from "../layerDetection";

export const llamaHandler: EntityHandler = (context): EntityHandlerResult | null => {
  const { folderRoot, all, ns, baseAssetId } = context;

  if (folderRoot !== "llama") return null;

  const furLeaves: string[] = [];
  for (const id of all) {
    if (isEntityFeatureLayerTextureAssetId(id)) continue;
    const p = getEntityPath(id);
    if (!p) continue;
    const d = getDirectEntityDirAndLeaf(p);
    if (!d) continue;
    if (d.dir !== "llama") continue;
    furLeaves.push(d.leaf);
  }

  const furColors = stableUnique(furLeaves);
  if (furColors.length <= 1) return null;

  const controls = [
    {
      kind: "select" as const,
      id: "llama.fur_color",
      label: "Fur Color",
      defaultValue: furColors.includes("creamy")
        ? "creamy"
        : furColors.includes("white")
          ? "white"
          : furColors[0]!,
      options: furColors.map((c) => ({ value: c, label: titleLabel(c) })),
    },
  ];

  const getBaseTextureAssetId = (state: Parameters<NonNullable<EntityHandlerResult["getBaseTextureAssetId"]>>[0]) => {
    const chosen = getSelect(state, "llama.fur_color", furColors[0]!);
    const candidate = `${ns}:entity/llama/${chosen}` as AssetId;
    return all.has(candidate) ? candidate : baseAssetId;
  };

  return {
    controls,
    getBaseTextureAssetId,
  };
};
