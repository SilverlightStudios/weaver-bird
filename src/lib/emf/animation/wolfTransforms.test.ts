import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import * as THREE from "three";
import { parseJEM, jemToThreeJS, type JEMFile } from "../jemLoader";
import { AnimationEngine } from "./AnimationEngine";

describe("Fresh Animations (wolf) rotation + tail semantics", () => {
  it("handles wolf body_rotation, mane2, head2, tail2 semantics", () => {
    const jemPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/wolf.jem",
    );
    const jpmPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/wolf_animations.jpm",
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
    const bodyRotationBefore = group.getObjectByName(
      "body_rotation",
    ) as THREE.Object3D | null;
    const tail2Before = group.getObjectByName("tail2") as THREE.Object3D | null;
    const head2Before = group.getObjectByName("head2") as THREE.Object3D | null;
    const mane2Before = group.getObjectByName("mane2") as THREE.Object3D | null;

    expect(bodyBefore).toBeTruthy();
    expect(bodyRotationBefore).toBeTruthy();
    expect(tail2Before).toBeTruthy();
    expect(head2Before).toBeTruthy();
    expect(mane2Before).toBeTruthy();

    const snap = (o: THREE.Object3D) => ({
      pos: o.position.clone(),
      rot: o.rotation.clone(),
    });
    const bodySnap = snap(bodyBefore!);
    const bodyRotationSnap = snap(bodyRotationBefore!);
    const head2Snap = snap(head2Before!);
    const tail2Snap = snap(tail2Before!);
    const mane2Snap = snap(mane2Before!);

    engine.tick(0);

    const body = group.getObjectByName("body") as THREE.Object3D | null;
    const bodyRotation = group.getObjectByName(
      "body_rotation",
    ) as THREE.Object3D | null;
    const tail2 = group.getObjectByName("tail2") as THREE.Object3D | null;
    const head2 = group.getObjectByName("head2") as THREE.Object3D | null;
    const mane2 = group.getObjectByName("mane2") as THREE.Object3D | null;

    expect(body).toBeTruthy();
    expect(bodyRotation).toBeTruthy();
    expect(tail2).toBeTruthy();
    expect(head2).toBeTruthy();
    expect(mane2).toBeTruthy();

    // Baseline normalization should keep tick(0) at the JEM rest pose.
    expect(body!.rotation.x).toBeCloseTo(bodySnap.rot.x, 3);
    expect(head2!.rotation.x).toBeCloseTo(head2Snap.rot.x, 3);
    expect(tail2!.rotation.x).toBeCloseTo(tail2Snap.rot.x, 3);
    expect(bodyRotation!.rotation.x).toBeCloseTo(bodyRotationSnap.rot.x, 3);

    // `body_rotation.tz` is authored as an absolute rotationPoint value, so it should
    // be interpreted in entity-absolute space (subtract parent origin).
    const bodyRotationUserData = (bodyRotation as any).userData ?? {};
    const bodyRotationAbsAxes =
      typeof bodyRotationUserData.absoluteTranslationAxes === "string"
        ? (bodyRotationUserData.absoluteTranslationAxes as string)
        : "";
    expect(bodyRotationAbsAxes).toContain("z");
    expect(bodyRotation!.position.y).toBeCloseTo(bodyRotationSnap.pos.y, 6);

    // Key bones should remain in their rest positions at tick(0).
    expect(head2!.position.x).toBeCloseTo(head2Snap.pos.x, 6);
    expect(head2!.position.y).toBeCloseTo(head2Snap.pos.y, 6);
    expect(head2!.position.z).toBeCloseTo(head2Snap.pos.z, 6);

    expect(tail2!.position.x).toBeCloseTo(tail2Snap.pos.x, 6);
    expect(tail2!.position.y).toBeCloseTo(tail2Snap.pos.y, 6);
    expect(tail2!.position.z).toBeCloseTo(tail2Snap.pos.z, 6);

    expect(mane2!.position.x).toBeCloseTo(mane2Snap.pos.x, 6);
    expect(mane2!.position.y).toBeCloseTo(mane2Snap.pos.y, 6);
    expect(mane2!.position.z).toBeCloseTo(mane2Snap.pos.z, 6);

    // Head and tail should not collapse onto the same world-space point.
    const headWorld = new THREE.Vector3();
    const tailWorld = new THREE.Vector3();
    head2!.getWorldPosition(headWorld);
    tail2!.getWorldPosition(tailWorld);
    expect(headWorld.distanceTo(tailWorld)).toBeGreaterThan(0.2);
  });
});
