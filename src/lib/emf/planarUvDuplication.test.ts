import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as THREE from "three";
import { parseJEM, jemToThreeJS, type JEMFile } from "./jemLoader";

describe("JEM planar UV duplication", () => {
  it("duplicates single-face UVs on planar boxes so they render from both sides", () => {
    const jemPath = join(
      __dirname,
      "../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/villager.jem",
    );
    const jem = JSON.parse(readFileSync(jemPath, "utf-8")) as JEMFile;

    const parsed = parseJEM(jem);
    const group = jemToThreeJS(parsed, null, {});

    // Fresh Animations villager uses 0-depth planes for facial details.
    // These often only define `uvNorth`; we should mirror that to `uvSouth`
    // so face-pruning doesn't delete the back face.
    const planarMeshes = [
      "brow_box0",
      "mouth_box0",
      "r_pupil_box0",
      "l_pupil_box0",
    ];

    for (const name of planarMeshes) {
      const mesh = group.getObjectByName(name) as THREE.Mesh | null;
      expect(mesh).toBeTruthy();
      const geom = mesh!.geometry as THREE.BufferGeometry;
      const idx = geom.getIndex();
      expect(idx).toBeTruthy();
      // One box face = 2 triangles = 6 indices. Two-sided plane should keep both faces.
      expect(idx!.array.length).toBe(12);
      const mat = mesh!.material as THREE.MeshStandardMaterial;
      expect(mat.side).toBe(THREE.DoubleSide);
    }
  });
});

