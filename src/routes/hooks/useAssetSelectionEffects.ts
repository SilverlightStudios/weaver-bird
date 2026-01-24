/**
 * Asset Selection Effects Hook
 *
 * Handles side effects when asset selection changes.
 */

import { useEffect } from "react";
import { useStore } from "@/state/store";
import { isMinecraftItem, isParticleTexture, is2DOnlyTexture } from "@/lib/assetUtils";
import type { ItemDisplayMode } from "@lib/itemDisplayModes";

export function useAssetSelectionEffects(
  selectedAssetId: string | undefined,
  blockItemPair: { blockId?: string; itemId?: string } | null,
  setTintInfo: (info: { hasTint: boolean; tintType?: "grass" | "foliage" }) => void,
  setBlockProps: (props: Record<string, string>) => void,
  setSeed: (seed: number) => void,
  setItemDisplayMode: (mode: ItemDisplayMode) => void,
  setViewingVariantId: (id: string | undefined) => void,
) {
  const setCanvasRenderMode = useStore((state) => state.setCanvasRenderMode);
  const setCanvas2DTextureSource = useStore((state) => state.setCanvas2DTextureSource);

  useEffect(() => {
    setTintInfo({ hasTint: false, tintType: undefined });
    setBlockProps({});
    setSeed(0);
    setItemDisplayMode("ground");
    setViewingVariantId(undefined);

    if (selectedAssetId) {
      const hasBlockCounterpart = Boolean(blockItemPair?.blockId);
      if (isMinecraftItem(selectedAssetId) && !hasBlockCounterpart) {
        setCanvasRenderMode("Item");
      } else if (isParticleTexture(selectedAssetId)) {
        setCanvasRenderMode("3D");
      } else if (is2DOnlyTexture(selectedAssetId)) {
        setCanvasRenderMode("2D");
      } else {
        setCanvasRenderMode("3D");
      }
    }
  }, [
    selectedAssetId,
    blockItemPair?.blockId,
    setCanvasRenderMode,
    setTintInfo,
    setBlockProps,
    setSeed,
    setItemDisplayMode,
    setViewingVariantId,
  ]);

  useEffect(() => {
    if (!blockItemPair?.blockId || !blockItemPair?.itemId) {
      setCanvas2DTextureSource("block");
    }
  }, [blockItemPair?.blockId, blockItemPair?.itemId, setCanvas2DTextureSource]);
}
