import { TabIcon } from "../TabIcon";

interface VariantTabIconsProps {
  hasTextureVariants: boolean;
  hasVariantsTab: boolean;
  onSelectVariant?: (id: string) => void;
}

export function VariantTabIcons({
  hasTextureVariants,
  hasVariantsTab,
  onSelectVariant,
}: VariantTabIconsProps) {
  return (
    <>
      {hasTextureVariants && onSelectVariant && (
        <TabIcon
          icon="🖼"
          label="Texture Variant"
          value="texture-variants"
        />
      )}
      {hasVariantsTab && (
        <TabIcon icon="📦" label="Pack Variants" value="variants" />
      )}
    </>
  );
}
