/**
 * JEM (JSON Entity Model) Loader for Three.js
 *
 * This module parses OptiFine CEM format entity models and converts them
 * to Three.js geometry. It follows Blockbench's approach exactly to ensure
 * correct rendering.
 *
 * Key Concepts:
 * - JEM uses pixel coordinates (16 pixels = 1 block = 1 Three.js unit)
 * - `translate` is the pivot/origin point, negated on import
 * - `coordinates` are [x, y, z, width, height, depth] in absolute pixel space
 * - `invertAxis: 'xy'` is metadata for exporters, NOT a runtime transformation
 * - Box positions must be made relative to their part's origin for Three.js
 *
 * Coordinate System:
 * - Both Minecraft/JEM and Three.js use Y-up, right-handed coordinates
 * - The main transformation is negating `translate` to get the origin
 */

import * as THREE from "three";

// =============================================================================
// TYPES
// =============================================================================

/** Raw JEM file structure as parsed from JSON */
export interface JEMFile {
  texture?: string;
  textureSize?: [number, number];
  shadowSize?: number;
  models?: JEMModelPart[];
}

/** A model part (bone) in the JEM file */
export interface JEMModelPart {
  part?: string;
  id?: string;
  invertAxis?: string;
  translate?: [number, number, number];
  rotate?: [number, number, number];
  scale?: number;
  mirrorTexture?: string;
  boxes?: JEMBox[];
  submodel?: JEMModelPart;
  submodels?: JEMModelPart[];
  animations?: Record<string, string | number>[];
}

/** Box geometry definition */
export interface JEMBox {
  coordinates?: [number, number, number, number, number, number];
  textureOffset?: [number, number];
  textureSize?: [number, number];
  sizeAdd?: number;
  uvDown?: [number, number, number, number];
  uvUp?: [number, number, number, number];
  uvNorth?: [number, number, number, number];
  uvSouth?: [number, number, number, number];
  uvWest?: [number, number, number, number];
  uvEast?: [number, number, number, number];
}

/** Parsed and normalized entity model */
export interface ParsedEntityModel {
  texturePath: string;
  textureSize: [number, number];
  shadowSize: number;
  parts: ParsedPart[];
}

/** Parsed model part with resolved values */
export interface ParsedPart {
  name: string;
  /** Origin point (negated translate) in pixels */
  origin: [number, number, number];
  /** Rotation in degrees [rx, ry, rz] */
  rotation: [number, number, number];
  scale: number;
  mirrorUV: boolean;
  boxes: ParsedBox[];
  children: ParsedPart[];
}

