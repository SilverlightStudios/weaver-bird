/**
 * Item Geometry Generator for Minecraft-style 3D Items
 *
 * Creates custom BufferGeometry from texture alpha channel to achieve
 * the Minecraft item rendering effect where:
 * - Front/back faces show the full texture
 * - Edge faces are pixel-perfect rectangular quads (no smooth interpolation)
 * - Each pixel gets its own edge faces where exposed
 * - Sharp, blocky appearance matching Minecraft's aesthetic
 */

import * as THREE from 'three';

interface PixelData {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/**
 * Reads pixel data from a texture
 */
function readTexturePixels(texture: THREE.Texture): PixelData {
  const image = texture.image as HTMLImageElement;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get 2D context');
  }

  canvas.width = image.width;
  canvas.height = image.height;

  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, image.width, image.height);

  return {
    width: image.width,
    height: image.height,
    data: imageData.data,
  };
}

/**
 * Checks if a pixel is opaque (alpha > threshold)
 */
function isPixelOpaque(pixelData: PixelData, x: number, y: number, threshold = 1): boolean {
  if (x < 0 || x >= pixelData.width || y < 0 || y >= pixelData.height) {
    return false;
  }

  const index = (y * pixelData.width + x) * 4;
  const alpha = pixelData.data[index + 3];

  return alpha > threshold;
}

/**
 * Generates custom BufferGeometry for a Minecraft-style item with pixel-perfect edges
 */
