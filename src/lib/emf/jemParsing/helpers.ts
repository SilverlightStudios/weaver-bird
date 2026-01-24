/**
 * Helper utilities for JEM parsing
 */

import type {
  JEMModelPart,
  JEMBox,
  ParseOptions,
  ParsedPart,
  ParsedBox,
} from "../jemLoader";

const DEBUG_JEM = false;

const fmt = (v: number[], d = 2): string =>
  `[${v.map((n) => n.toFixed(d)).join(", ")}]`;

export const log = {
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
};

/**
 * Calculate origin based on depth and parent origin
 */
export function calculateOrigin(
  translate: [number, number, number],
  hasTranslate: boolean,
  depth: number,
  parentOrigin: [number, number, number] | null,
  isJpm: boolean,
): [number, number, number] {
  const isRoot = depth === 0;

  if (isRoot) {
    return isJpm
      ? hasTranslate
        ? [...translate]
        : [0, 0, 0]
      : [-translate[0], -translate[1], -translate[2]];
  }

  if (depth === 1) {
    return hasTranslate ? [...translate] : [0, 0, 0];
  }

  if (parentOrigin) {
    return [
      translate[0] + parentOrigin[0],
      translate[1] + parentOrigin[1],
      translate[2] + parentOrigin[2],
    ];
  }

  return [...translate];
}

/**
 * Parse boxes for a model part
 */
export function parseBoxes(
  boxes: JEMBox[] | undefined,
  mirrorUV: boolean,
  origin: [number, number, number],
  isRoot: boolean,
  isJpm: boolean,
  effectiveTexturePath: string,
  effectiveTextureSize: [number, number],
  name: string,
  depth: number,
  parseBox: (
    box: JEMBox,
    mirrorUV: boolean,
    origin: [number, number, number],
    isRoot: boolean,
    isJpm: boolean,
    effectiveTexturePath: string,
    effectiveTextureSize: [number, number],
    name: string,
    depth: number,
  ) => ParsedBox | null,
): ParsedBox[] {
  if (!boxes) return [];

  const parsed: ParsedBox[] = [];
  for (const box of boxes) {
    const result = parseBox(
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
    if (result) parsed.push(result);
  }
  return parsed;
}

/**
 * Recursively parse child submodels
 */
export function parseChildren(
  part: JEMModelPart,
  effectiveTexturePath: string,
  effectiveTextureSize: [number, number],
  depth: number,
  origin: [number, number, number],
  options: ParseOptions,
  parseModelPart: (
    part: JEMModelPart,
    effectiveTexturePath: string,
    effectiveTextureSize: [number, number],
    depth: number,
    origin: [number, number, number],
    options: ParseOptions,
  ) => ParsedPart,
): ParsedPart[] {
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

  return children;
}
