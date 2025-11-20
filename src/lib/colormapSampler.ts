/**
 * Colormap sampling utility
 *
 * Loads colormap images and samples pixel colors at biome coordinates
 * for accurate biome-based texture tinting.
 */

import { getBiomesWithCoords } from "@components/BiomeColorPicker/biomeData";

export interface ColormapColor {
  r: number;
  g: number;
  b: number;
}

/**
 * Cache for loaded colormap image data
 * Key: colormap texture URL
 */
const colormapCache = new Map<string, ImageData>();

/**
 * Load a colormap image and extract its pixel data
 */
async function loadColormapImageData(url: string): Promise<ImageData> {
  // Check cache first
  const cached = colormapCache.get(url);
  if (cached) {
    return cached;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Cache the result
        colormapCache.set(url, imageData);
        resolve(imageData);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error(`Failed to load colormap: ${url}`));
    };

    img.src = url;
  });
}

/**
 * Sample a color from colormap image data at specific coordinates
 */
function sampleColorFromImageData(
  imageData: ImageData,
  x: number,
  y: number,
): ColormapColor {
  // Clamp coordinates to image bounds
  const clampedX = Math.max(0, Math.min(imageData.width - 1, Math.floor(x)));
  const clampedY = Math.max(0, Math.min(imageData.height - 1, Math.floor(y)));

  const index = (clampedY * imageData.width + clampedX) * 4;

  return {
    r: imageData.data[index],
    g: imageData.data[index + 1],
    b: imageData.data[index + 2],
  };
}

/**
 * Get the foliage color for a specific biome from a colormap
 *
 * @param colormapUrl - URL of the colormap image
 * @param biomeId - ID of the biome (e.g., "plains", "jungle")
 * @returns RGB color sampled from the colormap at the biome's coordinates
 */
export async function getFoliageColorForBiomeFromColormap(
  colormapUrl: string,
  biomeId: string,
): Promise<ColormapColor> {
  try {
    // Load the colormap image data
    const imageData = await loadColormapImageData(colormapUrl);

    // Get the biome's coordinates in the colormap
    const biomesWithCoords = getBiomesWithCoords();
    const biome = biomesWithCoords.find(b => b.id === biomeId);

    if (!biome) {
      // Fallback to center of colormap if biome not found
      console.warn(`[colormapSampler] Biome not found: ${biomeId}, using center of colormap`);
      return sampleColorFromImageData(
        imageData,
        imageData.width / 2,
        imageData.height / 2,
      );
    }

    // Sample the color at the biome's coordinates
    return sampleColorFromImageData(imageData, biome.x, biome.y);
  } catch (error) {
    console.error('[colormapSampler] Failed to sample colormap:', error);
    // Fallback to a default green color
    return { r: 119, g: 171, b: 47 }; // Plains default
  }
}

/**
 * Sample a color from a colormap at specific pixel coordinates
 *
 * @param colormapUrl - URL of the colormap image
 * @param x - X coordinate in the colormap image
 * @param y - Y coordinate in the colormap image
 * @returns RGB color at those coordinates
 */
export async function sampleColormapAtCoordinates(
  colormapUrl: string,
  x: number,
  y: number,
): Promise<ColormapColor> {
  try {
    const imageData = await loadColormapImageData(colormapUrl);
    return sampleColorFromImageData(imageData, x, y);
  } catch (error) {
    console.error('[colormapSampler] Failed to sample colormap:', error);
    return { r: 119, g: 171, b: 47 }; // Fallback
  }
}

/**
 * Clear the colormap cache
 * Call this when switching resource packs or to free memory
 */
export function clearColormapCache(): void {
  colormapCache.clear();
}
