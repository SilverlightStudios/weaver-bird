import type { AssetId } from "@state";
import type { EntityHandler, EntityHandlerResult } from "./types";
import { getSelect, getDirectEntityDirAndLeaf, stableUnique } from "./utils";
import {
  collectVariantLeaves,
  detectVariantType,
  buildVariantOptionLabel,
} from "./base_variant_utils";

export const baseVariantHandler: EntityHandler = (context): EntityHandlerResult | null => {
  const { entityPath, all, ns } = context;

  const direct = getDirectEntityDirAndLeaf(entityPath);
  if (!direct) return null;

  // Skip bee and banner (they have custom handlers)
  if (direct.dir === "bee" || direct.dir === "banner" || direct.dir === "horse") return null;

  // Collect and detect variant type
  const variantLeaves = collectVariantLeaves(all, direct.dir);
  const uniqueLeavesRaw = stableUnique(variantLeaves);
  const { isVariant, label, sortedLeaves } = detectVariantType(uniqueLeavesRaw, direct.dir);

  if (!isVariant) return null;

  const defaultValue = sortedLeaves.includes(direct.leaf) ? direct.leaf : sortedLeaves[0]!;
  const isDyeDir = label === "Color";

  console.log(
    `[entityComposite.baseVariantHandler] Building variant control for "${direct.dir}": leaf="${direct.leaf}" defaultValue="${defaultValue}" options=${sortedLeaves.length}`,
  );

  const controls = [
    {
      kind: "select" as const,
      id: "entity.variant",
      label,
      defaultValue,
      options: sortedLeaves.map((v) => ({
        value: v,
        label: buildVariantOptionLabel(v, direct.dir, isDyeDir),
      })),
    },
  ];

  const getBaseTextureAssetId = (
    state: Parameters<NonNullable<EntityHandlerResult["getBaseTextureAssetId"]>>[0],
  ) => {
    const chosen = getSelect(state, "entity.variant", direct.leaf);
    const candidate = `${ns}:entity/${direct.dir}/${chosen}` as AssetId;
    return all.has(candidate) ? candidate : context.baseAssetId;
  };

  return {
    controls,
    getBaseTextureAssetId,
  };
};
