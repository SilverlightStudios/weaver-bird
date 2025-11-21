/**
 * Synchronous fallback for Three.js Geometry Pre-computation
 *
 * Used when Web Worker fails to initialize.
 * Contains identical logic to the worker - runs on main thread as fallback.
 */

import type {
  BlockModel,
  ModelElement,
  ElementFace,
  ResolvedModel,
} from "@lib/tauri/blockModels";
import type {
  WorkerResponse,
  ElementGeometryData,
  GeometryData,
  MaterialGroup,
} from "@/workers/threeGeometry.worker";

const MINECRAFT_UNIT = 16;

/**
 * Compute geometry data for a single element
 */
function computeElementGeometry(
  element: ModelElement,
  textureVariables: Record<string, string>,
): GeometryData {
  const [x1, y1, z1] = element.from;
  const [x2, y2, z2] = element.to;

  const width = (x2 - x1) / MINECRAFT_UNIT;
  const height = (y2 - y1) / MINECRAFT_UNIT;
  const depth = (z2 - z1) / MINECRAFT_UNIT;

  const faces = element.faces;
  const definedFaces: Array<{
    name: string;
    data: ElementFace;
    faceIndex: number;
  }> = [];

  const faceMapping: Record<string, number> = {
    east: 0,
    west: 1,
    up: 2,
    down: 3,
    south: 4,
    north: 5,
  };

  for (const [faceName, faceData] of Object.entries(faces)) {
    const faceIndex = faceMapping[faceName];
    if (faceIndex !== undefined) {
      definedFaces.push({ name: faceName, data: faceData, faceIndex });
    }
  }

  const vertexCount = definedFaces.length * 4;
  const indexCount = definedFaces.length * 6;
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices = new Uint16Array(indexCount);
  const materialGroups: MaterialGroup[] = [];

  let vertexOffset = 0;
  let indexOffset = 0;

  for (const { name: faceName, data: faceData, faceIndex } of definedFaces) {
    let textureId = faceData.texture;
    if (textureId.startsWith("#")) {
      const varName = textureId.substring(1);
      textureId = textureVariables[varName] || textureId;
    }

    if (textureId.startsWith("#")) {
      continue;
    }

    const faceVertices = getFaceVertices(faceName, width, height, depth);
    const faceNormal = getFaceNormal(faceName);
    const faceUVs = getFaceUVs(faceData);

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

    indices[indexOffset + 0] = vertexOffset + 0;
    indices[indexOffset + 1] = vertexOffset + 1;
    indices[indexOffset + 2] = vertexOffset + 2;
    indices[indexOffset + 3] = vertexOffset + 0;
    indices[indexOffset + 4] = vertexOffset + 2;
    indices[indexOffset + 5] = vertexOffset + 3;

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
    case "east":
      return [w2, -h2, -d2, w2, -h2, d2, w2, h2, d2, w2, h2, -d2];
    case "west":
      return [-w2, -h2, d2, -w2, -h2, -d2, -w2, h2, -d2, -w2, h2, d2];
    case "up":
      return [-w2, h2, -d2, w2, h2, -d2, w2, h2, d2, -w2, h2, d2];
    case "down":
      return [-w2, -h2, d2, w2, -h2, d2, w2, -h2, -d2, -w2, -h2, -d2];
    case "south":
      return [-w2, -h2, d2, w2, -h2, d2, w2, h2, d2, -w2, h2, d2];
    case "north":
      return [w2, -h2, -d2, -w2, -h2, -d2, -w2, h2, -d2, w2, h2, -d2];
    default:
      return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  }
}

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

function getFaceUVs(faceData: ElementFace): number[] {
  if (!faceData.uv) {
    return [0, 1, 1, 1, 1, 0, 0, 0];
  }

  const [x1, y1, x2, y2] = faceData.uv;
  const u1 = x1 / 16;
  const u2 = x2 / 16;
  const v1 = 1 - y1 / 16;
  const v2 = 1 - y2 / 16;

  const rotation = faceData.rotation || 0;

  switch (rotation) {
    case 90:
      return [u1, v2, u1, v1, u2, v1, u2, v2];
    case 180:
      return [u2, v2, u1, v2, u1, v1, u2, v1];
    case 270:
      return [u2, v1, u2, v2, u1, v2, u1, v1];
    default:
      return [u1, v2, u2, v2, u2, v1, u1, v1];
  }
}

function processModel(
  model: BlockModel,
  resolvedTextures: Record<string, string>,
  _resolvedModel?: ResolvedModel,
): ElementGeometryData[] {
  if (!model.elements || model.elements.length === 0) {
    console.warn("[ThreeGeometrySync] No elements in model");
    return [];
  }

  const elements: ElementGeometryData[] = [];

  for (const element of model.elements) {
    const [x1, y1, z1] = element.from;
    const [x2, y2, z2] = element.to;

    const centerX = (x1 + x2) / 2 / MINECRAFT_UNIT - 0.5;
    const centerY = (y1 + y2) / 2 / MINECRAFT_UNIT - 0.5;
    const centerZ = (z1 + z2) / 2 / MINECRAFT_UNIT - 0.5;

    const geometry = computeElementGeometry(element, resolvedTextures);

    const elementData: ElementGeometryData = {
      geometry,
      position: [centerX, centerY, centerZ],
    };

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

/**
 * Synchronous version of geometry computation
 */
export function computeGeometrySync(
  model: BlockModel,
  resolvedTextures: Record<string, string>,
  biomeColor?: { r: number; g: number; b: number } | null,
  resolvedModel?: ResolvedModel,
): WorkerResponse {
  const elements = processModel(model, resolvedTextures, resolvedModel);

  const response: WorkerResponse = {
    id: "sync",
    elements,
  };

  if (resolvedModel) {
    response.blockstateRotation = {
      rotX: resolvedModel.rotX,
      rotY: resolvedModel.rotY,
      rotZ: resolvedModel.rotZ,
      uvlock: resolvedModel.uvlock,
    };
  }

  return response;
}
