/**
 * Colormap Manager
 *
 * Centralized colormap state management utility.
 * Handles resolving colormap winners, loading URLs, and sampling colors.
 */

import { convertFileSrc } from "@tauri-apps/api/core";
import { getPackTexturePath, getVanillaTexturePath } from "@lib/tauri";
import { getBiomesWithCoords } from "@components/BiomeColorPicker/biomeData";
import { sampleColormapAtCoordinates } from "@lib/colormapSampler";
import type { PackMeta } from "@state/types";

const GRASS_COLORMAP_ASSET_ID = "minecraft:colormap/grass";
const FOLIAGE_COLORMAP_ASSET_ID = "minecraft:colormap/foliage";

/**
 * Resolve which pack should provide a colormap
 * Returns the packId of the winner, or null if no provider found
 */
export function resolveColormapWinner(
  assetId: string,
  packOrder: string[],
  providersByAsset: Record<string, string[]>,
  overrides: Record<string, { packId: string } | undefined>,
  disabledPackIds: string[],
): string | null {
  const disabledSet = new Set(disabledPackIds);
  // Check if user has penciled a specific pack
  const override = overrides[assetId];
  if (override?.packId && !disabledSet.has(override.packId)) {
    return override.packId;
  }

  // Get providers for this colormap
  const providers = (providersByAsset[assetId] || []).filter(
    (id) => !disabledSet.has(id),
  );
  if (providers.length === 0) {
    console.warn(`[ColormapManager] No providers found for ${assetId}`);
    return null;
  }

  // Sort providers by pack order (earliest in pack order wins)
  const sorted = [...providers].sort(
    (a, b) => packOrder.indexOf(a) - packOrder.indexOf(b),
  );

  return sorted[0] ?? null;
}

/**
 * Load the asset URL for a colormap from a specific pack
 */
export async function loadColormapUrl(
  assetId: string,
  packId: string,
  packs: Record<string, PackMeta>,
): Promise<string | null> {
  try {
    let texturePath: string;

    if (packId === "minecraft:vanilla") {
      texturePath = await getVanillaTexturePath(assetId);
    } else {
      const packMeta = packs[packId];
      if (!packMeta) {
        console.error(
          `[ColormapManager] Pack metadata not found for ${packId}`,
        );
        return null;
      }

      texturePath = await getPackTexturePath(
        packMeta.path,
        assetId,
        packMeta.is_zip,
      );
    }

    return convertFileSrc(texturePath);
  } catch (error) {
    console.error(
      `[ColormapManager] Failed to load colormap URL for ${assetId}:`,
      error,
    );
    return null;
  }
}

/**
 * Sample colors from both grass and foliage colormaps at given coordinates
 */
export async function sampleColormapColors(
  grassColormapUrl: string | null,
  foliageColormapUrl: string | null,
  x: number,
  y: number,
): Promise<{
  grassColor: { r: number; g: number; b: number } | null;
  foliageColor: { r: number; g: number; b: number } | null;
}> {
  const results = {
    grassColor: null as { r: number; g: number; b: number } | null,
    foliageColor: null as { r: number; g: number; b: number } | null,
  };

  try {
    if (grassColormapUrl) {
      results.grassColor = await sampleColormapAtCoordinates(
        grassColormapUrl,
        x,
        y,
      );
    }
  } catch (error) {
    console.error(`[ColormapManager] Failed to sample grass color:`, error);
  }

  try {
    if (foliageColormapUrl) {
      results.foliageColor = await sampleColormapAtCoordinates(
        foliageColormapUrl,
        x,
        y,
      );
    }
  } catch (error) {
    console.error(`[ColormapManager] Failed to sample foliage color:`, error);
  }

  return results;
}

/**
 * Find biome ID if coordinates match a known biome
 * Returns biome ID or null if no match
 */
export function coordinatesToBiome(x: number, y: number): string | null {
  const biomesWithCoords = getBiomesWithCoords();

  // Find biome that matches these exact coordinates
  const biome = biomesWithCoords.find((b) => b.x === x && b.y === y);

  return biome ? biome.id : null;
}

/**
 * Get coordinates for a specific biome
 * Returns {x, y} or null if biome not found
 */
export function biomeToCoordinates(
  biomeId: string,
): { x: number; y: number } | null {
  const biomesWithCoords = getBiomesWithCoords();

  const biome = biomesWithCoords.find((b) => b.id === biomeId);

  if (!biome) {
    console.warn(`[ColormapManager] Biome not found: ${biomeId}`);
    return null;
  }

  return { x: biome.x, y: biome.y };
}

/**
 * Get the plains biome coordinates (default)
 */
export function getPlainsCoordinates(): { x: number; y: number } {
  const coords = biomeToCoordinates("plains");
  if (!coords) {
    // Fallback to center of colormap if plains not found
    console.warn(
      "[ColormapManager] Plains biome not found, using fallback coordinates",
    );
    return { x: 127, y: 127 };
  }
  return coords;
}

// Export colormap asset IDs as constants
export { GRASS_COLORMAP_ASSET_ID, FOLIAGE_COLORMAP_ASSET_ID };
