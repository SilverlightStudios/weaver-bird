/**
 * Web Worker for Three.js Geometry Pre-computation
 *
 * This worker handles CPU-intensive geometry calculations for Minecraft block models.
 * Instead of creating Three.js objects (which require WebGL context), it pre-computes
 * the raw vertex data that can be quickly converted to BufferGeometry on the main thread.
 *
 * RESPONSIBILITIES:
 * - Calculate vertex positions for all elements
 * - Compute UV coordinates with rotation support
 * - Generate normals for lighting
 * - Build face indices
 * - Return lightweight typed arrays for zero-copy transfer
 */

import type {
  BlockModel,
  ModelElement,
  ElementFace,
  ResolvedModel,
} from "@lib/tauri/blockModels";

const MINECRAFT_UNIT = 16; // Minecraft uses 16x16x16 units per block

// Types for worker communication
export interface WorkerRequest {
  id: string;
  model: BlockModel;
  resolvedTextures: Record<string, string>;
  biomeColor?: { r: number; g: number; b: number } | null;
  resolvedModel?: ResolvedModel;
}

export interface GeometryData {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint16Array;
  materialGroups: MaterialGroup[];
}

export interface MaterialGroup {
  start: number; // Start index in indices array
  count: number; // Number of indices
  textureId: string; // Resolved texture ID
  tintindex?: number; // For biome tinting
  materialIndex: number; // Index in materials array
}

export interface WorkerResponse {
  id: string;
  elements: ElementGeometryData[];
  blockstateRotation?: {
    rotX: number;
    rotY: number;
    rotZ: number;
    uvlock: boolean;
  };
}

export interface ElementGeometryData {
  geometry: GeometryData;
  position: [number, number, number]; // Element center position
  rotation?: {
    origin: [number, number, number];
    axis: "x" | "y" | "z";
    angle: number;
    rescale: boolean;
  };
}

/**
 * Compute geometry data for a single element
 */
function computeElementGeometry(
  element: ModelElement,
  textureVariables: Record<string, string>,
): GeometryData {
  const [x1, y1, z1] = element.from;
  const [x2, y2, z2] = element.to;

  // Calculate size in Three.js units (0-1 scale)
  const width = (x2 - x1) / MINECRAFT_UNIT;
  const height = (y2 - y1) / MINECRAFT_UNIT;
  const depth = (z2 - z1) / MINECRAFT_UNIT;

  // Each face has 4 vertices, 6 indices (2 triangles)
  // We'll build a custom geometry with only the faces that are defined
  const {faces} = element;
  const definedFaces: Array<{
    name: string;
    data: ElementFace;
    faceIndex: number;
  }> = [];

  const faceMapping: Record<string, number> = {
    east: 0, // right (+X)
    west: 1, // left (-X)
    up: 2, // top (+Y)
    down: 3, // bottom (-Y)
    south: 4, // front (+Z)
    north: 5, // back (-Z)
  };

  // Collect defined faces
  for (const [faceName, faceData] of Object.entries(faces)) {
    const faceIndex = faceMapping[faceName];
    if (faceIndex !== undefined) {
      definedFaces.push({ name: faceName, data: faceData, faceIndex });
    }
  }

  // Allocate arrays
  const vertexCount = definedFaces.length * 4;
  const indexCount = definedFaces.length * 6;
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices = new Uint16Array(indexCount);
  const materialGroups: MaterialGroup[] = [];

  let vertexOffset = 0;
  let indexOffset = 0;

  // Build geometry for each face
  for (const { name: faceName, data: faceData, faceIndex } of definedFaces) {
    // Resolve texture
    let textureId = faceData.texture;
    if (textureId.startsWith("#")) {
      const varName = textureId.substring(1);
      textureId = textureVariables[varName] || textureId;
    }

    // Skip if unresolved
    if (textureId.startsWith("#")) {
      continue;
    }

    // Build face geometry
    const faceVertices = getFaceVertices(faceName, width, height, depth);
    const faceNormal = getFaceNormal(faceName);
    const faceUVs = getFaceUVs(faceData);

    // Add vertices
    for (let i = 0; i < 4; i++) {
      positions[vertexOffset * 3 + i * 3 + 0] = faceVertices[i * 3 + 0];
      positions[vertexOffset * 3 + i * 3 + 1] = faceVertices[i * 3 + 1];
      positions[vertexOffset * 3 + i * 3 + 2] = faceVertices[i * 3 + 2];

      normals[vertexOffset * 3 + i * 3 + 0] = faceNormal[0];
      normals[vertexOffset * 3 + i * 3 + 1] = faceNormal[1];
      normals[vertexOffset * 3 + i * 3 + 2] = faceNormal[2];

      uvs[vertexOffset * 2 + i * 2 + 0] = faceUVs[i * 2 + 0];
      uvs[vertexOffset * 2 + i * 2 + 1] = faceUVs[i * 2 + 1];
    }

    // Add indices (two triangles)
    indices[indexOffset + 0] = vertexOffset + 0;
    indices[indexOffset + 1] = vertexOffset + 1;
    indices[indexOffset + 2] = vertexOffset + 2;
    indices[indexOffset + 3] = vertexOffset + 0;
    indices[indexOffset + 4] = vertexOffset + 2;
    indices[indexOffset + 5] = vertexOffset + 3;

    // Add material group
    materialGroups.push({
      start: indexOffset,
      count: 6,
      textureId,
      tintindex: faceData.tintindex,
      materialIndex: faceIndex,
    });

    vertexOffset += 4;
    indexOffset += 6;
  }

  return {
    positions,
    normals,
    uvs,
    indices,
    materialGroups,
  };
}

