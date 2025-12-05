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
  /** External model reference (JPM file path) - not currently supported */
  model?: string;
  /** Whether this is an attachment reference */
  attach?: boolean | string;
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

/** Animation layer type */
export type AnimationLayer = Record<string, string | number>;

/** Parsed and normalized entity model */
export interface ParsedEntityModel {
  texturePath: string;
  textureSize: [number, number];
  shadowSize: number;
  parts: ParsedPart[];
  /** Animation layers from all model parts (if present) */
  animations?: AnimationLayer[];
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
  const animations: AnimationLayer[] = [];

  if (jemData.models) {
    for (const modelPart of jemData.models) {
      // Skip external model references (parts with "model" property but no geometry)
      // These reference external .jpm files which we don't currently support.
      // They often have the same "part" name as a real part, causing collisions.
      // Example: {"part":"body","model":"piglin_body.jpm","attach":"true"}
      // should be skipped when there's already a {"part":"body","id":"body",...} with real geometry.
      if (modelPart.model && !modelPart.boxes && !modelPart.submodel && !modelPart.submodels) {
        console.log(`[JEM Parser] Skipping external model reference: ${modelPart.part || modelPart.id} -> ${modelPart.model}`);
        continue;
      }

      const parsed = parseModelPart(modelPart, textureSize, null);
      if (parsed) {
        parts.push(parsed);
      }

      // Extract animations from this model part
      // Animations are defined at the part level and contain multiple layers
      if (modelPart.animations && modelPart.animations.length > 0) {
        for (const animLayer of modelPart.animations) {
          animations.push(animLayer);
        }
      }
    }
  }

  const result: ParsedEntityModel = {
    texturePath,
    textureSize,
    shadowSize,
    parts,
  };

  // Only include animations if present
  if (animations.length > 0) {
    result.animations = animations;
  }

  return result;
}

/**
 * Merge geometry from base model with textures from variant model
 * 
 * Use case: Variant JEMs that only define texture offsets but no coordinates
 * (e.g., bed_foot.jem uses bed.jem geometry, sheep_wool_undercoat.jem uses sheep.jem geometry)
 * 
 * Strategy:
 * 1. For each part in the base model, check if variant has a matching part
 * 2. If match found, use base geometry (from/to) but variant UVs (texture offsets)
 * 3. This allows variants to change textures without redefining coordinates
 * 
 * @param baseModel - Base model with complete geometry (e.g., from bed.jem)
 * @param variantJemData - Variant JEM with texture overrides (e.g., from bed_foot.jem)
 * @returns Merged model with base geometry + variant textures
 */
