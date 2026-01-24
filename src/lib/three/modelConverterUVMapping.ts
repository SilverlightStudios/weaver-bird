import type * as THREE from "three";
import type { ElementFace } from "@lib/tauri/blockModels";

/**
 * Generate auto-UV coordinates for a face based on element dimensions.
 * This is Minecraft's behavior when UV is not explicitly specified.
 *
 * Per Minecraft spec:
 * - up/down faces: UV from element's X (u) and Z (v) coordinates
 * - north/south faces: UV from element's X (u) and Y (v) coordinates
 * - east/west faces: UV from element's Z (u) and Y (v) coordinates
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
      // Top face: X maps to U, Z maps to V
      return [x1, z1, x2, z2];
    case "down":
      // Bottom face: X maps to U, Z maps to V (but V is flipped)
      return [x1, 16 - z2, x2, 16 - z1];
    case "north":
      // North face (-Z): X maps to U (flipped), Y maps to V
      return [16 - x2, 16 - y2, 16 - x1, 16 - y1];
    case "south":
      // South face (+Z): X maps to U, Y maps to V
      return [x1, 16 - y2, x2, 16 - y1];
    case "east":
      // East face (+X): Z maps to U (flipped), Y maps to V
      return [16 - z2, 16 - y2, 16 - z1, 16 - y1];
    case "west":
      // West face (-X): Z maps to U, Y maps to V
      return [z1, 16 - y2, z2, 16 - y1];
    default:
      return [0, 0, 16, 16];
  }
}

/**
 * Apply custom UV coordinates to a box geometry
 *
 * Minecraft UV format: [x1, y1, x2, y2] where coords are 0-16
 * Three.js UV format: [0-1, 0-1] where (0,0) is bottom-left
 *
 * Three.js BoxGeometry has 6 faces, each face has 2 triangles (4 vertices)
 * Face order: [right, left, top, bottom, front, back]
 *
 * When UV is not specified in the model, auto-generate based on element dimensions.
 */
export function applyCustomUVs(
  geometry: THREE.BoxGeometry,
  faces: Record<string, ElementFace>,
  from: [number, number, number],
  to: [number, number, number],
): void {
  const faceMapping: Record<string, number> = {
    east: 0, // right (+X)
    west: 1, // left (-X)
    up: 2, // top (+Y)
    down: 3, // bottom (-Y)
    south: 4, // front (+Z)
    north: 5, // back (-Z)
  };

  const uvAttr = geometry.attributes.uv;
  if (!uvAttr) return;

  for (const [faceName, faceData] of Object.entries(faces)) {
    const faceIndex = faceMapping[faceName];
    if (faceIndex === undefined) continue;

    // Use explicit UV if provided, otherwise auto-generate from element dimensions
    const [x1, y1, x2, y2] = faceData.uv ?? generateAutoUV(faceName, from, to);

    // Convert Minecraft UV (0-16) to Three.js UV (0-1)
    // Minecraft UV coords: (0,0) is top-left, Y increases downward
    // Three.js UV coords: (0,0) is bottom-left, Y increases upward
    // So we need to flip the Y axis
    const u1 = x1 / 16;
    const u2 = x2 / 16;
    const v1 = 1 - y1 / 16; // Flip Y: Minecraft top becomes Three.js top
    const v2 = 1 - y2 / 16; // Flip Y: Minecraft bottom becomes Three.js bottom

    // Handle UV rotation (0, 90, 180, 270 degrees clockwise)
    const rotation = faceData.rotation ?? 0;

    console.log(
      `[modelConverter] UV ${faceName}: MC[${x1},${y1},${x2},${y2}] rot=${rotation}°`,
    );

    // BoxGeometry has 4 vertices per face
    // The uv attribute has uvAttr.count total vertices (24 for a box = 4 per face × 6 faces)
    const baseIndex = faceIndex * 4;

    // Vertex layout for each face (before rotation):
    // 2---3    (top edge, v2)
    // |   |
    // 0---1    (bottom edge, v1)

    // Apply rotation by rotating the UV coordinates
    // Rotation is clockwise in Minecraft
    let uvCoords: [number, number][];

    switch (rotation) {
      case 90:
        // Rotate 90° clockwise
        uvCoords = [
          [u1, v2], // 0: was top-left, now bottom-left
          [u1, v1], // 1: was bottom-left, now bottom-right
          [u2, v2], // 2: was top-right, now top-left
          [u2, v1], // 3: was bottom-right, now top-right
        ];
        break;
      case 180:
        // Rotate 180°: flip both axes
        uvCoords = [
          [u2, v2], // 0: was bottom-left, now top-right
          [u1, v2], // 1: was bottom-right, now top-left
          [u2, v1], // 2: was top-left, now bottom-right
          [u1, v1], // 3: was top-right, now bottom-left
        ];
        break;
      case 270:
        // Rotate 270° clockwise (or 90° counter-clockwise)
        uvCoords = [
          [u2, v1], // 0: was bottom-right, now bottom-left
          [u2, v2], // 1: was top-right, now bottom-right
          [u1, v1], // 2: was bottom-left, now top-left
          [u1, v2], // 3: was top-left, now top-right
        ];
        break;
      default: // 0 or undefined
        uvCoords = [
          [u1, v1], // 0: Bottom-left
          [u2, v1], // 1: Bottom-right
          [u1, v2], // 2: Top-left
          [u2, v2], // 3: Top-right
        ];
    }

    // Apply the UV coordinates to the vertices
    uvCoords.forEach((uv, index) => {
      uvAttr.setXY(baseIndex + index, uv[0], uv[1]);
    });
  }

  uvAttr.needsUpdate = true;
}
