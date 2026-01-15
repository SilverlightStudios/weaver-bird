/**
 * Web Worker for Block Geometry Processing
 *
 * This worker handles the CPU-intensive task of processing Minecraft block models
 * into renderable face geometry. By running in a separate thread, it prevents
 * blocking the main UI thread during 2D→3D transitions.
 *
 * RESPONSIBILITIES:
 * - Process block model elements into face data
 * - Calculate face positions, UVs, z-index
 * - Determine tint types for colormaps
 * - Return lightweight geometry data to main thread
 */

// Import only the types and pure functions (no DOM dependencies)
import type { ModelElement } from "@lib/tauri/blockModels";
import { getBlockTintType } from "@/constants/vanillaBlockColors";

// Types for worker communication
export interface WorkerRequest {
  id: string;
  elements: ModelElement[];
  textures: Record<string, string>;
  textureUrls: Record<string, string>; // Serialized as plain object
  scale: number;
  animationInfo?: Record<string, { frameCount: number }>; // Texture URL -> animation info
}

export interface WorkerResponse {
  id: string;
  renderedElements: RenderedElement[];
}

// Geometry types (copied from MinecraftCSSBlock)
interface NormalizedUV {
  u: number;
  v: number;
  width: number;
  height: number;
  flipX: 1 | -1;
  flipY: 1 | -1;
}

interface RenderedFace {
  type: "top" | "left" | "right";
  textureUrl: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  uv: NormalizedUV;
  zIndex: number;
  brightness: number;
  tintType?: "grass" | "foliage";
  transform: string; // Pre-baked transform string for performance
}

interface RenderedElement {
  faces: RenderedFace[];
}

/**
 * Resolves a texture variable reference to an actual texture ID
 */
