/**
 * JEM/JPM file parser
 *
 * Parses OptiFine CEM format entity models into a normalized structure
 * for rendering with Three.js.
 */

import type {
  JEMFile,
  JEMModelPart,
  JEMBox,
  ParsedEntityModel,
  ParsedModelPart,
  ParsedBox,
} from "./types";

/**
 * Parse a JEM file into a normalized entity model
 */
export function parseJEM(
  jemData: JEMFile,
  entityType: string,
  defaultTexturePath?: string,
): ParsedEntityModel {
  const textureSize = jemData.textureSize || [64, 32];
  const texturePath =
    jemData.texture || defaultTexturePath || `entity/${entityType}`;

  console.log(`[JEM Parser] Parsing entity: ${entityType}`);
  console.log(`[JEM Parser] Texture: ${texturePath}`);
  console.log(`[JEM Parser] Texture size: ${textureSize.join("x")}`);
  console.log(`[JEM Parser] Parts count: ${jemData.models?.length || 0}`);

  const parts: ParsedModelPart[] = [];

  if (jemData.models) {
    for (const modelPart of jemData.models) {
      const parsed = parseModelPart(modelPart, textureSize);
      if (parsed) {
        parts.push(parsed);
      }
    }
  }

  return {
    entityType,
    texturePath,
    textureSize,
    shadowSize: jemData.shadowSize || 0.5,
    parts,
  };
}

/**
 * Parse a single model part (recursive for submodels)
 */
function parseModelPart(
  part: JEMModelPart,
  textureSize: [number, number],
): ParsedModelPart | null {
  const name = part.part || part.id || "unnamed";

  console.log(`[JEM Parser] Parsing part: ${name}`);

  // Parse transformations
  // Parse transformations
  const invertAxis = part.invertAxis || "";
  const translate = part.translate || [0, 0, 0];
  const rotate = part.rotate || [0, 0, 0];
  const scale = part.scale || 1.0;
  const mirrorTexture =
    part.mirrorTexture === "u" || part.mirrorTexture === "uv";

  // Parse boxes
  const boxes: ParsedBox[] = [];
  if (part.boxes) {
    for (const box of part.boxes) {
      const parsed = parseBox(box, textureSize, mirrorTexture, invertAxis, part.part || "");
      if (parsed) {
        boxes.push(parsed);
      }
    }
  }

  // Parse children (submodels)
  const children: ParsedModelPart[] = [];

  if (part.submodel) {
    const child = parseModelPart(part.submodel, textureSize);
    if (child) {
      children.push(child);
    }
  }

  if (part.submodels) {
    for (const submodel of part.submodels) {
      const child = parseModelPart(submodel, textureSize);
      if (child) {
        children.push(child);
      }
    }
  }

  return {
    name,
    translate,
    rotate,
    scale,
    mirrorTexture,
    invertAxis,
    boxes,
    children,
  };
}

/**
 * Parse a box definition with UV coordinates
 */
function parseBox(
  box: JEMBox,
  parentTextureSize: [number, number],
  mirror: boolean,
  invertAxis: string = "",
  part: string = "",
): ParsedBox | null {
  // Use per-box textureSize if provided, otherwise use parent textureSize
  const textureSize = box.textureSize || parentTextureSize;

  // Modern JEM format: coordinates are optional, dimensions inferred from UV
  let x = 0,
    y = 0,
    z = 0,
    width = 0,
    height = 0,
    depth = 0;

  if (box.coordinates) {
    // Explicit coordinates provided (legacy format or custom geometry)
    [x, y, z, width, height, depth] = box.coordinates;
  } else {
    // Modern format: Infer dimensions from texture layout using box UV
    // When coordinates are omitted, we need to reverse-engineer dimensions from the UV layout
    if (box.textureOffset) {
      // Attempt to infer box dimensions from texture patterns
      // This is a heuristic based on common Minecraft entity part sizes
      const dimensions = inferBoxDimensionsFromUV(
        box.textureOffset,
        textureSize,
      );
      width = dimensions.width;
      height = dimensions.height;
      depth = dimensions.depth;

      // Position box centered at pivot, extending in standard direction
      // For most entity parts, boxes extend downward (negative Y) from pivot
      x = -width / 2;
      y = 0; // Most boxes extend down from pivot (0 to -height)
      z = -depth / 2;

      console.log(
        `[JEM Parser] Box using texture-driven geometry: inferred size [${width}, ${height}, ${depth}] at position [${x}, ${y}, ${z}]`,
      );
    } else {
      // Absolute fallback when no UV info available
      width = 4;
      height = 12;
      depth = 4;
      x = -2;
      y = 0;
      z = -2;

      console.warn(
        "[JEM Parser] Box missing both coordinates and textureOffset - using default cube",
      );
    }
  }

  // Apply invertAxis to convert from inverted coordinate space to standard space
  // Skip for legs since they are manually positioned at pivot points (centerX/Z=0)
  const isLeg = part.startsWith('leg');

  if (!isLeg && invertAxis.includes("x")) {
    x = -x - width;
  }
  if (!isLeg && invertAxis.includes("y")) {
    y = -y - height;
  }
  if (!isLeg && invertAxis.includes("z")) {
    z = -z - depth;
  }

  const sizeAdd = box.sizeAdd || 0;

  // Calculate UV coordinates
  let uv: ParsedBox["uv"];

  if (
    box.uvDown ||
    box.uvUp ||
    box.uvNorth ||
    box.uvSouth ||
    box.uvWest ||
    box.uvEast
  ) {
    // Individual face UVs provided (explicit UVs take precedence)
    uv = {
      down: box.uvDown || [0, 0, 0, 0],
      up: box.uvUp || [0, 0, 0, 0],
      north: box.uvNorth || [0, 0, 0, 0],
      south: box.uvSouth || [0, 0, 0, 0],
      west: box.uvWest || [0, 0, 0, 0],
      east: box.uvEast || [0, 0, 0, 0],
    };
  } else if (box.textureOffset) {
    // Calculate box UV from texture offset
    // This follows Minecraft's box UV layout convention
    // Note: Negative offsets are valid (used for texture atlas mapping)
    const [u, v] = box.textureOffset;
    uv = calculateBoxUV(u, v, width, height, depth);
  } else {
    // Default UV at origin (fallback)
    uv = calculateBoxUV(0, 0, width, height, depth);
  }

  return {
    position: [x, y, z],
    size: [width + sizeAdd * 2, height + sizeAdd * 2, depth + sizeAdd * 2],
    uv,
    mirror,
  };
}

