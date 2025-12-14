import * as THREE from "three";

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

  const materialCache = new Map<
    THREE.Texture | null,
    THREE.MeshStandardMaterial
  >();

  const rootGroups: Record<string, THREE.Group> = {};
  for (const part of model.parts) {
    const group = convertPart(part, texture, textureMap, materialCache, null);
    root.add(group);
    rootGroups[group.name] = group;
  }

  // Mark translation semantics for common vanilla parts.
  // Legs: absolute rotationPoint on all axes (Fresh Animations uses full pivot values).
  for (const limbName of ["left_leg", "right_leg"]) {
    const limb = rootGroups[limbName];
    if (limb) limb.userData.absoluteTranslationAxes = "xyz";
  }
  // Arms: humanoid rigs author tx/ty as absolute rotationPoint values (e.g. ty≈2.5),
  // while small/flying rigs tend to use additive offsets for ty. Use a pivot-height
  // heuristic to distinguish them.
  for (const limbName of ["left_arm", "right_arm"]) {
    const limb = rootGroups[limbName];
    if (!limb) continue;
    const pivotYPx = limb.position.y * PIXELS_PER_UNIT;
    limb.userData.absoluteTranslationAxes = pivotYPx >= 16 ? "xy" : "x";
  }

  // Collect bones that are explicitly animated so we don't re-parent them.
  const animatedBones = new Set<string>();
  if (model.animations) {
    for (const layer of model.animations) {
      for (const property of Object.keys(layer)) {
        const dot = property.indexOf(".");
        if (dot === -1) continue;
        const target = property.slice(0, dot);
        if (target === "var" || target === "render") continue;
        animatedBones.add(target);
      }
    }
  }

  // Apply implicit vanilla hierarchy for common skeletons.
  // Many CEM animations assume vanilla parent-child relationships for non-animated overlays.
  applyVanillaHierarchy(root, rootGroups, animatedBones);

  // Fix translation semantics for specific animated submodels.
  // Eyes in Fresh Animations use absolute tz to pin to head.
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
    }
    // Fresh Animations uses left_eye/right_eye translations as absolute positions
    // (the expressions include the bone's base translate), so treat them as absolute.
    if (
      (obj.name === "left_eye" || obj.name === "right_eye") &&
      obj.parent?.name === "head2"
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

      const parentOriginPx = Array.isArray((obj.parent as any)?.userData?.originPx)
        ? ((obj.parent as any).userData.originPx as [number, number, number])
        : null;
      // Use the parent's origin as the Y origin so absolute-Y becomes a direct
      // CEM->Three conversion (avoids the 24px biped origin logic).
      if (parentOriginPx) obj.userData.cemYOriginPx = parentOriginPx[1];
    }
    // Fresh Animations allay (and similar) uses head2.ty as an absolute origin
    // coordinate (in CEM space), not a local offset.
    if (obj.name === "head2" && obj.parent?.name === "body") {
      const existing =
        typeof obj.userData.absoluteTranslationAxes === "string"
          ? (obj.userData.absoluteTranslationAxes as string)
          : "";
      obj.userData.absoluteTranslationAxes = existing.includes("y")
        ? existing
        : existing + "y";
      obj.userData.cemYOriginPx = 0;
    }
  });

  log.hierarchy(root);
  return root;
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
): void {
  const hasBody = !!rootGroups.body;
  if (!hasBody) return;

  const hasArms = !!rootGroups.left_arm && !!rootGroups.right_arm;
  const hasLegs = !!rootGroups.left_leg && !!rootGroups.right_leg;

  // Vanilla biped-style skeletons (body + arms + legs)
  const hasHumanoidLimbs = hasArms && hasLegs;

  // Flying/humanoid-lite skeletons (body + arms, but no legs)
  const hasArmsOnly = hasArms && !hasLegs;

  let parentMap: Record<string, string>;
  let shouldSkipAnimated: (boneName: string) => boolean;

  if (hasHumanoidLimbs) {
    parentMap = {
      head: "body",
      headwear: "head",
      left_arm: "body",
      right_arm: "body",
      left_leg: "body",
      right_leg: "body",
      jacket: "body",
      left_ear: "head",
      right_ear: "head",
      left_sleeve: "left_arm",
      right_sleeve: "right_arm",
      left_pants: "left_leg",
      right_pants: "right_leg",
    };
    shouldSkipAnimated = (boneName) => animatedBones.has(boneName);
  } else if (hasArmsOnly) {
    // Allay/Vex-style rigs: animations expect arms to inherit body motion via hierarchy.
    parentMap = {
      left_arm: "body",
      right_arm: "body",
    };
    // For arms-only rigs, re-parent the arms even if they are animated.
    shouldSkipAnimated = () => false;
  } else {
    return;
  }

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

  for (const [childName, parentName] of Object.entries(parentMap)) {
    const child = rootGroups[childName];
    const parent = rootGroups[parentName];
    if (!child || !parent) continue;
    if (child.parent === parent) continue;
    if (shouldSkipAnimated(childName)) continue;

    // Mark these as vanilla skeleton parts for animation semantics.
    child.userData.vanillaPart = true;
    parent.userData.vanillaPart = true;

    reparentPreserveWorld(child, parent);
  }
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
  materialCache: Map<THREE.Texture | null, THREE.MeshStandardMaterial>,
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
    if (mesh) group.add(mesh);
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
  materialCache: Map<THREE.Texture | null, THREE.MeshStandardMaterial>,
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
    const indices: number[] = [];
    for (const face of faces) {
      const faceUV = box.uv[face.name];
      if (!faceUV || faceUV.every((v) => v === 0)) continue;
      const base = face.index * 4;
      indices.push(
        base + 0,
        base + 2,
        base + 1,
        base + 2,
        base + 3,
        base + 1,
      );
    }
    if (indices.length === 0) return null;
    geometry.setIndex(indices);
  }

  // Material
  let material = materialCache.get(texture);
  if (!material) {
    material = texture
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
    materialCache.set(texture, material);
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

export function loadJEM(
  jemData: JEMFile,
  texture: THREE.Texture | null = null,
): THREE.Group {
  const parsed = parseJEM(jemData);
  return jemToThreeJS(parsed, texture);
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
