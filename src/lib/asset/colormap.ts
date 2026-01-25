/**
 * Biome colormap utilities for grass and foliage tinting
 */

import { isBiomeColormapAsset } from "./predicates";

/** Keywords that indicate foliage rather than grass coloring */
const FOLIAGE_KEYWORDS = [
  "leaf",
  "leaves",
  "azalea",
  "bush",
  "vine",
  "cactus",
  "sapling",
  "flower",
  "fern",
  "hanging_roots",
  "moss",
] as const;

/**
 * Get the biome colormap type ("grass" or "foliage") from an asset ID
 */
export function getColormapTypeFromAssetId(
  assetId: string,
): "grass" | "foliage" | null {
  if (!isBiomeColormapAsset(assetId)) {
    return null;
  }

  const path = assetId.replace(/^[^:]*:/, "");
  const parts = path.split("/");
  const last = parts[parts.length - 1];

  if (last === "grass") return "grass";
  if (last === "foliage") return "foliage";
  return null;
}

/**
 * Extract the variant label (e.g., "No Orange Grass") for optional colormaps
 */
export function getColormapVariantLabel(assetId: string): string | null {
  if (!isBiomeColormapAsset(assetId)) {
    return null;
  }

  const match = assetId.match(/^[^:]*:colormap\/(.+)$/);
  if (!match) return null;

  const path = match[1];
  const parts = path.split("/");
  if (parts.length <= 1) {
    return null;
  }

  return parts.slice(0, -1).join(" / ");
}

/** Get the canonical asset ID for a biome colormap type */
export function getColormapAssetId(type: "grass" | "foliage"): string {
  return `minecraft:colormap/${type}`;
}

/**
 * Heuristic guess for which colormap type a block asset should use
 */
export function guessColormapTypeForAsset(
  assetId?: string,
): "grass" | "foliage" {
  if (!assetId) return "grass";

  const normalized = assetId.toLowerCase();
  const isFoliage = FOLIAGE_KEYWORDS.some((keyword) =>
    normalized.includes(keyword),
  );

  return isFoliage ? "foliage" : "grass";
}