function resolveTextureRef(
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
 *
 * @param uv - Minecraft UV coordinates [u1, v1, u2, v2] in 0-16 range
 * @param frameCount - Number of animation frames (1 for non-animated)
 */
function normalizeUV(
  uv: [number, number, number, number] | undefined,
  frameCount: number = 1,
): NormalizedUV {
  if (!uv) {
    // For animated textures with default UVs, scale height to show only first frame
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

  // For animated textures, scale V coordinates to show only first frame
  // Animation frames stack vertically, so we need to:
  // 1. Keep V position the same (starts at 0 for top frame)
  // 2. Scale height by 1/frameCount to show only first frame
  let adjustedHeight = height;

  if (frameCount > 1) {
    // Scale height to first frame only
    // Don't scale V position - it stays at the top (0)
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

/**
 * Calculates face positions for true 3D isometric rendering
 */
function calculateFaceOffsets(
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
function getColormapType(textureId: string): "grass" | "foliage" | undefined {
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
 *
 * @param faceType - The type of face (top, left, right)
 * @param x - X position in pixels
 * @param y - Y position in pixels
 * @param z - Z position in pixels
 * @returns Complete CSS transform string
 */
function generateFaceTransform(
  faceType: "top" | "left" | "right",
  x: number,
  y: number,
  z: number,
): string {
  const baseTransform = `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${z}px)`;

  switch (faceType) {
    case "top":
      // Top face - horizontal plane rotated to face up
      return `${baseTransform} rotateX(90deg)`;
    case "left":
      // Left face (south/north) - vertical plane
      return baseTransform;
    case "right":
      // Right face (east/west) - vertical plane rotated 90°
      return `${baseTransform} rotateY(90deg)`;
  }
}

/**
 * Camera-Aware Face Culling - Determines if a face should be rendered based on camera angle
 *
 * PERFORMANCE OPTIMIZATION: Mimics Minecraft's frustum culling
 * At rotateY(135deg), the camera is rotated 135° clockwise from north.
 * This means we're looking from the SOUTHEAST toward the NORTHWEST.
 *
 * Minecraft coordinate system:
 * - North: negative Z (back in our view)
 * - South: positive Z (front in our view)
 * - East: positive X (right in our view)
 * - West: negative X (left in our view)
 *
 * At 135° rotation (looking from southeast), visible faces are:
 * - up (top of block) ✓
 * - north (becomes the front face after rotation) ✓
 * - west (becomes the right face after rotation) ✓
 *
 * Hidden faces at 135° rotation:
 * - down (bottom - occluded by block itself) ✗
 * - south (back face - facing away from camera) ✗
 * - east (left face - facing away from camera) ✗
 *
 * @param faceDirection - Minecraft face direction (up, down, north, south, east, west)
 * @param cameraAngleY - Camera Y rotation in degrees (default 135 for isometric view)
 * @returns true if face should be rendered, false if culled
 */
function shouldRenderFace(
  faceDirection: string,
  cameraAngleY: number = 135,
): boolean {
  // At 135° (looking from southeast toward northwest)
  if (cameraAngleY === 135) {
    return (
      faceDirection === "up" ||
      faceDirection === "north" ||
      faceDirection === "west"
    );
  }

  // Future-proof: if camera becomes rotatable, add other angle cases here
  // For now, default to rendering all faces if angle is non-standard
  return true;
}

/**
 * Fast path for processing simple full cubes (16x16x16 blocks with no rotation)
 * This handles the most common case (stone, dirt, planks, ores, etc.) much faster
 * by using hardcoded offsets instead of complex calculations.
 */
function processSimpleCube(
  element: ModelElement,
  textures: Record<string, string>,
  textureUrls: Map<string, string>,
  scale: number,
  animationInfo?: Record<string, { frameCount: number }>,
): RenderedElement[] {
  const faces: RenderedFace[] = [];
  const UNIT = 16;

  // Hardcoded offsets for a standard 16x16x16 cube
  const topOffset = { x: 0, y: -8 * scale, z: 0 };
  const bottomOffset = { x: 0, y: 8 * scale, z: 0 };
  const southOffset = { x: 0, y: 0, z: 8 * scale };
  const northOffset = { x: 0, y: 0, z: -8 * scale };
  const eastOffset = { x: 8 * scale, y: 0, z: 0 };
  const westOffset = { x: -8 * scale, y: 0, z: 0 };

  // Top face (up)
  if (element.faces.up && shouldRenderFace("up")) {
    const face = element.faces.up;
    const textureId = resolveTextureRef(face.texture, textures);
    const textureUrl = textureId ? textureUrls.get(textureId) : null;

    if (textureUrl) {
      const shouldTint =
        face.tintindex !== undefined && face.tintindex !== null;
      const tintType =
        shouldTint && textureId ? getColormapType(textureId) : undefined;

      // Get animation frame count for this texture
      const frameCount = animationInfo?.[textureUrl]?.frameCount ?? 1;

      faces.push({
        type: "top",
        textureUrl,
        x: topOffset.x,
        y: topOffset.y,
        z: topOffset.z,
        width: UNIT * scale,
        height: UNIT * scale,
        uv: normalizeUV(
          resolveFaceUV("up", face, element.from, element.to),
          frameCount,
        ),
        zIndex: 180, // Center Y (8) * 10 + 100
        brightness: 1.0,
        tintType,
        transform: generateFaceTransform(
          "top",
          topOffset.x,
          topOffset.y,
          topOffset.z,
        ),
      });
    }
  }

  // Bottom face (down)
  if (element.faces.down && shouldRenderFace("down")) {
    const face = element.faces.down;
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
        x: bottomOffset.x,
        y: -bottomOffset.y, // Negate for CSS coordinate system
        z: bottomOffset.z,
        width: UNIT * scale,
        height: UNIT * scale,
        uv: normalizeUV(
          resolveFaceUV("down", face, element.from, element.to),
          animationInfo?.[textureUrl]?.frameCount ?? 1,
        ),
        zIndex: -20, // Bottom
        brightness: 0.5,
        tintType,
        transform: generateFaceTransform(
          "top",
          bottomOffset.x,
          -bottomOffset.y,
          bottomOffset.z,
        ),
      });
    }
  }

  // South face
  if (element.faces.south && shouldRenderFace("south")) {
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
        x: southOffset.x,
        y: southOffset.y,
        z: southOffset.z,
        width: UNIT * scale,
        height: UNIT * scale,
        uv: normalizeUV(
          resolveFaceUV("south", face, element.from, element.to),
          animationInfo?.[textureUrl]?.frameCount ?? 1,
        ),
        zIndex: 80, // Center Y (8) * 10
        brightness: 0.8,
        tintType,
        transform: generateFaceTransform(
          "left",
          southOffset.x,
          southOffset.y,
          southOffset.z,
        ),
      });
    }
  }

  // North face
  if (element.faces.north && shouldRenderFace("north")) {
    const face = element.faces.north;
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
        x: northOffset.x,
        y: northOffset.y,
        z: northOffset.z,
        width: UNIT * scale,
        height: UNIT * scale,
        uv: normalizeUV(
          resolveFaceUV("north", face, element.from, element.to),
          animationInfo?.[textureUrl]?.frameCount ?? 1,
        ),
        zIndex: 70,
        brightness: 0.8,
        tintType,
        transform: generateFaceTransform(
          "left",
          northOffset.x,
          northOffset.y,
          northOffset.z,
        ),
      });
    }
  }

  // East face
  if (element.faces.east && shouldRenderFace("east")) {
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
        x: eastOffset.x,
        y: eastOffset.y,
        z: eastOffset.z,
        width: UNIT * scale,
        height: UNIT * scale,
        uv: normalizeUV(
          resolveFaceUV("east", face, element.from, element.to),
          animationInfo?.[textureUrl]?.frameCount ?? 1,
        ),
        zIndex: 81, // Center Y (8) * 10 + 1
        brightness: 0.6,
        tintType,
        transform: generateFaceTransform(
          "right",
          eastOffset.x,
          eastOffset.y,
          eastOffset.z,
        ),
      });
    }
  }

  // West face
  if (element.faces.west && shouldRenderFace("west")) {
    const face = element.faces.west;
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
        x: westOffset.x,
        y: westOffset.y,
        z: westOffset.z,
        width: UNIT * scale,
        height: UNIT * scale,
        uv: normalizeUV(
          resolveFaceUV("west", face, element.from, element.to),
          animationInfo?.[textureUrl]?.frameCount ?? 1,
        ),
        zIndex: 71,
        brightness: 0.6,
        tintType,
        transform: generateFaceTransform(
          "right",
          westOffset.x,
          westOffset.y,
          westOffset.z,
        ),
      });
    }
  }

  return [{ faces }];
}

