/**
 * Item Geometry Generator for Minecraft-style 3D Items
 *
 * Creates custom BufferGeometry from texture alpha channel to achieve
 * the Minecraft item rendering effect where:
 * - Front/back faces show the full texture
 * - Edge faces show a 1-pixel slice from the texture edges
 * - Shape follows the non-transparent pixels
 */

import * as THREE from 'three';

interface PixelData {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

interface Point {
  x: number;
  y: number;
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
 * Finds the bounding box of non-transparent pixels
 */
function findBoundingBox(pixelData: PixelData): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = pixelData.width;
  let minY = pixelData.height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < pixelData.height; y++) {
    for (let x = 0; x < pixelData.width; x++) {
      if (isPixelOpaque(pixelData, x, y)) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Traces the outline of the shape using marching squares algorithm
 * Returns a simplified polygon outline
 */
function traceOutline(pixelData: PixelData): Point[] {
  const bbox = findBoundingBox(pixelData);

  // For now, we'll create a simple rectangular outline based on the bounding box
  // This is a good starting point and works well for most items
  // Can be enhanced later with true marching squares for complex shapes

  const outline: Point[] = [];

  // Convert pixel coordinates to normalized coordinates (0-1)
  // and center them
  const width = pixelData.width;
  const height = pixelData.height;

  // Create outline points for the bounding box
  // We'll scan the edges to create a more detailed outline
  const points = new Set<string>();

  // Scan top and bottom edges
  for (let x = bbox.minX; x <= bbox.maxX; x++) {
    // Top edge
    for (let y = bbox.minY; y <= bbox.maxY; y++) {
      if (isPixelOpaque(pixelData, x, y)) {
        points.add(`${x},${y}`);
        break;
      }
    }
    // Bottom edge
    for (let y = bbox.maxY; y >= bbox.minY; y--) {
      if (isPixelOpaque(pixelData, x, y)) {
        points.add(`${x},${y}`);
        break;
      }
    }
  }

  // Scan left and right edges
  for (let y = bbox.minY; y <= bbox.maxY; y++) {
    // Left edge
    for (let x = bbox.minX; x <= bbox.maxX; x++) {
      if (isPixelOpaque(pixelData, x, y)) {
        points.add(`${x},${y}`);
        break;
      }
    }
    // Right edge
    for (let x = bbox.maxX; x >= bbox.minX; x--) {
      if (isPixelOpaque(pixelData, x, y)) {
        points.add(`${x},${y}`);
        break;
      }
    }
  }

  // Convert to array and sort to create a proper outline
  const pointArray = Array.from(points).map(p => {
    const [x, y] = p.split(',').map(Number);
    return { x, y };
  });

  // Sort points to create a clockwise outline
  // Group by edges
  const topEdge = pointArray.filter(p => p.y === bbox.minY).sort((a, b) => a.x - b.x);
  const rightEdge = pointArray.filter(p => p.x === bbox.maxX && p.y !== bbox.minY && p.y !== bbox.maxY).sort((a, b) => a.y - b.y);
  const bottomEdge = pointArray.filter(p => p.y === bbox.maxY).sort((a, b) => b.x - a.x);
  const leftEdge = pointArray.filter(p => p.x === bbox.minX && p.y !== bbox.minY && p.y !== bbox.maxY).sort((a, b) => b.y - a.y);

  // Combine edges
  outline.push(...topEdge, ...rightEdge, ...bottomEdge, ...leftEdge);

  // If we didn't get enough points, fall back to simple bounding box
  if (outline.length < 4) {
    outline.length = 0;
    outline.push(
      { x: bbox.minX, y: bbox.minY },
      { x: bbox.maxX, y: bbox.minY },
      { x: bbox.maxX, y: bbox.maxY },
      { x: bbox.minX, y: bbox.maxY }
    );
  }

  return outline;
}

/**
 * Generates custom BufferGeometry for a Minecraft-style item
 */
export function generateItemGeometry(
  texture: THREE.Texture,
  thickness: number = 0.0625 // 1/16 block (1 pixel in Minecraft scale)
): THREE.BufferGeometry {
  const pixelData = readTexturePixels(texture);
  const outline = traceOutline(pixelData);

  const width = pixelData.width;
  const height = pixelData.height;

  // Normalize outline points to -0.5 to 0.5 range (centered)
  const normalizedOutline = outline.map(p => ({
    x: (p.x / width) - 0.5,
    y: -((p.y / height) - 0.5), // Flip Y for Three.js coordinate system
    u: p.x / width,
    v: p.y / height,
  }));

  const vertices: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];
  const normals: number[] = [];

  const halfThickness = thickness / 2;

  // Create vertices for front and back faces
  const numOutlinePoints = normalizedOutline.length;

  // Front face vertices (z = halfThickness)
  for (let i = 0; i < numOutlinePoints; i++) {
    const p = normalizedOutline[i];
    vertices.push(p.x, p.y, halfThickness);
    uvs.push(p.u, 1 - p.v); // Flip V coordinate for Three.js
    normals.push(0, 0, 1); // Front face normal
  }

  // Back face vertices (z = -halfThickness)
  for (let i = 0; i < numOutlinePoints; i++) {
    const p = normalizedOutline[i];
    vertices.push(p.x, p.y, -halfThickness);
    uvs.push(p.u, 1 - p.v); // Same UV as front
    normals.push(0, 0, -1); // Back face normal
  }

  // Triangulate front face using fan triangulation from center
  // Calculate center point for fan triangulation
  const centerX = normalizedOutline.reduce((sum, p) => sum + p.x, 0) / numOutlinePoints;
  const centerY = normalizedOutline.reduce((sum, p) => sum + p.y, 0) / numOutlinePoints;
  const centerU = normalizedOutline.reduce((sum, p) => sum + p.u, 0) / numOutlinePoints;
  const centerV = normalizedOutline.reduce((sum, p) => sum + p.v, 0) / numOutlinePoints;

  // Add center vertex for front face
  const frontCenterIndex = vertices.length / 3;
  vertices.push(centerX, centerY, halfThickness);
  uvs.push(centerU, 1 - centerV);
  normals.push(0, 0, 1);

  // Add center vertex for back face
  const backCenterIndex = vertices.length / 3;
  vertices.push(centerX, centerY, -halfThickness);
  uvs.push(centerU, 1 - centerV);
  normals.push(0, 0, -1);

  // Create front face triangles (counter-clockwise)
  for (let i = 0; i < numOutlinePoints; i++) {
    const next = (i + 1) % numOutlinePoints;
    indices.push(frontCenterIndex, i, next);
  }

  // Create back face triangles (clockwise for correct facing)
  for (let i = 0; i < numOutlinePoints; i++) {
    const next = (i + 1) % numOutlinePoints;
    indices.push(backCenterIndex, numOutlinePoints + next, numOutlinePoints + i);
  }

  // Create edge faces connecting front and back
  for (let i = 0; i < numOutlinePoints; i++) {
    const next = (i + 1) % numOutlinePoints;

    const frontIdx1 = i;
    const frontIdx2 = next;
    const backIdx1 = numOutlinePoints + i;
    const backIdx2 = numOutlinePoints + next;

    // Calculate edge normal (perpendicular to edge direction)
    const p1 = normalizedOutline[i];
    const p2 = normalizedOutline[next];
    const edgeX = p2.x - p1.x;
    const edgeY = p2.y - p1.y;
    const edgeLength = Math.sqrt(edgeX * edgeX + edgeY * edgeY);

    // Normal perpendicular to edge (pointing outward)
    const normalX = -edgeY / edgeLength;
    const normalY = edgeX / edgeLength;

    // Create two triangles for this edge face
    // We need to add new vertices for the edge because they need different UVs and normals
    const edgeVertexStart = vertices.length / 3;

    // Add 4 vertices for this edge quad
    // Front-left
    vertices.push(p1.x, p1.y, halfThickness);
    uvs.push(p1.u, 1 - p1.v); // Use edge pixel UV
    normals.push(normalX, normalY, 0);

    // Front-right
    vertices.push(p2.x, p2.y, halfThickness);
    uvs.push(p2.u, 1 - p2.v);
    normals.push(normalX, normalY, 0);

    // Back-right
    vertices.push(p2.x, p2.y, -halfThickness);
    uvs.push(p2.u, 1 - p2.v);
    normals.push(normalX, normalY, 0);

    // Back-left
    vertices.push(p1.x, p1.y, -halfThickness);
    uvs.push(p1.u, 1 - p1.v);
    normals.push(normalX, normalY, 0);

    // Create two triangles for the quad
    indices.push(
      edgeVertexStart, edgeVertexStart + 1, edgeVertexStart + 2,
      edgeVertexStart, edgeVertexStart + 2, edgeVertexStart + 3
    );
  }

  // Create BufferGeometry
  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);

  // Compute vertex normals for smooth shading (optional, we already set normals)
  // geometry.computeVertexNormals();

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