export function mergeVariantTextures(
  baseModel: ParsedEntityModel,
  variantJemData: JEMFile
): ParsedEntityModel {
  // console.log('[JEM Merger] Merging variant textures with base geometry');

  // Parse variant to extract part names and texture info
  // Note: parseJEM will skip boxes without coordinates, but we still get part structure
  const variantParsed = parseJEM(variantJemData);

  // Build a map of variant parts by name for quick lookup
  const variantPartMap = new Map<string, ParsedPart>();
  for (const part of variantParsed.parts) {
    variantPartMap.set(part.name, part);
  }

  // Helper to merge a single part recursively
  const mergePart = (basePart: ParsedPart): ParsedPart => {
    const variantPart = variantPartMap.get(basePart.name);

    // If no variant override, return base part as-is
    if (!variantPart) {
      // console.log(`[JEM Merger] No variant override for part: ${basePart.name}`);
      return {
        ...basePart,
        children: basePart.children.map(child => mergePart(child))
      };
    }

    // console.log(`[JEM Merger] Merging textures for part: ${basePart.name}`);

    // Merge boxes: use base geometry but try to get variant UVs
    // For texture-only variants, we need to get UVs from the raw JEM data
    // because parseJEM skipped boxes without coordinates
    const mergedBoxes: ParsedBox[] = basePart.boxes.map((baseBox, boxIdx) => {
      // Try to find matching box in variant's RAW data
      const rawVariantModel = variantJemData.models?.find(m =>
        (m.part === basePart.name || m.id === basePart.name)
      );

      const rawVariantBox = rawVariantModel?.boxes?.[boxIdx];

      if (rawVariantBox) {
        // Calculate UVs from variant's texture offset
        // We need to recalculate UVs using the variant's textureOffset
        let variantUV: ParsedBox['uv'];

        if (rawVariantBox.uvNorth || rawVariantBox.uvEast ||
          rawVariantBox.uvSouth || rawVariantBox.uvWest ||
          rawVariantBox.uvUp || rawVariantBox.uvDown) {
          // Per-face UV mode
          variantUV = {
            east: rawVariantBox.uvEast || baseBox.uv.east,
            west: rawVariantBox.uvWest || baseBox.uv.west,
            up: rawVariantBox.uvUp || baseBox.uv.up,
            down: rawVariantBox.uvDown || baseBox.uv.down,
            south: rawVariantBox.uvSouth || baseBox.uv.south,
            north: rawVariantBox.uvNorth || baseBox.uv.north,
          };
        } else if (rawVariantBox.textureOffset) {
          // Box UV mode - recalculate from texture offset
          const [u, v] = rawVariantBox.textureOffset;
          const width = baseBox.to[0] - baseBox.from[0];
          const height = baseBox.to[1] - baseBox.from[1];
          const depth = baseBox.to[2] - baseBox.from[2];
          variantUV = calculateBoxUV(u, v, width, height, depth);
        } else {
          // No UV override, use base
          variantUV = baseBox.uv;
        }

        return {
          ...baseBox,
          uv: variantUV,
        };
      }

      // No variant box data, use base
      return baseBox;
    });

    return {
      ...basePart,
      boxes: mergedBoxes,
      children: basePart.children.map(child => mergePart(child))
    };
  };

  // Merge all parts
  const mergedParts = baseModel.parts.map(part => mergePart(part));

  return {
    ...baseModel,
    parts: mergedParts,
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
  // IMPORTANT: Prefer id over part to avoid name collisions.
  // JEM files can have multiple entries with the same "part" but different "id"s:
  // - {"part":"body", "id":"body", "translate":[0,-6,0], ...} - the actual body
  // - {"part":"body", "id":"body_part", "model":"...", ...} - external model ref
  // Using id first ensures each gets a unique name in the bone map.
  const name = part.id || part.part || "unnamed";

  // Get the translate (pivot point)
  const rawTranslate: [number, number, number] = part.translate
    ? [...part.translate]
    : [0, 0, 0];

  // CRITICAL: Blockbench negates translate to get origin
  // See: group.origin.V3_multiply(-1) in optifine_jem.js
  // This is done REGARDLESS of invertAxis (invertAxis is export metadata only)
  const origin: [number, number, number] = [
    -rawTranslate[0],
    -rawTranslate[1],
    -rawTranslate[2],
  ];

  // For submodels, their translate is relative to parent
  // We need to compute absolute origin for proper positioning
  if (parentOrigin) {
    // Parent's origin is already negated, and child's translate is relative
    // Absolute origin = parent_origin + (-child_translate)
    // But since child_translate is relative to parent's translate (not origin),
    // we need: child_absolute_translate = parent_translate + child_translate
    // Then: child_origin = -child_absolute_translate
    // Which equals: -parent_translate + (-child_translate) = parent_origin + child_origin_local
    origin[0] += parentOrigin[0];
    origin[1] += parentOrigin[1];
    origin[2] += parentOrigin[2];
  }

  const rotation: [number, number, number] = part.rotate
    ? [...part.rotate]
    : [0, 0, 0];

  const scale = part.scale ?? 1.0;
  const mirrorUV = part.mirrorTexture?.includes("u") ?? false;

  // Parse boxes (invertAxis is NOT applied - it's export metadata only)
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
    const child = parseModelPart(part.submodel, textureSize, origin);
    children.push(child);
  }

  if (part.submodels) {
    for (const submodel of part.submodels) {
      const child = parseModelPart(submodel, textureSize, origin);
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
 * Box coordinates in JEM are relative to the part's pivot point.
 * [x, y, z, width, height, depth] where (x,y,z) is the minimum corner.
 */
function parseBox(
  box: JEMBox,
  _textureSize: [number, number],
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
  let uv: ParsedBox["uv"];
  if (
    box.uvNorth ||
    box.uvEast ||
    box.uvSouth ||
    box.uvWest ||
    box.uvUp ||
    box.uvDown
  ) {
    // Use per-face UV if provided
    uv = {
      north: box.uvNorth || [0, 0, 0, 0],
      east: box.uvEast || [0, 0, 0, 0],
      south: box.uvSouth || [0, 0, 0, 0],
      west: box.uvWest || [0, 0, 0, 0],
      up: box.uvUp || [0, 0, 0, 0],
      down: box.uvDown || [0, 0, 0, 0],
    };
  } else if (box.textureOffset) {
    // Box UV mode - calculate from texture offset
    const [u, v] = box.textureOffset;
    uv = calculateBoxUV(u, v, width, height, depth);
  } else {
    // No texture information
    uv = {
      north: [0, 0, 1, 1],
      east: [0, 0, 1, 1],
      south: [0, 0, 1, 1],
      west: [0, 0, 1, 1],
      up: [0, 0, 1, 1],
      down: [0, 0, 1, 1],
    };
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
  // IMPORTANT: Set Euler order to 'ZYX' to match JEM specification
  // Default 'XYZ' order does not match JEM's expected rotation behavior
  // console.log(`[jemLoader] Part: ${part.name}, Rotation: [${part.rotation.join(', ')}]`);
  group.rotation.order = 'ZYX';
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
    const mesh = createBoxMesh(
      box,
      part.origin,
      textureSize,
      texture,
    );
    if (mesh) {
      group.add(mesh);
    }
  }

  // Recursively add children
  for (const child of part.children) {
    const childGroup = convertPart(child, textureSize, texture);

    // Child origins are ABSOLUTE (computed during parsing by adding parent translate).
    // Parent group is positioned at parent.origin in world space.
    // To place child at its correct absolute position, compute LOCAL offset:
    //   childLocalPos = childAbsoluteOrigin - parentAbsoluteOrigin
    //
    // Example for allay:
    //   body.origin = [0, 6, 0] → body at world [0, 0.375, 0]
    //   head2.origin = [0, 0, 0] (absolute) → should be at world [0, 0, 0]
    //   head2 local pos = [0, 0, 0] - [0, 6, 0] = [0, -6, 0] → [0, -0.375, 0] in Three.js
    //   head2 world = body world + head2 local = [0, 0.375, 0] + [0, -0.375, 0] = [0, 0, 0] ✓
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
 * Box coordinates are ABSOLUTE in pixel space.
 * The group is positioned at origin (which is -translate).
 * To place the mesh correctly, we compute its local position relative to the group.
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

  // Skip completely degenerate boxes, but allow zero-width/depth planes (used for flat elements like tails)
  if (width < 0 || height < 0 || depth < 0) {
    console.warn(
      "[JEM] Skipping invalid box with negative dimensions:",
      width,
      height,
      depth,
    );
    return null;
  }

  // Skip boxes with no volume at all
  if (width === 0 && height === 0 && depth === 0) {
    console.warn("[JEM] Skipping zero-volume box");
    return null;
  }

  // Create geometry - use PlaneGeometry for flat elements (width=0 or depth=0)
  let geometry: THREE.BufferGeometry;
  let planeAxis: "x" | "z" | null = null;

  if (width === 0) {
    // YZ plane (should face X axis)
    // PlaneGeometry defaults to XY plane facing +Z, so we need depth x height
    geometry = new THREE.PlaneGeometry(depth, height);
    geometry.rotateY(Math.PI / 2); // Rotate 90° to face X axis
    planeAxis = "x";
  } else if (depth === 0) {
    // XY plane (should face Z axis)
    geometry = new THREE.PlaneGeometry(width, height);
    // No rotation needed - already facing Z
    planeAxis = "z";
  } else {
    // Normal 3D box
    geometry = new THREE.BoxGeometry(width, height, depth);
  }

  // Apply UV coordinates with rotation compensation
  if (planeAxis) {
    applyPlaneUVs(geometry, box.uv, textureSize, planeAxis);
  } else {
    applyUVs(
      geometry as THREE.BoxGeometry,
      box.uv,
      textureSize,
      box.mirror,
    );
  }

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

  // Calculate box center in ABSOLUTE pixel coordinates
  const centerX = (from[0] + to[0]) / 2;
  const centerY = (from[1] + to[1]) / 2;
  const centerZ = (from[2] + to[2]) / 2;

  // Position mesh relative to group.
  // Box coords are ABSOLUTE (in pixel world space).
  // Group is at origin/16 where origin = -translate (Blockbench convention).
  // Box world position = center / 16 (absolute position in Three.js units)
  // Group position = origin / 16
  // Mesh local position = box_world - group_position = (center - origin) / 16
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
 * Based on Blockbench's box UV implementation and Minecraft's coordinate system:
 * - Side faces (east, west, north, south): Standard orientation
 * - Up face (+Y): Needs Z-flip (swap v1/v2) for correct orientation
 * - Down face (-Y): Standard orientation
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
  const faceConfigs: { name: keyof typeof uv; index: number; flipZ?: boolean }[] = [
    { name: "east", index: 0 }, // right face (+X)
    { name: "west", index: 1 }, // left face (-X)
    { name: "up", index: 2, flipZ: true }, // top face (+Y) needs Z-flip
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
    let uvV1 = 1 - v1 / texHeight; // Top of face in texture space
    let uvU2 = u2 / texWidth;
    let uvV2 = 1 - v2 / texHeight; // Bottom of face in texture space

    // Handle mirroring
    if (mirror) {
      [uvU1, uvU2] = [uvU2, uvU1];
    }

    // Handle Z-flip for up face (swap V coordinates to flip along Z/depth axis)
    if (config.flipZ) {
      [uvV1, uvV2] = [uvV2, uvV1];
    }

    // Set UV coordinates for the 4 vertices of this face
    const baseIndex = config.index * 4;

    // Three.js BoxGeometry vertex layout per face:
    // 2---3
    // |   |
    // 0---1
    uvAttr.setXY(baseIndex + 0, uvU1, uvV1); // Bottom-left
    uvAttr.setXY(baseIndex + 1, uvU2, uvV1); // Bottom-right
    uvAttr.setXY(baseIndex + 2, uvU1, uvV2); // Top-left
    uvAttr.setXY(baseIndex + 3, uvU2, uvV2); // Top-right
  }

  uvAttr.needsUpdate = true;
}

/**
 * Apply UV coordinates to a plane geometry (for zero-width/depth boxes)
 *
 * PlaneGeometry has only 1 face with 4 vertices, so we apply the appropriate
 * face UV based on which axis the plane is perpendicular to.
 */
function applyPlaneUVs(
  geometry: THREE.BufferGeometry,
  uv: ParsedBox["uv"],
  textureSize: [number, number],
  normalAxis: "x" | "z",
): void {
  const [texWidth, texHeight] = textureSize;
  const uvAttr = geometry.attributes.uv;
  if (!uvAttr) return;

  // Choose which face UV to use based on the plane orientation
  let faceUV: [number, number, number, number];

  if (normalAxis === "x") {
    // YZ plane - use east or west face UV (east for positive side)
    faceUV = uv.east;
  } else {
    // XY plane - use north or south face UV (north for positive side)
    faceUV = uv.north;
  }

  if (!faceUV || faceUV.every((v) => v === 0)) {
    // Try fallback UVs if primary is empty
    faceUV = normalAxis === "x" ? uv.west : uv.south;
  }

  const [u1, v1, u2, v2] = faceUV;

  // Convert pixel coordinates to 0-1 UV space
  const uvU1 = u1 / texWidth;
  const uvV1 = 1 - v1 / texHeight; // Top
  const uvU2 = u2 / texWidth;
  const uvV2 = 1 - v2 / texHeight; // Bottom

  // PlaneGeometry has 4 vertices in this layout:
  // 2---3
  // |   |
  // 0---1
  uvAttr.setXY(0, uvU1, uvV1); // Bottom-left
  uvAttr.setXY(1, uvU2, uvV1); // Bottom-right
  uvAttr.setXY(2, uvU1, uvV2); // Top-left
  uvAttr.setXY(3, uvU2, uvV2); // Top-right

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