/** Parsed box with absolute coordinates and UV data */
export interface ParsedBox {
  /** Corner position [x, y, z] in pixels (absolute) */
  from: [number, number, number];
  /** Opposite corner [x, y, z] in pixels (absolute) */
  to: [number, number, number];
  /** UV coordinates for each face [u1, v1, u2, v2] */
  uv: {
    east: [number, number, number, number];
    west: [number, number, number, number];
    up: [number, number, number, number];
    down: [number, number, number, number];
    south: [number, number, number, number];
    north: [number, number, number, number];
  };
  mirror: boolean;
  inflate: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Pixels per block/Three.js unit */
const PIXELS_PER_UNIT = 16;

// =============================================================================
// PARSING
// =============================================================================

/**
 * Parse a JEM file into a normalized structure
 */
export function parseJEM(jemData: JEMFile): ParsedEntityModel {
  const textureSize: [number, number] = jemData.textureSize || [64, 32];
  const texturePath = jemData.texture || "";
  const shadowSize = jemData.shadowSize ?? 1.0;

  const parts: ParsedPart[] = [];

  if (jemData.models) {
    for (const modelPart of jemData.models) {
      const parsed = parseModelPart(modelPart, textureSize, null);
      if (parsed) {
        parts.push(parsed);
      }
    }
  }

  return {
    texturePath,
    textureSize,
    shadowSize,
    parts,
  };
}

/**
 * Parse a model part and its children recursively
 *
 * @param part - The raw JEM model part
 * @param textureSize - Default texture size [width, height]
 * @param parentOrigin - Parent's origin for submodel coordinate adjustment
 */
function parseModelPart(
  part: JEMModelPart,
  textureSize: [number, number],
  parentOrigin: [number, number, number] | null,
): ParsedPart {
  const name = part.part || part.id || "unnamed";

  // Get the translate (pivot point)
  // For submodels at depth >= 1, add parent's origin to make absolute
  const translate: [number, number, number] = part.translate
    ? [...part.translate]
    : [0, 0, 0];

  // Submodels have relative translates - convert to absolute
  if (parentOrigin) {
    translate[0] += parentOrigin[0];
    translate[1] += parentOrigin[1];
    translate[2] += parentOrigin[2];
  }

  // CRITICAL: Negate translate to get origin (Blockbench line 276)
  // This is the key transformation that makes everything work
  const origin: [number, number, number] = [
    -translate[0],
    -translate[1],
    -translate[2],
  ];

  const rotation: [number, number, number] = part.rotate
    ? [...part.rotate]
    : [0, 0, 0];

  const scale = part.scale ?? 1.0;
  const mirrorUV = part.mirrorTexture?.includes("u") ?? false;

  // Parse boxes
  const boxes: ParsedBox[] = [];
  if (part.boxes) {
    for (const box of part.boxes) {
      const parsed = parseBox(box, textureSize, mirrorUV);
      if (parsed) {
        boxes.push(parsed);
      }
    }
  }

  // Parse children (submodels)
  const children: ParsedPart[] = [];

  if (part.submodel) {
    // Pass the NEGATED origin (which equals the original translate with sign flip)
    // But for submodel coordinate calculation, we need the original translate
    const child = parseModelPart(part.submodel, textureSize, translate);
    children.push(child);
  }

  if (part.submodels) {
    for (const submodel of part.submodels) {
      const child = parseModelPart(submodel, textureSize, translate);
      children.push(child);
    }
  }

  return {
    name,
    origin,
    rotation,
    scale,
    mirrorUV,
    boxes,
    children,
  };
}

/**
 * Parse a box definition
 *
 * Box coordinates in JEM are ABSOLUTE in world space.
 * [x, y, z, width, height, depth] where (x,y,z) is the minimum corner.
 */
function parseBox(
  box: JEMBox,
  textureSize: [number, number],
  partMirrorUV: boolean,
): ParsedBox | null {
  // Default coordinates if not specified
  let x = 0,
    y = 0,
    z = 0;
  let width = 0,
    height = 0,
    depth = 0;

  if (box.coordinates) {
    [x, y, z, width, height, depth] = box.coordinates;
  } else {
    // No coordinates - can't create box
    console.warn("[JEM Parser] Box missing coordinates, skipping");
    return null;
  }

  const inflate = box.sizeAdd || 0;

  // Calculate from/to with inflation
  const from: [number, number, number] = [
    x - inflate,
    y - inflate,
    z - inflate,
  ];
  const to: [number, number, number] = [
    x + width + inflate,
    y + height + inflate,
    z + depth + inflate,
  ];

  // Calculate UV coordinates
  // Note: Per-box texture size support could be added here if needed
  let uv: ParsedBox["uv"];

  if (
    box.uvNorth ||
    box.uvEast ||
    box.uvSouth ||
    box.uvWest ||
    box.uvUp ||
    box.uvDown
  ) {
    // Per-face UV mode (explicit UVs provided)
    uv = {
      east: box.uvEast || [0, 0, 0, 0],
      west: box.uvWest || [0, 0, 0, 0],
      up: box.uvUp || [0, 0, 0, 0],
      down: box.uvDown || [0, 0, 0, 0],
      south: box.uvSouth || [0, 0, 0, 0],
      north: box.uvNorth || [0, 0, 0, 0],
    };
  } else if (box.textureOffset) {
    // Box UV mode - calculate from texture offset
    const [u, v] = box.textureOffset;
    uv = calculateBoxUV(u, v, width, height, depth);
  } else {
    // No UV info - use default at origin
    uv = calculateBoxUV(0, 0, width, height, depth);
  }

  return {
    from,
    to,
    uv,
    mirror: partMirrorUV,
    inflate,
  };
}

/**
 * Calculate UV coordinates for a box using Minecraft's standard layout
 *
 * Standard Minecraft Box UV Layout (textureOffset at [u, v]):
 *
 *       u      u+d     u+d+w   u+d+w+d  u+2d+2w
 *   v   +------+-------+-------+--------+
 *       |      |  up   | down  |        |   d (depth)
 *   v+d +------+-------+-------+--------+
 *       | east | north | west  | south  |   h (height)
 * v+d+h +------+-------+-------+--------+
 *          d      w       d       w
 *
 * Where: d = depth (Z), w = width (X), h = height (Y)
 */
function calculateBoxUV(
  u: number,
  v: number,
  width: number,
  height: number,
  depth: number,
): ParsedBox["uv"] {
  // Based on skinview3d's proven implementation
  // Their naming: top, bottom, left, front, right, back
  // Minecraft naming: down=top, up=bottom, east=left, north=front, west=right, south=back
  return {
    // Top row in texture (top and bottom faces of the box)
    up: [u + depth, v, u + depth + width, v + depth], // skinview3d calls this "top"
    down: [u + depth + width, v, u + depth + width * 2, v + depth], // skinview3d calls this "bottom"

    // Bottom row in texture (side faces)
    east: [u, v + depth, u + depth, v + depth + height], // left
    north: [u + depth, v + depth, u + depth + width, v + depth + height], // front
    west: [
      u + depth + width,
      v + depth,
      u + depth + width + depth,
      v + depth + height,
    ], // right
    south: [
      u + depth + width + depth,
      v + depth,
      u + depth + width + depth + width,
      v + depth + height,
    ], // back
  };
}

// =============================================================================
// THREE.JS CONVERSION
// =============================================================================

/**
 * Convert a parsed JEM model to a Three.js Group
 *
 * @param model - The parsed entity model
 * @param texture - Optional Three.js texture to apply
 * @returns Three.js Group containing the entity
 */
export function jemToThreeJS(
  model: ParsedEntityModel,
  texture: THREE.Texture | null,
): THREE.Group {
  const root = new THREE.Group();
  root.name = "jem_entity";

  // Configure texture for pixel-perfect rendering
  if (texture) {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
  }

  // Convert each part
  for (const part of model.parts) {
    const partGroup = convertPart(part, model.textureSize, texture);
    root.add(partGroup);
  }

  return root;
}

/**
 * Convert a parsed part to Three.js geometry
 *
 * The key insight from Blockbench:
 * 1. Position the group at the origin (negated translate)
 * 2. Create box geometry relative to that origin
 * 3. Apply rotations around the origin
 */
function convertPart(
  part: ParsedPart,
  textureSize: [number, number],
  texture: THREE.Texture | null,
): THREE.Group {
  const group = new THREE.Group();
  group.name = part.name;

  // Position at origin (in Three.js units)
  group.position.set(
    part.origin[0] / PIXELS_PER_UNIT,
    part.origin[1] / PIXELS_PER_UNIT,
    part.origin[2] / PIXELS_PER_UNIT,
  );

  // Apply rotation (degrees to radians)
  // JEM rotations are applied as-is
  group.rotation.set(
    THREE.MathUtils.degToRad(part.rotation[0]),
    THREE.MathUtils.degToRad(part.rotation[1]),
    THREE.MathUtils.degToRad(part.rotation[2]),
  );

  // Apply scale if not 1.0
  if (part.scale !== 1.0) {
    group.scale.setScalar(part.scale);
  }

  // Create meshes for each box
  for (const box of part.boxes) {
    const mesh = createBoxMesh(box, part.origin, textureSize, texture);
    if (mesh) {
      group.add(mesh);
    }
  }

  // Recursively add children
  for (const child of part.children) {
    const childGroup = convertPart(child, textureSize, texture);

    // Child position needs to be relative to parent
    // The child's origin is already absolute, so subtract parent's origin
    childGroup.position.set(
      (child.origin[0] - part.origin[0]) / PIXELS_PER_UNIT,
      (child.origin[1] - part.origin[1]) / PIXELS_PER_UNIT,
      (child.origin[2] - part.origin[2]) / PIXELS_PER_UNIT,
    );

    group.add(childGroup);
  }

  return group;
}

/**
 * Create a Three.js mesh for a box
 *
 * Box coordinates are absolute, but we need to position relative to the part's origin.
 * This matches Blockbench's updateGeometry() which subtracts the origin from from/to.
 */
function createBoxMesh(
  box: ParsedBox,
  partOrigin: [number, number, number],
  textureSize: [number, number],
  texture: THREE.Texture | null,
): THREE.Mesh | null {
  const { from, to } = box;

  // Calculate size
  const width = (to[0] - from[0]) / PIXELS_PER_UNIT;
  const height = (to[1] - from[1]) / PIXELS_PER_UNIT;
  const depth = (to[2] - from[2]) / PIXELS_PER_UNIT;

  // Skip degenerate boxes
  if (width <= 0 || height <= 0 || depth <= 0) {
    console.warn(
      "[JEM] Skipping degenerate box with size:",
      width,
      height,
      depth,
    );
    return null;
  }

  // Create geometry
  const geometry = new THREE.BoxGeometry(width, height, depth);

  // Apply UV coordinates
  applyUVs(geometry, box.uv, textureSize, box.mirror);

  // Create material
  const material = texture
    ? new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.1,
      side: THREE.DoubleSide,
    })
    : new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      side: THREE.DoubleSide,
    });

  const mesh = new THREE.Mesh(geometry, material);

  // Calculate box center in absolute coordinates
  const centerX = (from[0] + to[0]) / 2;
  const centerY = (from[1] + to[1]) / 2;
  const centerZ = (from[2] + to[2]) / 2;

  // Position RELATIVE to part origin (this is the key fix!)
  // Blockbench does: from[i] -= element.origin[i]
  mesh.position.set(
    (centerX - partOrigin[0]) / PIXELS_PER_UNIT,
    (centerY - partOrigin[1]) / PIXELS_PER_UNIT,
    (centerZ - partOrigin[2]) / PIXELS_PER_UNIT,
  );

  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

