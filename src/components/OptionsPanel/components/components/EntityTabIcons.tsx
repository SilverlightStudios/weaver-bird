import { TabIcon } from "../TabIcon";

interface EntityTabIconsProps {
  shouldShowEntityVariantTab: boolean;
  shouldShowAnimationsTab: boolean;
  shouldShowEntityFeaturesTab: boolean;
}

export function EntityTabIcons({
  shouldShowEntityVariantTab,
  shouldShowAnimationsTab,
  shouldShowEntityFeaturesTab,
}: EntityTabIconsProps) {
  return (
    <>
      {shouldShowEntityVariantTab && (
        <TabIcon icon="🔄" label="Entity Variant" value="entity-variant" />
      )}
      {shouldShowAnimationsTab && (
        <TabIcon icon="🎬" label="Animations" value="animations" />
      )}
      {shouldShowEntityFeaturesTab && (
        <TabIcon icon="🧩" label="Features" value="entity-features" />
      )}
    </>
  );
}
