import type * as THREE from "three";
import type { ParsedBox } from "./jemLoader";

/**
 * Apply UV coordinates to a box geometry
 */
export function applyUVs(
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

    const uvU1 = u1 / texWidth,
      uvV1 = 1 - v1 / texHeight;
    const uvU2 = u2 / texWidth,
      uvV2 = 1 - v2 / texHeight;

    const base = face.index * 4;
    uvAttr.setXY(base + 0, uvU1, uvV1);
    uvAttr.setXY(base + 1, uvU2, uvV1);
    uvAttr.setXY(base + 2, uvU1, uvV2);
    uvAttr.setXY(base + 3, uvU2, uvV2);
  }

  uvAttr.needsUpdate = true;
}
