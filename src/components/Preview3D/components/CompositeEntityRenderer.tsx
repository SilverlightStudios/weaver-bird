/**
 * Renders entities that show both block and entity models
 */

import BlockModel from "../BlockModel";
import EntityModel from "../EntityModel";
import type { BlockEntitySpec } from "@lib/blockEntityResolver";

interface CompositeEntityRendererProps {
  assetId: string;
  entityAssetId: string;
  blockEntitySpec: BlockEntitySpec;
  effectiveBiomeColor: { r: number; g: number; b: number } | null | undefined;
  showPot: boolean;
  isPlantPotted: boolean;
  canBePotted: boolean;
  isColormapAsset: boolean;
  blockProps: Record<string, string>;
  seed: number;
  onTintDetected: (info: { hasTint: boolean; tintType?: "grass" | "foliage" }) => void;
}

export function CompositeEntityRenderer({
  assetId,
  entityAssetId,
  blockEntitySpec,
  effectiveBiomeColor,
  showPot,
  isPlantPotted,
  canBePotted,
  isColormapAsset,
  blockProps,
  seed,
  onTintDetected,
}: CompositeEntityRendererProps) {
  return (
    <>
      <BlockModel
        assetId={assetId}
        biomeColor={effectiveBiomeColor}
        onTintDetected={onTintDetected}
        showPot={showPot && !isColormapAsset}
        isPotted={(isPlantPotted || canBePotted) && !isColormapAsset}
        blockProps={blockProps}
        seed={seed}
      />
      <EntityModel
        assetId={entityAssetId}
        entityTypeOverride={blockEntitySpec.entityTypeOverride}
        parentEntityOverride={blockEntitySpec.parentEntityOverride}
      />
    </>
  );
}
