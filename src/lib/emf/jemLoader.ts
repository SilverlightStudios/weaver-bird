import * as THREE from "three";
import { VANILLA_HIERARCHIES } from "@constants/animations/generated";

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

const PIXELS_PER_UNIT = 16;
const DEBUG_JEM = false;

const fmt = (v: number[], d = 2): string =>
  `[${v.map((n) => n.toFixed(d)).join(", ")}]`;

const log = {
  section: (msg: string) => {
    if (DEBUG_JEM)
      console.log(`\n${"=".repeat(60)}\n${msg}\n${"=".repeat(60)}`);
  },
  parse: (
    name: string,
    depth: number,
    translate: number[],
    origin: number[],
    isRoot: boolean,
  ) => {
    if (!DEBUG_JEM) return;
    const indent = "  ".repeat(depth);
    const type = isRoot ? "ROOT" : "SUB";
    console.log(
      `${indent}[PARSE:${type}] "${name}" translate=${fmt(translate)} → origin=${fmt(origin)}`,
    );
  },
  box: (
    _name: string,
    depth: number,
    rawFrom: number[],
    rawTo: number[],
    adjFrom: number[],
    adjTo: number[],
  ) => {
    if (!DEBUG_JEM) return;
    const indent = "  ".repeat(depth + 1);
    console.log(
      `${indent}[BOX] raw=[${fmt(rawFrom)}→${fmt(rawTo)}] adj=[${fmt(adjFrom)}→${fmt(adjTo)}]`,
    );
  },
  convert: (
    name: string,
    origin: number[],
    parentOrigin: number[] | null,
    localPos: number[],
  ) => {
    if (!DEBUG_JEM) return;
    const pStr = parentOrigin ? ` parent=${fmt(parentOrigin)}` : "";
    console.log(
      `[THREE] "${name}" origin=${fmt(origin)}${pStr} → local=${fmt(localPos, 4)}`,
    );
  },
  mesh: (name: string, boxIdx: number, center: number[], meshPos: number[]) => {
    if (!DEBUG_JEM) return;
    console.log(
      `  [MESH] "${name}"[${boxIdx}] center=${fmt(center)} → pos=${fmt(meshPos, 4)}`,
    );
  },
  hierarchy: (root: THREE.Group) => {
    if (!DEBUG_JEM) return;
    console.log(`\n[FINAL HIERARCHY]`);
    const logNode = (obj: THREE.Object3D, depth: number) => {
      const indent = "  ".repeat(depth);
      const p = obj.position;
      const w = new THREE.Vector3();
      obj.getWorldPosition(w);
      const type = obj instanceof THREE.Mesh ? "MESH" : "GROUP";
      console.log(
        `${indent}${type} "${obj.name}" local=[${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)}] world=[${w.x.toFixed(3)}, ${w.y.toFixed(3)}, ${w.z.toFixed(3)}]`,
      );
      obj.children.forEach((c) => logNode(c, depth + 1));
    };
    logNode(root, 0);
  },
};

// ============================================================================
// PARSING
// ============================================================================

