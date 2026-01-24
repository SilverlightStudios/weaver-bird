/**
 * Hook for resolving asset specifications (minecart, multi-block, block entity)
 */

import { useMemo } from "react";
import { resolveBlockEntityRenderSpec } from "@lib/blockEntityResolver";
import { getMultiBlockParts, type MultiBlockPart } from "@lib/multiBlockConfig";
import { resolveMinecartCompositeSpec } from "@lib/minecartComposite";
import { isEntityAsset } from "../EntityModel";

export function useAssetSpecs(
  assetId: string | undefined,
  sourceAssetId: string | undefined,
  blockProps: Record<string, string>,
  allAssetIds: string[],
) {
  const minecartCompositeSpec = useMemo(
    () => resolveMinecartCompositeSpec(sourceAssetId ?? assetId, allAssetIds),
    [sourceAssetId, assetId, allAssetIds],
  );

  const multiBlockParts = useMemo(
    () => (assetId ? getMultiBlockParts(assetId, blockProps) : null),
    [assetId, blockProps],
  );

  const blockEntitySpec = useMemo(
    () => (assetId ? resolveBlockEntityRenderSpec(assetId, allAssetIds) : null),
    [assetId, allAssetIds],
  );

  const directEntityAssetId =
    assetId && isEntityAsset(assetId) ? assetId : undefined;
  const entityAssetId = blockEntitySpec?.assetId ?? directEntityAssetId;
  const isMinecartEntity =
    entityAssetId?.replace(/^minecraft:/, "").startsWith("entity/minecart") ??
    false;

  return {
    minecartCompositeSpec,
    multiBlockParts,
    blockEntitySpec,
    entityAssetId,
    isMinecartEntity,
  };
}
