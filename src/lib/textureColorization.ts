/**
 * Canvas-based texture colorization for Minecraft leaf tinting
 *
 * Applies biome-based color tinting to grayscale leaf textures while
 * preserving transparency and texture detail.
 */

export interface TintColor {
  r: number;
  g: number;
  b: number;
}

/**
 * Cache for tinted textures to avoid re-processing
 * Key format: `${textureUrl}|${r},${g},${b}`
 */
const tintedTextureCache = new Map<string, string>();

/**
 * Maximum cache size (number of tinted textures to keep in memory)
 */
const MAX_CACHE_SIZE = 100;

/**
 * Generate a cache key for a texture + color combination
 */
function getCacheKey(textureUrl: string, color: TintColor): string {
  return `${textureUrl}|${color.r},${color.g},${color.b}`;
}

/**
 * Load an image from a URL and return it as an HTMLImageElement
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // Enable CORS for local files
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/**
 * Apply color tinting to a grayscale texture using canvas
 *
 * Algorithm:
 * - For each pixel, multiply the grayscale RGB values by the tint color
 * - Preserve the alpha channel (transparency)
 * - This maintains texture detail while applying the biome color
 *
 * @param textureUrl - URL of the grayscale texture to tint
 * @param tintColor - RGB color to apply
 * @returns Data URL of the tinted texture
 */
export async function tintTexture(
  textureUrl: string,
  tintColor: TintColor,
): Promise<string> {
  // Check cache first
  const cacheKey = getCacheKey(textureUrl, tintColor);
  const cached = tintedTextureCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Load the source image
    const img = await loadImage(textureUrl);

    // Create an off-screen canvas
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    // Draw the original image
    ctx.drawImage(img, 0, 0);

    // Get pixel data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Apply tinting to each pixel
    // Minecraft's tinting: multiply grayscale RGB by tint color, preserve alpha
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // Skip fully transparent pixels
      if (a === 0) {
        continue;
      }

      // Multiply each channel by the tint color
      // Normalize to 0-1 range for multiplication, then scale back to 0-255
      data[i] = Math.round((r / 255) * tintColor.r);
      data[i + 1] = Math.round((g / 255) * tintColor.g);
      data[i + 2] = Math.round((b / 255) * tintColor.b);
      // Alpha channel stays the same
    }

    // Put the modified pixel data back
    ctx.putImageData(imageData, 0, 0);

    // Convert to data URL
    const dataUrl = canvas.toDataURL("image/png");

    // Cache the result (with LRU eviction)
    if (tintedTextureCache.size >= MAX_CACHE_SIZE) {
      // Remove oldest entry (first key in Map)
      const firstKey = tintedTextureCache.keys().next().value;
      if (firstKey) {
        tintedTextureCache.delete(firstKey);
      }
    }
    tintedTextureCache.set(cacheKey, dataUrl);

    return dataUrl;
  } catch (error) {
    console.error("[textureColorization] Failed to tint texture:", error);
    // Return original URL as fallback
    return textureUrl;
  }
}

/**
 * Clear all tinted textures from cache
 * Call this when the component unmounts to prevent memory leaks
 */
export function clearTintCache(): void {
  tintedTextureCache.clear();
}

/**
 * Clear tinted textures for a specific source texture
 * Useful when a texture is unloaded
 */
export function clearTextureFromCache(textureUrl: string): void {
  const keysToDelete: string[] = [];
  for (const key of tintedTextureCache.keys()) {
    if (key.startsWith(`${textureUrl}|`)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach((key) => tintedTextureCache.delete(key));
}
