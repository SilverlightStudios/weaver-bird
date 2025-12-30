import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import * as THREE from "three";
import { parseJEM, jemToThreeJS, type JEMFile } from "../jemLoader";
import { AnimationEngine } from "./AnimationEngine";

const PX = 16;

describe("Fresh Animations (allay) transform sanity", () => {
  it("matches expected hierarchy + translation semantics at tick(0)", () => {
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

    const bodyBefore = group.getObjectByName("body") as THREE.Object3D | null;
    const rightArmBefore = group.getObjectByName(
      "right_arm",
    ) as THREE.Object3D | null;
    const leftArmBefore = group.getObjectByName("left_arm") as THREE.Object3D | null;
    expect(bodyBefore).toBeTruthy();
    expect(rightArmBefore).toBeTruthy();
    expect(leftArmBefore).toBeTruthy();

    const bodyWorldBefore = new THREE.Vector3();
    const rightArmWorldBefore = new THREE.Vector3();
    const leftArmWorldBefore = new THREE.Vector3();
    bodyBefore!.getWorldPosition(bodyWorldBefore);
    rightArmBefore!.getWorldPosition(rightArmWorldBefore);
    leftArmBefore!.getWorldPosition(leftArmWorldBefore);

    engine.tick(0);

    const body = group.getObjectByName("body") as THREE.Object3D | null;
    const head2 = group.getObjectByName("head2") as THREE.Object3D | null;
    const rightArm = group.getObjectByName("right_arm") as THREE.Object3D | null;
    const leftArm = group.getObjectByName("left_arm") as THREE.Object3D | null;
    const eyes = group.getObjectByName("eyes") as THREE.Object3D | null;
    const rightEye = group.getObjectByName("right_eye") as THREE.Object3D | null;
    const leftEye = group.getObjectByName("left_eye") as THREE.Object3D | null;

    expect(body).toBeTruthy();
    expect(head2).toBeTruthy();
    expect(rightArm).toBeTruthy();
    expect(leftArm).toBeTruthy();
    expect(eyes).toBeTruthy();
    expect(rightEye).toBeTruthy();
    expect(leftEye).toBeTruthy();

    // Arms should inherit body motion via hierarchy for allay-style rigs.
    expect(rightArm!.parent?.name).toBe("body");
    expect(leftArm!.parent?.name).toBe("body");

    // head2.ty in Fresh Animations allay is authored as an absolute origin coordinate,
    // so its local Y should stay ~0 (not +6px) at rest.
    expect(Math.abs(head2!.position.y)).toBeLessThan(0.02);

    // Eye translations in Fresh Animations are authored as absolute positions
    // (values include the base translate), so they should replace the rest pose.
    const eyesTz = engine.getBoneValue("eyes", "tz");
    const rightEyeTx = engine.getBoneValue("right_eye", "tx");
    const rightEyeTy = engine.getBoneValue("right_eye", "ty");
    const rightEyeTz = engine.getBoneValue("right_eye", "tz");
    const leftEyeTx = engine.getBoneValue("left_eye", "tx");
    const leftEyeTy = engine.getBoneValue("left_eye", "ty");
    const leftEyeTz = engine.getBoneValue("left_eye", "tz");

    expect(eyes!.position.z).toBeCloseTo(eyesTz / PX, 6);
    expect(rightEye!.position.x).toBeCloseTo(-rightEyeTx / PX, 6);
    expect(rightEye!.position.y).toBeCloseTo(-rightEyeTy / PX, 6);
    expect(rightEye!.position.z).toBeCloseTo(rightEyeTz / PX, 6);
    expect(leftEye!.position.x).toBeCloseTo(-leftEyeTx / PX, 6);
    expect(leftEye!.position.y).toBeCloseTo(-leftEyeTy / PX, 6);
    expect(leftEye!.position.z).toBeCloseTo(leftEyeTz / PX, 6);
    expect(rightEye!.position.z).toBeCloseTo(eyes!.position.z, 6);
    expect(leftEye!.position.z).toBeCloseTo(eyes!.position.z, 6);

    const bodyWorldAfter = new THREE.Vector3();
    const rightArmWorldAfter = new THREE.Vector3();
    const leftArmWorldAfter = new THREE.Vector3();
    body!.getWorldPosition(bodyWorldAfter);
    rightArm!.getWorldPosition(rightArmWorldAfter);
    leftArm!.getWorldPosition(leftArmWorldAfter);

    // tick(0) should not drift far from the JEM rest pose.
    expect(Math.abs(rightArmWorldAfter.y - rightArmWorldBefore.y)).toBeLessThan(0.01);
    expect(Math.abs(leftArmWorldAfter.y - leftArmWorldBefore.y)).toBeLessThan(0.01);
    expect(Math.abs(bodyWorldAfter.y - bodyWorldBefore.y)).toBeLessThan(0.01);
  });
});
