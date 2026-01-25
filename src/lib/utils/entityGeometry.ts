/**
 * Entity Geometry Utilities
 *
 * Converts JEM (JSON Entity Model) structures to RenderedFace objects
 * for CSS-based isometric rendering in MinecraftCSSBlock.
 *
 * This bridges the gap between:
 * - JEM's ParsedBox format (from jemLoader.ts)
 * - RenderedFace format (used by MinecraftCSSBlock)
 */

import type {
  ParsedEntityModel,
  ParsedPart,
  ParsedBox,
} from "@lib/emf/jemLoader";
import type {
  RenderedElement,
  RenderedFace,
} from "@components/MinecraftCSSBlock/types";
import {
  PIXELS_PER_UNIT,
  normalizeJEMUV,
  rotatePoint,
  generateFaceTransform,
} from "./entityGeometryHelpers";

/**
 * Convert a single JEM box to RenderedFace array
 *
 * @param box - Parsed JEM box with UV coordinates for each face
 * @param partOrigin - The origin point of the parent part (in pixels)
 * @param textureSize - Texture dimensions [width, height]
 * @param textureUrl - URL of the entity texture
 * @param scale - Scale factor for rendering
 * @param rotation - Rotation of the part in degrees [rx, ry, rz]
 * @returns Array of renderable faces
 */
export function convertJEMBoxToFaces(
  box: ParsedBox,
  partOrigin: [number, number, number],
  textureSize: [number, number],
  textureUrl: string,
  scale: number,
  rotation: [number, number, number] = [0, 0, 0],
): RenderedFace[] {
  const faces: RenderedFace[] = [];
  const { from, to, uv } = box;

  // Calculate box dimensions in pixels
  const width = to[0] - from[0];
  const height = to[1] - from[1];
  const depth = to[2] - from[2];

  // Calculate box center in absolute coordinates
  const centerX = (from[0] + to[0]) / 2;
  const centerY = (from[1] + to[1]) / 2;
  const centerZ = (from[2] + to[2]) / 2;

  // Make relative to part origin (in Minecraft units)
  // This is the vector from Pivot to BoxCenter
  const relativeX = (centerX - partOrigin[0]) / PIXELS_PER_UNIT;
  const relativeY = (centerY - partOrigin[1]) / PIXELS_PER_UNIT;
  const relativeZ = (centerZ - partOrigin[2]) / PIXELS_PER_UNIT;

  // Scale to rendering space (JEM units)
  const scaledX = relativeX * scale;
  const scaledY = relativeY * scale;
  const scaledZ = relativeZ * scale;

  const boxCenter: [number, number, number] = [scaledX, scaledY, scaledZ];

  // Helper to process a face
  const addFace = (
    faceType: "top" | "left" | "right",
    uvData: [number, number, number, number],
    offset: [number, number, number], // Offset from box center in JEM units
    dims: [number, number], // [width, height] in JEM units
    brightness: number,
    zIndexOffset: number,
  ) => {
    // 1. Calculate Face Center in JEM space (relative to pivot)
    const faceCenterJEM: [number, number, number] = [
      boxCenter[0] + offset[0],
      boxCenter[1] + offset[1],
      boxCenter[2] + offset[2],
    ];

    // 2. Rotate the Face Center around the pivot (0,0,0)
    const rotatedCenter = rotatePoint(faceCenterJEM, rotation);

    // 3. Convert to CSS space (Y-down)
    // JEM: +Y is Up. CSS: +Y is Down.
    // So y_css = -y_jem
    const cssX = rotatedCenter[0];
    const cssY = -rotatedCenter[1];
    const cssZ = rotatedCenter[2];

    // 4. Generate transform
    const transform = generateFaceTransform(
      faceType,
      cssX,
      cssY,
      cssZ,
      rotation,
    );

    faces.push({
      type: faceType,
      textureUrl,
      x: cssX,
      y: cssY,
      z: cssZ,
      width: dims[0],
      height: dims[1],
      uv: normalizeJEMUV(uvData, textureSize),
      zIndex: Math.round(relativeY * 10 + zIndexOffset), // Approximate z-index
      brightness,
      transform,
    });
  };

  const wScaled = (width / PIXELS_PER_UNIT) * scale;
  const hScaled = (height / PIXELS_PER_UNIT) * scale;
  const dScaled = (depth / PIXELS_PER_UNIT) * scale;

  // Up face (top)
  const hasValidUpUV = uv.up[2] > uv.up[0] || uv.up[3] > uv.up[1];
  if (hasValidUpUV) {
    addFace(
      "top",
      uv.up,
      [0, hScaled / 2, 0], // Offset: +Y/2
      [wScaled, dScaled],
      1.0,
      100,
    );
  }

  // North face (front in isometric view)
  const hasValidNorthUV =
    uv.north[2] > uv.north[0] || uv.north[3] > uv.north[1];
  if (hasValidNorthUV) {
    addFace(
      "left", // "left" type is used for front-facing planes in our CSS system
      uv.north,
      [0, 0, -dScaled / 2], // Offset: -Z/2
      [wScaled, hScaled],
      0.8,
      40,
    );
  }

  // West face (right side in isometric view)
  const hasValidWestUV = uv.west[2] > uv.west[0] || uv.west[3] > uv.west[1];
  if (hasValidWestUV) {
    addFace(
      "right", // "right" type is used for side-facing planes
      uv.west,
      [-wScaled / 2, 0, 0], // Offset: -X/2
      [dScaled, hScaled],
      0.6,
      -10,
    );
  }

  // East face
  const hasValidEastUV = uv.east[2] > uv.east[0] || uv.east[3] > uv.east[1];
  if (hasValidEastUV) {
    addFace(
      "right",
      uv.east,
      [wScaled / 2, 0, 0], // Offset: +X/2
      [dScaled, hScaled],
      0.6,
      0,
    );
  }

  // South face
  const hasValidSouthUV =
    uv.south[2] > uv.south[0] || uv.south[3] > uv.south[1];
  if (hasValidSouthUV) {
    addFace(
      "left",
      uv.south,
      [0, 0, dScaled / 2], // Offset: +Z/2
      [wScaled, hScaled],
      0.8,
      50,
    );
  }

  // Down face (bottom)
  const hasValidDownUV = uv.down[2] > uv.down[0] || uv.down[3] > uv.down[1];
  if (hasValidDownUV) {
    addFace(
      "top",
      uv.down,
      [0, -hScaled / 2, 0], // Offset: -Y/2
      [wScaled, dScaled],
      0.5,
      -100,
    );
  }

  return faces;
}

