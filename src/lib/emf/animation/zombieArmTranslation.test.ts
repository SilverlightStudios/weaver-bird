import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import * as THREE from "three";
import { parseJEM, jemToThreeJS, type JEMFile } from "../jemLoader";
import { AnimationEngine } from "./AnimationEngine";

const CEM_Y_ORIGIN = 24;
const PX = 16;

describe("CEM translation semantics (zombie)", () => {
  it("maps right_arm.ty as absolute rotationPointY (not offset)", () => {
    const jemPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/zombie.jem",
    );
    const jpmPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/zombie_animations.jpm",
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

    const rightArm = group.getObjectByName("right_arm") as THREE.Object3D | null;
    const leftArm = group.getObjectByName("left_arm") as THREE.Object3D | null;
    expect(rightArm).toBeTruthy();
    expect(leftArm).toBeTruthy();

    const rightTy = engine.getBoneValue("right_arm", "ty");
    const leftTy = engine.getBoneValue("left_arm", "ty");

    const rightWorld = new THREE.Vector3();
    const leftWorld = new THREE.Vector3();
    rightArm!.getWorldPosition(rightWorld);
    leftArm!.getWorldPosition(leftWorld);

    expect(rightWorld.y).toBeCloseTo((CEM_Y_ORIGIN - rightTy) / PX, 6);
    expect(leftWorld.y).toBeCloseTo((CEM_Y_ORIGIN - leftTy) / PX, 6);
  });
});
