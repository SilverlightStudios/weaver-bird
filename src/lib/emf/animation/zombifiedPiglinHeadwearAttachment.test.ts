import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import * as THREE from "three";
import { parseJEM, jemToThreeJS, type JEMFile } from "../jemLoader";
import { AnimationEngine } from "./AnimationEngine";

describe("Fresh Animations (zombified piglin) headwear attachment", () => {
  it("keeps headwear vertically aligned with body under walking", () => {
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
    const headwear = group.getObjectByName("headwear") as THREE.Object3D | null;
    const body = group.getObjectByName("body") as THREE.Object3D | null;
    expect(headwear).toBeTruthy();
    expect(body).toBeTruthy();

    group.updateMatrixWorld(true);
    const restHeadwear = new THREE.Vector3();
    const restBody = new THREE.Vector3();
    headwear!.getWorldPosition(restHeadwear);
    body!.getWorldPosition(restBody);
    const restDeltaY = restHeadwear.y - restBody.y;

    const engine = new AnimationEngine(group, parsed.animations);

    engine.setPreset("walking", true);
    engine.tick(0.15);
    group.updateMatrixWorld(true);

    const headwearWorld = new THREE.Vector3();
    headwear!.getWorldPosition(headwearWorld);
    const bodyWorld = new THREE.Vector3();
    body!.getWorldPosition(bodyWorld);

    // Headwear should stay attached to the body/neck line; large deltas indicate
    // mismatched translation normalization between dependent `ty` channels.
    const deltaY = headwearWorld.y - bodyWorld.y;
    expect(Math.abs(deltaY - restDeltaY)).toBeLessThan(0.05);
  });
});
