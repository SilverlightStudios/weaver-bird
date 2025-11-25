/**
 * Biome colors utilities for managing Minecraft biome colormap coordinates.
 *
 * This module provides functionality to fetch, parse, and cache biome
 * colormap coordinates from the Minecraft Wiki.
 */

export {
  fetchBiomeColors,
  clearBiomeColorsCache,
  getBiomeCoords,
  type BiomeColorRegistry,
  type BiomeColorCoords,
} from "./fetchBiomeColors";
