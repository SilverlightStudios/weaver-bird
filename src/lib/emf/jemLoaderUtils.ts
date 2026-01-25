/**
 * Utility functions for JEM loading and merging
 */

import type { ParsedBox, JEMFile } from "./jemLoader";
import { calculateBoxUV } from "./jemParsing";

type BoxUV = {
  east: [number, number, number, number];
  west: [number, number, number, number];
  up: [number, number, number, number];
  down: [number, number, number, number];
  south: [number, number, number, number];
  north: [number, number, number, number];
};

/**
 * Check if a raw variant box has custom per-face UV mapping
 */
function hasCustomFaceUVs(rawVariantBox: {
  uvNorth?: [number, number];
  uvEast?: [number, number];
  uvSouth?: [number, number];
  uvWest?: [number, number];
  uvUp?: [number, number];
  uvDown?: [number, number];
}): boolean {
  return !!(
    rawVariantBox.uvNorth ??
    rawVariantBox.uvEast ??
    rawVariantBox.uvSouth ??
    rawVariantBox.uvWest ??
    rawVariantBox.uvUp ??
    rawVariantBox.uvDown
  );
}

/**
 * Build merged UV mapping from variant and base box
 */
function buildMergedUV(
  rawVariantBox: {
    uvNorth?: [number, number];
    uvEast?: [number, number];
    uvSouth?: [number, number];
    uvWest?: [number, number];
    uvUp?: [number, number];
    uvDown?: [number, number];
  },
  baseUV: BoxUV,
): BoxUV {
  return {
    east: rawVariantBox.uvEast ?? baseUV.east,
    west: rawVariantBox.uvWest ?? baseUV.west,
    up: rawVariantBox.uvUp ?? baseUV.up,
    down: rawVariantBox.uvDown ?? baseUV.down,
    south: rawVariantBox.uvSouth ?? baseUV.south,
    north: rawVariantBox.uvNorth ?? baseUV.north,
  };
}

/**
 * Calculate UV from texture offset
 */
function calculateUVFromOffset(
  rawVariantBox: { textureOffset: [number, number] },
  baseBox: ParsedBox,
  partMirrorUV: boolean | undefined,
): BoxUV {
  const w = baseBox.to[0] - baseBox.from[0];
  const h = baseBox.to[1] - baseBox.from[1];
  const d = baseBox.to[2] - baseBox.from[2];
  return calculateBoxUV(
    rawVariantBox.textureOffset[0],
    rawVariantBox.textureOffset[1],
    w,
    h,
    d,
    partMirrorUV,
  );
}

/**
 * Merge a single box from base and variant models
 */
export function mergeBox(
  baseBox: ParsedBox,
  idx: number,
  basePartName: string,
  basePart: { textureSize: [number, number]; mirrorUV: boolean | undefined },
  variantJemData: JEMFile,
  mergedTexturePath: string,
  mergedTextureSize: [number, number],
): ParsedBox {
  // Find the variant model for this part
  const rawVariantModel = variantJemData.models?.find(
    (m) => m.part === basePartName || m.id === basePartName,
  );
  const rawVariantBox = rawVariantModel?.boxes?.[idx];

  let variantUV = baseBox.uv;
  let variantBoxSize: [number, number] | undefined;

  // Apply variant UV or texture offset if present
  if (rawVariantBox) {
    if (hasCustomFaceUVs(rawVariantBox)) {
      variantUV = buildMergedUV(rawVariantBox, baseBox.uv);
    } else if (rawVariantBox.textureOffset) {
      variantUV = calculateUVFromOffset(rawVariantBox, baseBox, basePart.mirrorUV);
    }
    if (rawVariantBox.textureSize) {
      variantBoxSize = rawVariantBox.textureSize;
    }
  }

  // Inherit texture size from merged part if box uses part's size
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
}
