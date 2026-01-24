/**
 * Asset exclusion logic - determines which assets to filter from the asset list
 */

import { normalizeAssetId } from "./parsing";

/** Extensions that indicate non-texture files */
const EXCLUDED_EXTENSIONS = [
  ".txt",
  ".md",
  ".json",
  ".mcmeta",
  ".ini",
  ".ds_store",
  "thumbs.db",
];

/** Check if an asset path is invalid (missing required content) */
function isInvalidPath(assetId: string, prefix: string): boolean {
  if (!assetId.includes(prefix)) return false;
  const match = assetId.match(new RegExp(`${prefix}(.+)`));
  return !match?.[1]?.trim();
}

/** Check if asset has excluded content types */
function hasExcludedContent(assetId: string): boolean {
  const lowercaseId = assetId.toLowerCase();
  return (
    lowercaseId.includes("readme") ||
    assetId.includes("colormap/") ||
    assetId.includes("/debug") ||
    lowercaseId.includes("desktop") ||
    EXCLUDED_EXTENSIONS.some((ext) => lowercaseId.endsWith(ext))
  );
}

/** Check if entity is rendered as part of a block */
function isEntityRenderedAsBlock(
  assetId: string,
  allAssetIds: Set<string>
): boolean {
  const match = assetId.match(/entity\/([^/]+)/);
  if (!match?.[1]) return false;

  const entityName = match[1];
  const normalized = normalizeAssetId(assetId);
  const parts = normalized.split(":");
  const namespace = parts.length === 2 ? parts[0] : "minecraft";
  const blockId = normalizeAssetId(`${namespace}:block/${entityName}`);
  return allAssetIds.has(blockId);
}

/** Check if asset has invalid paths */
function hasInvalidPaths(assetId: string): boolean {
  return (
    isInvalidPath(assetId, "entity/") ||
    isInvalidPath(assetId, "chest/") ||
    isInvalidPath(assetId, "shulker_box/")
  );
}

/**
 * Check if an asset should be excluded from the asset list
 * Filters out non-texture assets, metadata files, and special debug textures
 */
export function shouldExcludeAsset(
  assetId: string,
  allAssetIds?: Set<string>,
): boolean {
  // Exclude empty/malformed
  if (!assetId || assetId === "minecraft:" || assetId === "minecraft:block/") {
    return true;
  }

  // Data-driven exclusion: Hide entity models that are already rendered as part of blocks
  if (assetId.includes("entity/") && allAssetIds) {
    if (isEntityRenderedAsBlock(assetId, allAssetIds)) return true;
  }

  // Exclude invalid paths and excluded content
  return hasInvalidPaths(assetId) || hasExcludedContent(assetId);
}