/**
 * Convert a JEM part (with multiple boxes and potential children) to faces
 *
 * @param part - Parsed JEM part
 * @param textureSize - Texture dimensions [width, height]
 * @param textureUrl - URL of the entity texture
 * @param scale - Scale factor for rendering
 * @returns Array of renderable faces from this part and its children
 */
export function convertJEMPartToFaces(
  part: ParsedPart,
  textureSize: [number, number],
  textureUrl: string,
  scale: number,
): RenderedFace[] {
  const faces: RenderedFace[] = [];

  // Process boxes in this part
  for (const box of part.boxes) {
    const boxFaces = convertJEMBoxToFaces(
      box,
      part.origin,
      textureSize,
      textureUrl,
      scale,
      part.rotation, // Pass rotation!
    );
    faces.push(...boxFaces);
  }

  // Recursively process child parts
  for (const child of part.children) {
    const childFaces = convertJEMPartToFaces(
      child,
      textureSize,
      textureUrl,
      scale,
    );
    faces.push(...childFaces);
  }

  return faces;
}

/**
 * Calculate bounding box for all parts in an entity model
 */
function calculateEntityBounds(model: ParsedEntityModel): {
  min: [number, number, number];
  max: [number, number, number];
  center: [number, number, number];
} {
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;

  const processPart = (part: ParsedPart) => {
    for (const box of part.boxes) {
      minX = Math.min(minX, box.from[0], box.to[0]);
      minY = Math.min(minY, box.from[1], box.to[1]);
      minZ = Math.min(minZ, box.from[2], box.to[2]);
      maxX = Math.max(maxX, box.from[0], box.to[0]);
      maxY = Math.max(maxY, box.from[1], box.to[1]);
      maxZ = Math.max(maxZ, box.from[2], box.to[2]);
    }

    for (const child of part.children) {
      processPart(child);
    }
  };

  for (const part of model.parts) {
    processPart(part);
  }

  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
    center: [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2],
  };
}

