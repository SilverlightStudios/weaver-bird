import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import * as THREE from "three";
import { parseJEM, jemToThreeJS, type JEMFile } from "../jemLoader";
import { AnimationEngine } from "./AnimationEngine";

describe("Fresh Animations (axolotl) attachment", () => {
  it("keeps the land legs embedded in the torso under idle", () => {
    const jemPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/axolotl.jem",
    );
    const jpmPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/axolotl_animations.jpm",
    );

    const jem = JSON.parse(readFileSync(jemPath, "utf-8")) as JEMFile;
    const jpm = JSON.parse(readFileSync(jpmPath, "utf-8")) as {
      animations?: Record<string, any>[];
    };

    const parsed = parseJEM(jem);
    parsed.animations = jpm.animations as any;

    const group = jemToThreeJS(parsed, null, {});
    const engine = new AnimationEngine(group, parsed.animations);

    engine.setPreset("idle", true);
    engine.tick(0);
    group.updateMatrixWorld(true);

    const torso = group.getObjectByName("body2_box0") as THREE.Object3D | null;
    const legs = ["leg5_box0", "leg6_box0", "leg7_box0", "leg8_box0"].map(
      (name) => group.getObjectByName(name) as THREE.Object3D | null,
    );
    expect(torso).toBeTruthy();
    for (const leg of legs) expect(leg).toBeTruthy();

    const torsoBox = new THREE.Box3().setFromObject(torso!);
    const limbUnion = new THREE.Box3();
    for (const leg of legs) limbUnion.union(new THREE.Box3().setFromObject(leg!));

    // Ensure there is no positive separation between torso and land legs.
    const separationY = Math.max(0, torsoBox.min.y - limbUnion.max.y, limbUnion.min.y - torsoBox.max.y);
    expect(separationY).toBeLessThan(0.02);
  });
});
