/**
 * JEM Parsing - Core logic for parsing OptiFine Entity Models
 */

import type {
  JEMModelPart,
  JEMBox,
  ParseOptions,
  ParsedPart,
  ParsedBox,
} from "./jemLoader";
import { log, calculateOrigin, parseBoxes, parseChildren } from "./jemParsing/helpers";

export function parseModelPart(
  part: JEMModelPart,
  inheritedTexturePath: string,
  inheritedTextureSize: [number, number],
  depth: number,
  parentOrigin: [number, number, number] | null,
  options: ParseOptions,
): ParsedPart {
  const name = part.id ?? part.part ?? "unnamed";
  const { invertAxis } = part;
  const hasTranslate = Array.isArray(part.translate);
  const translate: [number, number, number] = hasTranslate
    ? [...(part.translate as [number, number, number])]
    : [0, 0, 0];
  const isRoot = depth === 0;
  const isJpm = options.isJpm === true;

  const origin = calculateOrigin(translate, hasTranslate, depth, parentOrigin, isJpm);
  log.parse(name, depth, translate, origin, isRoot);

  const rotation: [number, number, number] = part.rotate ? [...part.rotate] : [0, 0, 0];
  const scale = part.scale ?? 1.0;
  const mirrorUV = part.mirrorTexture?.includes("u") ?? false;

  const effectiveTexturePath = part.texture ?? inheritedTexturePath;
  const effectiveTextureSize = part.textureSize ?? inheritedTextureSize;

  const boxes = parseBoxes(
    part.boxes,
    mirrorUV,
    origin,
    isRoot,
    isJpm,
    effectiveTexturePath,
    effectiveTextureSize,
    name,
    depth,
    parseBox,
  );

  const children = parseChildren(
    part,
    effectiveTexturePath,
    effectiveTextureSize,
    depth,
    origin,
    options,
    parseModelPart,
  );

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

function calculateUVFromBox(
  box: JEMBox,
  width: number,
  height: number,
  boxDepth: number,
  mirrorUV: boolean,
): ParsedBox["uv"] {
  const hasPerFaceUV =
    box.uvNorth ??
    box.uvEast ??
    box.uvSouth ??
    box.uvWest ??
    box.uvUp ??
    box.uvDown;

  if (hasPerFaceUV) {
    return {
      north: box.uvNorth ?? [0, 0, 0, 0],
      east: box.uvEast ?? [0, 0, 0, 0],
      south: box.uvSouth ?? [0, 0, 0, 0],
      west: box.uvWest ?? [0, 0, 0, 0],
      up: box.uvUp ?? [0, 0, 0, 0],
      down: box.uvDown ?? [0, 0, 0, 0],
    };
  }

  if (box.textureOffset) {
    return calculateBoxUV(
      box.textureOffset[0],
      box.textureOffset[1],
      width,
      height,
      boxDepth,
      mirrorUV,
    );
  }

  return {
    north: [0, 0, 1, 1],
    east: [0, 0, 1, 1],
    south: [0, 0, 1, 1],
    west: [0, 0, 1, 1],
    up: [0, 0, 1, 1],
    down: [0, 0, 1, 1],
  };
}

export function parseBox(
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
  const inflate = box.sizeAdd ?? 0;
  const EPS = 1e-6;
  const zeroX = Math.abs(width) < EPS;
  const zeroY = Math.abs(height) < EPS;
  const zeroZ = Math.abs(boxDepth) < EPS;
  const zeroCount = (zeroX ? 1 : 0) + (zeroY ? 1 : 0) + (zeroZ ? 1 : 0);

  if (zeroCount >= 2) return null;
  const planarAxis = zeroCount === 1 ? (zeroX ? "x" : zeroY ? "y" : "z") : undefined;

  const rawFrom: [number, number, number] = [x - inflate, y - inflate, z - inflate];
  const rawTo: [number, number, number] = [
    x + width + inflate,
    y + height + inflate,
    z + boxDepth + inflate,
  ];

  let from: [number, number, number];
  let to: [number, number, number];

  if (!isRootGroup || isJpm) {
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
    from = [...rawFrom];
    to = [...rawTo];
  }

  log.box(partName, depth, rawFrom, rawTo, from, to);

  const uv = calculateUVFromBox(box, width, height, boxDepth, mirrorUV);
  const boxTextureSize = box.textureSize ?? textureSize;

  return {
    from,
    to,
    planarAxis,
    uv,
    mirror: mirrorUV,
    inflate,
    texturePath,
    textureSize: boxTextureSize,
  };
}

export function calculateBoxUV(
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
