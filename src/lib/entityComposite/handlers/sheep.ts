import type { AssetId } from "@state";
import type { EntityHandler, EntityHandlerResult } from "./types";
import type { EntityLayerDefinition, EntityFeatureStateView } from "../types";
import { findAssetId, getSelect } from "./utils";
import { DYE_COLORS, getDyeRgb } from "../dyeColors";

export const sheepHandler: EntityHandler = (context): EntityHandlerResult | null => {
  const { folderRoot, dir, leaf, all, ns, baseAssetId } = context;

  if (folderRoot !== "sheep") return null;

  // Find wool/fur textures
  const sheepWoolTexture = findAssetId(
    ns,
    [
      dir ? `entity/${dir}/${leaf}_wool` : `entity/${leaf}_wool`,
      dir ? `entity/${dir}/${leaf}_fur` : `entity/${leaf}_fur`,
      "entity/sheep/sheep_fur",
      "entity/sheep/sheep_wool",
    ],
    all,
  );

  const sheepUndercoatTexture =
    findAssetId(
      ns,
      [
        dir ? `entity/${dir}/${leaf}_wool_undercoat` : `entity/${leaf}_wool_undercoat`,
        dir ? `entity/${dir}/${leaf}_undercoat` : `entity/${leaf}_undercoat`,
      ],
      all,
    ) ?? sheepWoolTexture;

  // If no wool textures found, no controls needed
  if (!sheepWoolTexture && !sheepUndercoatTexture) return null;

  const dyeOptions = DYE_COLORS.map((d) => ({ value: d.id, label: d.label }));

  const controls: EntityHandlerResult["controls"] = [
    {
      kind: "select",
      id: "sheep.coat_state",
      label: "Coat",
      defaultValue: "full",
      options: [
        { value: "full", label: "Full" },
        { value: "sheared", label: "Sheared" },
        { value: "bare", label: "Bare" },
      ],
    },
    {
      kind: "select",
      id: "sheep.color",
      label: "Wool Color",
      defaultValue: "white",
      options: dyeOptions,
    },
  ];

  const getLayerContributions = (state: EntityFeatureStateView): EntityLayerDefinition[] => {
    const layers: EntityLayerDefinition[] = [];

    const coatState = getSelect(state, "sheep.coat_state", "full");
    const dyeId = getSelect(state, "sheep.color", "white");
    const rgb = getDyeRgb(dyeId);

    const wantUndercoat = coatState === "full" || coatState === "sheared";
    const wantOuterCoat = coatState === "full";

    // Use cemModel to load separate JEM files for wool geometry
    // (not cloneTexture which would reuse the base sheep geometry)
    // syncToBasePose: true ensures wool follows the sheep's animations
    if (wantUndercoat && sheepUndercoatTexture) {
      layers.push({
        id: "sheep_undercoat",
        label: "Undercoat",
        kind: "cemModel",
        cemEntityTypeCandidates: [
          "sheep_wool_undercoat",
          "sheep_fur",
          "sheep_wool",
        ],
        textureAssetId: sheepUndercoatTexture,
        blend: "normal",
        zIndex: 120,
        opacity: 1,
        materialMode: { kind: "tint", color: rgb },
        syncToBasePose: true,
      });
    }

    if (wantOuterCoat && sheepWoolTexture) {
      layers.push({
        id: "sheep_wool",
        label: "Wool",
        kind: "cemModel",
        cemEntityTypeCandidates: ["sheep_wool", "sheep_fur"],
        textureAssetId: sheepWoolTexture,
        blend: "normal",
        zIndex: 130,
        opacity: 1,
        materialMode: { kind: "tint", color: rgb },
        syncToBasePose: true,
      });
    }

    return layers;
  };

  return {
    controls,
    getLayerContributions,
  };
};
