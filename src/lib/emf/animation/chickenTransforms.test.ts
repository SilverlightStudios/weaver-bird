import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import * as THREE from "three";
import { parseJEM, jemToThreeJS, type JEMFile } from "../jemLoader";
import { AnimationEngine } from "./AnimationEngine";

describe("Fresh Animations (chicken) root translation semantics", () => {
  it("keeps the body at its JEM rest position at tick(0)", () => {
    const jemPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/chicken.jem",
    );
    const jpmPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/chicken_animations.jpm",
    );

    const jem = JSON.parse(readFileSync(jemPath, "utf-8")) as JEMFile;
    const jpm = JSON.parse(readFileSync(jpmPath, "utf-8")) as {
      animations?: Record<string, any>[];
    };

    const parsed = parseJEM(jem);
    parsed.animations = [
      ...(parsed.animations ?? []),
      ...((jpm.animations ?? []) as any),
    ];

    const group = jemToThreeJS(parsed, null, {});
    const engine = new AnimationEngine(group, parsed.animations);

    const bodyBefore = group.getObjectByName("body") as THREE.Object3D | null;
    expect(bodyBefore).toBeTruthy();
    const snapY = bodyBefore!.position.y;

    engine.tick(0);

    const bodyAfter = group.getObjectByName("body") as THREE.Object3D | null;
    expect(bodyAfter).toBeTruthy();

    const bodyUserData = (bodyAfter as any).userData ?? {};
    const axes =
      typeof bodyUserData.absoluteTranslationAxes === "string"
        ? (bodyUserData.absoluteTranslationAxes as string)
        : "";
    expect(axes).toContain("y");
    expect(bodyUserData.absoluteTranslationSpace).toBe("entity");

    const bodyTy = engine.getBoneValue("body", "ty");
    const expectedY = 24 / 16 - bodyTy / 16;
    expect(bodyAfter!.position.y).toBeCloseTo(expectedY, 6);

    // Keep the initial pose close to the JEM rest pose (should not "sink").
    expect(Math.abs(bodyAfter!.position.y - snapY)).toBeLessThan(0.08);
  });

  it("does not drift the body far from rest under the idle preset", () => {
    const jemPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/chicken.jem",
    );
    const jpmPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/chicken_animations.jpm",
    );

    const jem = JSON.parse(readFileSync(jemPath, "utf-8")) as JEMFile;
    const jpm = JSON.parse(readFileSync(jpmPath, "utf-8")) as {
      animations?: Record<string, any>[];
    };

    const parsed = parseJEM(jem);
    parsed.animations = [
      ...(parsed.animations ?? []),
      ...((jpm.animations ?? []) as any),
    ];

    const group = jemToThreeJS(parsed, null, {});
    const engine = new AnimationEngine(group, parsed.animations);
    engine.setPreset("idle", true);

    const bodyBase = group.getObjectByName("body") as THREE.Object3D | null;
    expect(bodyBase).toBeTruthy();
    const snapY = bodyBase!.position.y;

    // Advance a bit so time-based idle motion kicks in.
    for (let i = 0; i < 10; i++) engine.tick(0.05);

    const bodyAfter = group.getObjectByName("body") as THREE.Object3D | null;
    expect(bodyAfter).toBeTruthy();

    // Idle breathing/bobbing should be subtle.
    expect(Math.abs(bodyAfter!.position.y - snapY)).toBeLessThan(0.08);
  });
});
