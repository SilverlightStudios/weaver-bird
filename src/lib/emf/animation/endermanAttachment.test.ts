import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as THREE from "three";
import { parseJEM, jemToThreeJS, type JEMFile } from "../jemLoader";
import { createAnimationEngine } from "./AnimationEngine";

describe("Fresh Animations (enderman) attachment", () => {
  it("keeps left/right limbs symmetrically attached during CEM playback", () => {
    const jemPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/enderman.jem",
    );
    const jpmPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/enderman_animations.jpm",
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

    const leftArm = group.getObjectByName("left_arm") as THREE.Object3D | null;
    const rightArm = group.getObjectByName("right_arm") as THREE.Object3D | null;
    const leftLeg = group.getObjectByName("left_leg") as THREE.Object3D | null;
    const rightLeg = group.getObjectByName("right_leg") as THREE.Object3D | null;
    const body = group.getObjectByName("body") as THREE.Object3D | null;
    const headwear = group.getObjectByName("headwear") as THREE.Object3D | null;
    const rightFoot = group.getObjectByName(
      "right_foot",
    ) as THREE.Object3D | null;

    expect(leftArm).toBeTruthy();
    expect(rightArm).toBeTruthy();
    expect(leftLeg).toBeTruthy();
    expect(rightLeg).toBeTruthy();
    expect(body).toBeTruthy();
    expect(headwear).toBeTruthy();
    expect(rightFoot).toBeTruthy();

    const bodyWorld = new THREE.Vector3();
    const leftArmWorld = new THREE.Vector3();
    const rightArmWorld = new THREE.Vector3();
    const leftLegWorld = new THREE.Vector3();
    const rightLegWorld = new THREE.Vector3();

    group.updateMatrixWorld(true);
    body!.getWorldPosition(bodyWorld);
    leftArm!.getWorldPosition(leftArmWorld);
    rightArm!.getWorldPosition(rightArmWorld);
    leftLeg!.getWorldPosition(leftLegWorld);
    rightLeg!.getWorldPosition(rightLegWorld);

    // Headwear is the actual head rig; it should remain attached under `head`
    // (overlay-style hierarchy) while the main torso motion is authored via
    // cross-bone translation references in the JPM.
    expect(headwear!.parent?.name).toBe("head");

    // Humanoid base limbs should remain root-level parts (no implicit body->leg
    // parenting), since Fresh Animations authors torso bob/lean relative to the
    // legs and keeps everything aligned via authored translations.
    expect(leftLeg!.parent?.name).toBe("jem_entity");
    expect(rightLeg!.parent?.name).toBe("jem_entity");

    // The actual leg cube lives under right_foot and should pivot from the hip,
    // not from the cube's center (cube center.y should be ~13.5px in local space).
    const rightFootBox0 = group.getObjectByName(
      "right_foot_box0",
    ) as THREE.Object3D | null;
    expect(rightFootBox0).toBeTruthy();
    expect(rightFootBox0!.position.y).toBeCloseTo(13.5 / 16, 6);

    // Arms inherit torso sway via authored translations, so they should remain
    // mirror-symmetric around the torso (not necessarily around the entity origin).
    expect(
      Math.abs(
        (leftArmWorld.x - bodyWorld.x) + (rightArmWorld.x - bodyWorld.x),
      ),
    ).toBeLessThan(1e-2);

    // Legs remain symmetric around the entity origin (they do not inherit torso translation).
    expect(Math.abs(leftLegWorld.x + rightLegWorld.x)).toBeLessThan(1e-3);
  });

  it("treats foot tx channels as entity-absolute pivots", () => {
    const jemPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/enderman.jem",
    );
    const jpmPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/enderman_animations.jpm",
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

    const leftFoot = group.getObjectByName("left_foot") as THREE.Object3D | null;
    const rightFoot = group.getObjectByName(
      "right_foot",
    ) as THREE.Object3D | null;

    expect(leftFoot).toBeTruthy();
    expect(rightFoot).toBeTruthy();

    // Fresh Animations sets `left_foot.tx=2` / `right_foot.tx=-2` as absolute pivots
    // in entity space. If treated as additive offsets, the feet drift sideways by 2px.
    expect(leftFoot!.userData.absoluteTranslationAxes).toContain("x");
    expect(leftFoot!.userData.absoluteTranslationSpace).toBe("entity");
    expect(rightFoot!.userData.absoluteTranslationAxes).toContain("x");
    expect(rightFoot!.userData.absoluteTranslationSpace).toBe("entity");
    expect(leftFoot!.position.x).toBeCloseTo(0, 6);
    expect(rightFoot!.position.x).toBeCloseTo(0, 6);
  });

  it("does not amplify torso sway by subtracting an idle baseline", () => {
    const jemPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/enderman.jem",
    );
    const jpmPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/enderman_animations.jpm",
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

    const body = group.getObjectByName("body") as THREE.Object3D | null;
    const headwear = group.getObjectByName("headwear") as THREE.Object3D | null;
    const leftArm = group.getObjectByName("left_arm") as THREE.Object3D | null;
    const rightArm = group.getObjectByName("right_arm") as THREE.Object3D | null;
    expect(body).toBeTruthy();
    expect(headwear).toBeTruthy();
    expect(leftArm).toBeTruthy();
    expect(rightArm).toBeTruthy();

    // When the body translation baseline differs across poses, subtracting a fixed
    // offset can exaggerate sway and make the legs appear detached. Ensure that we
    // keep `body.tx` in authored space and apply it directly as an additive offset.
    expect(body!.userData.translationOffsetXPx).toBeUndefined();
    // Any bones derived from `body.tx` should also remain in authored space, or the
    // rig will appear laterally misaligned (head/arms drifting relative to torso).
    expect(headwear!.userData.translationOffsetXPx).toBeUndefined();
    expect(leftArm!.userData.translationOffsetXPx).toBeUndefined();
    expect(rightArm!.userData.translationOffsetXPx).toBeUndefined();
    // Vertical alignment should still be baseline-normalized so the head doesn't
    // float a constant amount above the body.
    expect(typeof headwear!.userData.translationOffsetYPx).toBe("number");
    const bodyTxPx = engine.getBoneValue("body", "tx");
    expect(body!.position.x * 16).toBeCloseTo(-bodyTxPx, 3);
  });
});
