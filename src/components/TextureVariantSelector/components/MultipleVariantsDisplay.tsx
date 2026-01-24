import { TextureThumbnail } from "./TextureThumbnail";
import type { ViewMode } from "../types";
import s from "../styles.module.scss";

interface MultipleVariantsProps {
  viewMode: ViewMode;
  currentVariants: string[];
  selectedVariantId: string | undefined;
  assetId: string | undefined;
  onSelectVariant: (variantId: string) => void;
}

export function MultipleVariantsDisplay({
  viewMode,
  currentVariants,
  selectedVariantId,
  assetId,
  onSelectVariant,
}: MultipleVariantsProps) {
  return (
    <>
      <h3 className={s.sectionTitle}>
        {viewMode === "world" ? "Texture Variants" : "Inventory Variants"}
      </h3>
      <div className={s.thumbnailGrid}>
        {currentVariants.map((variantId, index) => (
          <TextureThumbnail
            key={variantId}
            variantId={variantId}
            index={index}
            isSelected={variantId === (selectedVariantId ?? assetId)}
            onClick={() => onSelectVariant(variantId)}
          />
        ))}
      </div>
      <div className={s.hint}>
        {currentVariants.length} variant
        {currentVariants.length !== 1 ? "s" : ""} available
      </div>
    </>
  );
}
