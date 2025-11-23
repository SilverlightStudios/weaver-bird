/**
 * OptiFine JEM (JSON Entity Model) format types
 *
 * Based on OptiFine CEM documentation:
 * https://github.com/sp614x/optifine/tree/master/OptiFineDoc/doc
 */

/**
 * Root JEM file structure
 */
export interface JEMFile {
  /** Path to texture file */
  texture?: string;
  /** Texture dimensions [width, height] in pixels */
  textureSize?: [number, number];
  /** Shadow size (0.0 - 1.0) */
  shadowSize?: number;
  /** Array of model parts */
  models?: JEMModelPart[];
}

/**
 * A model part in a JEM file
 */
export interface JEMModelPart {
  /** Parent model ID to inherit from */
  baseId?: string;
  /** External JPM file to load */
  model?: string;
  /** Identifier for this part (for referencing as parent) */
  id?: string;
  /** Entity part name to attach/replace */
  part?: string;
  /** True = attach to part, false = replace part */
  attach?: boolean;
  /** Render scale (default 1.0) */
  scale?: number;
  /** Animation expressions */
  animations?: JEMAnimation[];

  // Inline part model properties (from JPM format)
  /** Texture path */
  texture?: string;
  /** Axes to invert (e.g., "xy", "xyz") */
  invertAxis?: string;
  /** Translation [x, y, z] in pixels */
  translate?: [number, number, number];
  /** Rotation [x, y, z] in degrees */
  rotate?: [number, number, number];
  /** Axis to mirror texture (e.g., "u", "v", "uv") */
  mirrorTexture?: string;
  /** Box definitions */
  boxes?: JEMBox[];
  /** Sprite definitions */
  sprites?: JEMSprite[];
  /** Single nested submodel */
  submodel?: JEMModelPart;
  /** Array of nested submodels */
  submodels?: JEMModelPart[];
}

/**
 * Animation definition
 */
export interface JEMAnimation {
  /** Variable to animate (e.g., "head.rx", "left_arm.ty") */
  [variable: string]: string | number;
}

/**
 * Box geometry definition
 */
export interface JEMBox {
  /** Texture offset [u, v] for box UV mapping */
  textureOffset?: [number, number];
  /** Box coordinates [x, y, z, width, height, depth] */
  coordinates?: [number, number, number, number, number, number];
  /** Uniform size increment */
  sizeAdd?: number;
  /** Per-box texture size (overrides parent textureSize) */
  textureSize?: [number, number];

  // Individual face UV coordinates (alternative to textureOffset)
  /** UV for down face (-Y) [u1, v1, u2, v2] */
  uvDown?: [number, number, number, number];
  /** UV for up face (+Y) */
  uvUp?: [number, number, number, number];
  /** UV for north face (-Z) */
  uvNorth?: [number, number, number, number];
  /** UV for south face (+Z) */
  uvSouth?: [number, number, number, number];
  /** UV for west face (-X) */
  uvWest?: [number, number, number, number];
  /** UV for east face (+X) */
  uvEast?: [number, number, number, number];
}

/**
 * Sprite definition (flat 3D plane, depth=1)
 */
export interface JEMSprite {
  /** Texture offset [u, v] */
  textureOffset?: [number, number];
  /** Sprite coordinates [x, y, z, width, height, depth] */
  coordinates?: [number, number, number, number, number, number];
  /** Size increment */
  sizeAdd?: number;
}

/**
 * JPM (JSON Part Model) file structure
 * Can be referenced by JEM files via the "model" property
 */
export interface JPMFile {
  /** Texture path */
  texture?: string;
  /** Texture dimensions [width, height] */
  textureSize?: [number, number];
  /** Axes to invert */
  invertAxis?: string;
  /** Translation [x, y, z] */
  translate?: [number, number, number];
  /** Rotation [x, y, z] in degrees */
  rotate?: [number, number, number];
  /** Mirror texture axis */
  mirrorTexture?: string;
  /** Box definitions */
  boxes?: JEMBox[];
  /** Sprite definitions */
  sprites?: JEMSprite[];
  /** Single nested submodel */
  submodel?: JEMModelPart;
  /** Array of nested submodels */
  submodels?: JEMModelPart[];
}

/**
 * Parsed and normalized entity model ready for rendering
 */
export interface ParsedEntityModel {
  /** Entity type identifier */
  entityType: string;
  /** Texture path */
  texturePath: string;
  /** Texture dimensions */
  textureSize: [number, number];
  /** Shadow size */
  shadowSize: number;
  /** Parsed model parts in hierarchical structure */
  parts: ParsedModelPart[];
}

/**
 * Parsed model part with resolved geometry
 */
export interface ParsedModelPart {
  /** Part name */
  name: string;
  /** Translation in pixels */
  translate: [number, number, number];
  /** Rotation in degrees */
  rotate: [number, number, number];
  /** Scale factor */
  scale: number;
  /** Whether to mirror texture */
  mirrorTexture: boolean;
  /** Inverted axes */
  invertAxis: string;
  /** Box geometry */
  boxes: ParsedBox[];
  /** Child parts */
  children: ParsedModelPart[];
}

/**
 * Parsed box with resolved UV coordinates
 */
export interface ParsedBox {
  /** Position [x, y, z] in pixels */
  position: [number, number, number];
  /** Size [width, height, depth] in pixels */
  size: [number, number, number];
  /** UV coordinates for each face */
  uv: {
    down: [number, number, number, number];
    up: [number, number, number, number];
    north: [number, number, number, number];
    south: [number, number, number, number];
    west: [number, number, number, number];
    east: [number, number, number, number];
  };
  /** Whether texture is mirrored */
  mirror: boolean;
}
