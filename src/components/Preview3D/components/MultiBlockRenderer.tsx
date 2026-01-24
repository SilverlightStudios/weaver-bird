/**
 * Renders multi-part block structures (doors, beds, etc.)
 */

import BlockModel from "../BlockModel";
import type { MultiBlockPart } from "@lib/multiBlockConfig";

interface MultiBlockRendererProps {
  assetId: string;
  multiBlockParts: MultiBlockPart[];
  effectiveBiomeColor: { r: number; g: number; b: number } | null | undefined;
  showPot: boolean;
  isPlantPotted: boolean;
  canBePotted: boolean;
  isColormapAsset: boolean;
  blockProps: Record<string, string>;
  seed: number;
  onTintDetected: (info: { hasTint: boolean; tintType?: "grass" | "foliage" }) => void;
}

export function MultiBlockRenderer({
  assetId,
  multiBlockParts,
  effectiveBiomeColor,
  showPot,
  isPlantPotted,
  canBePotted,
  isColormapAsset,
  blockProps,
  seed,
  onTintDetected,
}: MultiBlockRendererProps) {
  return (
    <>
      {multiBlockParts.map((part, index) => (
        <BlockModel
          key={`${part.assetId ?? assetId}-${index}`}
          assetId={part.assetId ?? assetId}
          biomeColor={effectiveBiomeColor}
          onTintDetected={index === 0 ? onTintDetected : undefined}
          showPot={showPot && !isColormapAsset}
          isPotted={(isPlantPotted || canBePotted) && !isColormapAsset}
          blockProps={{
            ...blockProps,
            ...(part.overrides ?? {}),
          }}
          seed={seed}
          positionOffset={part.offset}
        />
      ))}
    </>
  );
}
