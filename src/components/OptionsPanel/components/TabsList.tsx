import { TabsList as TabsListUI } from "@/ui/components/tabs";
import { TabIcon } from "./TabIcon";
import {
  DecoratedPotTabIcons,
  ItemTabIcons,
  EntityTabIcons,
  VariantTabIcons,
} from "./TabsListGroups";

interface TabsListProps {
  shouldShowPotteryShardTab: boolean;
  shouldShowEntityDecoratedPotTab: boolean;
  shouldShowDecoratedPotTab: boolean;
  shouldShowPaintingTab: boolean;
  shouldShowItemTab: boolean;
  shouldShowSignTab: boolean;
  shouldShowBlockStateTab: boolean;
  shouldShowEntityVariantTab: boolean;
  shouldShowAnimationsTab: boolean;
  shouldShowEntityFeaturesTab: boolean;
  shouldShowPotTab: boolean;
  shouldShowParticlePropertiesTab: boolean;
  hasTextureVariants: boolean;
  hasVariantsTab: boolean;
  onSelectVariant?: (id: string) => void;
}

export function TabsList({
  shouldShowPotteryShardTab,
  shouldShowEntityDecoratedPotTab,
  shouldShowDecoratedPotTab,
  shouldShowPaintingTab,
  shouldShowItemTab,
  shouldShowSignTab,
  shouldShowBlockStateTab,
  shouldShowEntityVariantTab,
  shouldShowAnimationsTab,
  shouldShowEntityFeaturesTab,
  shouldShowPotTab,
  shouldShowParticlePropertiesTab,
  hasTextureVariants,
  hasVariantsTab,
  onSelectVariant,
}: TabsListProps) {
  return (
    <TabsListUI>
      <DecoratedPotTabIcons
        shouldShowPotteryShardTab={shouldShowPotteryShardTab}
        shouldShowEntityDecoratedPotTab={shouldShowEntityDecoratedPotTab}
        shouldShowDecoratedPotTab={shouldShowDecoratedPotTab}
      />

      <ItemTabIcons
        shouldShowPaintingTab={shouldShowPaintingTab}
        shouldShowItemTab={shouldShowItemTab}
        shouldShowSignTab={shouldShowSignTab}
        onSelectVariant={onSelectVariant}
      />

      {shouldShowBlockStateTab && (
        <TabIcon icon="⚙" label="Block State" value="block-state" />
      )}

      <EntityTabIcons
        shouldShowEntityVariantTab={shouldShowEntityVariantTab}
        shouldShowAnimationsTab={shouldShowAnimationsTab}
        shouldShowEntityFeaturesTab={shouldShowEntityFeaturesTab}
      />

      {shouldShowPotTab && <TabIcon icon="🌱" label="Pot" value="pot" />}

      {shouldShowParticlePropertiesTab && (
        <TabIcon icon="✨" label="Particles" value="particle-properties" />
      )}

      <VariantTabIcons
        hasTextureVariants={hasTextureVariants}
        hasVariantsTab={hasVariantsTab}
        onSelectVariant={onSelectVariant}
      />

      <TabIcon icon="⚡" label="Advanced" value="advanced" />
    </TabsListUI>
  );
}
