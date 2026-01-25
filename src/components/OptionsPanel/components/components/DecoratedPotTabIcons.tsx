import { TabIcon } from "../TabIcon";

interface DecoratedPotTabIconsProps {
  shouldShowPotteryShardTab: boolean;
  shouldShowEntityDecoratedPotTab: boolean;
  shouldShowDecoratedPotTab: boolean;
}

export function DecoratedPotTabIcons({
  shouldShowPotteryShardTab,
  shouldShowEntityDecoratedPotTab,
  shouldShowDecoratedPotTab,
}: DecoratedPotTabIconsProps) {
  return (
    <>
      {shouldShowPotteryShardTab && (
        <TabIcon icon="🏺" label="Pottery Shard" value="pottery-shard" />
      )}
      {shouldShowEntityDecoratedPotTab && (
        <TabIcon icon="🏺" label="Decorated Pot" value="entity-pot" />
      )}
      {shouldShowDecoratedPotTab && (
        <TabIcon icon="🏺" label="Decorated Pot" value="decorated-pot" />
      )}
    </>
  );
}
