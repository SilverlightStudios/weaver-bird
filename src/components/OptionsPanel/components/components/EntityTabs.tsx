import type { EntityFeatureRecord } from "@lib/packFormatCompatibility";
import { EntityVariantTab } from "../tabs/EntityVariantTab";
import { AnimationsTab } from "../tabs/AnimationsTab";
import { EntityFeaturesTab } from "../tabs/EntityFeaturesTab";

interface EntityTabsProps {
  entityAssetId: string | null;
  entityFeatureSchema: EntityFeatureRecord | null;
  shouldShowEntityVariantTab: boolean;
  shouldShowAnimationsTab: boolean;
  shouldShowEntityFeaturesTab: boolean;
}

export function EntityTabs({
  entityAssetId,
  entityFeatureSchema,
  shouldShowEntityVariantTab,
  shouldShowAnimationsTab,
  shouldShowEntityFeaturesTab,
}: EntityTabsProps) {
  return (
    <>
      {shouldShowEntityVariantTab && entityAssetId && (
        <EntityVariantTab assetId={entityAssetId} />
      )}

      {shouldShowAnimationsTab && <AnimationsTab />}

      {shouldShowEntityFeaturesTab && entityFeatureSchema && (
        <EntityFeaturesTab schema={entityFeatureSchema} />
      )}
    </>
  );
}
