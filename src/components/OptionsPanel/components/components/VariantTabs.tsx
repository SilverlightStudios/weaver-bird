import type { Asset } from "../../types";
import { TextureVariantTab } from "../tabs/TextureVariantTab";
import { PackVariantsTab } from "../tabs/PackVariantsTab";

interface VariantTabsProps {
  assetId: string;
  allAssets: Asset[];
  providers: Array<{ packId: string; packName: string }>;
  viewingVariantId: string | null;
  hasTextureVariants: boolean;
  hasVariantsTab: boolean;
  onSelectVariant?: (id: string) => void;
  onSelectProvider?: (packId: string, assetId: string) => void;
  setViewingVariantId: (id: string | null) => void;
}

export function VariantTabs({
  assetId,
  allAssets,
  providers,
  viewingVariantId,
  hasTextureVariants,
  hasVariantsTab,
  onSelectVariant,
  onSelectProvider,
  setViewingVariantId,
}: VariantTabsProps) {
  return (
    <>
      {hasTextureVariants && onSelectVariant && (
        <TextureVariantTab
          assetId={assetId}
          allAssets={allAssets}
          selectedVariantId={viewingVariantId}
          onSelectVariant={setViewingVariantId}
        />
      )}

      {hasVariantsTab && onSelectProvider && (
        <PackVariantsTab
          assetId={assetId}
          providers={providers}
          onSelectProvider={onSelectProvider}
        />
      )}
    </>
  );
}
