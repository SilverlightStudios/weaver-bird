/**
 * Helper utilities for entity geometry conversion
 */
import type { NormalizedUV } from "@components/MinecraftCSSBlock/types";

export const PIXELS_PER_UNIT = 16;

/**
 * Convert JEM UV coordinates to normalized UV for rendering
 *
 * JEM UVs are in pixel coordinates [u1, v1, u2, v2]
 * We need to normalize to [0-1] range and calculate width/height
 */
export function normalizeJEMUV(
  uv: [number, number, number, number],
  textureSize: [number, number],
): NormalizedUV {
  const [u1, v1, u2, v2] = uv;
  const [texWidth, texHeight] = textureSize;

  // Convert to 0-1 range
  const normU1 = u1 / texWidth;
  const normV1 = v1 / texHeight;
  const normU2 = u2 / texWidth;
  const normV2 = v2 / texHeight;

  const width = Math.abs(normU2 - normU1);
  const height = Math.abs(normV2 - normV1);

  return {
    u: Math.min(normU1, normU2),
    v: Math.min(normV1, normV2),
    width,
    height,
    flipX: normU2 < normU1 ? -1 : 1,
    flipY: normV2 < normV1 ? -1 : 1,
  };
}

/**
 * Rotate a 3D point in JEM space (Y-up)
 *
 * @param point - Point [x, y, z]
 * @param rotation - Rotation in degrees [rx, ry, rz]
 */
export function rotatePoint(
  point: [number, number, number],
  rotation: [number, number, number],
): [number, number, number] {
  const [x, y, z] = point;
  // Convert to radians
  const radX = rotation[0] * (Math.PI / 180);
  const radY = rotation[1] * (Math.PI / 180);
  const radZ = rotation[2] * (Math.PI / 180);

  // Apply rotations in order: X, then Y, then Z (Three.js standard)
  // 1. Rotate around X
  const y1 = y * Math.cos(radX) - z * Math.sin(radX);
  const z1 = y * Math.sin(radX) + z * Math.cos(radX);
  const x1 = x;

  // 2. Rotate around Y
  const x2 = x1 * Math.cos(radY) + z1 * Math.sin(radY);
  const z2 = -x1 * Math.sin(radY) + z1 * Math.cos(radY);
  const y2 = y1;

  // 3. Rotate around Z
  const x3 = x2 * Math.cos(radZ) - y2 * Math.sin(radZ);
  const y3 = x2 * Math.sin(radZ) + y2 * Math.cos(radZ);
  const z3 = z2;

  return [x3, y3, z3];
}

/**
 * Generate a pre-baked CSS transform string for a face
 */
export function generateFaceTransform(
  faceType: "top" | "left" | "right",
  x: number,
  y: number,
  z: number,
  rotation: [number, number, number] = [0, 0, 0],
): string {
  const baseTransform = `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${z}px)`;

  // Apply part rotation
  // Note: CSS rotations are applied in order. To match Three.js/JEM Euler(XYZ),
  // we need to apply them in reverse order in CSS: Z, then Y, then X.
  // CRITICAL: Coordinate System Mapping
  // JEM/Three.js: Right-Handed, Y-Up, Z-Out
  // CSS: Left-Handed, Y-Down, Z-Out
  // Mapping:
  // - X rotation: Inverted (JEM +90 moves Up->Front, CSS +90 moves Down->Out/Back, CSS -90 moves Up->Front) -> Negate
  // - Y rotation: Preserved (JEM +90 moves Front->Right, CSS +90 moves Front->Right) -> Keep
  // - Z rotation: Inverted (JEM +90 moves Right->Up, CSS +90 moves Right->Down, CSS -90 moves Right->Up) -> Negate
  const partRotation = `rotateZ(${-rotation[2]}deg) rotateY(${rotation[1]}deg) rotateX(${-rotation[0]}deg)`;

  switch (faceType) {
    case "top":
      return `${baseTransform} ${partRotation} rotateX(90deg)`;
    case "left":
      return `${baseTransform} ${partRotation}`;
    case "right":
      return `${baseTransform} ${partRotation} rotateY(90deg)`;
  }
}
