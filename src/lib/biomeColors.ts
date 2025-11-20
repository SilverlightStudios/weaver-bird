/**
 * Biome foliage color utilities
 *
 * These are approximations of Minecraft's default foliage colormap colors.
 * The actual colors come from assets/minecraft/textures/colormap/foliage.png
 */

export interface BiomeColor {
  r: number;
  g: number;
  b: number;
}

/**
 * Default foliage colors for common biomes
 * Sampled from vanilla Minecraft's foliage.png colormap
 */
const BIOME_FOLIAGE_COLORS: Record<string, BiomeColor> = {
  // Default/Plains - medium green
  plains: { r: 119, g: 171, b: 47 },

  // Forest biomes - darker green
  forest: { r: 89, g: 157, b: 38 },
  birch_forest: { r: 104, g: 167, b: 45 },
  dark_forest: { r: 89, g: 157, b: 38 },

  // Cold biomes - dark teal/blue-green
  taiga: { r: 95, g: 141, b: 76 },
  snowy_taiga: { r: 95, g: 141, b: 76 },
  giant_tree_taiga: { r: 95, g: 141, b: 76 },

  // Frozen biomes - very dark blue-green
  snowy_tundra: { r: 96, g: 140, b: 94 },
  frozen_ocean: { r: 96, g: 140, b: 94 },
  frozen_river: { r: 96, g: 140, b: 94 },
  snowy_mountains: { r: 96, g: 140, b: 94 },

  // Warm/tropical biomes - vibrant green
  jungle: { r: 60, g: 192, b: 41 },
  jungle_hills: { r: 60, g: 192, b: 41 },
  jungle_edge: { r: 60, g: 192, b: 41 },

  // Swamp - olive/muddy green
  swamp: { r: 106, g: 112, b: 57 },

  // Savanna - yellowish green
  savanna: { r: 155, g: 173, b: 62 },
  savanna_plateau: { r: 155, g: 173, b: 62 },

  // Desert/Badlands - brownish (though leaves are rare here)
  desert: { r: 174, g: 164, b: 42 },
  badlands: { r: 158, g: 164, b: 42 },

  // Ocean/River - default
  ocean: { r: 119, g: 171, b: 47 },
  river: { r: 119, g: 171, b: 47 },

  // Mountains - cooler green
  mountains: { r: 107, g: 156, b: 73 },

  // Beach - default
  beach: { r: 119, g: 171, b: 47 },

  // Mushroom - vibrant (though mycelium doesn't have normal trees)
  mushroom_fields: { r: 85, g: 192, b: 71 },
};

/**
 * Get the foliage color for a given biome ID
 * Falls back to plains if biome is not found
 */
export function getFoliageColorForBiome(biomeId: string | undefined): BiomeColor {
  if (!biomeId) {
    return BIOME_FOLIAGE_COLORS.plains;
  }

  return BIOME_FOLIAGE_COLORS[biomeId] || BIOME_FOLIAGE_COLORS.plains;
}

/**
 * Convert RGB color to CSS rgb() string
 */
export function rgbToCSS(color: BiomeColor): string {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

/**
 * Convert RGB to hex color string
 */
export function rgbToHex(color: BiomeColor): string {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}