/**
 * Convert a complete JEM entity model to RenderedElement array
 *
 * This is the main entry point for entity rendering.
 *
 * @param model - Parsed entity model
 * @param textureUrl - URL of the entity texture
 * @param scale - Scale factor for rendering (same as blocks)
 * @returns Array of RenderedElements ready for MinecraftCSSBlock
 */
export function convertJEMModelToFaces(
  model: ParsedEntityModel,
  textureUrl: string,
  scale: number,
): RenderedElement[] {
  // Calculate entity center for proper positioning
  // Entities use absolute pixel coordinates, not block-relative (0-16)
  // We need to center them like we do for blocks (around 8,8,8)
  const bounds = calculateEntityBounds(model);
  const entityCenter: [number, number, number] = [
    bounds.center[0] / PIXELS_PER_UNIT,
    bounds.center[1] / PIXELS_PER_UNIT,
    bounds.center[2] / PIXELS_PER_UNIT,
  ];

  console.log("[EntityGeometry] Entity bounds:", bounds);
  console.log("[EntityGeometry] Entity center (units):", entityCenter);

  // CRITICAL: Entities are in absolute pixel coordinates and can be much larger than 16x16x16
  // Blocks use a scale factor directly, but entities need additional adjustment
  // Apply an additional scale multiplier to match block sizes
  // Reduced from 16.0 to 12.0 based on user feedback ("slightly too large")
  const ENTITY_SCALE_MULTIPLIER = 12.0;
  const adjustedScale = scale * ENTITY_SCALE_MULTIPLIER;

  console.log("[EntityGeometry] Scale:", scale, "→ Adjusted:", adjustedScale);

  // Create a modified model with adjusted part origins
  // to center the entity at 0,0,0 like blocks
  const allFaces: RenderedFace[] = [];

  // Helper to adjust part origin for centering
  const processPartWithOffset = (part: ParsedPart): RenderedFace[] => {
    // Adjust the part origin to center the entity
    // We set the origin to the center of the bounding box
    // This effectively shifts the model so its center is at (0,0,0) relative to the origin
    // Note: We subtract the center to shift the model "back" to the origin
    // Y_OFFSET: Add a small offset to push the model down if it's too high (user feedback)
    const Y_OFFSET_ADJUSTMENT = 4; // 4 pixels = 0.25 units
    const adjustedOrigin: [number, number, number] = [
      part.origin[0] - bounds.center[0],
      part.origin[1] - bounds.center[1] + Y_OFFSET_ADJUSTMENT,
      part.origin[2] - bounds.center[2],
    ];

    const faces: RenderedFace[] = [];

    // Process boxes with adjusted origin
    for (const box of part.boxes) {
      const boxFaces = convertJEMBoxToFaces(
        box,
        adjustedOrigin,
        model.textureSize,
        textureUrl,
        adjustedScale, // Use adjusted scale for proper sizing
        part.rotation, // Pass rotation!
      );
      faces.push(...boxFaces);
    }

    // Recursively process children
    for (const child of part.children) {
      const childFaces = processPartWithOffset(child);
      faces.push(...childFaces);
    }

    return faces;
  };

  // Process each top-level part
  for (const part of model.parts) {
    const partFaces = processPartWithOffset(part);
    allFaces.push(...partFaces);
  }

  // Return as a single RenderedElement
  return [{ faces: allFaces }];
}