/**
 * Infer box dimensions from texture offset and known patterns
 *
 * This uses common Minecraft entity part dimensions based on texture offset patterns.
 * When the modern JEM format omits coordinates, we use these standard sizes.
 */
function inferBoxDimensionsFromUV(
  textureOffset: [number, number],
  _textureSize: [number, number],
): { width: number; height: number; depth: number } {
  const [u, v] = textureOffset;

  // Common Minecraft entity part dimensions based on texture patterns
  // These are educated guesses based on vanilla entity models
  const commonSizes: Record<
    string,
    { width: number; height: number; depth: number }
  > = {
    // Legs (most common): 4x12x4
    "0,16": { width: 4, height: 12, depth: 4 },

    // Body parts
    "18,4": { width: 12, height: 18, depth: 10 }, // Cow body
    "52,0": { width: 4, height: 6, depth: 1 }, // Cow udder

    // Head parts
    "0,0": { width: 8, height: 8, depth: 6 }, // Standard head
    "22,0": { width: 1, height: 3, depth: 1 }, // Horn/ear
    "1,33": { width: 1, height: 1, depth: 1 }, // Small detail
  };

  // Try exact match first
  const key = `${u},${v}`;
  if (commonSizes[key]) {
    return commonSizes[key];
  }

  // Fallback: Use texture region size as a hint
  // Standard leg is a good default for unknown patterns
  return { width: 4, height: 12, depth: 4 };
}

/**
 * Calculate UV coordinates for a box using Minecraft's standard box layout
 *
 * Minecraft box UV layout (with textureOffset at [u, v]):
 *
 *         depth   width   depth   width
 *       +-------+-------+-------+-------+
 *   v   |  up   | down  |       |       |  depth
 *       +-------+-------+-------+-------+
 *       | north | east  | south | west  |  height
 *       +-------+-------+-------+-------+
 *         width   depth   width   depth
 *
 * Starting from textureOffset:
 * - Up: (u + depth, v), size (width, depth)
 * - Down: (u + depth + width, v), size (width, depth)
 * - North: (u + depth, v + depth), size (width, height)
 * - East: (u, v + depth), size (depth, height)
 * - South: (u + depth + width + depth, v + depth), size (width, height)
 * - West: (u + depth + width, v + depth), size (depth, height)
 */
function calculateBoxUV(
  u: number,
  v: number,
  width: number,
  height: number,
  depth: number,
): ParsedBox["uv"] {
  return {
    // Down face (-Y): bottom of box
    down: [u + depth, v, u + depth + width, v + depth],
    // Up face (+Y): top of box
    up: [u + depth + width, v, u + depth + width + width, v + depth],
    // North face (-Z): front of box
    north: [u + depth, v + depth, u + depth + width, v + depth + height],
    // East face (+X): right side
    east: [
      u,
      v + depth,
      u + depth,
      v + depth + height,
    ],
    // South face (+Z): back of box
    south: [
      u + depth + width + depth,
      v + depth,
      u + depth + width + depth + width,
      v + depth + height,
    ],
    // West face (-X): left side
    west: [u + depth + width, v + depth, u + depth + width + depth, v + depth + height],
  };
}

/**
 * Serialize a parsed entity model back to JEM format
 * (useful for debugging or exporting)
 */
export function serializeToJEM(model: ParsedEntityModel): JEMFile {
  return {
    texture: model.texturePath,
    textureSize: model.textureSize,
    shadowSize: model.shadowSize,
    models: model.parts.map(serializeModelPart),
  };
}

function serializeModelPart(part: ParsedModelPart): JEMModelPart {
  const result: JEMModelPart = {
    part: part.name,
  };

  if (
    part.translate[0] !== 0 ||
    part.translate[1] !== 0 ||
    part.translate[2] !== 0
  ) {
    result.translate = part.translate;
  }

  if (part.rotate[0] !== 0 || part.rotate[1] !== 0 || part.rotate[2] !== 0) {
    result.rotate = part.rotate;
  }

  if (part.scale !== 1.0) {
    result.scale = part.scale;
  }

  if (part.invertAxis) {
    result.invertAxis = part.invertAxis;
  }

  if (part.mirrorTexture) {
    result.mirrorTexture = "u";
  }

  if (part.boxes.length > 0) {
    result.boxes = part.boxes.map((box) => ({
      coordinates: [
        box.position[0],
        box.position[1],
        box.position[2],
        box.size[0],
        box.size[1],
        box.size[2],
      ] as [number, number, number, number, number, number],
      uvNorth: box.uv.north,
      uvSouth: box.uv.south,
      uvEast: box.uv.east,
      uvWest: box.uv.west,
      uvUp: box.uv.up,
      uvDown: box.uv.down,
    }));
  }

  if (part.children.length > 0) {
    result.submodels = part.children.map(serializeModelPart);
  }

  return result;
}