export function generateItemGeometry(
  texture: THREE.Texture,
  thickness: number = 0.0625 // 1/16 block (1 pixel in Minecraft scale)
): THREE.BufferGeometry {
  const pixelData = readTexturePixels(texture);

  const width = pixelData.width;
  const height = pixelData.height;
  const halfThickness = thickness / 2;

  const vertices: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];
  const normals: number[] = [];

  // Pixel size in normalized coordinates (texture covers -0.5 to 0.5)
  const pixelWidth = 1.0 / width;
  const pixelHeight = 1.0 / height;

  // Helper to add a quad (two triangles)
  function addQuad(
    v1: [number, number, number],
    v2: [number, number, number],
    v3: [number, number, number],
    v4: [number, number, number],
    uv1: [number, number],
    uv2: [number, number],
    uv3: [number, number],
    uv4: [number, number],
    normal: [number, number, number]
  ) {
    const startIdx = vertices.length / 3;

    // Add vertices
    vertices.push(...v1, ...v2, ...v3, ...v4);

    // Add UVs
    uvs.push(...uv1, ...uv2, ...uv3, ...uv4);

    // Add normals (same for all 4 vertices)
    normals.push(...normal, ...normal, ...normal, ...normal);

    // Add indices for two triangles
    indices.push(
      startIdx, startIdx + 1, startIdx + 2,
      startIdx, startIdx + 2, startIdx + 3
    );
  }

  // First pass: Create front and back faces as single textured quads
  // This is more efficient than per-pixel quads and looks correct with texture mapping

  // Find bounding box of opaque pixels
  let minX = width, minY = height, maxX = 0, maxY = 0;
  let hasOpaquePixels = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isPixelOpaque(pixelData, x, y)) {
        hasOpaquePixels = true;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (!hasOpaquePixels) {
    // Return empty geometry if no opaque pixels
    return new THREE.BufferGeometry();
  }

  // Add 1 to max to include the full pixel
  maxX += 1;
  maxY += 1;

  // Convert pixel coordinates to normalized coordinates (-0.5 to 0.5, centered)
  const x1 = (minX / width) - 0.5;
  const x2 = (maxX / width) - 0.5;
  const y1 = -((minY / height) - 0.5); // Flip Y
  const y2 = -((maxY / height) - 0.5); // Flip Y

  const u1 = minX / width;
  const u2 = maxX / width;
  const v1 = minY / height;
  const v2 = maxY / height;

  // Front face (z = halfThickness)
  addQuad(
    [x1, y1, halfThickness],
    [x2, y1, halfThickness],
    [x2, y2, halfThickness],
    [x1, y2, halfThickness],
    [u1, 1 - v1],
    [u2, 1 - v1],
    [u2, 1 - v2],
    [u1, 1 - v2],
    [0, 0, 1]
  );

  // Back face (z = -halfThickness)
  addQuad(
    [x2, y1, -halfThickness],
    [x1, y1, -halfThickness],
    [x1, y2, -halfThickness],
    [x2, y2, -halfThickness],
    [u2, 1 - v1],
    [u1, 1 - v1],
    [u1, 1 - v2],
    [u2, 1 - v2],
    [0, 0, -1]
  );

  // Second pass: Create pixel-perfect edge faces
  // For each opaque pixel, check its neighbors and create edge faces where exposed

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      if (!isPixelOpaque(pixelData, px, py)) {
        continue;
      }

      // Convert pixel coordinates to normalized coordinates
      const pixelX1 = (px / width) - 0.5;
      const pixelX2 = ((px + 1) / width) - 0.5;
      const pixelY1 = -((py / height) - 0.5); // Flip Y
      const pixelY2 = -(((py + 1) / height) - 0.5); // Flip Y

      // UV coordinates for this pixel (use the pixel's center for edge faces)
      const pixelU1 = px / width;
      const pixelU2 = (px + 1) / width;
      const pixelV1 = py / height;
      const pixelV2 = (py + 1) / height;

      // For edges, we want to sample from the edge of the pixel
      // Use the same UV for all edge vertices of a given edge

      // Check left neighbor (x - 1)
      if (!isPixelOpaque(pixelData, px - 1, py)) {
        // Left edge exposed - create a vertical face (CCW from outside)
        addQuad(
          [pixelX1, pixelY1, halfThickness],
          [pixelX1, pixelY1, -halfThickness],
          [pixelX1, pixelY2, -halfThickness],
          [pixelX1, pixelY2, halfThickness],
          [pixelU1, 1 - pixelV1],
          [pixelU1, 1 - pixelV1],
          [pixelU1, 1 - pixelV2],
          [pixelU1, 1 - pixelV2],
          [-1, 0, 0]
        );
      }

      // Check right neighbor (x + 1)
      if (!isPixelOpaque(pixelData, px + 1, py)) {
        // Right edge exposed - create a vertical face (CCW from outside)
        addQuad(
          [pixelX2, pixelY1, -halfThickness],
          [pixelX2, pixelY1, halfThickness],
          [pixelX2, pixelY2, halfThickness],
          [pixelX2, pixelY2, -halfThickness],
          [pixelU2, 1 - pixelV1],
          [pixelU2, 1 - pixelV1],
          [pixelU2, 1 - pixelV2],
          [pixelU2, 1 - pixelV2],
          [1, 0, 0]
        );
      }

      // Check top neighbor (y - 1)
      if (!isPixelOpaque(pixelData, px, py - 1)) {
        // Top edge exposed - create a horizontal face (CCW from outside)
        addQuad(
          [pixelX1, pixelY1, -halfThickness],
          [pixelX2, pixelY1, -halfThickness],
          [pixelX2, pixelY1, halfThickness],
          [pixelX1, pixelY1, halfThickness],
          [pixelU1, 1 - pixelV1],
          [pixelU2, 1 - pixelV1],
          [pixelU2, 1 - pixelV1],
          [pixelU1, 1 - pixelV1],
          [0, 1, 0]
        );
      }

      // Check bottom neighbor (y + 1)
      if (!isPixelOpaque(pixelData, px, py + 1)) {
        // Bottom edge exposed - create a horizontal face (CCW from outside)
        addQuad(
          [pixelX2, pixelY2, halfThickness],
          [pixelX1, pixelY2, halfThickness],
          [pixelX1, pixelY2, -halfThickness],
          [pixelX2, pixelY2, -halfThickness],
          [pixelU2, 1 - pixelV2],
          [pixelU1, 1 - pixelV2],
          [pixelU1, 1 - pixelV2],
          [pixelU2, 1 - pixelV2],
          [0, -1, 0]
        );
      }
    }
  }

  // Create BufferGeometry
  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);

  return geometry;
}

/**
 * Cache for generated geometries to avoid regenerating for the same texture
 */
const geometryCache = new Map<string, THREE.BufferGeometry>();

/**
 * Generates or retrieves cached item geometry
 */
export function getItemGeometry(
  texture: THREE.Texture,
  thickness: number = 0.0625
): THREE.BufferGeometry {
  const cacheKey = `${texture.uuid}_${thickness}`;

  if (geometryCache.has(cacheKey)) {
    return geometryCache.get(cacheKey)!;
  }

  const geometry = generateItemGeometry(texture, thickness);
  geometryCache.set(cacheKey, geometry);

  return geometry;
}

/**
 * Clears the geometry cache
 */
export function clearGeometryCache(): void {
  geometryCache.forEach(geometry => geometry.dispose());
  geometryCache.clear();
}

/**
 * Removes a specific geometry from cache
 */
export function uncacheGeometry(textureUuid: string, thickness: number = 0.0625): void {
  const cacheKey = `${textureUuid}_${thickness}`;
  const geometry = geometryCache.get(cacheKey);

  if (geometry) {
    geometry.dispose();
    geometryCache.delete(cacheKey);
  }
}
