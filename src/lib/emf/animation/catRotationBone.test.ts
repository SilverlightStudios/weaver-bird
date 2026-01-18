import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import type * as THREE from "three";
import { parseJEM, jemToThreeJS, type JEMFile } from "../jemLoader";
import { AnimationEngine } from "./AnimationEngine";
import type { AnimationLayer } from "../types";

describe("Fresh Animations (cat) rotation bone", () => {
  it("treats rotation.rx as absolute (avoids doubling base -90°)", () => {
    const jemPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/cat.jem",
    );
    const jpmPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/cat_animations.jpm",
    );

    const jem = JSON.parse(readFileSync(jemPath, "utf-8")) as JEMFile;
    const jpm = JSON.parse(readFileSync(jpmPath, "utf-8")) as {
      animations?: AnimationLayer[];
    };

    const parsed = parseJEM(jem);
    parsed.animations = jpm.animations;

    const group = jemToThreeJS(parsed, null, {});
    const engine = new AnimationEngine(group, parsed.animations);

    engine.tick(0);

    const rotationBone = group.getObjectByName("rotation") as THREE.Object3D | null;
    expect(rotationBone).toBeTruthy();

    // At tick(0) in idle state, cat_animations defines:
    //   rotation.rx = pi/2
    // with invertAxis="xy" => X sign is negative, so final should be -pi/2 (-90°),
    // not -pi (-180°).
    expect(rotationBone!.rotation.x).toBeCloseTo(-Math.PI / 2, 6);
  });
});

