/**
 * Shared Block Geometry Logic
 *
 * Core processing functions used by the Block Geometry Web Worker.
 */

import { getBlockTintType } from "@/constants/vanillaBlockColors";
import type { ModelElement } from "../tauri/blockModels";

export interface RenderedFace {
  type: "top" | "left" | "right";
  textureUrl: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  uv: {
    u: number;
    v: number;
    width: number;
    height: number;
    flipX: 1;
    flipY: 1;
  };
  zIndex: number;
  brightness: number;
  tintType?: "grass" | "foliage";
}

export interface RenderedElement {
  faces: RenderedFace[];
}

export function resolveTextureRef(
  ref: string,
  textures: Record<string, string>,
): string | null {
  if (!ref) return null;

  let resolved = ref;
  let iterations = 0;
  while (resolved.startsWith("#") && iterations < 10) {
    const varName = resolved.substring(1);
    resolved = textures[varName] || resolved;
    iterations++;
  }

  if (resolved.startsWith("#")) return null;
  return resolved;
}

export function normalizeUV(uv: [number, number, number, number] | undefined) {
  if (!uv) {
    return {
      u: 0,
      v: 0,
      width: 1,
      height: 1,
      flipX: 1 as const,
      flipY: 1 as const,
    };
  }

  const rawU1 = uv[0] / 16;
  const rawV1 = uv[1] / 16;
  const rawU2 = uv[2] / 16;
  const rawV2 = uv[3] / 16;

  const widthDelta = rawU2 - rawU1;
  const heightDelta = rawV2 - rawV1;

  const width = Math.abs(widthDelta);
  const height = Math.abs(heightDelta);

  if (width === 0 || height === 0) {
    return {
      u: 0,
      v: 0,
      width: 1,
      height: 1,
      flipX: 1 as const,
      flipY: 1 as const,
    };
  }

  return {
    u: widthDelta >= 0 ? rawU1 : rawU2,
    v: heightDelta >= 0 ? rawV1 : rawV2,
    width,
    height,
    flipX: 1 as const,
    flipY: 1 as const,
  };
}

function generateAutoUV(
  faceName: string,
  from: [number, number, number],
  to: [number, number, number],
): [number, number, number, number] {
  const [x1, y1, z1] = from;
  const [x2, y2, z2] = to;

  switch (faceName) {
    case "up":
      return [x1, z1, x2, z2];
    case "down":
      return [x1, 16 - z2, x2, 16 - z1];
    case "north":
      return [16 - x2, 16 - y2, 16 - x1, 16 - y1];
    case "south":
      return [x1, 16 - y2, x2, 16 - y1];
    case "east":
      return [16 - z2, 16 - y2, 16 - z1, 16 - y1];
    case "west":
      return [z1, 16 - y2, z2, 16 - y1];
    default:
      return [0, 0, 16, 16];
  }
}

function resolveFaceUV(
  faceName: string,
  face: { uv?: [number, number, number, number] },
  from: [number, number, number],
  to: [number, number, number],
): [number, number, number, number] {
  return face.uv ?? generateAutoUV(faceName, from, to);
}

export function calculateFaceOffsets(
  element: { from: number[]; to: number[] },
  scale: number,
  blockCenter: { x: number; y: number; z: number },
) {
  const [x1, y1, z1] = element.from;
  const [x2, y2, z2] = element.to;

  const width = x2 - x1;
  const height = y2 - y1;
  const depth = z2 - z1;

  const centerX = (x1 + x2) / 2 - blockCenter.x;
  const centerY = (y1 + y2) / 2 - blockCenter.y;
  const centerZ = (z1 + z2) / 2 - blockCenter.z;

  const topX = centerX * scale;
  const topY = (centerY + height / 2) * scale;
  const topZ = centerZ * scale;

  const leftX = centerX * scale;
  const leftY = -centerY * scale;
  const leftZ = (centerZ + depth / 2) * scale;

  const rightX = (centerX + width / 2) * scale;
  const rightY = -centerY * scale;
  const rightZ = centerZ * scale;

  return {
    top: { x: topX, y: -topY, z: topZ },
    left: { x: leftX, y: leftY, z: leftZ },
    right: { x: rightX, y: rightY, z: rightZ },
  };
}

