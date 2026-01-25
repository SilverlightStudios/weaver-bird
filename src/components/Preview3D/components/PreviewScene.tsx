/**
 * Scene content for Preview3D - routes to appropriate renderer
 */

import { MinecartEntityRenderer } from "./MinecartEntityRenderer";
import { CompositeEntityRenderer } from "./CompositeEntityRenderer";
import { EntityOnlyRenderer } from "./EntityOnlyRenderer";
import { MultiBlockRenderer } from "./MultiBlockRenderer";
import { StandardBlockRenderer } from "./StandardBlockRenderer";
import type { MultiBlockPart } from "@lib/multiBlockConfig";
import type { BlockEntitySpec } from "@lib/blockEntityResolver";
import type { MinecartCompositeSpec } from "@lib/minecartComposite";

interface PreviewSceneProps {
  assetId: string;
  isColormapAsset: boolean;
  entityAssetId: string | undefined;
  isMinecartEntity: boolean;
  minecartCompositeSpec: MinecartCompositeSpec | null;
  blockEntitySpec: BlockEntitySpec | null;
  multiBlockParts: MultiBlockPart[] | null;
  effectiveBiomeColor: { r: number; g: number; b: number } | null | undefined;
  showPot: boolean;
  isPlantPotted: boolean;
  canBePotted: boolean;
  blockProps: Record<string, string>;
  seed: number;
  onTintDetected: (info: { hasTint: boolean; tintType?: "grass" | "foliage" }) => void;
}

export function PreviewScene({
  assetId,
  isColormapAsset,
  entityAssetId,
  isMinecartEntity,
  minecartCompositeSpec,
  blockEntitySpec,
  multiBlockParts,
  effectiveBiomeColor,
  showPot,
  isPlantPotted,
  canBePotted,
  blockProps,
  seed,
  onTintDetected,
}: PreviewSceneProps) {
  console.log("[PreviewScene] DEBUG:", {
    assetId,
    entityAssetId,
    isMinecartEntity,
    hasMinecartSpec: !!minecartCompositeSpec,
    hasBlockEntitySpec: !!blockEntitySpec,
    renderBoth: blockEntitySpec?.renderBoth,
    hasMultiBlockParts: !!multiBlockParts,
  });

  // Entity with minecart
  if (entityAssetId && isMinecartEntity && minecartCompositeSpec) {
    console.log("[PreviewScene] → Taking MINECART path");
    return (
      <MinecartEntityRenderer
        entityAssetId={entityAssetId}
        minecartCompositeSpec={minecartCompositeSpec}
        blockEntitySpec={blockEntitySpec}
        effectiveBiomeColor={effectiveBiomeColor}
        seed={seed}
      />
    );
  }

  // Entity with both block and entity rendering
  if (entityAssetId && blockEntitySpec?.renderBoth) {
    console.log("[PreviewScene] → Taking COMPOSITE (renderBoth) path");
    return (
      <CompositeEntityRenderer
        assetId={assetId}
        entityAssetId={entityAssetId}
        blockEntitySpec={blockEntitySpec}
        effectiveBiomeColor={effectiveBiomeColor}
        showPot={showPot}
        isPlantPotted={isPlantPotted}
        canBePotted={canBePotted}
        isColormapAsset={isColormapAsset}
        blockProps={blockProps}
        seed={seed}
        onTintDetected={onTintDetected}
      />
    );
  }

  // Entity-only rendering
  if (entityAssetId) {
    console.log("[PreviewScene] → Taking ENTITY-ONLY path");
    return (
      <EntityOnlyRenderer
        entityAssetId={entityAssetId}
        blockEntitySpec={blockEntitySpec}
      />
    );
  }

  // Multi-part block model
  if (multiBlockParts) {
    console.log("[PreviewScene] → Taking MULTI-BLOCK path");
    return (
      <MultiBlockRenderer
        assetId={assetId}
        multiBlockParts={multiBlockParts}
        effectiveBiomeColor={effectiveBiomeColor}
        showPot={showPot}
        isPlantPotted={isPlantPotted}
        canBePotted={canBePotted}
        isColormapAsset={isColormapAsset}
        blockProps={blockProps}
        seed={seed}
        onTintDetected={onTintDetected}
      />
    );
  }

  // Standard block model
  console.log("[PreviewScene] → Taking STANDARD BLOCK path");
  return (
    <StandardBlockRenderer
      assetId={assetId}
      effectiveBiomeColor={effectiveBiomeColor}
      showPot={showPot}
      isPlantPotted={isPlantPotted}
      canBePotted={canBePotted}
      isColormapAsset={isColormapAsset}
      blockProps={blockProps}
      seed={seed}
      onTintDetected={onTintDetected}
    />
  );
}
