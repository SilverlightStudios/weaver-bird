import { useEffect, useRef, useMemo } from "react";
import { normalizeAssetId } from "@lib/assetUtils";
import { useBlockModelLoader } from "./BlockModel/useBlockModelLoader";
import { usePackResolution } from "./BlockModel/usePackResolution";

interface Props {
  assetId: string;
  biomeColor?: { r: number; g: number; b: number } | null;
  onTintDetected?: (info: {
    hasTint: boolean;
    tintType?: "grass" | "foliage";
  }) => void;
  showPot?: boolean;
  isPotted?: boolean;
  blockProps?: Record<string, string>;
  seed?: number;
  forcedPackId?: string;
  positionOffset?: [number, number, number];
}

// Default values defined outside component to prevent re-creation on every render
const EMPTY_BLOCK_PROPS: Record<string, string> = {};
const DEFAULT_POSITION_OFFSET: [number, number, number] = [0, 0, 0];

function BlockModel({
  assetId,
  biomeColor,
  onTintDetected,
  showPot = false,
  isPotted = false,
  blockProps = EMPTY_BLOCK_PROPS,
  seed = 0,
  forcedPackId,
  positionOffset = DEFAULT_POSITION_OFFSET,
}: Props) {
  const normalizedAssetId = normalizeAssetId(assetId);
  const groupRef = useRef<THREE.Group>(null);

  const { resolvedPackId, resolvedPack, packsDirPath } = usePackResolution(assetId, forcedPackId);

  const biomeColorKey = biomeColor
    ? `${biomeColor.r},${biomeColor.g},${biomeColor.b}`
    : null;
  const blockPropsKey = JSON.stringify(blockProps);

  // Create stable key for resolvedPack to avoid infinite re-renders
  const resolvedPackKey = resolvedPack
    ? `${resolvedPack.path}:${resolvedPack.is_zip}`
    : null;

  // Memoize config object to prevent infinite re-renders
  const loaderConfig = useMemo(
    () => ({
      normalizedAssetId,
      assetId,
      isPotted,
      showPot,
      blockProps,
      seed,
      resolvedPackId,
      resolvedPack,
      packsDirPath,
      biomeColor,
      onTintDetected,
    }),
    [
      normalizedAssetId,
      assetId,
      isPotted,
      showPot,
      blockProps,
      seed,
      resolvedPackId,
      resolvedPackKey, // Use stable key instead of object
      packsDirPath,
      biomeColor,
      onTintDetected,
    ]
  );

  const { blockGroup, error, loading } = useBlockModelLoader(
    loaderConfig,
    biomeColorKey,
    blockPropsKey,
  );

  if (error) {
    console.error("[BlockModel] Rendering error state:", error);
  }

  if (loading || !blockGroup) {
    return null;
  }

  return (
    <group ref={groupRef} position={positionOffset}>
      <primitive object={blockGroup} />
    </group>
  );
}

export default BlockModel;