export function parseJEM(
  jemData: JEMFile,
  options: ParseOptions = {},
): ParsedEntityModel {
  const textureSize: [number, number] = jemData.textureSize || [64, 32];
  const texturePath = jemData.texture || "";
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

function parseModelPart(
  part: JEMModelPart,
  inheritedTexturePath: string,
  inheritedTextureSize: [number, number],
  depth: number,
  parentOrigin: [number, number, number] | null,
  options: ParseOptions,
): ParsedPart {
  const name = part.id || part.part || "unnamed";
  const invertAxis = part.invertAxis;
  const hasTranslate = Array.isArray(part.translate);
  const translate: [number, number, number] = hasTranslate
    ? [...(part.translate as [number, number, number])]
    : [0, 0, 0];
  const isRoot = depth === 0;

  // Calculate origin following Blockbench's logic:
  // ROOT (depth=0): origin = -translate
  // CHILD (depth=1): origin = translate (absolute)
  // GRANDCHILD+ (depth>=2): origin = translate + parentOrigin
  let origin: [number, number, number];

  const isJpm = options.isJpm === true;

  if (isRoot) {
    origin = isJpm
      ? hasTranslate
        ? [...translate]
        : [0, 0, 0]
      : [-translate[0], -translate[1], -translate[2]];
  } else if (depth === 1) {
    // Direct children of root use translate as-is; missing translate defaults to [0,0,0]
    origin = hasTranslate ? [...translate] : [0, 0, 0];
  } else if (parentOrigin) {
    origin = [
      translate[0] + parentOrigin[0],
      translate[1] + parentOrigin[1],
      translate[2] + parentOrigin[2],
    ];
  } else {
    origin = [...translate];
  }

  log.parse(name, depth, translate, origin, isRoot);

  const rotation: [number, number, number] = part.rotate
    ? [...part.rotate]
    : [0, 0, 0];
  const scale = part.scale ?? 1.0;
  const mirrorUV = part.mirrorTexture?.includes("u") ?? false;

  const effectiveTexturePath = part.texture ?? inheritedTexturePath;
  const effectiveTextureSize = part.textureSize ?? inheritedTextureSize;

  // Parse boxes - Blockbench adjusts box coords for non-root groups
  // by adding p_group.origin. But since we're in the parsing phase,
  // we need to understand what this means:
  //
  // For ROOT parts: boxes stay as-is (they're in absolute world coords)
  // For SUBMODELS: Blockbench adds the group's origin to box coords
  //                This makes the boxes "move" to their correct world position
  //
  // HOWEVER - the key insight is that after this adjustment, the boxes
  // are positioned in world space, but the GROUP is ALSO at origin.
  // So when we compute mesh position = boxCenter - groupOrigin, it cancels out
  // and boxes end up at their intended world positions.
  //
  // Actually, re-reading Blockbench more carefully:
  // - p_group is the current group being populated, not the parent
  // - So boxes get p_group.origin added, which is THIS group's origin
  // - This means: adjustedBox = rawBox + thisOrigin
  // - Then mesh position in local space = adjustedBoxCenter (no subtraction needed)
  //   because the group position already accounts for origin

  const boxes: ParsedBox[] = [];
  if (part.boxes) {
    for (const box of part.boxes) {
      const parsed = parseBox(
        box,
        mirrorUV,
        origin,
        isRoot,
        isJpm,
        effectiveTexturePath,
        effectiveTextureSize,
        name,
        depth,
      );
      if (parsed) boxes.push(parsed);
    }
  }

  // Recursively parse children
  const children: ParsedPart[] = [];
  if (part.submodel) {
    children.push(
      parseModelPart(
        part.submodel,
        effectiveTexturePath,
        effectiveTextureSize,
        depth + 1,
        origin,
        options,
      ),
    );
  }
  if (part.submodels) {
    for (const sub of part.submodels) {
      children.push(
        parseModelPart(
          sub,
          effectiveTexturePath,
          effectiveTextureSize,
          depth + 1,
          origin,
          options,
        ),
      );
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
    isRootPart: isRoot,
    invertAxis,
    texturePath: effectiveTexturePath,
    textureSize: effectiveTextureSize,
  };
}

/**
 * Parse a box, adjusting coordinates for non-root groups.
 *
 * Blockbench (line 332-337):
 *   if (p_group && (p_group.parent !== 'root' || model._is_jpm)) {
 *     base_cube.from[i] += p_group.origin[i];
 *     base_cube.to[i] += p_group.origin[i];
 *   }
 *
 * This means for non-root groups, box coords get the group's origin added.
 * For root groups, boxes stay as-is.
 */
function parseBox(
  box: JEMBox,
  mirrorUV: boolean,
  groupOrigin: [number, number, number],
  isRootGroup: boolean,
  isJpm: boolean,
  texturePath: string,
  textureSize: [number, number],
  partName: string,
  depth: number,
): ParsedBox | null {
  if (!box.coordinates) {
    console.warn("[JEM] Box missing coordinates");
    return null;
  }

  const [x, y, z, width, height, boxDepth] = box.coordinates;
  const inflate = box.sizeAdd || 0;

  // Raw box coords from JEM
  const rawFrom: [number, number, number] = [
    x - inflate,
    y - inflate,
    z - inflate,
  ];
  const rawTo: [number, number, number] = [
    x + width + inflate,
    y + height + inflate,
    z + boxDepth + inflate,
  ];

  // Adjust for non-root groups (add group origin)
  let from: [number, number, number];
  let to: [number, number, number];

  if (!isRootGroup || isJpm) {
    // Non-root (or JPM root): add group origin to box coords
    from = [
      rawFrom[0] + groupOrigin[0],
      rawFrom[1] + groupOrigin[1],
      rawFrom[2] + groupOrigin[2],
    ];
    to = [
      rawTo[0] + groupOrigin[0],
      rawTo[1] + groupOrigin[1],
      rawTo[2] + groupOrigin[2],
    ];
  } else {
    // Root JEM: boxes stay as-is
    from = [...rawFrom];
    to = [...rawTo];
  }

  log.box(partName, depth, rawFrom, rawTo, from, to);

  // Parse UVs
  let uv: ParsedBox["uv"];
  if (
    box.uvNorth ||
    box.uvEast ||
    box.uvSouth ||
    box.uvWest ||
    box.uvUp ||
    box.uvDown
  ) {
    uv = {
      north: box.uvNorth || [0, 0, 0, 0],
      east: box.uvEast || [0, 0, 0, 0],
      south: box.uvSouth || [0, 0, 0, 0],
      west: box.uvWest || [0, 0, 0, 0],
      up: box.uvUp || [0, 0, 0, 0],
      down: box.uvDown || [0, 0, 0, 0],
    };
  } else if (box.textureOffset) {
    uv = calculateBoxUV(
      box.textureOffset[0],
      box.textureOffset[1],
      width,
      height,
      boxDepth,
      mirrorUV,
    );
  } else {
    uv = {
      north: [0, 0, 1, 1],
      east: [0, 0, 1, 1],
      south: [0, 0, 1, 1],
      west: [0, 0, 1, 1],
      up: [0, 0, 1, 1],
      down: [0, 0, 1, 1],
    };
  }

  const boxTextureSize = box.textureSize ?? textureSize;

  return {
    from,
    to,
    uv,
    mirror: mirrorUV,
    inflate,
    texturePath,
    textureSize: boxTextureSize,
  };
}

function calculateBoxUV(
  u: number,
  v: number,
  w: number,
  h: number,
  d: number,
  mirror: boolean,
): ParsedBox["uv"] {
  // Port of Blockbench cube.js updateUV() box_uv face_list logic
  const faceList: {
    face: keyof ParsedBox["uv"];
    from: [number, number];
    size: [number, number];
  }[] = [
    { face: "east", from: [0, d], size: [d, h] },
    { face: "west", from: [d + w, d], size: [d, h] },
    { face: "up", from: [d + w, d], size: [-w, -d] },
    { face: "down", from: [d + w * 2, 0], size: [-w, d] },
    { face: "south", from: [d * 2 + w, d], size: [w, h] },
    { face: "north", from: [d, d], size: [w, h] },
  ];

  if (mirror) {
    for (const f of faceList) {
      f.from[0] += f.size[0];
      f.size[0] *= -1;
    }
    // Swap east/west rectangles after mirroring (Blockbench swaps from/size only)
    const eastFrom = faceList[0].from;
    const eastSize = faceList[0].size;
    faceList[0].from = faceList[1].from;
    faceList[0].size = faceList[1].size;
    faceList[1].from = eastFrom;
    faceList[1].size = eastSize;
  }

  const uv: ParsedBox["uv"] = {
    east: [0, 0, 0, 0],
    west: [0, 0, 0, 0],
    up: [0, 0, 0, 0],
    down: [0, 0, 0, 0],
    south: [0, 0, 0, 0],
    north: [0, 0, 0, 0],
  };

  for (const f of faceList) {
    uv[f.face] = [
      u + f.from[0],
      v + f.from[1],
      u + f.from[0] + f.size[0],
      v + f.from[1] + f.size[1],
    ];
  }

  return uv;
}

// ============================================================================
// THREE.JS CONVERSION
// ============================================================================

export function jemToThreeJS(
  model: ParsedEntityModel,
  texture: THREE.Texture | null,
  textureMap: Record<string, THREE.Texture> = {},
  entityId?: string,
): THREE.Group {
  const root = new THREE.Group();
  root.name = "jem_entity";

  if (texture) {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
  }
  for (const tex of Object.values(textureMap)) {
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
  }

  log.section("Converting to Three.js");

  const materialCache = new Map<string, THREE.MeshStandardMaterial>();

  const rootGroups: Record<string, THREE.Group> = {};
  for (const part of model.parts) {
    const group = convertPart(part, texture, textureMap, materialCache, null);
    root.add(group);
    rootGroups[group.name] = group;
  }

  // Mark translation semantics for common vanilla parts.
  const hasHumanoidLimbs =
    !!rootGroups.left_arm &&
    !!rootGroups.right_arm &&
    !!rootGroups.left_leg &&
    !!rootGroups.right_leg;
  if (hasHumanoidLimbs) {
    // Arms: humanoid rigs author tx/ty as absolute rotationPoint values (e.g. ty≈2.5).
    for (const limbName of ["left_arm", "right_arm"]) {
      const limb = rootGroups[limbName];
      if (!limb) continue;
      const pivotYPx = limb.position.y * PIXELS_PER_UNIT;
      limb.userData.absoluteTranslationAxes = pivotYPx >= 16 ? "xy" : "x";
    }
  }

  // Quadruped-style skeletons (cow, sheep, pig, mooshroom, creeper): leg1-leg4.
  // Fresh Animations authors translations as full rotationPoint values.
  const hasQuadrupedLegs =
    !!rootGroups.leg1 &&
    !!rootGroups.leg2 &&
    !!rootGroups.leg3 &&
    !!rootGroups.leg4;
  const hasDirectionalLegs =
    !!rootGroups.front_left_leg &&
    !!rootGroups.front_right_leg &&
    !!rootGroups.back_left_leg &&
    !!rootGroups.back_right_leg;
  const hasMiddleLegs =
    !!rootGroups.middle_left_leg && !!rootGroups.middle_right_leg;
  // "Quadruped" defaults are intended for 4-legged rigs; multi-leg rigs (e.g.
  // sniffer with middle legs) author translations differently.
  const isQuadruped = (hasQuadrupedLegs || hasDirectionalLegs) && !hasMiddleLegs;
  const hasHorseFamilyRig = isQuadruped && !!root.getObjectByName("neck2");
  if (isQuadruped) {
    const legNames = hasQuadrupedLegs
      ? ["leg1", "leg2", "leg3", "leg4"]
      : ["front_left_leg", "front_right_leg", "back_left_leg", "back_right_leg"];
    for (const legName of legNames) {
      const leg = rootGroups[legName];
      if (leg) leg.userData.absoluteTranslationAxes = "xyz";
    }

    // Some rigs (e.g. axolotl) include leg1-leg4 but explicitly zero out
    // body translations in the JPM (body.tx/ty/tz = 0), which should preserve
    // the JEM rest pose instead of snapping to rotationPoint(0). Only apply
    // the quadruped body translation default when the animation does not
    // explicitly treat these channels as additive-zeroed.
    const isZeroConst = (expr: unknown): boolean => {
      if (typeof expr === "number") return Math.abs(expr) < 1e-9;
      if (typeof expr !== "string") return false;
      const s = expr.trim();
      if (!/^-?\d+(\.\d+)?$/.test(s)) return false;
      const n = Number(s);
      return Number.isFinite(n) && Math.abs(n) < 1e-9;
    };
    const hasZeroedBodyTranslation =
      Array.isArray(model.animations) &&
      model.animations.some((layer) => {
        if (!layer || typeof layer !== "object") return false;
        const rec = layer as Record<string, unknown>;
        return (
          isZeroConst(rec["body.tx"]) ||
          isZeroConst(rec["body.ty"]) ||
          isZeroConst(rec["body.tz"])
        );
      });

    const body = rootGroups.body;
    if (body && !hasZeroedBodyTranslation) {
      body.userData.absoluteTranslationAxes = "xyz";
    }
  }

  // Collect bones that are explicitly animated so we don't re-parent them.
  const animatedBones = new Set<string>();
  const referencedBonesByTarget = new Map<string, Set<string>>();
  const referencedTranslationBonesByTarget = new Map<string, Set<string>>();
  if (model.animations) {
    for (const layer of model.animations) {
      for (const [property, expression] of Object.entries(layer)) {
        const dot = property.indexOf(".");
        if (dot === -1) continue;
        const target = property.slice(0, dot);
        if (target === "var" || target === "render") continue;
        animatedBones.add(target);

        if (typeof expression === "string") {
          const refs = referencedBonesByTarget.get(target) ?? new Set<string>();
          const tRefs =
            referencedTranslationBonesByTarget.get(target) ?? new Set<string>();
          const re = /\b([A-Za-z0-9_]+)\.([tr])[xyz]\b/g;
          let m: RegExpExecArray | null;
          while ((m = re.exec(expression))) {
            const ref = m[1];
            const kind = m[2] as "t" | "r";
            if (!ref || ref === "var" || ref === "render" || ref === "varb")
              continue;
            refs.add(ref);
            if (kind === "t") tRefs.add(ref);
          }
          if (refs.size > 0) referencedBonesByTarget.set(target, refs);
          if (tRefs.size > 0)
            referencedTranslationBonesByTarget.set(target, tRefs);
        }
      }
    }
  }

  // Apply implicit vanilla hierarchy for common skeletons.
  // Many CEM animations assume vanilla parent-child relationships for non-animated overlays.
  applyVanillaHierarchy(
    root,
    rootGroups,
    animatedBones,
    referencedBonesByTarget,
    referencedTranslationBonesByTarget,
    entityId,
  );

  // Reparenting preserves world transforms but changes local positions, so
  // refresh rest positions after hierarchy adjustments.
  root.traverse((obj) => {
    if (obj instanceof THREE.Group && obj.name && obj.name !== "jem_entity") {
      obj.userData.restPosition = obj.position.clone();
    }
  });

  // Fix translation semantics for specific animated submodels.
  const hasNegativeHead2TyBaseline = (() => {
    if (!isQuadruped || !Array.isArray(model.animations)) return false;
    for (const layer of model.animations) {
      if (!layer || typeof layer !== "object") continue;
      const expr = (layer as Record<string, unknown>)["head2.ty"];
      if (typeof expr === "number") {
        if (expr <= -3) return true;
        continue;
      }
      if (typeof expr !== "string") continue;
      // Many FA quadruped rigs author head2.ty with a large leading negative
      // constant like `-20 ...` to indicate rotationPoint-like coordinates.
      if (/^\s*-\s*\d/.test(expr.trimStart())) return true;
    }
    return false;
  })();

  root.traverse((obj) => {
    if (!(obj instanceof THREE.Group)) return;
    if (obj.name === "eyes") {
      const existing =
        typeof obj.userData.absoluteTranslationAxes === "string"
          ? (obj.userData.absoluteTranslationAxes as string)
          : "";
      obj.userData.absoluteTranslationAxes = existing.includes("z")
        ? existing
        : existing + "z";
      obj.userData.absoluteTranslationSpace = "local";
    }
    // Wolves also author `body_rotation.tz` (and friends) as rotationPoint values
    // (expressions include a base `+2`), so treat Z translation as absolute to avoid
    // double-applying the part's pivot.
    if (obj.name === "body_rotation" && obj.parent?.name === "body") {
      obj.userData.absoluteTranslationAxes = "z";
      // Use a 0px Y origin for consistency with other wolf-local absolute hacks.
      // (We currently only mark Z as absolute, but keeping this here avoids surprises
      // if we expand the absolute axes later.)
      obj.userData.cemYOriginPx = 0;
    }
    // Fresh Animations uses left_eye/right_eye translations as absolute positions
    // (the expressions include the bone's base translate), so treat them as absolute.
    if (
      (obj.name === "left_eye" || obj.name === "right_eye") &&
      (obj.parent?.name === "head2" || obj.parent?.name === "eyes")
    ) {
      const existing =
        typeof obj.userData.absoluteTranslationAxes === "string"
          ? (obj.userData.absoluteTranslationAxes as string)
          : "";
      const want = "xyz";
      obj.userData.absoluteTranslationAxes = want
        .split("")
        .reduce(
          (acc, axis) => (acc.includes(axis) ? acc : acc + axis),
          existing,
        );
      obj.userData.absoluteTranslationSpace = "local";

      const parentOriginPx = Array.isArray((obj.parent as any)?.userData?.originPx)
        ? ((obj.parent as any).userData.originPx as [number, number, number])
        : null;
      // Use the parent's origin as the Y origin so absolute-Y becomes a direct
      // CEM->Three conversion (avoids the 24px biped origin logic).
      if (parentOriginPx) obj.userData.cemYOriginPx = parentOriginPx[1];
    }

    // Goat/sheep-style snouts animate the mouth translations as absolute
    // positions (they already include the bone's base translate).
    if (obj.name === "mouth" && obj.parent?.name === "snout") {
      const existing =
        typeof obj.userData.absoluteTranslationAxes === "string"
          ? (obj.userData.absoluteTranslationAxes as string)
          : "";
      const want = "xyz";
      obj.userData.absoluteTranslationAxes = want
        .split("")
        .reduce(
          (acc, axis) => (acc.includes(axis) ? acc : acc + axis),
          existing,
        );
      obj.userData.absoluteTranslationSpace = "local";
    }

    // Fresh Animations goat "coat" uses ty as an absolute origin value (in CEM
    // space), not a local offset; use a 0px Y origin for quadrupeds.
    if (isQuadruped && obj.name === "coat" && obj.parent?.name === "body") {
      const existing =
        typeof obj.userData.absoluteTranslationAxes === "string"
          ? (obj.userData.absoluteTranslationAxes as string)
          : "";
      const want = "y";
      obj.userData.absoluteTranslationAxes = want
        .split("")
        .reduce(
          (acc, axis) => (acc.includes(axis) ? acc : acc + axis),
          existing,
        );
      obj.userData.cemYOriginPx = 0;
    }

    // Horse-family rigs (horse/donkey/mule/skeleton horse/zombie horse) animate
    // neck2 and tail2 translations as absolute origin values (e.g. ty≈-18.7),
    // not local offsets. Use a 0px CEM Y origin and subtract the body/saddle pivot.
    if (hasHorseFamilyRig && obj.parent?.name === "body") {
      if (obj.name === "neck2") {
        const existing =
          typeof obj.userData.absoluteTranslationAxes === "string"
            ? (obj.userData.absoluteTranslationAxes as string)
            : "";
        const want = "yz";
        obj.userData.absoluteTranslationAxes = want
          .split("")
          .reduce(
            (acc, axis) => (acc.includes(axis) ? acc : acc + axis),
            existing,
          );
        obj.userData.cemYOriginPx = 0;
      }

      if (obj.name === "tail2") {
        const existing =
          typeof obj.userData.absoluteTranslationAxes === "string"
            ? (obj.userData.absoluteTranslationAxes as string)
            : "";
        const want = "y";
        obj.userData.absoluteTranslationAxes = want
          .split("")
          .reduce(
            (acc, axis) => (acc.includes(axis) ? acc : acc + axis),
            existing,
          );
        obj.userData.cemYOriginPx = 0;
      }
    }

    if (obj.name === "headpiece_neck" && obj.parent?.name === "saddle") {
      const existing =
        typeof obj.userData.absoluteTranslationAxes === "string"
          ? (obj.userData.absoluteTranslationAxes as string)
          : "";
      const want = "yz";
      obj.userData.absoluteTranslationAxes = want
        .split("")
        .reduce((acc, axis) => (acc.includes(axis) ? acc : acc + axis), existing);
      obj.userData.cemYOriginPx = 0;
    }

    // Horse-family snouts animate `snout2.ty` (and tack `headpiece_snout.ty`) as
    // local absolute values (they include the base translate of +3px).
    if (
      (obj.name === "snout2" && obj.parent?.name === "head2") ||
      (obj.name === "headpiece_snout" && obj.parent?.name === "headpiece_head")
    ) {
      const existing =
        typeof obj.userData.absoluteTranslationAxes === "string"
          ? (obj.userData.absoluteTranslationAxes as string)
          : "";
      const want = "y";
      obj.userData.absoluteTranslationAxes = want
        .split("")
        .reduce(
          (acc, axis) => (acc.includes(axis) ? acc : acc + axis),
          existing,
        );
      obj.userData.absoluteTranslationSpace = "local";
    }

    // Pupils in Fresh Animations are driven by expressions that already include
    // their base translate, so treat them as local absolute translations.
    if (
      obj.name.endsWith("_pupil") &&
      (obj.parent?.name === "right_eye" || obj.parent?.name === "left_eye")
    ) {
      const existing =
        typeof obj.userData.absoluteTranslationAxes === "string"
          ? (obj.userData.absoluteTranslationAxes as string)
          : "";
      const want = "xyz";
      obj.userData.absoluteTranslationAxes = want
        .split("")
        .reduce(
          (acc, axis) => (acc.includes(axis) ? acc : acc + axis),
          existing,
        );
      obj.userData.absoluteTranslationSpace = "local";
    }

    // Wolf/fox/llama/turtle rigs with `body_rotation` author `head2` and `tail2`
    // translations with baked-in baselines (e.g. `head2.ty` starts at -16, `head2.tz`
    // starts at 3.5). Treat Y as an absolute rotationPoint-derived value that
    // evaluates to 0 at rest, and treat Z as an additive delta after subtracting
    // the baked baseline so parts stay separated along Z.
    if (
      (obj.name === "head2" || obj.name === "tail2") &&
      obj.parent?.name === "body" &&
      Array.isArray(obj.parent?.children) &&
      obj.parent.children.some((c) => c.name === "body_rotation")
    ) {
      // No-op: tick(0) baseline normalization in the AnimationEngine handles
      // baked constants on additive channels without relying on part names.
    }
    // Piglin-style snouts (nose/tusks) animate `ty` as an absolute (already
    // includes the bone's base translate, typically `-2` with invertAxis="xy").
    // Treat them as local absolute to avoid double-adding the base position.
    if (
      (obj.name === "nose" || obj.name === "tusks") &&
      (obj.parent?.name === "head" || obj.parent?.name === "head2")
    ) {
      const existing =
        typeof obj.userData.absoluteTranslationAxes === "string"
          ? (obj.userData.absoluteTranslationAxes as string)
          : "";
      const want = "y";
      obj.userData.absoluteTranslationAxes = want
        .split("")
        .reduce(
          (acc, axis) => (acc.includes(axis) ? acc : acc + axis),
          existing,
        );
      obj.userData.absoluteTranslationSpace = "local";
    }
    // Cat/Ocelot tails animate `tail3.ty/tail3.tz` as absolute origin values
    // (e.g. ty=-9, tz=9), so treat Y/Z as absolute and use a 0px Y origin.
    if (obj.name === "tail3" && obj.parent?.name === "body") {
      const existing =
        typeof obj.userData.absoluteTranslationAxes === "string"
          ? (obj.userData.absoluteTranslationAxes as string)
          : "";
      const want = "yz";
      obj.userData.absoluteTranslationAxes = want
        .split("")
        .reduce(
          (acc, axis) => (acc.includes(axis) ? acc : acc + axis),
          existing,
        );
      obj.userData.cemYOriginPx = 0;
    }
    // Quadruped heads in Fresh Animations are commonly authored in "rotationPoint"
    // space (values include large baseline constants like `-20`), so treat head2
    // translations as absolute origin coordinates. Body-rotation rigs are handled
    // separately above.
    if (isQuadruped && obj.name === "head2" && obj.parent?.name === "body") {
      const isBodyRotationRig =
        Array.isArray(obj.parent?.children) &&
        obj.parent.children.some((c) => c.name === "body_rotation");
      if (!isBodyRotationRig && hasNegativeHead2TyBaseline) {
        const existing =
          typeof obj.userData.absoluteTranslationAxes === "string"
            ? (obj.userData.absoluteTranslationAxes as string)
            : "";
        const want = "xyz";
        obj.userData.absoluteTranslationAxes = want
          .split("")
          .reduce(
            (acc, axis) => (acc.includes(axis) ? acc : acc + axis),
            existing,
          );
        obj.userData.cemYOriginPx = 0;
      }
    }
  });

  log.hierarchy(root);
  return root;
}

/**
 * Apply a parent map to reparent bones while preserving world transforms.
 * Used by both extracted hierarchies and heuristic-based hierarchies.
 */
function applyParentMap(
  root: THREE.Group,
  rootGroups: Record<string, THREE.Group>,
  parentMap: Record<string, string>,
  animatedBones: Set<string>,
  referencedBonesByTarget: Map<string, Set<string>>,
  referencedTranslationBonesByTarget: Map<string, Set<string>>,
  skipSafetyChecks = false,
): void {
  root.updateMatrixWorld(true);

  const reparentPreserveWorld = (
    child: THREE.Object3D,
    parent: THREE.Object3D,
  ) => {
    child.updateMatrixWorld(true);
    const worldMatrix = child.matrixWorld.clone();

    parent.add(child);
    parent.updateMatrixWorld(true);

    const parentInv = parent.matrixWorld.clone().invert();
    const localMatrix = worldMatrix.clone().premultiply(parentInv);
    localMatrix.decompose(child.position, child.quaternion, child.scale);
  };

  const getAncestorChain = (name: string): string[] => {
    const chain: string[] = [];
    let cur: string | undefined = name;
    while (cur) {
      chain.push(cur);
      cur = parentMap[cur];
    }
    return chain;
  };

  for (const [childName, parentName] of Object.entries(parentMap)) {
    const child = rootGroups[childName];
    const parent = rootGroups[parentName];
    if (!child || !parent) continue;
    if (child.parent === parent) continue;

    // For extracted hierarchies from Minecraft code, skip safety checks
    // since we know the hierarchy is correct
    if (!skipSafetyChecks) {
      // If the child animation already references any would-be ancestor transforms,
      // re-parenting would double-apply those transforms (common in Fresh Animations).
      const childRefs = referencedBonesByTarget.get(childName);
      const ancestors = getAncestorChain(parentName);
      const childReferencesAncestor =
        animatedBones.has(childName) &&
        !!childRefs &&
        ancestors.some((a) => childRefs.has(a));
      if (childReferencesAncestor) continue;

      // If the parent drives its own translations from the child's translations,
      // parenting the child under the parent will double-apply translations.
      const parentTranslationRefs =
        referencedTranslationBonesByTarget.get(parentName);
      if (parentTranslationRefs?.has(childName)) continue;
    }

    // Mark these as vanilla skeleton parts for animation semantics.
    child.userData.vanillaPart = true;
    parent.userData.vanillaPart = true;

    reparentPreserveWorld(child, parent);
  }
}

/**
 * Re-parent common vanilla parts into their implicit hierarchy while preserving
 * world transforms. This aligns our scene graph with OptiFine/Minecraft's
 * built-in skeleton so animation translations are applied in the right space.
 */
function applyVanillaHierarchy(
  root: THREE.Group,
  rootGroups: Record<string, THREE.Group>,
  animatedBones: Set<string>,
  referencedBonesByTarget: Map<string, Set<string>>,
  referencedTranslationBonesByTarget: Map<string, Set<string>>,
  entityId?: string,
): void {
  // First, check if we have extracted hierarchy data for this entity from Minecraft's code
  // This is the preferred source of truth for parent-child relationships
  if (entityId) {
    const extractedHierarchy = VANILLA_HIERARCHIES[entityId as keyof typeof VANILLA_HIERARCHIES];
    if (extractedHierarchy && Object.keys(extractedHierarchy).length > 0) {
      // Build parentMap from extracted hierarchy
      // Format: { bone: parent } where parent is null for root bones
      const parentMap: Record<string, string> = {};
      for (const [bone, parent] of Object.entries(extractedHierarchy)) {
        if (parent !== null && rootGroups[bone] && rootGroups[parent]) {
          parentMap[bone] = parent;
        }
      }

      if (Object.keys(parentMap).length > 0) {
        applyParentMap(root, rootGroups, parentMap, animatedBones, referencedBonesByTarget, referencedTranslationBonesByTarget);
        return;
      }
    }
  }

  // Fall back to heuristic-based hierarchy for models without extracted data
  const hasBody = !!rootGroups.body;
  if (!hasBody) return;

  const hasMeshDescendant = (obj: THREE.Object3D): boolean => {
    let hasMesh = false;
    obj.traverse((child) => {
      if (child !== obj && (child as any).isMesh === true) hasMesh = true;
    });
    return hasMesh;
  };

  const hasArms = !!rootGroups.left_arm && !!rootGroups.right_arm;
  const hasLegs = !!rootGroups.left_leg && !!rootGroups.right_leg;
  const hasVillagerArms = !!rootGroups.arms;
  const hasVillagerLegs = !!rootGroups.left_leg && !!rootGroups.right_leg;

  // Vanilla biped-style skeletons (body + arms + legs)
  const hasHumanoidLimbs = hasArms && hasLegs;

  // Flying/humanoid-lite skeletons (body + arms, but no legs)
  const hasArmsOnly = hasArms && !hasLegs;

  // Villager-style skeletons (body + arms + legs, but arms are a single bone)
  const hasVillagerLimbs = hasVillagerArms && hasVillagerLegs;

  const hasQuadrupedLegs =
    !!rootGroups.leg1 &&
    !!rootGroups.leg2 &&
    !!rootGroups.leg3 &&
    !!rootGroups.leg4;
  const hasDirectionalLegs =
    !!rootGroups.front_left_leg &&
    !!rootGroups.front_right_leg &&
    !!rootGroups.back_left_leg &&
    !!rootGroups.back_right_leg;
  const isQuadruped = hasQuadrupedLegs || hasDirectionalLegs;

  let parentMap: Record<string, string>;

  if (hasHumanoidLimbs) {
    // For CEM/JPM animation, Fresh Animations commonly authors body motion
    // (translations/rotations) as offsets relative to the limbs, and drives
    // attachments via explicit cross-bone references instead of relying on an
    // inherited hierarchy. Only re-parent true overlays to their base bones.
    parentMap = {
      ...(rootGroups.headwear ? { headwear: "head" } : {}),
      jacket: "body",
      left_ear: "head",
      right_ear: "head",
      left_sleeve: "left_arm",
      right_sleeve: "right_arm",
      left_pants: "left_leg",
      right_pants: "right_leg",
    };
  } else if (hasArmsOnly) {
    // Allay/Vex-style rigs: animations expect arms to inherit body motion via hierarchy.
    parentMap = {
      left_arm: "body",
      right_arm: "body",
    };
  } else if (hasVillagerLimbs) {
    // Villager rigs are authored with an empty `head` bone and put the actual
    // head cubes in `headwear` as a separate root part. Animations target
    // `head.*`, so swap the names to animate the real head geometry without
    // forcing a hard-coded pivot translation.
    if (rootGroups.head && rootGroups.headwear) {
      const head = rootGroups.head;
      const headwear = rootGroups.headwear;
      if (!hasMeshDescendant(head) && hasMeshDescendant(headwear)) {
        let pivotName = "head_pivot";
        while (rootGroups[pivotName]) pivotName = `${pivotName}_`;
        head.name = pivotName;
        rootGroups[pivotName] = head;
        delete rootGroups.head;

        headwear.name = "head";
        rootGroups.head = headwear;
        delete rootGroups.headwear;
      }
    }

    // Villager rigs rely on the vanilla head attachments hierarchy so facial
    // overlays inherit head motion.
    parentMap = {
      ...(rootGroups.headwear ? { headwear: "head" } : {}),
      ...(rootGroups.nose ? { nose: "head" } : {}),
    };
  } else if (isQuadruped) {
    // Quadruped overlays (e.g. horse saddle) are authored as separate root parts
    // but should inherit body motion via the vanilla hierarchy.
    parentMap = {
      saddle: "body",
    };
  } else {
    // No heuristic-based hierarchy applies - extracted hierarchies are handled above
    return;
  }

  // Apply the heuristic-based parent map
  // Skip safety checks for arms-only and villager rigs as they rely on specific inheritance
  const skipChecks = hasArmsOnly || hasVillagerLimbs;
  applyParentMap(root, rootGroups, parentMap, animatedBones, referencedBonesByTarget, referencedTranslationBonesByTarget, skipChecks);
}

/**
 * Convert a parsed part to Three.js.
 *
 * Blockbench's outliner.js (bone_rig mode, lines 821-827):
 *   mesh.position.set(element.origin[0], element.origin[1], element.origin[2])
 *   if (element.parent instanceof OutlinerNode) {
 *     mesh.position.x -= element.parent.origin[0];
 *     mesh.position.y -= element.parent.origin[1];
 *     mesh.position.z -= element.parent.origin[2];
 *   }
 *
 * So: localPosition = origin - parentOrigin (for children)
 *     localPosition = origin (for root)
 */
function convertPart(
  part: ParsedPart,
  texture: THREE.Texture | null,
  textureMap: Record<string, THREE.Texture>,
  materialCache: Map<string, THREE.MeshStandardMaterial>,
  parentOrigin: [number, number, number] | null,
): THREE.Group {
  const group = new THREE.Group();
  group.name = part.name;
  if (part.invertAxis) {
    group.userData.invertAxis = part.invertAxis;
  }
  group.userData.originPx = [...part.origin];

  // Calculate local position
  // ROOT: position = origin
  // CHILD: position = origin - parentOrigin
  let localX: number, localY: number, localZ: number;

  if (parentOrigin === null) {
    localX = part.origin[0] / PIXELS_PER_UNIT;
    localY = part.origin[1] / PIXELS_PER_UNIT;
    localZ = part.origin[2] / PIXELS_PER_UNIT;
  } else {
    localX = (part.origin[0] - parentOrigin[0]) / PIXELS_PER_UNIT;
    localY = (part.origin[1] - parentOrigin[1]) / PIXELS_PER_UNIT;
    localZ = (part.origin[2] - parentOrigin[2]) / PIXELS_PER_UNIT;
  }

  group.position.set(localX, localY, localZ);
  group.userData.restPosition = new THREE.Vector3(localX, localY, localZ);
  log.convert(part.name, part.origin, parentOrigin, [localX, localY, localZ]);

  // Rotation
  group.rotation.order = "ZYX";
  group.rotation.set(
    THREE.MathUtils.degToRad(part.rotation[0]),
    THREE.MathUtils.degToRad(part.rotation[1]),
    THREE.MathUtils.degToRad(part.rotation[2]),
  );

  // Scale
  if (part.scale !== 1.0) group.scale.setScalar(part.scale);

  // Add boxes
  // After parsing, box coords are already adjusted (for non-root: coords += origin)
  // Now we need to position meshes in the group's local space.
  //
  // For ROOT groups: mesh position = boxCenter - origin
  //   Because boxes are in world coords, and group is at origin
  //
  // For NON-ROOT groups: mesh position = boxCenter - origin
  //   Because boxes were adjusted to world coords (rawBox + origin),
  //   and group is at origin in world space.
  //   So: adjustedCenter - origin = (rawCenter + origin) - origin = rawCenter
  //
  // Wait, that means for non-root, mesh should be at rawCenter!
  // Let me reconsider...
  //
  // Actually, looking at Blockbench's cube.js updateGeometry (lines 1154-1193):
  //   from.forEach((v, i) => { from[i] -= element.origin[i]; })
  //   to.forEach((v, i) => { to[i] -= element.origin[i]; })
  //
  // So Blockbench subtracts the element's origin from box coords when building geometry!
  // This means the mesh is centered at (0,0,0) in local space, offset by (from+to)/2 - origin.
  //
  // Combined with the parsing adjustment:
  // - Parsing: adjustedBox = rawBox + groupOrigin (for non-root)
  // - Geometry: meshPos = adjustedBoxCenter - groupOrigin
  //           = (rawBoxCenter + groupOrigin) - groupOrigin = rawBoxCenter
  //
  // So for non-root, mesh ends up at rawBoxCenter!
  // For root, no parsing adjustment, so mesh = rawBoxCenter - origin.
  //
  // This makes sense - the group handles world positioning, boxes are in local space.

  const partTexture = textureMap[part.texturePath] ?? texture;

  // Keep meshes for this part's own boxes in a dedicated subgroup so CEM
  // animations can toggle `visible_boxes` without hiding child bones.
  const boxesGroup = new THREE.Group();
  // Do not name this group; it should not be addressable as a bone.
  group.userData.boxesGroup = boxesGroup;
  group.add(boxesGroup);

  for (let i = 0; i < part.boxes.length; i++) {
    const box = part.boxes[i];
    const mesh = createBoxMesh(
      box,
      partTexture,
      materialCache,
      part.origin,
      part.name,
      i,
    );
    if (mesh) boxesGroup.add(mesh);
  }

  // Children
  for (const child of part.children) {
    group.add(
      convertPart(child, texture, textureMap, materialCache, part.origin),
    );
  }

  return group;
}

function createBoxMesh(
  box: ParsedBox,
  texture: THREE.Texture | null,
  materialCache: Map<string, THREE.MeshStandardMaterial>,
  groupOrigin: [number, number, number],
  partName: string,
  boxIdx: number,
): THREE.Mesh | null {
  const { from, to } = box;
  const textureSize = box.textureSize;

  // Blockbench expands 0-sized dimensions slightly (cube.js updateGeometry):
  //   if (from[i] === to[i]) to[i] += 0.001
  // This prevents degenerate geometry and allows distinct UVs per face
  // (e.g. planes with different east/west UVs like allay wings).
  const rawWidthPx = to[0] - from[0];
  const rawHeightPx = to[1] - from[1];
  const rawDepthPx = to[2] - from[2];
  if (rawWidthPx < 0 || rawHeightPx < 0 || rawDepthPx < 0) return null;
  if (rawWidthPx === 0 && rawHeightPx === 0 && rawDepthPx === 0) return null;
  // Treat "inflated planes" (size=0 with sizeAdd>0) as planar for rendering.
  // Fresh Animations frequently uses a tiny inflate to prevent z-fighting while
  // still expecting the part to be visible from both sides.
  const inflatePx = box.inflate ?? 0;
  const originalWidthPx = rawWidthPx - inflatePx * 2;
  const originalHeightPx = rawHeightPx - inflatePx * 2;
  const originalDepthPx = rawDepthPx - inflatePx * 2;
  const PLANAR_EPS_PX = 1e-6;
  const isPlanar =
    Math.abs(originalWidthPx) <= PLANAR_EPS_PX ||
    Math.abs(originalHeightPx) <= PLANAR_EPS_PX ||
    Math.abs(originalDepthPx) <= PLANAR_EPS_PX;

  // For planar boxes, OptiFine/Blockbench rigs frequently only specify one of the
  // opposing faces (e.g. `uvNorth` for a 0-depth plane). Blockbench still
  // renders these from both sides in practice, so duplicate the UV to the
  // opposite face to preserve expected two-sided appearance.
  if (isPlanar) {
    const uv = box.uv;
    const isZero = (r: [number, number, number, number]) => r.every((v) => v === 0);
    const planarAxis =
      Math.abs(originalWidthPx) <= PLANAR_EPS_PX
        ? "x"
        : Math.abs(originalHeightPx) <= PLANAR_EPS_PX
          ? "y"
          : "z";
    if (planarAxis === "x") {
      if (!isZero(uv.east) && isZero(uv.west)) uv.west = [...uv.east];
      if (!isZero(uv.west) && isZero(uv.east)) uv.east = [...uv.west];
    } else if (planarAxis === "y") {
      if (!isZero(uv.up) && isZero(uv.down)) uv.down = [...uv.up];
      if (!isZero(uv.down) && isZero(uv.up)) uv.up = [...uv.down];
    } else {
      if (!isZero(uv.north) && isZero(uv.south)) uv.south = [...uv.north];
      if (!isZero(uv.south) && isZero(uv.north)) uv.north = [...uv.south];
    }
  }

  const fromPx: [number, number, number] = [...from];
  const toPx: [number, number, number] = [...to];

  const EPSILON_PX = 0.001;
  if (rawWidthPx === 0) toPx[0] += EPSILON_PX;
  if (rawHeightPx === 0) toPx[1] += EPSILON_PX;
  if (rawDepthPx === 0) toPx[2] += EPSILON_PX;

  const width = (toPx[0] - fromPx[0]) / PIXELS_PER_UNIT;
  const height = (toPx[1] - fromPx[1]) / PIXELS_PER_UNIT;
  const depth = (toPx[2] - fromPx[2]) / PIXELS_PER_UNIT;

  // Create geometry
  const geometry = new THREE.BoxGeometry(width, height, depth);

  // Apply UVs
  applyUVs(geometry, box.uv, textureSize);

  // Hide faces that aren't defined in JEM (Blockbench does this via updateFaces).
  // In our parsed format, missing faces are represented as [0,0,0,0] UVs.
  const faces: { name: keyof ParsedBox["uv"]; index: number }[] = [
    { name: "east", index: 0 },
    { name: "west", index: 1 },
    { name: "up", index: 2 },
    { name: "down", index: 3 },
    { name: "south", index: 4 },
    { name: "north", index: 5 },
  ];
  const hasDisabledFaces = faces.some((face) =>
    box.uv[face.name].every((v) => v === 0),
  );
  if (hasDisabledFaces) {
    const originalIndex = geometry.index;
    if (!originalIndex) return null;
    const src = Array.from(originalIndex.array as ArrayLike<number>);

    const indices: number[] = [];
    for (const face of faces) {
      const faceUV = box.uv[face.name];
      if (!faceUV || faceUV.every((v) => v === 0)) continue;
      const start = face.index * 6;
      indices.push(
        src[start + 0],
        src[start + 1],
        src[start + 2],
        src[start + 3],
        src[start + 4],
        src[start + 5],
      );
    }
    if (indices.length === 0) return null;
    geometry.setIndex(indices);
  }

  // Material
  //
  // Minecraft entity rendering effectively treats quads as double-sided for many
  // model parts (and resource packs frequently use 0-width "planes" for details).
  // To keep behavior consistent and avoid per-entity exceptions, default to
  // DoubleSide for all entity model meshes.
  const side = isPlanar ? THREE.DoubleSide : THREE.FrontSide;
  const texKey = texture ? texture.uuid : "null";
  const cacheKey = `${texKey}:${side === THREE.DoubleSide ? "double" : "front"}`;
  let material = materialCache.get(cacheKey);
  if (!material) {
    material = texture
      ? new THREE.MeshStandardMaterial({
          map: texture,
          // Minecraft entity rendering is predominantly cutout (not blended).
          // Keeping `transparent=false` avoids Three.js transparent sorting issues
          // that cause z-order artifacts when layering multiple entity groups.
          transparent: false,
          alphaTest: 0.1,
          side,
        })
      : new THREE.MeshStandardMaterial({
          color: 0x8b4513,
          side,
        });
    materialCache.set(cacheKey, material);
  }

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `${partName}_box${boxIdx}`;

  // Position mesh in group's local space
  // Blockbench subtracts origin from box coords: mesh = boxCenter - origin
  const centerX = (fromPx[0] + toPx[0]) / 2;
  const centerY = (fromPx[1] + toPx[1]) / 2;
  const centerZ = (fromPx[2] + toPx[2]) / 2;

  const meshX = (centerX - groupOrigin[0]) / PIXELS_PER_UNIT;
  const meshY = (centerY - groupOrigin[1]) / PIXELS_PER_UNIT;
  const meshZ = (centerZ - groupOrigin[2]) / PIXELS_PER_UNIT;

  mesh.position.set(meshX, meshY, meshZ);
  log.mesh(
    partName,
    boxIdx,
    [centerX, centerY, centerZ],
    [meshX, meshY, meshZ],
  );

  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

// ============================================================================
// UV MAPPING
// ============================================================================

function applyUVs(
  geometry: THREE.BoxGeometry,
  uv: ParsedBox["uv"],
  textureSize: [number, number],
): void {
  const [texWidth, texHeight] = textureSize;
  const uvAttr = geometry.attributes.uv;
  if (!uvAttr) return;

  // Blockbench applies a tiny inset for box-UV mapped entity textures to avoid
  // sampling exactly on pixel boundaries, which can cause Nearest sampling to
  // "spill" into adjacent texels (especially noticeable on thin/flat boxes).
  const BLEED_MARGIN_PX = 1 / 64;

  const faces: { name: keyof typeof uv; index: number }[] = [
    { name: "east", index: 0 },
    { name: "west", index: 1 },
    { name: "up", index: 2 },
    { name: "down", index: 3 },
    { name: "south", index: 4 },
    { name: "north", index: 5 },
  ];

  for (const face of faces) {
    const faceUV = uv[face.name];
    if (!faceUV || faceUV.every((v) => v === 0)) continue;

    let [u1, v1, u2, v2] = faceUV;

    // Fight texture bleeding by nudging UVs slightly inwards, respecting
    // reversed rectangles (e.g. u2 < u1 for mirrored faces).
    if (u1 !== u2) {
      const marginU = u1 > u2 ? -BLEED_MARGIN_PX : BLEED_MARGIN_PX;
      u1 += marginU;
      u2 -= marginU;
    }
    if (v1 !== v2) {
      const marginV = v1 > v2 ? -BLEED_MARGIN_PX : BLEED_MARGIN_PX;
      v1 += marginV;
      v2 -= marginV;
    }

    let uvU1 = u1 / texWidth,
      uvV1 = 1 - v1 / texHeight;
    let uvU2 = u2 / texWidth,
      uvV2 = 1 - v2 / texHeight;

    const base = face.index * 4;
    uvAttr.setXY(base + 0, uvU1, uvV1);
    uvAttr.setXY(base + 1, uvU2, uvV1);
    uvAttr.setXY(base + 2, uvU1, uvV2);
    uvAttr.setXY(base + 3, uvU2, uvV2);
  }

  uvAttr.needsUpdate = true;
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

    const mergedTexturePath = variantPart.texturePath || basePart.texturePath;
    const mergedTextureSize = variantPart.textureSize || basePart.textureSize;

    const mergedBoxes = basePart.boxes.map((baseBox, idx) => {
      const rawVariantModel = variantJemData.models?.find(
        (m) => m.part === basePart.name || m.id === basePart.name,
      );
      const rawVariantBox = rawVariantModel?.boxes?.[idx];

      let variantUV = baseBox.uv;
      let variantBoxSize: [number, number] | undefined;

      if (rawVariantBox) {
        if (
          rawVariantBox.uvNorth ||
          rawVariantBox.uvEast ||
          rawVariantBox.uvSouth ||
          rawVariantBox.uvWest ||
          rawVariantBox.uvUp ||
          rawVariantBox.uvDown
        ) {
          variantUV = {
            east: rawVariantBox.uvEast || baseBox.uv.east,
            west: rawVariantBox.uvWest || baseBox.uv.west,
            up: rawVariantBox.uvUp || baseBox.uv.up,
            down: rawVariantBox.uvDown || baseBox.uv.down,
            south: rawVariantBox.uvSouth || baseBox.uv.south,
            north: rawVariantBox.uvNorth || baseBox.uv.north,
          };
        } else if (rawVariantBox.textureOffset) {
          const w = baseBox.to[0] - baseBox.from[0];
          const h = baseBox.to[1] - baseBox.from[1];
          const d = baseBox.to[2] - baseBox.from[2];
          variantUV = calculateBoxUV(
            rawVariantBox.textureOffset[0],
            rawVariantBox.textureOffset[1],
            w,
            h,
            d,
            basePart.mirrorUV,
          );
        }
        if (rawVariantBox.textureSize) {
          variantBoxSize = rawVariantBox.textureSize;
        }
      }

      const inheritedBoxSize =
        baseBox.textureSize[0] === basePart.textureSize[0] &&
        baseBox.textureSize[1] === basePart.textureSize[1]
          ? mergedTextureSize
          : baseBox.textureSize;

      return {
        ...baseBox,
        uv: variantUV,
        texturePath: mergedTexturePath,
        textureSize: variantBoxSize ?? inheritedBoxSize,
      };
    });

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
    const name = modelPart.id || modelPart.part;
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
    `${prefix}${group.name || "(unnamed)"} pos:[${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)}] rot:[${THREE.MathUtils.radToDeg(r.x).toFixed(1)}°, ${THREE.MathUtils.radToDeg(r.y).toFixed(1)}°, ${THREE.MathUtils.radToDeg(r.z).toFixed(1)}°]`,
  );
  group.children.forEach((c) => logHierarchy(c, indent + 1));
}
