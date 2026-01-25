/**
 * Asset variant grouping utilities
 */

import { isInventoryVariant } from "./predicates";
import { getVariantGroupKey, isNumberedVariant, normalizeAssetId } from "./parsing";

export interface AssetGroup {
  baseId: string;
  variantIds: string[];
}

/**
 * Categorize variants into world (placed block) and inventory (held item) types
 */
export function categorizeVariants(variantIds: string[]): {
  worldVariants: string[];
  inventoryVariants: string[];
} {
  const worldVariants: string[] = [];
  const inventoryVariants: string[] = [];

  for (const variantId of variantIds) {
    if (isInventoryVariant(variantId)) {
      inventoryVariants.push(variantId);
    } else {
      worldVariants.push(variantId);
    }
  }

  return { worldVariants, inventoryVariants };
}

/** Structural priority for sorting variants */
function getStructuralPriority(id: string): number {
  if (/_bottom|_lower|_foot/.test(id)) return 0;
  if (/_top|_upper|_head/.test(id)) return 1;
  return 0;
}

/**
 * Group assets by their variant group key
 */
export function groupAssetsByVariant(assetIds: string[]): AssetGroup[] {
  const groups = new Map<string, string[]>();

  for (const assetId of assetIds) {
    const groupKey = getVariantGroupKey(assetId);
    const existing = groups.get(groupKey) ?? [];
    existing.push(assetId);
    groups.set(groupKey, existing);
  }

  const result: AssetGroup[] = [];

  for (const [baseId, variantIds] of groups.entries()) {
    const sorted = variantIds.sort((a, b) => {
      const aStructural = getStructuralPriority(a);
      const bStructural = getStructuralPriority(b);
      if (aStructural !== bStructural) return aStructural - bStructural;

      const aIsNumbered = isNumberedVariant(a);
      const bIsNumbered = isNumberedVariant(b);

      if (!aIsNumbered && bIsNumbered) return -1;
      if (aIsNumbered && !bIsNumbered) return 1;

      const aNum = parseInt(a.match(/(\d+)$/)?.[1] ?? "0");
      const bNum = parseInt(b.match(/(\d+)$/)?.[1] ?? "0");
      return aNum - bNum;
    });

    result.push({ baseId, variantIds: sorted });
  }

  return result;
}

/**
 * Get block/item pair for an asset
 */
function createFindByPath(allAssetIds: string[], namespace: string) {
  return (path: string): string | undefined => {
    const exactMatch = allAssetIds.find((id) => {
      const normalized = normalizeAssetId(id);
      return (
        normalized.startsWith(`${namespace}:`) &&
        normalized.split(":")[1] === path
      );
    });
    if (exactMatch) return exactMatch;

    return allAssetIds.find((id) => {
      const normalized = normalizeAssetId(id);
      return normalized.split(":")[1] === path;
    });
  };
}

function createFindBlockVariantByGroupKey(allAssetIds: string[], namespace: string) {
  return (groupKey: string): string | undefined => {
    const candidates = allAssetIds.filter((id) => {
      if (!id.includes(":block/")) return false;
      return getVariantGroupKey(id) === groupKey;
    });
    if (candidates.length === 0) return undefined;

    const inNamespace = candidates.filter((id) =>
      normalizeAssetId(id).startsWith(`${namespace}:`),
    );
    const ordered = inNamespace.length > 0 ? inNamespace : candidates;
    return ordered.find((id) => !isInventoryVariant(id)) ?? ordered[0];
  };
}

function handleMinecartItem(
  baseName: string,
  namespace: string,
  findByPath: (path: string) => string | undefined
): { blockId: string; itemId: string } {
  const entityId =
    findByPath(`entity/${baseName}`) ??
    findByPath("entity/minecart") ??
    normalizeAssetId(`${namespace}:entity/minecart`);
  return {
    blockId: entityId,
    itemId:
      findByPath(`item/${baseName}`) ??
      normalizeAssetId(`${namespace}:item/${baseName}`),
  };
}

function handleRedstoneItem(
  baseName: string,
  findByPath: (path: string) => string | undefined,
  findBlockVariant: (groupKey: string) => string | undefined
): { blockId?: string; itemId?: string } {
  return {
    blockId:
      findByPath("block/redstone_dust_dot") ??
      findByPath("block/redstone_dust_line0") ??
      findBlockVariant("block/redstone_wire"),
    itemId: findByPath(`item/${baseName}`),
  };
}

function handleRedstoneWireBlock(
  baseName: string,
  findByPath: (path: string) => string | undefined
): { blockId?: string; itemId?: string } {
  return {
    blockId:
      findByPath(`block/${baseName}`) ??
      findByPath("block/redstone_dust_dot") ??
      findByPath("block/redstone_dust_line0"),
    itemId: findByPath("item/redstone"),
  };
}

export function getBlockItemPair(
  assetId: string,
  allAssetIds: string[],
): { blockId?: string; itemId?: string } {
  const normalizedAssetId = normalizeAssetId(assetId);
  const namespace = normalizedAssetId.includes(":")
    ? normalizedAssetId.split(":")[0]!
    : "minecraft";
  const assetPath = normalizedAssetId.includes(":")
    ? normalizedAssetId.split(":")[1]!
    : normalizedAssetId;

  const findByPath = createFindByPath(allAssetIds, namespace);
  const findBlockVariant = createFindBlockVariantByGroupKey(allAssetIds, namespace);

  // Handle item paths
  if (assetPath.startsWith("item/")) {
    const baseName = assetPath.slice("item/".length);

    if (baseName === "minecart" || baseName.endsWith("_minecart")) {
      return handleMinecartItem(baseName, namespace, findByPath);
    }

    if (baseName === "redstone") {
      return handleRedstoneItem(baseName, findByPath, findBlockVariant);
    }

    return {
      blockId:
        findByPath(`block/${baseName}`) ??
        findBlockVariant(`block/${baseName}`),
      itemId: findByPath(`item/${baseName}`),
    };
  }

  // Handle block paths
  if (assetPath.startsWith("block/")) {
    const groupKey = getVariantGroupKey(normalizedAssetId);
    const baseName = groupKey.startsWith("block/")
      ? groupKey.slice("block/".length)
      : assetPath.slice("block/".length);

    if (baseName === "redstone_wire") {
      return handleRedstoneWireBlock(baseName, findByPath);
    }

    return {
      blockId: findByPath(`block/${baseName}`),
      itemId: findByPath(`item/${baseName}`),
    };
  }

  return {};
}
