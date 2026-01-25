import { TabIcon } from "../TabIcon";

interface ItemTabIconsProps {
  shouldShowPaintingTab: boolean;
  shouldShowItemTab: boolean;
  shouldShowSignTab: boolean;
  onSelectVariant?: (id: string) => void;
}

export function ItemTabIcons({
  shouldShowPaintingTab,
  shouldShowItemTab,
  shouldShowSignTab,
  onSelectVariant,
}: ItemTabIconsProps) {
  return (
    <>
      {shouldShowPaintingTab && onSelectVariant && (
        <TabIcon icon="🖼" label="Painting" value="painting" />
      )}
      {shouldShowItemTab && (
        <TabIcon icon="🗡️" label="Item Display" value="item" />
      )}
      {shouldShowSignTab && <TabIcon icon="🪧" label="Sign" value="sign" />}
    </>
  );
}
