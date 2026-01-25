import type { Asset } from "../../types";
import { PaintingTab } from "../tabs/PaintingTab";
import { ItemDisplayTab } from "../tabs/ItemDisplayTab";
import { SignOptionsTab } from "../tabs/SignOptionsTab";

interface ItemAndDisplayTabsProps {
  assetId: string;
  allAssets: Asset[];
  shouldShowPaintingTab: boolean;
  shouldShowItemTab: boolean;
  shouldShowSignTab: boolean;
  itemDisplayMode: string;
  isHangingSignAsset: boolean;
  onSelectVariant?: (id: string) => void;
}

export function ItemAndDisplayTabs({
  assetId,
  allAssets,
  shouldShowPaintingTab,
  shouldShowItemTab,
  shouldShowSignTab,
  itemDisplayMode,
  isHangingSignAsset,
  onSelectVariant,
}: ItemAndDisplayTabsProps) {
  return (
    <>
      {shouldShowPaintingTab && onSelectVariant && (
        <PaintingTab
          assetId={assetId}
          allAssets={allAssets}
          onSelectVariant={onSelectVariant}
        />
      )}

      {shouldShowItemTab && <ItemDisplayTab itemDisplayMode={itemDisplayMode} />}

      {shouldShowSignTab && <SignOptionsTab isHangingSign={isHangingSignAsset} />}
    </>
  );
}
