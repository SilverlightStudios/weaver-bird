import {
  is2DOnlyTexture,
  isEntityTexture,
  isMinecraftItem,
  isParticleTexture,
} from "@lib/assetUtils";

interface CanvasDisabledStates {
  disabled2D: boolean;
  disabled3D: boolean;
  disabledItem: boolean;
}

export function getCanvasDisabledStates(
  selectedAssetId: string | undefined,
  blockItemPair: { blockId?: string; itemId?: string } | null,
): CanvasDisabledStates {
  if (!selectedAssetId) {
    return {
      disabled2D: false,
      disabled3D: false,
      disabledItem: false,
    };
  }

  return {
    disabled2D:
      !is2DOnlyTexture(selectedAssetId) &&
      !isEntityTexture(selectedAssetId) &&
      !isMinecraftItem(selectedAssetId) &&
      !isParticleTexture(selectedAssetId),
    disabled3D:
      (is2DOnlyTexture(selectedAssetId) &&
        !isParticleTexture(selectedAssetId)) ||
      (isMinecraftItem(selectedAssetId) && !blockItemPair?.blockId),
    disabledItem:
      isEntityTexture(selectedAssetId) ||
      is2DOnlyTexture(selectedAssetId) ||
      isParticleTexture(selectedAssetId),
  };
}
