import type { AssetId } from "@state";
import type { EntityHandler, EntityHandlerResult } from "./types";
import { getSelect, getEntityPath, stableUnique, titleLabel, findAssetId } from "./utils";

export const decoratedPotHandler: EntityHandler = (context): EntityHandlerResult | null => {
  const { folderRoot, dir, all, ns, baseAssetId } = context;

  if (folderRoot !== "decorated_pot" && dir !== "decorated_pot") return null;

  const basePotTexture =
    findAssetId(
      ns,
      ["entity/decorated_pot/decorated_pot_base", "entity/decorated_pot_base"],
      all,
    ) ?? baseAssetId;
  const sidePotTexture =
    findAssetId(
      ns,
      ["entity/decorated_pot/decorated_pot_side", "entity/decorated_pot_side"],
      all,
    ) ?? basePotTexture;

  const patternLeaves: string[] = [];
  for (const id of all) {
    const p = getEntityPath(id);
    if (!p) continue;
    if (!p.startsWith("decorated_pot/")) continue;
    const leafName = p.split("/").pop();
    if (!leafName) continue;
    if (leafName === "decorated_pot_base" || leafName === "decorated_pot_side") continue;
    patternLeaves.push(leafName);
  }

  const patterns = stableUnique(patternLeaves);
  const controls = [
    {
      kind: "select" as const,
      id: "decorated_pot.pattern",
      label: "Pottery Sherd",
      defaultValue: "none",
      options: [
        { value: "none", label: "None" },
        ...patterns.map((p) => ({
          value: p,
          label: titleLabel(p.replace(/_pottery_pattern$/, "")),
        })),
      ],
    },
  ];

  const getBaseTextureAssetId = () => basePotTexture;

  const getCemEntityType = () => ({ entityType: "decorated_pot" as const, parentEntity: null });

  const getPartTextureOverrides = (
    state: Parameters<NonNullable<EntityHandlerResult["getPartTextureOverrides"]>>[0],
  ) => {
    const chosen = getSelect(state, "decorated_pot.pattern", "none");
    const patternCandidate =
      chosen === "none" ? null : (`${ns}:entity/decorated_pot/${chosen}` as AssetId);
    const patternTex =
      patternCandidate && all.has(patternCandidate) ? patternCandidate : sidePotTexture;

    return {
      neck: basePotTexture,
      top: basePotTexture,
      bottom: basePotTexture,
      front: patternTex,
      back: patternTex,
      left: patternTex,
      right: patternTex,
    };
  };

  return {
    controls,
    getBaseTextureAssetId,
    getCemEntityType,
    getPartTextureOverrides,
  };
};
