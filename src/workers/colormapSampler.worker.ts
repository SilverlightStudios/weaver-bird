/**
 * Web Worker for Colormap Sampling (Batch)
 *
 * Handles CPU-intensive colormap sampling operations.
 * Loads colormap images and samples multiple coordinates in batches.
 * Runs off the main thread to keep UI responsive.
 */

export interface ColormapColor {
  r: number;
  g: number;
  b: number;
}

export interface SampleRequest {
  x: number;
  y: number;
}

export interface SampleResult {
  grassColor: ColormapColor | null;
  foliageColor: ColormapColor | null;
}

export interface WorkerRequest {
  id: string;
  grassColormapUrl: string | null;
  foliageColormapUrl: string | null;
  coordinates: SampleRequest[];
}

export interface WorkerResponse {
  id: string;
  results: SampleResult[];
}

/**
 * Cache for loaded colormap image data in the worker
 */
const colormapCache = new Map<string, ImageData>();

/**
 * Load a colormap image and extract its pixel data
 * Uses fetch + createImageBitmap which work in Web Workers
 */
async function loadColormapImageData(url: string): Promise<ImageData> {
  // Check cache first
  const cached = colormapCache.get(url);
  if (cached) {
    return cached;
  }

  try {
    // Fetch the image as a blob
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch colormap: ${response.statusText}`);
    }

    const blob = await response.blob();

    // Decode the image using createImageBitmap (works in workers)
    const imageBitmap = await createImageBitmap(blob);

    // Use OffscreenCanvas to extract pixel data
    const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    ctx.drawImage(imageBitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Cache the result
    colormapCache.set(url, imageData);

    return imageData;
  } catch (error) {
    throw new Error(`Failed to load colormap from ${url}: ${error}`);
  }
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
 * Sample colors from both colormaps at given coordinates
 */
async function sampleBatch(
  grassColormapUrl: string | null,
  foliageColormapUrl: string | null,
  coordinates: SampleRequest[],
): Promise<SampleResult[]> {
  // Load both colormaps once
  const grassImageData = grassColormapUrl
    ? await loadColormapImageData(grassColormapUrl).catch((error) => {
        console.error('[ColormapWorker] Failed to load grass colormap:', error);
        return null;
      })
    : null;

  const foliageImageData = foliageColormapUrl
    ? await loadColormapImageData(foliageColormapUrl).catch((error) => {
        console.error('[ColormapWorker] Failed to load foliage colormap:', error);
        return null;
      })
    : null;

  // Sample all coordinates
  return coordinates.map(({ x, y }) => {
    const grassColor = grassImageData
      ? sampleColorFromImageData(grassImageData, x, y)
      : null;

    const foliageColor = foliageImageData
      ? sampleColorFromImageData(foliageImageData, x, y)
      : null;

    return { grassColor, foliageColor };
  });
}

/**
 * Worker message handler
 */
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, grassColormapUrl, foliageColormapUrl, coordinates } = event.data;

  try {
    const results = await sampleBatch(
      grassColormapUrl,
      foliageColormapUrl,
      coordinates,
    );

    const response: WorkerResponse = { id, results };
    self.postMessage(response);
  } catch (error) {
    console.error('[ColormapWorker] Error:', error);
    // Send empty results on error
    const response: WorkerResponse = {
      id,
      results: coordinates.map(() => ({
        grassColor: null,
        foliageColor: null,
      })),
    };
    self.postMessage(response);
  }
};
