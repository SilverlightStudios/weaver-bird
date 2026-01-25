/**
 * View mode tabs for switching between world and inventory variants
 */
import type { ViewMode } from "../types";
import s from "../styles.module.scss";

interface ViewModeTabsProps {
  viewMode: ViewMode;
  worldVariants: string[];
  inventoryVariants: string[];
  assetId: string | undefined;
  hasWorldVariants: boolean;
  onSelectVariant: (variantId: string) => void;
  setViewMode: (mode: ViewMode) => void;
}

export function ViewModeTabs({
  viewMode,
  worldVariants,
  inventoryVariants,
  assetId,
  hasWorldVariants,
  onSelectVariant,
  setViewMode,
}: ViewModeTabsProps) {
  const handleWorldClick = () => {
    setViewMode("world");
    // Select first world variant when switching to world view
    if (worldVariants.length > 0 && assetId && !worldVariants.includes(assetId)) {
      onSelectVariant(worldVariants[0]);
    }
  };

  const handleInventoryClick = () => {
    setViewMode("inventory");
    // Select first inventory variant when switching to inventory view
    if (inventoryVariants.length > 0 && assetId && !inventoryVariants.includes(assetId)) {
      onSelectVariant(inventoryVariants[0]);
    }
  };

  return (
    <div className={s.viewTabs}>
      <button
        className={`${s.viewTab} ${viewMode === "world" ? s.active : ""}`}
        onClick={handleWorldClick}
        disabled={!hasWorldVariants}
      >
        World View
      </button>
      <button
        className={`${s.viewTab} ${viewMode === "inventory" ? s.active : ""}`}
        onClick={handleInventoryClick}
      >
        Inventory View
      </button>
    </div>
  );
}
