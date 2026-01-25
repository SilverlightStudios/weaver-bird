import * as THREE from "three";
import { parseModelPart } from "./jemParsing";
import { jemToThreeJS } from "./jemThreeJSConverter";
import { log } from "./jemUtilities";
import { mergeBox } from "./jemLoaderUtils";

/**
 * JEM Loader - Parses OptiFine Entity Models following Blockbench's exact logic
 *
 * KEY INSIGHT FROM BLOCKBENCH (optifine_jem.js):
 *
 * 1. ROOT PARTS (depth=0):
 *    - origin = -translate (negate)
 *    - Boxes are in ABSOLUTE world coordinates
 *
 * 2. SUBMODELS:
 *    - Depth=1 (direct child of a root part):
 *        origin = translate (NO negation, NO accumulation)
 *    - Depth>=2:
 *        First: subsub.translate += parent.origin
 *        Then: origin = subsub.translate (use directly, NO negation)
 *    - Boxes are ALSO in absolute coordinates, but Blockbench adjusts them for
 *      non-root groups: box.from += group.origin, box.to += group.origin
 *
 * 3. THREE.JS POSITIONING:
 *    - Blockbench's outliner.js (bone_rig mode):
 *      mesh.position = origin
 *      if (parent) mesh.position -= parent.origin
 *    - So children are positioned RELATIVE to parent
 *
 * 4. BOX POSITIONING:
 *    - After the origin adjustment, boxes need to be positioned relative to (0,0,0)
 *    - in the group's local space. Blockbench adds p_group.origin to box coords
 *    - for non-root groups, which effectively repositions them.
 *    - The mesh center is then just the box center (no origin subtraction needed).
 */

export interface JEMFile {
  texture?: string;
  textureSize?: [number, number];
  shadowSize?: number;
  models?: JEMModelPart[];
}

export interface JEMModelPart {
  part?: string;
  id?: string;
  texture?: string;
  textureSize?: [number, number];
  invertAxis?: string;
  translate?: [number, number, number];
  rotate?: [number, number, number];
  scale?: number;
  mirrorTexture?: string;
  boxes?: JEMBox[];
  submodel?: JEMModelPart;
  submodels?: JEMModelPart[];
  animations?: Record<string, string | number>[];
  model?: string;
  attach?: boolean | string;
}

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

export type AnimationLayer = Record<string, string | number>;

export interface ParsedEntityModel {
  texturePath: string;
  textureSize: [number, number];
  shadowSize: number;
  parts: ParsedPart[];
  animations?: AnimationLayer[];
}

export interface ParseOptions {
  /** Parse in JPM mode (root translate not negated, root boxes adjusted) */
  isJpm?: boolean;
}

export interface ParsedPart {
  name: string;
  /**
   * Origin in Blockbench space (after accumulation for submodels).
   * ROOT (depth=0): origin = -translate
   * SUBMODEL depth=1: origin = translate (absolute)
   * SUBMODEL depth>=2: origin = translate + parentOrigin (accumulated, NOT negated)
   */
  origin: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  mirrorUV: boolean;
  /** Boxes with coordinates already adjusted (for non-root: coords += origin) */
  boxes: ParsedBox[];
  children: ParsedPart[];
  isRootPart: boolean;
  /** Axes to invert when applying animations (as specified by CEM) */
  invertAxis?: string;
  /** Effective texture path for this part (inherits from parent/JEM) */
  texturePath: string;
  /** Effective texture size for this part (inherits from parent/JEM) */
  textureSize: [number, number];
}

export interface ParsedBox {
  /** Box min corner (already adjusted for submodels) */
  from: [number, number, number];
  /** Box max corner (already adjusted for submodels) */
  to: [number, number, number];
  /** Planar axis if the source box had a zero dimension */
  planarAxis?: "x" | "y" | "z";
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
  /** Effective texture path for this box (inherits from part) */
  texturePath: string;
  /** Texture size to use for UV normalization */
  textureSize: [number, number];
}

export { jemToThreeJS };

// ============================================================================
// PARSING
// ============================================================================

export function parseJEM(
  jemData: JEMFile,
  options: ParseOptions = {},
): ParsedEntityModel {
  const textureSize: [number, number] = jemData.textureSize ?? [64, 32];
  const texturePath = jemData.texture ?? "";
  const shadowSize = jemData.shadowSize ?? 1.0;
  const parts: ParsedPart[] = [];
  const animations: AnimationLayer[] = [];

  if (jemData.models) {
    log.section(`Parsing ${jemData.models.length} models`);

    for (const modelPart of jemData.models) {
      // Skip pure external model refs (including attach-only roots)
      if (
        modelPart.model &&
        !modelPart.boxes &&
        !modelPart.submodel &&
        !modelPart.submodels
      )
        continue;

      const parsed = parseModelPart(
        modelPart,
        texturePath,
        textureSize,
        0,
        null,
        options,
      );
      if (parsed) parts.push(parsed);

      if (modelPart.animations) {
        for (const anim of modelPart.animations) animations.push(anim);
      }
    }
  }

  const result: ParsedEntityModel = {
    texturePath,
    textureSize,
    shadowSize,
    parts,
  };
  if (animations.length > 0) result.animations = animations;
  return result;
}

