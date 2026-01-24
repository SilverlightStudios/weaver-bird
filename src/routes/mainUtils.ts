/**
 * Utility functions for main route
 */

import type { AssetId } from "@state";
import { is2DOnlyTexture, isParticleTexture } from "@lib/assetUtils";

export type CanvasRenderMode = "3D" | "2D" | "Item";

/**
 * Get preview IDs for different render modes
 */
export function getPreviewIds(
  selectedAssetId: AssetId | undefined,
  blockItemPair: { blockId?: AssetId; itemId?: AssetId } | null,
  canvas2DTextureSource: "block" | "item",
): {
  previewBlockId: AssetId | undefined;
  previewItemId: AssetId | undefined;
  preview2DId: AssetId | undefined;
} {
  const previewBlockId = blockItemPair?.blockId ?? selectedAssetId ?? undefined;
  const previewItemId = blockItemPair?.itemId ?? selectedAssetId ?? undefined;
  const preview2DId =
    blockItemPair?.blockId &&
    blockItemPair?.itemId &&
    canvas2DTextureSource === "item"
      ? blockItemPair.itemId
      : previewBlockId ?? previewItemId;

  return { previewBlockId, previewItemId, preview2DId };
}

/**
 * Determine effective canvas render mode based on asset type and user selection
 */
export function getEffectiveCanvasMode(
  selectedAssetId: AssetId | undefined,
  canvasRenderMode: CanvasRenderMode,
): CanvasRenderMode {
  if (!selectedAssetId) {
    return "3D"; // Default to 3D when nothing selected
  }

  const is2DOnly = is2DOnlyTexture(selectedAssetId);
  const isParticle = isParticleTexture(selectedAssetId);

  // 2D-only textures (GUI, etc.) can't be rendered as 3D or items
  // Note: Particles are NOT 2D-only - they support both 2D and 3D modes via PreviewParticle
  if (is2DOnly && !isParticle && (canvasRenderMode === "3D" || canvasRenderMode === "Item")) {
    return "2D";
  }

  return canvasRenderMode;
}
