/**
 * Utility functions for block geometry processing
 */

import { getBlockTintType } from "@/constants/vanillaBlockColors";

/**
 * Normalized UV coordinates with flip flags
 */
export interface NormalizedUV {
  u: number;
  v: number;
  width: number;
  height: number;
  flipX: 1 | -1;
  flipY: 1 | -1;
}

/**
 * Resolves a texture variable reference to an actual texture ID
 */
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

/**
 * Converts Minecraft UV coordinates (0-16) to normalized (0-1)
 * For animated textures, adjusts V coordinates to show only the first frame
 */
export function normalizeUV(
  uv: [number, number, number, number] | undefined,
  frameCount: number = 1,
): NormalizedUV {
  if (!uv) {
    const height = frameCount > 1 ? 1 / frameCount : 1;
    return { u: 0, v: 0, width: 1, height, flipX: 1, flipY: 1 };
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
    return { u: 0, v: 0, width: 1, height: 1, flipX: 1, flipY: 1 };
  }

  let adjustedHeight = height;
  if (frameCount > 1) {
    adjustedHeight = height / frameCount;
  }

  return {
    u: widthDelta >= 0 ? rawU1 : rawU2,
    v: heightDelta >= 0 ? rawV1 : rawV2,
    width,
    height: adjustedHeight,
    flipX: 1,
    flipY: 1,
  };
}

/**
 * Generates auto UV coordinates based on face and element bounds
 */
export function generateAutoUV(
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

/**
 * Resolves face UV coordinates, using auto-generated values if not specified
 */
export function resolveFaceUV(
  faceName: string,
  face: { uv?: [number, number, number, number] },
  from: [number, number, number],
  to: [number, number, number],
): [number, number, number, number] {
  return face.uv ?? generateAutoUV(faceName, from, to);
}

/**
 * Calculates face positions for true 3D isometric rendering
 */
export function calculateFaceOffsets(
  element: { from: number[]; to: number[] },
  scale: number,
  blockCenter: { x: number; y: number; z: number },
): {
  top: { x: number; y: number; z: number };
  left: { x: number; y: number; z: number };
  right: { x: number; y: number; z: number };
} {
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

/**
 * Determines which colormap type to use for a texture
 */
export function getColormapType(textureId: string): "grass" | "foliage" | undefined {
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

/**
 * Generates a pre-baked CSS transform string for a face
 * This eliminates CSS variable lookups during rendering for better performance
 */
export function generateFaceTransform(
  faceType: "top" | "left" | "right",
  x: number,
  y: number,
  z: number,
): string {
  const baseTransform = `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${z}px)`;

  switch (faceType) {
    case "top":
      return `${baseTransform} rotateX(90deg)`;
    case "left":
      return baseTransform;
    case "right":
      return `${baseTransform} rotateY(90deg)`;
  }
}

/**
 * Camera-Aware Face Culling - Determines if a face should be rendered based on camera angle
 *
 * PERFORMANCE OPTIMIZATION: Mimics Minecraft's frustum culling
 * At rotateY(135deg), the camera is rotated 135° clockwise from north.
 * This means we're looking from the SOUTHEAST toward the NORTHWEST.
 */
export function shouldRenderFace(
  faceDirection: string,
  cameraAngleY: number = 135,
): boolean {
  if (cameraAngleY === 135) {
    return (
      faceDirection === "up" ||
      faceDirection === "north" ||
      faceDirection === "west"
    );
  }

  return true;
}
