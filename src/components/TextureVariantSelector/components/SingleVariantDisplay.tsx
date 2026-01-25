import { getVariantDisplayName } from "../utilities";
import type { ViewMode } from "../types";
import s from "../styles.module.scss";

interface SingleVariantProps {
  viewMode: ViewMode;
  variantId: string;
}

export function SingleVariantDisplay({ viewMode, variantId }: SingleVariantProps) {
  return (
    <>
      <label className={s.label}>
        {viewMode === "world" ? "World Texture" : "Inventory Texture"}
      </label>
      <div className={s.singleVariant}>
        {getVariantDisplayName(variantId, 0, viewMode).replace(" (Default)", "")}
      </div>
      {viewMode === "inventory" && (
        <div className={s.hint}>
          This is the texture shown when the block is in your inventory
        </div>
      )}
    </>
  );
}
