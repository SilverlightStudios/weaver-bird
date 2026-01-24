/**
 * Utility functions for base variant entity handler
 */

import type { AssetId } from "@state";
import { getEntityPath, getDirectEntityDirAndLeaf, titleLabel } from "./utils";
import { isEntityFeatureLayerTextureAssetId } from "../layerDetection";
import { allLeavesInSet, CAT_SKIN_IDS, DYE_COLOR_IDS, WOOD_TYPE_IDS } from "../../entityVariants";
import { DYE_COLORS } from "../dyeColors";

export function isEntityVariantLeaf(dir: string, leaf: string): boolean {
  return leaf === dir || leaf.startsWith(`${dir}_`) || leaf.endsWith(`_${dir}`);
}

export function getEntityVariantLabel(dir: string, leaf: string): string {
  if (leaf === dir) return "Default";
  if (leaf.startsWith(`${dir}_`)) return titleLabel(leaf.slice(dir.length + 1));
  if (leaf.endsWith(`_${dir}`)) return titleLabel(leaf.slice(0, -(dir.length + 1)));
  return titleLabel(leaf);
}

export function sortByPreferredOrder(values: string[], preferredOrder: string[]): string[] {
  const order = new Map<string, number>();
  preferredOrder.forEach((id, idx) => order.set(id, idx));
  return [...values].sort((a, b) => {
    const ai = order.get(a);
    const bi = order.get(b);
    if (ai != null && bi != null) return ai - bi;
    if (ai != null) return -1;
    if (bi != null) return 1;
    return a.localeCompare(b);
  });
}

/**
 * Collect variant leaves from all entity IDs
 */
export function collectVariantLeaves(
  all: Set<AssetId>,
  targetDir: string,
): string[] {
  const variantLeaves: string[] = [];
  for (const id of all) {
    if (isEntityFeatureLayerTextureAssetId(id)) continue;
    const p = getEntityPath(id);
    if (!p) continue;
    const d = getDirectEntityDirAndLeaf(p);
    if (!d) continue;
    if (d.dir !== targetDir) continue;
    variantLeaves.push(d.leaf);
  }
  return variantLeaves;
}

/**
 * Detect variant type from unique leaves
 */
export function detectVariantType(
  uniqueLeaves: string[],
  dir: string,
): {
  isVariant: boolean;
  label: string;
  sortedLeaves: string[];
} {
  if (uniqueLeaves.length <= 1) {
    return { isVariant: false, label: "", sortedLeaves: uniqueLeaves };
  }

  const isPatternDir = uniqueLeaves.every((l) => isEntityVariantLeaf(dir, l));
  const isDyeDir = allLeavesInSet(uniqueLeaves, DYE_COLOR_IDS);
  const isWoodDir = allLeavesInSet(uniqueLeaves, WOOD_TYPE_IDS);
  const isCatDir = dir === "cat" && allLeavesInSet(uniqueLeaves, CAT_SKIN_IDS);

  const isVariant = isPatternDir || isDyeDir || isWoodDir || isCatDir;

  if (!isVariant) {
    return { isVariant: false, label: "", sortedLeaves: uniqueLeaves };
  }

  let label = "Variant";
  let sortedLeaves = uniqueLeaves;

  if (isDyeDir) {
    label = "Color";
    sortedLeaves = sortByPreferredOrder(uniqueLeaves, DYE_COLORS.map((d) => d.id));
  } else if (isWoodDir) {
    label = "Wood Type";
  } else if (isCatDir) {
    label = "Cat Type";
  }

  return { isVariant, label, sortedLeaves };
}

/**
 * Build variant option label
 */
export function buildVariantOptionLabel(
  variantValue: string,
  dir: string,
  isDyeDir: boolean,
): string {
  if (isDyeDir) {
    return DYE_COLORS.find((d) => d.id === variantValue)?.label ?? titleLabel(variantValue);
  }
  return getEntityVariantLabel(dir, variantValue);
}
