import { useMemo } from "react";
import { resolveEntityCompositeSchema } from "@lib/entityComposite";
import { groupAssetsForCards } from "@lib/utils/assetGrouping";
import { resolveBlockEntityRenderSpec } from "@lib/blockEntityResolver";

export const useEntityMetadata = (
  assetId: string | null | undefined,
  allAssetIds: string[],
) => {
  const blockEntitySpec = useMemo(
    () => (assetId ? resolveBlockEntityRenderSpec(assetId, allAssetIds) : null),
    [assetId, allAssetIds],
  );

  const entityAssetId = blockEntitySpec?.assetId ?? assetId;

  const combinedAssetIds = useMemo(() => {
    if (!assetId || allAssetIds.length === 0) return assetId ? [assetId] : [];
    const groups = groupAssetsForCards(allAssetIds);
    const group = groups.find((g) => g.variantIds.includes(assetId));
    return group ? group.variantIds : [assetId];
  }, [assetId, allAssetIds]);

  const entityFeatureSchema = useMemo(() => {
    if (!entityAssetId) return null;
    console.log(
      `[OptionsPanel.entityFeatureSchema] Resolving schema for assetId="${entityAssetId}"`,
    );
    const schema = resolveEntityCompositeSchema(entityAssetId, allAssetIds);
    if (schema) {
      console.log(
        `[OptionsPanel.entityFeatureSchema] Schema resolved: baseAssetId="${schema.baseAssetId}" controls=${schema.controls.length}`,
      );
    }
    return schema;
  }, [entityAssetId, allAssetIds]);

  return {
    entityAssetId,
    combinedAssetIds,
    entityFeatureSchema,
  };
};
