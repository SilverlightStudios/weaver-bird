/**
 * Hook to compute asset-related boolean flags
 */
import {
  getBlockStateIdFromAssetId,
  isBiomeColormapAsset,
  isPottedPlant,
  isMinecraftItem,
  isSignTexture,
  isHangingSign,
} from "@lib/assetUtils";

export interface AssetFlags {
  isPlantPotted: boolean;
  isColormapSelection: boolean;
  isItem: boolean;
  isSign: boolean;
  isHangingSignAsset: boolean;
  isMinecraftNamespace: boolean;
  blockStateAssetId: string | null;
}

export function useAssetFlags(assetId: string | undefined | null): AssetFlags {
  const isPlantPotted = assetId ? isPottedPlant(assetId) : false;
  const isColormapSelection = assetId ? isBiomeColormapAsset(assetId) : false;
  const isItem = assetId ? isMinecraftItem(assetId) : false;
  const isSign = assetId ? isSignTexture(assetId) : false;
  const isHangingSignAsset = assetId ? isHangingSign(assetId) : false;
  const isMinecraftNamespace = assetId?.startsWith("minecraft:") ?? false;
  const blockStateAssetId =
    assetId != null ? getBlockStateIdFromAssetId(assetId) : null;

  return {
    isPlantPotted,
    isColormapSelection,
    isItem,
    isSign,
    isHangingSignAsset,
    isMinecraftNamespace,
    blockStateAssetId,
  };
}
