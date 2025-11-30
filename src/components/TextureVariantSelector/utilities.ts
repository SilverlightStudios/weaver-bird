import { beautifyAssetName } from "@lib/assetUtils";
import type { ViewMode } from "./types";

/**
 * Get a friendly display name for a variant
 */
export function getVariantDisplayName(
    variantId: string,
    index: number,
    viewMode: ViewMode,
): string {
    const name = beautifyAssetName(variantId);
    // For inventory variants, strip the "Inventory" suffix since we're already in inventory view
    if (viewMode === "inventory") {
        return name.replace(/ Inventory$/, "") + (index === 0 ? " (Default)" : "");
    }
    return name + (index === 0 ? " (Default)" : "");
}
