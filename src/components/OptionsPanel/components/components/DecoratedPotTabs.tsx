import type { Asset } from "../../types";
import { PotteryShardTab } from "../tabs/PotteryShardTab";
import { EntityDecoratedPotTab } from "../tabs/EntityDecoratedPotTab";
import { DecoratedPotTab } from "../tabs/DecoratedPotTab";

interface DecoratedPotTabsProps {
  assetId: string;
  allAssets: Asset[];
  shouldShowPotteryShardTab: boolean;
  shouldShowEntityDecoratedPotTab: boolean;
  shouldShowDecoratedPotTab: boolean;
  onSelectVariant?: (id: string) => void;
}

export function DecoratedPotTabs({
  assetId,
  allAssets,
  shouldShowPotteryShardTab,
  shouldShowEntityDecoratedPotTab,
  shouldShowDecoratedPotTab,
  onSelectVariant,
}: DecoratedPotTabsProps) {
  return (
    <>
      {shouldShowPotteryShardTab && (
        <PotteryShardTab
          assetId={assetId}
          allAssets={allAssets}
          onSelectVariant={onSelectVariant}
        />
      )}

      {shouldShowEntityDecoratedPotTab && (
        <EntityDecoratedPotTab
          assetId={assetId}
          allAssets={allAssets}
          onSelectVariant={onSelectVariant}
        />
      )}

      {shouldShowDecoratedPotTab && (
        <DecoratedPotTab assetId={assetId} allAssets={allAssets} />
      )}
    </>
  );
}