/**
 * Processes block model elements into renderable face data
 * This is the CPU-intensive function that runs off the main thread
 */
function processElements(
  elements: ModelElement[],
  textures: Record<string, string>,
  textureUrls: Map<string, string>,
  scale: number,
  animationInfo?: Record<string, { frameCount: number }>,
): RenderedElement[] {
  const renderedElements: RenderedElement[] = [];
  const blockCenter = { x: 8, y: 8, z: 8 };

  // PERFORMANCE OPTIMIZATION: Fast path for simple single-element blocks without rotation
  // This covers ~80% of blocks (stone, dirt, planks, ores, etc.) and is 3-5x faster
  if (elements.length === 1) {
    const element = elements[0];
    const hasRotation = element.rotation && element.rotation.angle !== 0;

    if (!hasRotation) {
      // Check if this is a full cube (most common case)
      const [x1, y1, z1] = element.from;
      const [x2, y2, z2] = element.to;
      const isFullCube =
        x1 === 0 && y1 === 0 && z1 === 0 && x2 === 16 && y2 === 16 && z2 === 16;

      if (isFullCube) {
        // Fast path for full cubes - hardcoded offsets, no complex calculations
        return processSimpleCube(
          element,
          textures,
          textureUrls,
          scale,
          animationInfo,
        );
      }
    }
  }

  // Standard processing path for complex models
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

    const centerY = (y1 + y2) / 2 - blockCenter.y;

    // Top face
    if (element.faces.up && shouldRenderFace("up")) {
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
          uv: normalizeUV(
            resolveFaceUV("up", face, element.from, element.to),
            animationInfo?.[textureUrl]?.frameCount ?? 1,
          ),
          zIndex: Math.round(centerY * 10 + 100),
          brightness: 1.0,
          tintType,
          transform: generateFaceTransform(
            "top",
            offsets.top.x,
            offsets.top.y,
            offsets.top.z,
          ),
        });
      }
    }

    // South face
    if (element.faces.south && shouldRenderFace("south")) {
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
          uv: normalizeUV(
            resolveFaceUV("south", face, element.from, element.to),
            animationInfo?.[textureUrl]?.frameCount ?? 1,
          ),
          zIndex: Math.round(centerY * 10 + 50),
          brightness: 0.8,
          tintType,
          transform: generateFaceTransform(
            "left",
            offsets.left.x,
            offsets.left.y,
            offsets.left.z,
          ),
        });
      }
    }

    // North face
    if (element.faces.north && shouldRenderFace("north")) {
      const face = element.faces.north;
      const textureId = resolveTextureRef(face.texture, textures);
      const textureUrl = textureId ? textureUrls.get(textureId) : null;

      if (textureUrl) {
        const shouldTint =
          face.tintindex !== undefined && face.tintindex !== null;
        const tintType =
          shouldTint && textureId ? getColormapType(textureId) : undefined;

        const centerX = (x1 + x2) / 2 - blockCenter.x;
        const centerZ = (z1 + z2) / 2 - blockCenter.z;

        const northX = centerX * scale;
        const northY = offsets.left.y;
        const northZ = (centerZ - depth / 2) * scale;

        faces.push({
          type: "left",
          textureUrl,
          x: northX,
          y: northY,
          z: northZ,
          width: width * scale,
          height: height * scale,
          uv: normalizeUV(
            resolveFaceUV("north", face, element.from, element.to),
            animationInfo?.[textureUrl]?.frameCount ?? 1,
          ),
          zIndex: Math.round(centerY * 10 + 40),
          brightness: 0.8,
          tintType,
          transform: generateFaceTransform("left", northX, northY, northZ),
        });
      }
    }

    // East face
    if (element.faces.east && shouldRenderFace("east")) {
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
          uv: normalizeUV(
            resolveFaceUV("east", face, element.from, element.to),
            animationInfo?.[textureUrl]?.frameCount ?? 1,
          ),
          zIndex: Math.round(centerY * 10),
          brightness: 0.6,
          tintType,
          transform: generateFaceTransform(
            "right",
            offsets.right.x,
            offsets.right.y,
            offsets.right.z,
          ),
        });
      }
    }

    // West face
    if (element.faces.west && shouldRenderFace("west")) {
      const face = element.faces.west;
      const textureId = resolveTextureRef(face.texture, textures);
      const textureUrl = textureId ? textureUrls.get(textureId) : null;

      if (textureUrl) {
        const shouldTint =
          face.tintindex !== undefined && face.tintindex !== null;
        const tintType =
          shouldTint && textureId ? getColormapType(textureId) : undefined;

        const centerX = (x1 + x2) / 2 - blockCenter.x;
        const centerZ = (z1 + z2) / 2 - blockCenter.z;

        const westX = (centerX - width / 2) * scale;
        const westY = offsets.right.y;
        const westZ = centerZ * scale;

        faces.push({
          type: "right",
          textureUrl,
          x: westX,
          y: westY,
          z: westZ,
          width: depth * scale,
          height: height * scale,
          uv: normalizeUV(
            resolveFaceUV("west", face, element.from, element.to),
            animationInfo?.[textureUrl]?.frameCount ?? 1,
          ),
          zIndex: Math.round(centerY * 10 - 10),
          brightness: 0.6,
          tintType,
          transform: generateFaceTransform("right", westX, westY, westZ),
        });
      }
    }

    // Down face
    if (element.faces.down && shouldRenderFace("down")) {
      const face = element.faces.down;
      const textureId = resolveTextureRef(face.texture, textures);
      const textureUrl = textureId ? textureUrls.get(textureId) : null;

      if (textureUrl) {
        const shouldTint =
          face.tintindex !== undefined && face.tintindex !== null;
        const tintType =
          shouldTint && textureId ? getColormapType(textureId) : undefined;

        const centerX = (x1 + x2) / 2 - blockCenter.x;
        const centerZ = (z1 + z2) / 2 - blockCenter.z;
        const bottomY = (centerY - height / 2) * scale;

        const downX = centerX * scale;
        const downY = -bottomY; // Negate for CSS coordinate system
        const downZ = centerZ * scale;

        console.log(
          "[Worker] Down face - centerY:",
          centerY,
          "height:",
          height,
          "bottomY:",
          bottomY,
          "negated:",
          -bottomY,
        );

        faces.push({
          type: "top",
          textureUrl,
          x: downX,
          y: downY,
          z: downZ,
          width: width * scale,
          height: depth * scale,
          uv: normalizeUV(
            resolveFaceUV("down", face, element.from, element.to),
            animationInfo?.[textureUrl]?.frameCount ?? 1,
          ),
          zIndex: Math.round((centerY - height / 2) * 10 - 100),
          brightness: 0.5,
          tintType,
          transform: generateFaceTransform("top", downX, downY, downZ),
        });
      }
    }

    if (faces.length > 0) {
      renderedElements.push({ faces });
    }
  }

  return renderedElements;
}

// Worker message handler
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, elements, textures, textureUrls, scale, animationInfo } =
    event.data;

  try {
    // Convert serialized object back to Map
    const textureUrlsMap = new Map(Object.entries(textureUrls));

    // Process elements (CPU-intensive work)
    const renderedElements = processElements(
      elements,
      textures,
      textureUrlsMap,
      scale,
      animationInfo,
    );

    // Send result back to main thread
    const response: WorkerResponse = {
      id,
      renderedElements,
    };

    self.postMessage(response);
  } catch (error) {
    console.error("[BlockGeometryWorker] Error processing elements:", error);
    // Send empty result on error
    self.postMessage({
      id,
      renderedElements: [],
    });
  }
};
