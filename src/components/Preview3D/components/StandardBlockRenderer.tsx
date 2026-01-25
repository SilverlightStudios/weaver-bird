/**
 * Renders standard single-block models
 */

import BlockModel from "../BlockModel";

interface StandardBlockRendererProps {
  assetId: string;
  effectiveBiomeColor: { r: number; g: number; b: number } | null | undefined;
  showPot: boolean;
  isPlantPotted: boolean;
  canBePotted: boolean;
  isColormapAsset: boolean;
  blockProps: Record<string, string>;
  seed: number;
  onTintDetected: (info: { hasTint: boolean; tintType?: "grass" | "foliage" }) => void;
}

export function StandardBlockRenderer({
  assetId,
  effectiveBiomeColor,
  showPot,
  isPlantPotted,
  canBePotted,
  isColormapAsset,
  blockProps,
  seed,
  onTintDetected,
}: StandardBlockRendererProps) {
  return (
    <BlockModel
      assetId={assetId}
      biomeColor={effectiveBiomeColor}
      onTintDetected={onTintDetected}
      showPot={showPot && !isColormapAsset}
      isPotted={(isPlantPotted || canBePotted) && !isColormapAsset}
      blockProps={blockProps}
      seed={seed}
    />
  );
}
