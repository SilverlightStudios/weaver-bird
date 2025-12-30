import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import * as THREE from "three";
import { parseJEM, jemToThreeJS, type JEMFile } from "../jemLoader";
import { AnimationEngine } from "./AnimationEngine";

describe("Fresh Animations (piglin) idle baseline pose", () => {
  it("preserves authored idle torso yaw tilt", () => {
    const jemPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/piglin.jem",
    );
    const jpmPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/piglin_animations.jpm",
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
    expect(body).toBeTruthy();

    const baseRy = body!.rotation.y;

    engine.setPreset("idle", true);
    engine.tick(0.05);

    // piglin_animations defines an idle yaw bias in body.ry (≈ torad(-15) when limb_speed=0).
    const delta = body!.rotation.y - baseRy;
    expect(Math.abs(delta)).toBeGreaterThan(0.15);
  });
});

