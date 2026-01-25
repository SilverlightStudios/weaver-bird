import type { EntityHandler, EntityHandlerResult } from "./types";
import { getToggle, findAssetId } from "./utils";

export const breezeHandler: EntityHandler = (context): EntityHandlerResult | null => {
  const { folderRoot, all, ns } = context;

  if (folderRoot !== "breeze") return null;

  const breezeWindTexture = findAssetId(
    ns,
    ["entity/breeze/breeze_wind", "entity/breeze/wind", "entity/breeze/breeze_air"],
    all,
  );
  const breezeWindChargeTexture = findAssetId(
    ns,
    ["entity/breeze/breeze_wind_charge", "entity/breeze/wind_charge"],
    all,
  );

  const controls = [];
  if (breezeWindTexture) {
    controls.push({
      kind: "toggle" as const,
      id: "breeze.wind",
      label: "Wind",
      defaultValue: false,
    });
  }
  if (breezeWindChargeTexture) {
    controls.push({
      kind: "toggle" as const,
      id: "breeze.wind_charge",
      label: "Wind Charge",
      defaultValue: false,
    });
  }

  if (controls.length === 0) return null;

  const getLayerContributions = (
    state: Parameters<NonNullable<EntityHandlerResult["getLayerContributions"]>>[0],
  ) => {
    const layers = [];

    if (breezeWindTexture && getToggle(state, "breeze.wind", false)) {
      layers.push({
        id: "breeze_wind",
        label: "Wind",
        kind: "cemModel" as const,
        cemEntityTypeCandidates: ["breeze_wind", "breeze_air", "wind"],
        textureAssetId: breezeWindTexture,
        blend: "additive" as const,
        zIndex: 170,
        opacity: 1,
        materialMode: { kind: "emissive" as const, intensity: 0.9 },
      });
    }

    if (breezeWindChargeTexture && getToggle(state, "breeze.wind_charge", false)) {
      layers.push({
        id: "breeze_wind_charge",
        label: "Wind Charge",
        kind: "cemModel" as const,
        cemEntityTypeCandidates: ["breeze_wind_charge", "wind_charge"],
        textureAssetId: breezeWindChargeTexture,
        blend: "additive" as const,
        zIndex: 175,
        opacity: 1,
        materialMode: { kind: "emissive" as const, intensity: 1 },
      });
    }

    return layers;
  };

  return {
    controls,
    getLayerContributions,
  };
};
