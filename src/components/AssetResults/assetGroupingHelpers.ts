/**
 * Helper functions for asset grouping logic
 */
import { isMinecraftItem, isNumberedVariant } from "@lib/assetUtils";
import { findBestMatchingVariant } from "./variantMatching";

export interface VariantCategories {
  blockVariants: string[];
  itemVariants: string[];
  otherVariants: string[];
}

export function categorizeVariants(variantIds: string[]): VariantCategories {
  const blockVariants = variantIds.filter((id) => id.includes(":block/"));
  const itemVariants = variantIds.filter((id) => isMinecraftItem(id));
  const otherVariants = variantIds.filter(
    (id) => !id.includes(":block/") && !isMinecraftItem(id),
  );

  return { blockVariants, itemVariants, otherVariants };
}

export function getAssetPath(id: string): string {
  return id.includes(":") ? id.split(":")[1] ?? id : id;
}

export function pickVariant(variants: string[], targetPath?: string): string | undefined {
  if (variants.length === 0) return undefined;
  if (!targetPath) return variants[0];
  return variants.find((id) => getAssetPath(id) === targetPath) ?? variants[0];
}

export function selectIdWithSmartMatching(
  searchQuery: string | undefined,
  group: { baseId: string; variantIds: string[] },
  blockVariants: string[],
  itemVariants: string[],
  blockPrimaryId: string | undefined,
  itemPrimaryId: string | undefined,
): string {
  if (!searchQuery || group.variantIds.length <= 1) {
    return blockPrimaryId ?? itemPrimaryId ?? group.variantIds[0];
  }

  let selectionId: string;
  if (blockVariants.length > 0) {
    selectionId = findBestMatchingVariant(blockVariants, searchQuery);
  } else if (itemVariants.length > 0) {
    selectionId = findBestMatchingVariant(itemVariants, searchQuery);
  } else {
    selectionId = findBestMatchingVariant(group.variantIds, searchQuery);
  }

  console.log(
    `[AssetResults.grouping] Smart selection for "${group.baseId}": query="${searchQuery}" → "${selectionId}"`,
  );

  return selectionId;
}

export function selectDisplayIdWithSmartMatching(
  searchQuery: string | undefined,
  group: { baseId: string; variantIds: string[] },
  blockVariants: string[],
  itemVariants: string[],
  otherVariants: string[],
  itemPrimaryId: string | undefined,
  inventoryVariant: string | undefined,
  selectionId: string,
): string {
  let displayId = itemPrimaryId ?? inventoryVariant ?? selectionId;

  if (!searchQuery || group.variantIds.length <= 1) {
    return displayId;
  }

  if (itemVariants.length > 0) {
    displayId =
      itemVariants.length > 1
        ? findBestMatchingVariant(itemVariants, searchQuery)
        : itemPrimaryId ?? itemVariants[0];
    console.log(
      `[AssetResults.grouping] Smart displayId for item "${group.baseId}": "${displayId}"`,
    );
  } else if (
    otherVariants.length > 1 &&
    !blockVariants.length &&
    !itemVariants.length
  ) {
    displayId = findBestMatchingVariant(otherVariants, searchQuery);
    console.log(
      `[AssetResults.grouping] Smart displayId for entity "${group.baseId}": "${displayId}"`,
    );
  } else if (blockVariants.length > 1) {
    displayId = findBestMatchingVariant(blockVariants, searchQuery);
    console.log(
      `[AssetResults.grouping] Smart displayId for block "${group.baseId}": "${displayId}"`,
    );
  }

  return displayId;
}

export function applySpecialCaseOverrides(
  displayId: string,
  group: { baseId: string; variantIds: string[] },
): string {
  if (group.baseId === "entity/banner") {
    const full = group.variantIds.find((id) => id.endsWith(":entity/banner_base"));
    if (full) return full;
  }

  if (group.baseId === "entity/decorated_pot") {
    const base = group.variantIds.find((id) =>
      id.endsWith(":entity/decorated_pot/decorated_pot_base"),
    );
    if (base) return base;
  }

  return displayId;
}

export function calculateVariantCount(
  blockPrimaryId: string | undefined,
  blockVariants: string[],
  allVariantIds: string[],
  getWinningPackForAsset: (assetId: string) => string | undefined,
): number {
  if (blockPrimaryId) {
    const blockWinnerPack = getWinningPackForAsset(blockPrimaryId);
    const blockVariantsForCount = blockWinnerPack
      ? blockVariants.filter(
          (variantId) => getWinningPackForAsset(variantId) === blockWinnerPack,
        )
      : blockVariants;
    return blockVariantsForCount.filter(isNumberedVariant).length;
  }

  const numberedVariants = allVariantIds.filter(isNumberedVariant);
  return numberedVariants.length;
}
