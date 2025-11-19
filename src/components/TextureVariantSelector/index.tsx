import { useMemo } from "react";
import {
  beautifyAssetName,
  groupAssetsByVariant,
  isPottedPlant,
} from "@lib/assetUtils";
import s from "./styles.module.scss";

interface Props {
  assetId?: string;
  allAssets: Array<{ id: string; name: string }>;
  onSelectVariant: (variantId: string) => void;
}

export default function TextureVariantSelector({
  assetId,
  allAssets,
  onSelectVariant,
}: Props) {
  // Find all variants for the currently selected asset
  const variants = useMemo(() => {
    if (!assetId) return [];

    const allAssetIds = allAssets.map((a) => a.id);
    const groups = groupAssetsByVariant(allAssetIds);

    // Find the group that contains the selected asset
    const group = groups.find((g) => g.variantIds.includes(assetId));

    if (!group || group.variantIds.length <= 1) {
      return [];
    }

    // Filter out potted variants - they're controlled by "Show Pot" toggle, not texture selector
    const nonPottedVariants = group.variantIds.filter(
      (id) => !isPottedPlant(id),
    );

    return nonPottedVariants;
  }, [assetId, allAssets]);

  // Don't render if no variants or only one variant
  if (variants.length <= 1) {
    return null;
  }

  return (
    <div className={s.root}>
      <label className={s.label} htmlFor="texture-variant-select">
        Texture Variant
      </label>
      <select
        id="texture-variant-select"
        className={s.select}
        value={assetId}
        onChange={(e) => onSelectVariant(e.target.value)}
      >
        {variants.map((variantId, index) => (
          <option key={variantId} value={variantId}>
            {beautifyAssetName(variantId)}
            {index === 0 ? " (Default)" : ""}
          </option>
        ))}
      </select>
      <div className={s.hint}>
        {variants.length} variant{variants.length !== 1 ? "s" : ""} available
      </div>
    </div>
  );
}
