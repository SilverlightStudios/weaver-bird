/**
 * Renders entity-only models
 */

import EntityModel from "../EntityModel";
import type { BlockEntitySpec } from "@lib/blockEntityResolver";

interface EntityOnlyRendererProps {
  entityAssetId: string;
  blockEntitySpec: BlockEntitySpec | null;
}

export function EntityOnlyRenderer({
  entityAssetId,
  blockEntitySpec,
}: EntityOnlyRendererProps) {
  return (
    <EntityModel
      assetId={entityAssetId}
      entityTypeOverride={blockEntitySpec?.entityTypeOverride}
      parentEntityOverride={blockEntitySpec?.parentEntityOverride}
    />
  );
}
