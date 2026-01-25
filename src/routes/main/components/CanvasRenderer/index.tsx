import { forwardRef } from "react";
import Preview2D from "@components/Preview2D";
import Preview3D from "@components/Preview3D";
import PreviewItem from "@components/PreviewItem";
import PreviewParticle from "@components/PreviewParticle";
import { isParticleTexture } from "@lib/assetUtils";
import type { ItemDisplayMode } from "@lib/itemDisplayModes";
import { getPreviewIds, getEffectiveCanvasMode } from "../../../mainUtils";

interface CanvasRendererProps {
  selectedAssetId: string | undefined;
  blockItemPair: { blockId?: string; itemId?: string } | null;
  canvas2DTextureSource: "block" | "item";
  canvasRenderMode: "2D" | "3D" | "Item";
  viewingVariantId: string | undefined;
  biomeColor: { r: number; g: number; b: number } | undefined;
  showPot: boolean;
  blockProps: Record<string, string>;
  particleConditionOverrides: Record<string, string>;
  seed: number;
  allAssetIds: string[];
  itemDisplayMode: ItemDisplayMode;
  onTintDetected: (tintInfo: {
    hasTint: boolean;
    tintType?: "grass" | "foliage";
  }) => void;
}

export const CanvasRenderer = forwardRef<HTMLDivElement, CanvasRendererProps>(
  (
    {
      selectedAssetId,
      blockItemPair,
      canvas2DTextureSource,
      canvasRenderMode,
      viewingVariantId,
      biomeColor,
      showPot,
      blockProps,
      particleConditionOverrides,
      seed,
      allAssetIds,
      itemDisplayMode,
      onTintDetected,
    },
    ref,
  ) => {
    const { previewBlockId, previewItemId, preview2DId } = getPreviewIds(
      selectedAssetId,
      blockItemPair,
      canvas2DTextureSource,
    );

    const effectiveMode = getEffectiveCanvasMode(
      selectedAssetId,
      canvasRenderMode,
    );

    const isParticle =
      selectedAssetId && isParticleTexture(selectedAssetId);

    let content;

    // Particles use PreviewParticle which handles both 2D and 3D modes internally
    if (isParticle && selectedAssetId) {
      content = <PreviewParticle assetId={selectedAssetId} />;
    } else {
      switch (effectiveMode) {
        case "2D":
          content = selectedAssetId ? (
            <Preview2D assetId={preview2DId} />
          ) : null;
          break;
        case "Item":
          content = selectedAssetId ? (
            <PreviewItem
              assetId={previewItemId}
              displayMode={itemDisplayMode}
            />
          ) : null;
          break;
        case "3D":
        default:
          content = (
            <Preview3D
              assetId={viewingVariantId ?? previewBlockId}
              sourceAssetId={viewingVariantId ?? selectedAssetId}
              biomeColor={biomeColor}
              onTintDetected={onTintDetected}
              showPot={showPot}
              blockProps={blockProps}
              particleConditionOverrides={particleConditionOverrides}
              seed={seed}
              allAssetIds={allAssetIds}
            />
          );
      }
    }

    return (
      <div ref={ref} style={{ width: "100%", height: "100%" }}>
        {content}
      </div>
    );
  },
);

CanvasRenderer.displayName = "CanvasRenderer";
