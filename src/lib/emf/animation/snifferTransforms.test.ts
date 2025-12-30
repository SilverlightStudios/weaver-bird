import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import * as THREE from "three";
import { parseJEM, jemToThreeJS, type JEMFile } from "../jemLoader";
import { AnimationEngine } from "./AnimationEngine";

describe("Fresh Animations (sniffer) transform sanity", () => {
  it("keeps leg Z offsets distinct, preserves base leg/body heights, and avoids double-adding ear2 ty", () => {
    const jemPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/sniffer.jem",
    );
    const jpmPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/sniffer_animations.jpm",
    );

    const jem = JSON.parse(readFileSync(jemPath, "utf-8")) as JEMFile;
    const jpm = JSON.parse(readFileSync(jpmPath, "utf-8")) as {
      animations?: Record<string, any>[];
    };

    const parsed = parseJEM(jem);
    parsed.animations = jpm.animations as any;

    const group = jemToThreeJS(parsed, null, {});
    const engine = new AnimationEngine(group, parsed.animations);
    engine.tick(0);

    const frontLeft = group.getObjectByName("front_left_leg") as THREE.Object3D | null;
    const backLeft = group.getObjectByName("back_left_leg") as THREE.Object3D | null;
    const middleLeft = group.getObjectByName("middle_left_leg") as THREE.Object3D | null;
    const body = group.getObjectByName("body") as THREE.Object3D | null;
    expect(frontLeft).toBeTruthy();
    expect(backLeft).toBeTruthy();
    expect(middleLeft).toBeTruthy();
    expect(body).toBeTruthy();

    const frontZ = new THREE.Vector3();
    const backZ = new THREE.Vector3();
    frontLeft!.getWorldPosition(frontZ);
    backLeft!.getWorldPosition(backZ);

    // Legs should not collapse onto the same Z plane.
    expect(Math.abs(frontZ.z - backZ.z)).toBeGreaterThan(1.0);

    // Sniffer legs should stay anchored at their JEM rest pose at tick(0).
    expect(frontLeft!.position.y).toBeCloseTo(9 / 16, 6);
    expect(middleLeft!.position.y).toBeCloseTo(9 / 16, 6);
    expect(backLeft!.position.y).toBeCloseTo(9 / 16, 6);
    // Body should remain close to rest at tick(0) (minor idle/breathing offsets are OK).
    expect(body!.position.y).toBeCloseTo(19 / 16, 1);

    const leftEar2 = group.getObjectByName("left_ear2") as THREE.Object3D | null;
    expect(leftEar2).toBeTruthy();

    // FA sniffer uses left_ear2.ty = -6.8 as a local absolute pivot value.
    // With invertAxis="xy", local absolute maps to y = -ty/16.
    expect(leftEar2!.position.y).toBeCloseTo(6.8 / 16, 3);
  });
});