/**
 * Apply UV coordinates to box geometry
 *
 * Three.js BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z
 * Which maps to: East, West, Up, Down, South, North
 *
 * CRITICAL: Different faces need different UV orientations!
 * Based on Blockbench's box UV implementation:
 * - Side faces (east, west, north, south): Normal orientation
 * - Up face: Flip both U and V
 * - Down face: Flip U only
 *
 * Three.js UV coordinate system: (0,0) at bottom-left, (1,1) at top-right
 * Texture UV system: (0,0) at top-left
 */
function applyUVs(
  geometry: THREE.BoxGeometry,
  uv: ParsedBox["uv"],
  textureSize: [number, number],
  mirror: boolean,
): void {
  const [texWidth, texHeight] = textureSize;
  const uvAttr = geometry.attributes.uv;
  if (!uvAttr) return;

  // Map face names to Three.js box face indices
  // Three.js order: [right(+X), left(-X), top(+Y), bottom(-Y), front(+Z), back(-Z)]
  const faceConfigs: { name: keyof typeof uv; index: number }[] = [
    { name: "east", index: 0 }, // right face (+X)
    { name: "west", index: 1 }, // left face (-X)
    { name: "up", index: 2 }, // top face (+Y)
    { name: "down", index: 3 }, // bottom face (-Y)
    { name: "south", index: 4 }, // front face (+Z)
    { name: "north", index: 5 }, // back face (-Z)
  ];

  for (const config of faceConfigs) {
    const faceUV = uv[config.name];
    if (!faceUV || faceUV.every((v) => v === 0)) continue;

    const [u1, v1, u2, v2] = faceUV;

    // Convert pixel coordinates to 0-1 UV space
    // Entity textures have (0,0) at top-left, Three.js at bottom-left
    let uvU1 = u1 / texWidth;
    const uvV1 = 1 - v1 / texHeight; // Top of face
    let uvU2 = u2 / texWidth;
    const uvV2 = 1 - v2 / texHeight; // Bottom of face

    // Handle mirroring
    if (mirror) {
      [uvU1, uvU2] = [uvU2, uvU1];
    }

    // Set UV coordinates for the 4 vertices of this face
    const baseIndex = config.index * 4;

    // Three.js BoxGeometry vertex layout per face:
    // 2---3  (uvV2 - top in Three.js after flip)
    // |   |
    // 0---1  (uvV1 - bottom in Three.js after flip)
    // Note: v1 is top in texture coords, but after (1-v) flip becomes bottom in Three.js
    uvAttr.setXY(baseIndex + 0, uvU1, uvV1); // Bottom-left (was uvV2)
    uvAttr.setXY(baseIndex + 1, uvU2, uvV1); // Bottom-right (was uvV2)
    uvAttr.setXY(baseIndex + 2, uvU1, uvV2); // Top-left (was uvV1)
    uvAttr.setXY(baseIndex + 3, uvU2, uvV2); // Top-right (was uvV1)
  }

  uvAttr.needsUpdate = true;
}

