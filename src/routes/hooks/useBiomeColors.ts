/**
 * Biome Colors Hook
 *
 * Manages biome color selection and colormap overrides.
 */

import { useMemo } from "react";
import { useStore } from "@/state/store";
import {
  GRASS_COLORMAP_ASSET_ID,
  FOLIAGE_COLORMAP_ASSET_ID,
} from "@/constants/colormaps";
import {
  getColormapTypeFromAssetId,
} from "@/lib/assetUtils";
import { getBlockTintType } from "@/constants/vanillaBlockColors";

const useSelectedFoliageColor = () =>
  useStore((state) => state.selectedFoliageColor);
const useSelectedGrassColor = () =>
  useStore((state) => state.selectedGrassColor);

/**
 * Get the biome color for the currently selected asset
 */
export function useBiomeColors(selectedAssetId: string | undefined) {
  const selectedGrassColor = useSelectedGrassColor();
  const selectedFoliageColor = useSelectedFoliageColor();

  const biomeColor = useMemo(() => {
    if (!selectedAssetId) return undefined;

    // First check if it's a colormap asset itself
    const colormapType = getColormapTypeFromAssetId(selectedAssetId);
    if (colormapType === "grass") return selectedGrassColor;
    if (colormapType === "foliage") return selectedFoliageColor;

    // Extract base block name by removing texture suffix patterns
    let baseAssetId = selectedAssetId;
    const textureSuffixes = [
      "_side_overlay",
      "_side",
      "_top",
      "_bottom",
      "_overlay",
      "_particle",
      "_snow",
    ];

    let changed = true;
    while (changed) {
      changed = false;
      for (const suffix of textureSuffixes) {
        if (baseAssetId.endsWith(suffix)) {
          baseAssetId = baseAssetId.substring(0, baseAssetId.length - suffix.length);
          changed = true;
          break;
        }
      }
    }

    // Convert assetId to blockId
    let baseBlockId = baseAssetId;
    if (baseBlockId.includes("/block/")) {
      baseBlockId = baseBlockId.replace("/block/", ":");
    } else if (baseBlockId.includes("/item/")) {
      baseBlockId = baseBlockId.replace("/item/", ":");
    } else {
      baseBlockId = baseBlockId.replace(":block/", ":");
      baseBlockId = baseBlockId.replace(":item/", ":");
    }

    const tintType = getBlockTintType(baseBlockId);
    if (tintType === "grass") return selectedGrassColor;
    if (tintType === "foliage") return selectedFoliageColor;

    return undefined;
  }, [selectedAssetId, selectedGrassColor, selectedFoliageColor]);

  // Track colormap-specific override changes with stable key
  const colormapOverridesKey = useStore((state) => {
    const grassOverride = state.overrides[GRASS_COLORMAP_ASSET_ID];
    const foliageOverride = state.overrides[FOLIAGE_COLORMAP_ASSET_ID];

    const grassKey = grassOverride
      ? `${grassOverride.packId}:${grassOverride.variantPath ?? ""}`
      : "none";
    const foliageKey = foliageOverride
      ? `${foliageOverride.packId}:${foliageOverride.variantPath ?? ""}`
      : "none";

    return `${grassKey}|${foliageKey}`;
  });

  const colormapOverrides = useMemo(() => {
    const state = useStore.getState();
    const filtered: Record<string, { packId: string; variantPath?: string }> = {};

    if (state.overrides[GRASS_COLORMAP_ASSET_ID]) {
      filtered[GRASS_COLORMAP_ASSET_ID] = state.overrides[GRASS_COLORMAP_ASSET_ID];
    }
    if (state.overrides[FOLIAGE_COLORMAP_ASSET_ID]) {
      filtered[FOLIAGE_COLORMAP_ASSET_ID] = state.overrides[FOLIAGE_COLORMAP_ASSET_ID];
    }

    return filtered;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colormapOverridesKey]);

  return {
    biomeColor,
    colormapOverrides,
    selectedGrassColor,
    selectedFoliageColor,
  };
}
