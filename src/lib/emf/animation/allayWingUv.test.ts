import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import * as THREE from "three";
import { parseJEM, jemToThreeJS, type JEMFile } from "../jemLoader";

function expectFaceUvRect(
  geometry: THREE.BufferGeometry,
  faceIndex: number,
  rect: [number, number, number, number],
  textureSize: [number, number],
): void {
  const [texWidth, texHeight] = textureSize;
  const uvAttr = geometry.getAttribute("uv") as THREE.BufferAttribute | null;
  expect(uvAttr).toBeTruthy();

  const [u1, v1, u2, v2] = rect;
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

    const leftGeom = leftWingMesh!.geometry as THREE.BufferGeometry;
    const rightGeom = rightWingMesh!.geometry as THREE.BufferGeometry;

    // With face filtering, only east+west faces should render (2 faces -> 12 indices).
    expect(leftGeom.index?.count).toBe(12);
    expect(rightGeom.index?.count).toBe(12);

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

