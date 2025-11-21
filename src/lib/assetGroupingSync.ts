/**
 * Synchronous fallback for Asset Variant Grouping
 *
 * Used when Web Worker fails to initialize.
 * Contains identical logic to the worker.
 */

import {
  normalizeAssetId,
  beautifyAssetName,
  getVariantGroupKey,
  isNumberedVariant,
} from "./assetUtils";

export interface AssetGroup {
  baseId: string; // The primary/base asset ID (without number suffix)
  variantIds: string[]; // All variants including the base
  displayName: string; // Pre-computed beautified name
}

/**
 * Group assets by their variant group key (synchronous version)
 * Returns an array of asset groups with pre-computed display names
 */
export function groupAssetsSync(assetIds: string[]): AssetGroup[] {
  const groups = new Map<string, string[]>();

  // Group all assets by their variant group key
  for (const assetId of assetIds) {
    const groupKey = getVariantGroupKey(assetId);
    const existing = groups.get(groupKey) || [];
    existing.push(assetId);
    groups.set(groupKey, existing);
  }

  // Convert to array of AssetGroup objects
  const result: AssetGroup[] = [];
  for (const [baseId, variantIds] of groups.entries()) {
    // Sort variants: base first (no number), then by number
    const sorted = variantIds.sort((a, b) => {
      const structuralPriority = (id: string) => {
        if (/_bottom|_lower|_foot/.test(id)) return 0;
        if (/_top|_upper|_head/.test(id)) return 1;
        return 0;
      };

      const aStructural = structuralPriority(a);
      const bStructural = structuralPriority(b);
      if (aStructural !== bStructural) {
        return aStructural - bStructural;
      }

      const aIsNumbered = isNumberedVariant(a);
      const bIsNumbered = isNumberedVariant(b);

      if (!aIsNumbered && bIsNumbered) return -1;
      if (aIsNumbered && !bIsNumbered) return 1;

      // Both are numbered, sort numerically
      const aNum = parseInt(a.match(/(\d+)$/)?.[1] || "0");
      const bNum = parseInt(b.match(/(\d+)$/)?.[1] || "0");
      return aNum - bNum;
    });

    // Pre-compute the display name for the base ID
    const displayName = beautifyAssetName(baseId);

    result.push({ baseId, variantIds: sorted, displayName });
  }

  return result;
}
