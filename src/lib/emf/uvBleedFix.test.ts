import fs from "node:fs";
import path from "node:path";
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { jemToThreeJS, parseJEM } from "@lib/emf";

describe("JEM UV mapping", () => {
  it("applies Blockbench-style bleed insetting for reversed explicit face UVs (enderman headwear plane)", () => {
    const filePath = path.join(
      process.cwd(),
      "__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/enderman.jem",
    );
    const jemData = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const parsed = parseJEM(jemData);

    const root = jemToThreeJS(parsed, null);
    const obj = root.getObjectByName("head2_box1");
    expect(obj).toBeTruthy();
    expect(obj).toBeInstanceOf(THREE.Mesh);

    const mesh = obj as THREE.Mesh;
    const geometry = mesh.geometry as THREE.BufferGeometry;
    const uvAttr = geometry.getAttribute("uv") as THREE.BufferAttribute;
    expect(uvAttr).toBeTruthy();

    // `head2_box1` defines only `uvDown: [32, 0, 24, 8]` on a 64x32 texture.
    // Blockbench insets by 1/64 px, respecting reversed rectangles.
    const margin = 1 / 64;
    const u1 = 32 - margin;
    const u2 = 24 + margin;
    const v1 = 0 + margin;
    const v2 = 8 - margin;

    const expectedU1 = u1 / 64;
    const expectedU2 = u2 / 64;
    const expectedV1 = 1 - v1 / 32;
    const expectedV2 = 1 - v2 / 32;

    // Down face is index 3 in our face ordering (east, west, up, down, south, north).
    const base = 3 * 4;
    expect(Math.abs(uvAttr.getX(base + 0) - expectedU1)).toBeLessThan(1e-6);
    expect(Math.abs(uvAttr.getY(base + 0) - expectedV1)).toBeLessThan(1e-6);
    expect(Math.abs(uvAttr.getX(base + 1) - expectedU2)).toBeLessThan(1e-6);
    expect(Math.abs(uvAttr.getY(base + 1) - expectedV1)).toBeLessThan(1e-6);
    expect(Math.abs(uvAttr.getX(base + 2) - expectedU1)).toBeLessThan(1e-6);
    expect(Math.abs(uvAttr.getY(base + 2) - expectedV2)).toBeLessThan(1e-6);
    expect(Math.abs(uvAttr.getX(base + 3) - expectedU2)).toBeLessThan(1e-6);
    expect(Math.abs(uvAttr.getY(base + 3) - expectedV2)).toBeLessThan(1e-6);
  });
});

