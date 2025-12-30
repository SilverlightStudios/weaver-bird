import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import * as THREE from "three";
import { parseJEM, jemToThreeJS, type JEMFile } from "../jemLoader";

function triangleNormal(
  geometry: THREE.BufferGeometry,
  indexOffset: number,
): THREE.Vector3 {
  const posAttr = geometry.getAttribute(
    "position",
  ) as THREE.BufferAttribute | null;
  const idxAttr = geometry.index as THREE.BufferAttribute | null;
  expect(posAttr).toBeTruthy();
  expect(idxAttr).toBeTruthy();

  const idx = Array.from(idxAttr!.array as ArrayLike<number>);
  const ia = idx[indexOffset + 0];
  const ib = idx[indexOffset + 1];
  const ic = idx[indexOffset + 2];

  const a = new THREE.Vector3().fromBufferAttribute(posAttr!, ia);
  const b = new THREE.Vector3().fromBufferAttribute(posAttr!, ib);
  const c = new THREE.Vector3().fromBufferAttribute(posAttr!, ic);

  const ab = b.clone().sub(a);
  const ac = c.clone().sub(a);
  return ab.cross(ac).normalize();
}

function expectFaceUvRect(
  geometry: THREE.BufferGeometry,
  faceIndex: number,
  rect: [number, number, number, number],
  textureSize: [number, number],
): void {
  const [texWidth, texHeight] = textureSize;
  const uvAttr = geometry.getAttribute("uv") as THREE.BufferAttribute | null;
  expect(uvAttr).toBeTruthy();

  let [u1, v1, u2, v2] = rect;

  // Match `applyUVs` Blockbench-style bleed insetting (1/64 px).
  const margin = 1 / 64;
  if (u1 !== u2) {
    const m = u1 > u2 ? -margin : margin;
    u1 += m;
    u2 -= m;
  }
  if (v1 !== v2) {
    const m = v1 > v2 ? -margin : margin;
    v1 += m;
    v2 -= m;
  }

  const expU1 = u1 / texWidth;
  const expV1 = 1 - v1 / texHeight;
  const expU2 = u2 / texWidth;
  const expV2 = 1 - v2 / texHeight;

  const base = faceIndex * 4;
  expect(uvAttr!.getX(base + 0)).toBeCloseTo(expU1, 6);
  expect(uvAttr!.getY(base + 0)).toBeCloseTo(expV1, 6);
  expect(uvAttr!.getX(base + 3)).toBeCloseTo(expU2, 6);
  expect(uvAttr!.getY(base + 3)).toBeCloseTo(expV2, 6);
}

describe("Fresh Animations (allay) wing UVs", () => {
  it("keeps distinct east/west UVs for 0-width wing planes", () => {
    const jemPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/allay.jem",
    );
    const jem = JSON.parse(readFileSync(jemPath, "utf-8")) as JEMFile;

    const parsed = parseJEM(jem);
    const group = jemToThreeJS(parsed, null, {});

    const leftWingMesh = group.getObjectByName(
      "left_wing3_box0",
    ) as THREE.Mesh | null;
    const rightWingMesh = group.getObjectByName(
      "right_wing3_box0",
    ) as THREE.Mesh | null;
    expect(leftWingMesh).toBeTruthy();
    expect(rightWingMesh).toBeTruthy();

    // Wing boxes are authored as planes; these should render double-sided.
    expect((leftWingMesh!.material as THREE.MeshStandardMaterial).side).toBe(
      THREE.DoubleSide,
    );
    expect((rightWingMesh!.material as THREE.MeshStandardMaterial).side).toBe(
      THREE.DoubleSide,
    );

    const leftGeom = leftWingMesh!.geometry as THREE.BufferGeometry;
    const rightGeom = rightWingMesh!.geometry as THREE.BufferGeometry;

    // With face filtering, only east+west faces should render (2 faces -> 12 indices).
    expect(leftGeom.index?.count).toBe(12);
    expect(rightGeom.index?.count).toBe(12);

    // Face filtering must preserve BoxGeometry’s per-face triangle winding so both
    // sides render (FrontSide culling should work as expected).
    const leftEast = triangleNormal(leftGeom, 0);
    const leftWest = triangleNormal(leftGeom, 6);
    expect(leftEast.x).toBeGreaterThan(0.9);
    expect(leftWest.x).toBeLessThan(-0.9);

    const rightEast = triangleNormal(rightGeom, 0);
    const rightWest = triangleNormal(rightGeom, 6);
    expect(rightEast.x).toBeGreaterThan(0.9);
    expect(rightWest.x).toBeLessThan(-0.9);

    const texSize: [number, number] = [32, 32];

    // left_wing3 JEM box:
    //   uvEast: [32, 22, 24, 27]
    //   uvWest: [24, 22, 16, 27]
    expectFaceUvRect(leftGeom, 0, [32, 22, 24, 27], texSize);
    expectFaceUvRect(leftGeom, 1, [24, 22, 16, 27], texSize);

    // right_wing3 JEM box:
    //   uvEast: [16, 22, 24, 27]
    //   uvWest: [24, 22, 32, 27]
    expectFaceUvRect(rightGeom, 0, [16, 22, 24, 27], texSize);
    expectFaceUvRect(rightGeom, 1, [24, 22, 32, 27], texSize);
  });
});
