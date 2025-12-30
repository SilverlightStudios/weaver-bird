import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import * as THREE from "three";
import { parseJEM, jemToThreeJS, type JEMFile } from "../jemLoader";
import { AnimationEngine } from "./AnimationEngine";

describe("Fresh Animations (allay) wing mirroring", () => {
  it("keeps left/right wing transforms mirrored (no baseline double-application)", () => {
    const jemPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/allay.jem",
    );
    const jpmPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/allay_animations.jpm",
    );

    const jem = JSON.parse(readFileSync(jemPath, "utf-8")) as JEMFile;
    const jpm = JSON.parse(readFileSync(jpmPath, "utf-8")) as {
      animations?: Record<string, any>[];
    };

    const parsed = parseJEM(jem);
    parsed.animations = jpm.animations as any;

    const group = jemToThreeJS(parsed, null, {});
    const engine = new AnimationEngine(group, parsed.animations);

    const body = group.getObjectByName("body") as THREE.Object3D | null;
    const leftWing2 = group.getObjectByName("left_wing2") as THREE.Object3D | null;
    const rightWing2 = group.getObjectByName("right_wing2") as THREE.Object3D | null;
    expect(body).toBeTruthy();
    expect(leftWing2).toBeTruthy();
    expect(rightWing2).toBeTruthy();

    const baseLeft = leftWing2!.rotation.clone();
    const baseRight = rightWing2!.rotation.clone();

    engine.setPreset("walking", true);
    engine.tick(0.1);
    group.updateMatrixWorld(true);

    // Expressions define:
    //   left_wing2.ry = -right_wing2.ry
    //   left_wing2.rz = -right_wing2.rz
    //   left_wing2.rx =  right_wing2.rx
    const dLy = leftWing2!.rotation.y - baseLeft.y;
    const dRy = rightWing2!.rotation.y - baseRight.y;
    expect(dLy).toBeCloseTo(-dRy, 4);

    const dLz = leftWing2!.rotation.z - baseLeft.z;
    const dRz = rightWing2!.rotation.z - baseRight.z;
    expect(dLz).toBeCloseTo(-dRz, 4);

    const dLx = leftWing2!.rotation.x - baseLeft.x;
    const dRx = rightWing2!.rotation.x - baseRight.x;
    expect(dLx).toBeCloseTo(dRx, 4);

    // Wings should remain symmetric around the torso.
    const bodyWorld = new THREE.Vector3();
    const leftWorld = new THREE.Vector3();
    const rightWorld = new THREE.Vector3();
    body!.getWorldPosition(bodyWorld);
    leftWing2!.getWorldPosition(leftWorld);
    rightWing2!.getWorldPosition(rightWorld);
    expect(
      Math.abs((leftWorld.x - bodyWorld.x) + (rightWorld.x - bodyWorld.x)),
    ).toBeLessThan(0.01);
  });
});
