import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as THREE from "three";
import { parseJEM, jemToThreeJS, type JEMFile } from "../jemLoader";
import { createAnimationEngine } from "./AnimationEngine";

describe("Fresh Animations (villager) attachment", () => {
  it("treats headwear geometry as the animated head bone", () => {
    const jemPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/villager.jem",
    );
    const jpmPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/villager_animations.jpm",
    );

    const jem = JSON.parse(readFileSync(jemPath, "utf-8")) as JEMFile;
    const jpm = JSON.parse(readFileSync(jpmPath, "utf-8")) as {
      animations?: any[];
    };

    const parsed = parseJEM(jem);
    parsed.animations = jpm.animations ?? [];

    const group = jemToThreeJS(parsed, null, {});
    const engine = createAnimationEngine(group, parsed.animations);

    engine.setPreset("idle", true);
    engine.tick(0.05);
    group.updateMatrixWorld(true);

    const head = group.getObjectByName("head") as THREE.Object3D | null;
    const headPivot = group.getObjectByName("head_pivot") as THREE.Object3D | null;
    const nose = group.getObjectByName("nose") as THREE.Object3D | null;

    expect(head).toBeTruthy();
    expect(headPivot).toBeTruthy();
    expect(nose).toBeTruthy();
    expect(group.getObjectByName("headwear")).toBeFalsy();

    let headHasMesh = false;
    head!.traverse((obj) => {
      if (obj !== head && (obj as any).isMesh === true) headHasMesh = true;
    });
    expect(headHasMesh).toBe(true);

    expect(nose!.parent?.name).toBe("head");
  });

  it("keeps arms/legs in place by normalizing parent-origin ty constants", () => {
    const jemPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/villager.jem",
    );
    const jpmPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/villager_animations.jpm",
    );

    const jem = JSON.parse(readFileSync(jemPath, "utf-8")) as JEMFile;
    const jpm = JSON.parse(readFileSync(jpmPath, "utf-8")) as {
      animations?: any[];
    };

    const parsed = parseJEM(jem);
    parsed.animations = jpm.animations ?? [];

    const group = jemToThreeJS(parsed, null, {});
    const engine = createAnimationEngine(group, parsed.animations);

    engine.setPreset("walking", true);
    engine.tick(0.5);
    group.updateMatrixWorld(true);

    const armsRotation = group.getObjectByName("arms_rotation") as THREE.Object3D | null;
    const arms = group.getObjectByName("arms") as THREE.Object3D | null;
    const leftLeg = group.getObjectByName("left_leg") as THREE.Object3D | null;
    const rightLeg = group.getObjectByName("right_leg") as THREE.Object3D | null;
    expect(armsRotation).toBeTruthy();
    expect(arms).toBeTruthy();
    expect(leftLeg).toBeTruthy();
    expect(rightLeg).toBeTruthy();

    // Villager `arms` is a posture pivot; normalize away the large baseline angle
    // so the idle preset doesn't permanently hold the arms at ~45°.
    expect(typeof arms!.userData.rotationOffsetX).toBe("number");
    engine.setPreset("idle", true);
    engine.tick(0);
    expect(Math.abs(arms!.rotation.x)).toBeLessThan(0.01);

    // Villager animations include a constant `arms_rotation.ty≈-24.8` which should
    // be treated as a baseline (not a literal additive offset).
    expect(typeof armsRotation!.userData.translationOffsetYPx).toBe("number");
    expect(armsRotation!.userData.translationOffsetYPx).toBeCloseTo(-24.8, 2);
    expect(armsRotation!.position.y * 16).toBeCloseTo(-1.5, 2);

    // Villager legs use tx=±2 as entity-space pivots; if treated additively the
    // legs drift to ±4.
    expect(leftLeg!.userData.absoluteTranslationAxes).toContain("x");
    expect(rightLeg!.userData.absoluteTranslationAxes).toContain("x");
    expect(leftLeg!.position.x * 16).toBeCloseTo(-2, 2);
    expect(rightLeg!.position.x * 16).toBeCloseTo(2, 2);
  });
});