export function getColormapType(
  textureId: string,
): "grass" | "foliage" | undefined {
  let blockId = textureId;

  if (blockId.includes("/block/")) {
    blockId = blockId.replace("/block/", ":");
  } else if (blockId.includes("/item/")) {
    blockId = blockId.replace("/item/", ":");
  }

  if (!blockId.includes(":")) {
    blockId = `minecraft:${blockId}`;
  }

  const tintType = getBlockTintType(blockId);

  if (tintType === "grass" || tintType === "foliage") {
    return tintType;
  }

  return undefined;
}

export function processElementsSync(
  elements: ModelElement[],
  textures: Record<string, string>,
  textureUrls: Map<string, string>,
  scale: number,
): RenderedElement[] {
  const renderedElements: RenderedElement[] = [];
  const blockCenter = { x: 8, y: 8, z: 8 };

  for (const element of elements) {
    const faces: RenderedFace[] = [];
    const [x1, y1, z1] = element.from;
    const [x2, y2, z2] = element.to;

    const hasRotation = element.rotation && element.rotation.angle !== 0;

    const width = x2 - x1;
    const height = y2 - y1;
    const depth = z2 - z1;

    let offsets = calculateFaceOffsets(element, scale, blockCenter);

    if (hasRotation) {
      offsets = {
        top: { x: 0, y: offsets.top.y, z: 0 },
        left: { x: 0, y: offsets.left.y, z: 0 },
        right: { x: 0, y: offsets.right.y, z: 0 },
      };
    }

    const centerY = (y1 + y2) / 2;

    if (element.faces.up) {
      const face = element.faces.up;
      const textureId = resolveTextureRef(face.texture, textures);
      const textureUrl = textureId ? textureUrls.get(textureId) : null;

      if (textureUrl) {
        const shouldTint =
          face.tintindex !== undefined && face.tintindex !== null;
        const tintType =
          shouldTint && textureId ? getColormapType(textureId) : undefined;

        faces.push({
          type: "top",
          textureUrl,
          x: offsets.top.x,
          y: offsets.top.y,
          z: offsets.top.z,
          width: width * scale,
          height: depth * scale,
          uv: normalizeUV(resolveFaceUV("up", face, element.from, element.to)),
          zIndex: Math.round(centerY * 10 + 100),
          brightness: 1.0,
          tintType,
        });
      }
    }

    if (element.faces.south) {
      const face = element.faces.south;
      const textureId = resolveTextureRef(face.texture, textures);
      const textureUrl = textureId ? textureUrls.get(textureId) : null;

      if (textureUrl) {
        const shouldTint =
          face.tintindex !== undefined && face.tintindex !== null;
        const tintType =
          shouldTint && textureId ? getColormapType(textureId) : undefined;

        faces.push({
          type: "left",
          textureUrl,
          x: offsets.left.x,
          y: offsets.left.y,
          z: offsets.left.z,
          width: width * scale,
          height: height * scale,
          uv: normalizeUV(resolveFaceUV("south", face, element.from, element.to)),
          zIndex: Math.round(centerY * 10 + 50),
          brightness: 0.8,
          tintType,
        });
      }
    }

    if (element.faces.east) {
      const face = element.faces.east;
      const textureId = resolveTextureRef(face.texture, textures);
      const textureUrl = textureId ? textureUrls.get(textureId) : null;

      if (textureUrl) {
        const shouldTint =
          face.tintindex !== undefined && face.tintindex !== null;
        const tintType =
          shouldTint && textureId ? getColormapType(textureId) : undefined;

        faces.push({
          type: "right",
          textureUrl,
          x: offsets.right.x,
          y: offsets.right.y,
          z: offsets.right.z,
          width: depth * scale,
          height: height * scale,
          uv: normalizeUV(resolveFaceUV("east", face, element.from, element.to)),
          zIndex: Math.round(centerY * 10),
          brightness: 0.6,
          tintType,
        });
      }
    }

    if (faces.length > 0) {
      renderedElements.push({ faces });
    }
  }

  return renderedElements;
}
