import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import * as THREE from "three";
import { parseJEM, jemToThreeJS, type JEMFile } from "../jemLoader";
import { AnimationEngine } from "./AnimationEngine";

const PX = 16;

describe("Fresh Animations (mooshroom) translation semantics", () => {
  it("treats body/legs/head2 translations as absolute rotationPoint values", () => {
    const jemPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/mooshroom.jem",
    );
    const jpmPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/mooshroom_animations.jpm",
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

    const body = group.getObjectByName("body") as THREE.Object3D | null;
    const head2 = group.getObjectByName("head2") as THREE.Object3D | null;
    const udder = group.getObjectByName("udder") as THREE.Object3D | null;
    const rightEye = group.getObjectByName("right_eye") as THREE.Object3D | null;
    const leftEye = group.getObjectByName("left_eye") as THREE.Object3D | null;
    const legs = ["leg1", "leg2", "leg3", "leg4"].map(
      (name) => group.getObjectByName(name) as THREE.Object3D | null,
    );

    expect(body).toBeTruthy();
    expect(head2).toBeTruthy();
    expect(udder).toBeTruthy();
    expect(rightEye).toBeTruthy();
    expect(leftEye).toBeTruthy();
    for (const leg of legs) expect(leg).toBeTruthy();

    // Hierarchy expectations (matches the JEM structure)
    for (const leg of legs) expect(leg!.parent?.name).toBe("jem_entity");
    expect(head2!.parent?.name).toBe("body");
    expect(udder!.parent?.name).toBe("body");
    expect(rightEye!.parent?.name).toBe("head2");
    expect(leftEye!.parent?.name).toBe("head2");

    const bodyTx = engine.getBoneValue("body", "tx");
    const bodyTy = engine.getBoneValue("body", "ty");
    const bodyTz = engine.getBoneValue("body", "tz");

    // body is invertAxis="xy" and uses absolute rotationPoint coordinates.
    expect(body!.position.x).toBeCloseTo(-bodyTx / PX, 6);
    expect(body!.position.y).toBeCloseTo((24 - bodyTy) / PX, 6);
    expect(body!.position.z).toBeCloseTo(bodyTz / PX, 6);

    for (const legName of ["leg1", "leg2", "leg3", "leg4"]) {
      const leg = group.getObjectByName(legName) as THREE.Object3D | null;
      expect(leg).toBeTruthy();

      const tx = engine.getBoneValue(legName, "tx");
      const ty = engine.getBoneValue(legName, "ty");
      const tz = engine.getBoneValue(legName, "tz");

      expect(leg!.position.x).toBeCloseTo(-tx / PX, 6);
      expect(leg!.position.y).toBeCloseTo((24 - ty) / PX, 6);
      expect(leg!.position.z).toBeCloseTo(tz / PX, 6);
    }

    // head2 translations are authored in a local absolute space (base translate is included),
    // so we use cemYOriginPx=0 and subtract the parent's originPx.
    const parentOriginPx = Array.isArray((head2!.parent as any)?.userData?.originPx)
      ? ((head2!.parent as any).userData.originPx as [number, number, number])
      : ([0, 0, 0] as [number, number, number]);

    const head2Tx = engine.getBoneValue("head2", "tx");
    const head2Ty = engine.getBoneValue("head2", "ty");
    const head2Tz = engine.getBoneValue("head2", "tz");

    expect(head2!.position.x).toBeCloseTo(
      -head2Tx / PX - parentOriginPx[0] / PX,
      6,
    );
    expect(head2!.position.y).toBeCloseTo(
      -head2Ty / PX - parentOriginPx[1] / PX,
      6,
    );
    expect(head2!.position.z).toBeCloseTo(
      head2Tz / PX - parentOriginPx[2] / PX,
      6,
    );

    // Eye tracking in mooshroom uses tz as a *local absolute* value (includes the base -6),
    // so it should replace the rest pose without subtracting the parent origin.
    const rightEyeTz = engine.getBoneValue("right_eye", "tz");
    const leftEyeTz = engine.getBoneValue("left_eye", "tz");
    expect(rightEye!.position.z).toBeCloseTo(rightEyeTz / PX, 6);
    expect(leftEye!.position.z).toBeCloseTo(leftEyeTz / PX, 6);
  });
});
