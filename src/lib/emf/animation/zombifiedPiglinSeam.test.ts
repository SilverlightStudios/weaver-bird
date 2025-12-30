import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import * as THREE from "three";
import { parseJEM, jemToThreeJS, type JEMFile } from "../jemLoader";
import { AnimationEngine } from "./AnimationEngine";

describe("Fresh Animations (zombified piglin) body/leg seam", () => {
  it("keeps torso close to the leg tops under walking", () => {
    const jemPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/zombified_piglin.jem",
    );
    const jpmPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/zombified_piglin_animations.jpm",
    );

    const jem = JSON.parse(readFileSync(jemPath, "utf-8")) as JEMFile;
    const jpm = JSON.parse(readFileSync(jpmPath, "utf-8")) as {
      animations?: Record<string, any>[];
    };

    const parsed = parseJEM(jem);
    parsed.animations = jpm.animations as any;

    const group = jemToThreeJS(parsed, null, {});
    const engine = new AnimationEngine(group, parsed.animations);

    engine.setPreset("walking", true);
    engine.tick(0.25);
    group.updateMatrixWorld(true);

    const body = group.getObjectByName("body") as THREE.Object3D | null;
    const rightLeg = group.getObjectByName("right_leg") as THREE.Object3D | null;
    expect(body).toBeTruthy();
    expect(rightLeg).toBeTruthy();

    const bodyBox = new THREE.Box3().setFromObject(body!);
    const legBox = new THREE.Box3().setFromObject(rightLeg!);

    // Torso should be very close to the top of the legs (no visible gap).
    const gap = bodyBox.min.y - legBox.max.y;
    expect(gap).toBeLessThan(0.03);
  });
});