/**
 * Get vertex positions for a face
 * Returns 4 vertices (x, y, z) × 4 = 12 floats
 */
function getFaceVertices(
  faceName: string,
  width: number,
  height: number,
  depth: number,
): number[] {
  const w2 = width / 2;
  const h2 = height / 2;
  const d2 = depth / 2;

  switch (faceName) {
    case "east": // right (+X)
      return [
        w2,
        -h2,
        -d2, // bottom-left
        w2,
        -h2,
        d2, // bottom-right
        w2,
        h2,
        d2, // top-right
        w2,
        h2,
        -d2, // top-left
      ];
    case "west": // left (-X)
      return [
        -w2,
        -h2,
        d2, // bottom-left
        -w2,
        -h2,
        -d2, // bottom-right
        -w2,
        h2,
        -d2, // top-right
        -w2,
        h2,
        d2, // top-left
      ];
    case "up": // top (+Y)
      return [
        -w2,
        h2,
        -d2, // bottom-left
        w2,
        h2,
        -d2, // bottom-right
        w2,
        h2,
        d2, // top-right
        -w2,
        h2,
        d2, // top-left
      ];
    case "down": // bottom (-Y)
      return [
        -w2,
        -h2,
        d2, // bottom-left
        w2,
        -h2,
        d2, // bottom-right
        w2,
        -h2,
        -d2, // top-right
        -w2,
        -h2,
        -d2, // top-left
      ];
    case "south": // front (+Z)
      return [
        -w2,
        -h2,
        d2, // bottom-left
        w2,
        -h2,
        d2, // bottom-right
        w2,
        h2,
        d2, // top-right
        -w2,
        h2,
        d2, // top-left
      ];
    case "north": // back (-Z)
      return [
        w2,
        -h2,
        -d2, // bottom-left
        -w2,
        -h2,
        -d2, // bottom-right
        -w2,
        h2,
        -d2, // top-right
        w2,
        h2,
        -d2, // top-left
      ];
    default:
      return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  }
}

/**
 * Get normal vector for a face
 */
function getFaceNormal(faceName: string): [number, number, number] {
  switch (faceName) {
    case "east":
      return [1, 0, 0];
    case "west":
      return [-1, 0, 0];
    case "up":
      return [0, 1, 0];
    case "down":
      return [0, -1, 0];
    case "south":
      return [0, 0, 1];
    case "north":
      return [0, 0, -1];
    default:
      return [0, 0, 0];
  }
}

/**
 * Get UV coordinates for a face
 * Returns 4 UV pairs (u, v) × 4 = 8 floats
 */