// =============================================================================
// CONVENIENCE FUNCTION
// =============================================================================

/**
 * Load and convert a JEM file to Three.js in one step
 *
 * @param jemData - Raw JEM JSON data
 * @param texture - Optional Three.js texture
 * @returns Three.js Group containing the entity
 */
export function loadJEM(
  jemData: JEMFile,
  texture: THREE.Texture | null = null,
): THREE.Group {
  const parsed = parseJEM(jemData);
  return jemToThreeJS(parsed, texture);
}

// =============================================================================
// DEBUG UTILITIES
// =============================================================================

/**
 * Add debug visualization (pivot points, bounding boxes)
 */
export function addDebugVisualization(group: THREE.Group): void {
  group.traverse((obj) => {
    if (obj instanceof THREE.Group && obj.name) {
      // Add pivot point marker
      const pivotGeom = new THREE.SphereGeometry(0.05);
      const pivotMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const pivotMarker = new THREE.Mesh(pivotGeom, pivotMat);
      pivotMarker.name = `${obj.name}_pivot`;
      obj.add(pivotMarker);
    }
  });
}

/**
 * Log the hierarchy of a Three.js group for debugging
 */
export function logHierarchy(group: THREE.Object3D, indent = 0): void {
  const prefix = "  ".repeat(indent);
  const pos = group.position;
  const rot = group.rotation;

  console.log(
    `${prefix}${group.name || "(unnamed)"} ` +
    `pos:[${pos.x.toFixed(3)}, ${pos.y.toFixed(3)}, ${pos.z.toFixed(3)}] ` +
    `rot:[${THREE.MathUtils.radToDeg(rot.x).toFixed(1)}°, ${THREE.MathUtils.radToDeg(rot.y).toFixed(1)}°, ${THREE.MathUtils.radToDeg(rot.z).toFixed(1)}°]`,
  );

  for (const child of group.children) {
    logHierarchy(child, indent + 1);
  }
}
