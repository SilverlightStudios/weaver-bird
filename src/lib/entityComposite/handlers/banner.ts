import type { AssetId } from "@state";
import type { EntityHandler, EntityHandlerResult } from "./types";
import { getSelect, stripNamespace, stableUnique, titleLabel, findAssetId } from "./utils";
import { DYE_COLORS, getDyeRgb } from "../dyeColors";

export const bannerHandler: EntityHandler = (context): EntityHandlerResult | null => {
  const { entityType, baseAssetId, all, ns, allAssetIds } = context;

  const bannerPatternPrefix = `${ns}:entity/banner/`;
  const bannerPatterns = allAssetIds
    .filter((id) => id.startsWith(bannerPatternPrefix))
    .map((id) => id as AssetId);

  const shouldOfferBannerPatterns =
    bannerPatterns.length > 0 &&
    (entityType === "banner" ||
      entityType === "banner_base" ||
      stripNamespace(baseAssetId).startsWith("entity/banner"));

  if (!shouldOfferBannerPatterns) return null;

  const bannerFullTexture =
    findAssetId(ns, ["entity/banner_base"], all) ??
    findAssetId(ns, ["entity/banner/base", "entity/banner/banner_base"], all);

  const controls = [
    {
      kind: "select" as const,
      id: "banner.placement",
      label: "Placement",
      defaultValue: "standing",
      options: [
        { value: "standing", label: "Standing" },
        { value: "wall", label: "Wall" },
      ],
    },
    {
      kind: "select" as const,
      id: "banner.facing",
      label: "Facing",
      defaultValue: "0",
      options: Array.from({ length: 16 }, (_, i) => ({
        value: String(i),
        label: `${i}`,
      })),
    },
    {
      kind: "select" as const,
      id: "banner.base_color",
      label: "Base Color",
      defaultValue: "white",
      options: DYE_COLORS.map((d) => ({ value: d.id, label: d.label })),
    },
  ];

  const patternOptions: Array<{ value: string; label: string }> = [{ value: "none", label: "None" }];

  for (const pat of stableUnique(bannerPatterns)) {
    const leafName = stripNamespace(pat).split("/").pop() ?? "";
    if (!leafName) continue;
    if (leafName === "base" || leafName === "banner_base") continue;
    patternOptions.push({ value: leafName, label: titleLabel(leafName) });
  }

  if (patternOptions.length > 1) {
    controls.push({
      kind: "select" as const,
      id: "banner.pattern",
      label: "Pattern",
      defaultValue: "none",
      options: patternOptions,
    });

    controls.push({
      kind: "select" as const,
      id: "banner.pattern_color",
      label: "Pattern Color",
      defaultValue: "black",
      options: DYE_COLORS.map((d) => ({ value: d.id, label: d.label })),
    });
  }

  const getBaseTextureAssetId = bannerFullTexture ? () => bannerFullTexture : undefined;

  const getCemEntityType = () => ({ entityType: "banner" as const, parentEntity: null });

  const getRootTransform = (
    state: Parameters<NonNullable<EntityHandlerResult["getRootTransform"]>>[0],
  ) => {
    const rot = parseInt(getSelect(state, "banner.facing", "0"), 10);
    const idx = Number.isFinite(rot) ? rot : 0;
    return { rotation: { x: 0, y: -idx * (Math.PI / 8), z: 0 } };
  };

  const getBoneRenderOverrides = (
    state: Parameters<NonNullable<EntityHandlerResult["getBoneRenderOverrides"]>>[0],
  ) => {
    const placement = getSelect(state, "banner.placement", "standing");
    if (placement !== "wall") return {};
    return { stand: { visible: false } };
  };

  const getLayerContributions = (
    state: Parameters<NonNullable<EntityHandlerResult["getLayerContributions"]>>[0],
  ) => {
    const layers = [];

    const bannerMaskTexture =
      findAssetId(ns, ["entity/banner/base", "entity/banner/banner_base"], all) ?? bannerFullTexture;

    const baseDyeId = getSelect(state, "banner.base_color", "white");
    const baseRgb = getDyeRgb(baseDyeId);

    if (bannerMaskTexture && baseDyeId !== "white") {
      layers.push({
        id: "banner_base_tint",
        label: "Base Color",
        kind: "cloneTexture" as const,
        textureAssetId: bannerMaskTexture,
        blend: "normal" as const,
        zIndex: 50,
        opacity: 1,
        materialMode: { kind: "tint" as const, color: baseRgb },
      });
    }

    const chosen = getSelect(state, "banner.pattern", "none");
    if (chosen !== "none") {
      const patAsset = `${ns}:entity/banner/${chosen}` as AssetId;
      if (all.has(patAsset)) {
        const patDyeId = getSelect(state, "banner.pattern_color", "black");
        const patRgb = getDyeRgb(patDyeId);
        layers.push({
          id: "banner_pattern",
          label: "Pattern",
          kind: "cloneTexture" as const,
          textureAssetId: patAsset,
          blend: "normal" as const,
          zIndex: 60,
          opacity: 1,
          materialMode: { kind: "tint" as const, color: patRgb },
        });
      }
    }

    return layers;
  };

  return {
    controls,
    ...(getBaseTextureAssetId ? { getBaseTextureAssetId } : {}),
    getCemEntityType,
    getRootTransform,
    getBoneRenderOverrides,
    getLayerContributions,
  };
};
