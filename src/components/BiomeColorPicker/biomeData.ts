/**
 * Minecraft biome data from wiki-scraped coordinates
 *
 * This module provides biome data scraped from the Minecraft Wiki.
 * All 92 Java Edition biomes with accurate colormap coordinates and hex colors.
 */

import { ALL_BIOMES } from "@/constants/biomeCoordinates";

export interface BiomeData {
  id: string;
  name: string;
  coords: { x: number; y: number } | null;
  grassHexColor: string | null;
  foliageHexColor: string | null;
  waterHexColor: string | null;
  dryFoliageHexColor: string | null;
  usesNoise: boolean;
}

/**
 * All biomes with complete data
 */
export const BIOMES: BiomeData[] = ALL_BIOMES.map((biome) => ({
  id: biome.biomeId,
  name: biome.name,
  coords: biome.coords,
  grassHexColor: biome.grassHexColor,
  foliageHexColor: biome.foliageHexColor,
  waterHexColor: biome.waterHexColor,
  dryFoliageHexColor: biome.dryFoliageHexColor,
  usesNoise: biome.usesNoise,
}));

/**
 * Get biome data by ID
 */
export function getBiome(biomeId: string): BiomeData | undefined {
  return BIOMES.find((b) => b.id === biomeId);
}

/**
 * Get pixel coordinates for a biome
 * @param biome - The biome data
 * @returns {x, y} pixel coordinates (0-255) or null if noise-based
 */
export function getBiomeCoords(
  biome: BiomeData,
): { x: number; y: number } | null {
  return biome.coords;
}

/**
 * Get all biomes with their pixel coordinates (excludes noise biomes)
 * @returns Array of biomes with their {x, y} coordinates
 */
export function getBiomesWithCoords(): Array<
  BiomeData & { x: number; y: number }
> {
  return BIOMES.filter((b) => b.coords !== null).map((biome) => ({
    ...biome,
    x: biome.coords!.x,
    y: biome.coords!.y,
  }));
}

/**
 * Get grass color for a biome
 * Returns coords for sampling colormap, or fallback to hex color for noise biomes
 */
export function getGrassColor(biomeId: string): {
  coords: { x: number; y: number } | null;
  hex: string | null;
} {
  const biome = getBiome(biomeId);
  if (!biome) {
    return { coords: null, hex: null };
  }

  return {
    coords: biome.coords,
    hex: biome.grassHexColor,
  };
}

/**
 * Get foliage color for a biome
 * Returns coords for sampling colormap, or fallback to hex color for noise biomes
 */
export function getFoliageColor(biomeId: string): {
  coords: { x: number; y: number } | null;
  hex: string | null;
} {
  const biome = getBiome(biomeId);
  if (!biome) {
    return { coords: null, hex: null };
  }

  return {
    coords: biome.coords,
    hex: biome.foliageHexColor,
  };
}