function getFaceUVs(faceData: ElementFace): number[] {
  if (!faceData.uv) {
    // Default UVs (full texture)
    return [
      0,
      1, // bottom-left
      1,
      1, // bottom-right
      1,
      0, // top-right
      0,
      0, // top-left
    ];
  }

  const [x1, y1, x2, y2] = faceData.uv;

  // Convert Minecraft UV (0-16) to Three.js UV (0-1)
  // Flip Y axis: Minecraft (0,0) is top-left, Three.js (0,0) is bottom-left
  const u1 = x1 / 16;
  const u2 = x2 / 16;
  const v1 = 1 - y1 / 16;
  const v2 = 1 - y2 / 16;

  // Handle rotation
  const rotation = faceData.rotation || 0;

  switch (rotation) {
    case 90:
      return [
        u1,
        v2, // rotated
        u1,
        v1,
        u2,
        v1,
        u2,
        v2,
      ];
    case 180:
      return [u2, v2, u1, v2, u1, v1, u2, v1];
    case 270:
      return [u2, v1, u2, v2, u1, v2, u1, v1];
    default: // 0
      return [
        u1,
        v2, // bottom-left (v2 because Y is flipped)
        u2,
        v2, // bottom-right
        u2,
        v1, // top-right
        u1,
        v1, // top-left
      ];
  }
}

/**
 * Process a block model and compute geometry data for all elements
 */
function processModel(
  model: BlockModel,
  resolvedTextures: Record<string, string>,
  _resolvedModel?: ResolvedModel,
): ElementGeometryData[] {
  if (!model.elements || model.elements.length === 0) {
    console.warn("[ThreeGeometryWorker] No elements in model");
    return [];
  }

  const elements: ElementGeometryData[] = [];

  for (const element of model.elements) {
    const [x1, y1, z1] = element.from;
    const [x2, y2, z2] = element.to;

    // Calculate center position (offset by -0.5 to center entire model at origin)
    const centerX = (x1 + x2) / 2 / MINECRAFT_UNIT - 0.5;
    const centerY = (y1 + y2) / 2 / MINECRAFT_UNIT - 0.5;
    const centerZ = (z1 + z2) / 2 / MINECRAFT_UNIT - 0.5;

    // Compute geometry
    const geometry = computeElementGeometry(element, resolvedTextures);

    // Build element data
    const elementData: ElementGeometryData = {
      geometry,
      position: [centerX, centerY, centerZ],
    };

    // Include rotation if specified
    if (element.rotation) {
      const [originX, originY, originZ] = element.rotation.origin;
      elementData.rotation = {
        origin: [
          originX / MINECRAFT_UNIT - 0.5,
          originY / MINECRAFT_UNIT - 0.5,
          originZ / MINECRAFT_UNIT - 0.5,
        ],
        axis: element.rotation.axis,
        angle: element.rotation.angle,
        rescale: element.rotation.rescale || false,
      };
    }

    elements.push(elementData);
  }

  return elements;
}

// Worker message handler
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, model, resolvedTextures, resolvedModel } = event.data;

  try {
    // Process the model
    const elements = processModel(model, resolvedTextures, resolvedModel);

    // Build response
    const response: WorkerResponse = {
      id,
      elements,
    };

    // Include blockstate rotation if provided
    if (resolvedModel) {
      response.blockstateRotation = {
        rotX: resolvedModel.rotX,
        rotY: resolvedModel.rotY,
        rotZ: resolvedModel.rotZ,
        uvlock: resolvedModel.uvlock,
      };
    }

    // Send result back to main thread
    // Transfer typed arrays for zero-copy performance
    const transferables: Transferable[] = [];
    for (const element of elements) {
      transferables.push(element.geometry.positions.buffer);
      transferables.push(element.geometry.normals.buffer);
      transferables.push(element.geometry.uvs.buffer);
      transferables.push(element.geometry.indices.buffer);
    }

    self.postMessage(response, { transfer: transferables });
  } catch (error) {
    console.error("[ThreeGeometryWorker] Error processing model:", error);
    // Send empty result on error
    self.postMessage({
      id,
      elements: [],
    });
  }
};