/**
 * Parse a model part following Blockbench's exact logic.
 *
 * @param part - The JEM model part data
 * @param textureSize - Texture dimensions for UV calculation
 * @param depth - Nesting depth (0 = root, 1+ = submodel)
 * @param parentOrigin - Parent's origin (null for root parts)
 */
export function parseJEMPart(
  part: JEMModelPart,
  inheritedTextureSize: [number, number],
  options: ParseOptions = {},
  inheritedTexturePath = "",
): ParsedPart {
  return parseModelPart(
    part,
    inheritedTexturePath,
    inheritedTextureSize,
    0,
    null,
    options,
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export function mergeVariantTextures(
  baseModel: ParsedEntityModel,
  variantJemData: JEMFile,
): ParsedEntityModel {
  const variantParsed = parseJEM(variantJemData);
  const variantPartMap = new Map<string, ParsedPart>();
  for (const part of variantParsed.parts) variantPartMap.set(part.name, part);

  const mergePart = (basePart: ParsedPart): ParsedPart => {
    const variantPart = variantPartMap.get(basePart.name);
    if (!variantPart)
      return { ...basePart, children: basePart.children.map(mergePart) };

    const mergedTexturePath = variantPart.texturePath ?? basePart.texturePath;
    const mergedTextureSize = variantPart.textureSize ?? basePart.textureSize;

    const mergedBoxes = basePart.boxes.map((baseBox, idx) =>
      mergeBox(
        baseBox,
        idx,
        basePart.name,
        { textureSize: basePart.textureSize, mirrorUV: basePart.mirrorUV },
        variantJemData,
        mergedTexturePath,
        mergedTextureSize,
      ),
    );

    return {
      ...basePart,
      texturePath: mergedTexturePath,
      textureSize: mergedTextureSize,
      boxes: mergedBoxes,
      children: basePart.children.map(mergePart),
    };
  };

  return { ...baseModel, parts: baseModel.parts.map(mergePart) };
}

export function applyVariantPartMask(
  baseModel: ParsedEntityModel,
  variantJemData: JEMFile,
): ParsedEntityModel {
  const variantPartBoxes = new Map<string, number>();

  for (const modelPart of variantJemData.models ?? []) {
    const name = modelPart.id ?? modelPart.part;
    if (!name) continue;
    const count = Array.isArray(modelPart.boxes) ? modelPart.boxes.length : 0;
    variantPartBoxes.set(name, count);
  }

  const maskPart = (part: ParsedPart): ParsedPart | null => {
    const count = variantPartBoxes.get(part.name);
    const keepSelf = count != null && count > 0;
    const keptChildren = part.children
      .map(maskPart)
      .filter((child): child is ParsedPart => child != null);

    if (!keepSelf && keptChildren.length === 0) return null;

    return {
      ...part,
      boxes: keepSelf ? part.boxes : [],
      children: keptChildren,
    };
  };

  const maskedParts = baseModel.parts
    .map(maskPart)
    .filter((part): part is ParsedPart => part != null);

  return { ...baseModel, parts: maskedParts };
}

export function loadJEM(
  jemData: JEMFile,
  texture: THREE.Texture | null = null,
  entityId?: string,
): THREE.Group {
  const parsed = parseJEM(jemData);
  return jemToThreeJS(parsed, texture, {}, entityId);
}

export function addDebugVisualization(group: THREE.Group): void {
  group.traverse((obj) => {
    if (obj instanceof THREE.Group && obj.name) {
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.05),
        new THREE.MeshBasicMaterial({ color: 0xff0000 }),
      );
      marker.name = `${obj.name}_pivot`;
      obj.add(marker);
    }
  });
}

export function logHierarchy(group: THREE.Object3D, indent = 0): void {
  const prefix = "  ".repeat(indent);
  const p = group.position;
  const r = group.rotation;
  console.log(
    `${prefix}${group.name ?? "(unnamed)"} pos:[${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)}] rot:[${THREE.MathUtils.radToDeg(r.x).toFixed(1)}°, ${THREE.MathUtils.radToDeg(r.y).toFixed(1)}°, ${THREE.MathUtils.radToDeg(r.z).toFixed(1)}°]`,
  );
  group.children.forEach((c) => logHierarchy(c, indent + 1));
}
