import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import * as THREE from "three";
import { parseJEM, jemToThreeJS, type JEMFile } from "../jemLoader";
import { AnimationEngine } from "./AnimationEngine";

const PX = 16;

describe("Fresh Animations (horse) translation semantics", () => {
  it("treats neck2/tail2/headpiece_neck translations as absolute (not additive) and reparents saddle to body", () => {
    const jemPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/horse.jem",
    );
    const jpmPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/horse_animations.jpm",
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
    const saddle = group.getObjectByName("saddle") as THREE.Object3D | null;
    const neck2 = group.getObjectByName("neck2") as THREE.Object3D | null;
    const tail2 = group.getObjectByName("tail2") as THREE.Object3D | null;
    const headpieceNeck = group.getObjectByName(
      "headpiece_neck",
    ) as THREE.Object3D | null;
    const snout2 = group.getObjectByName("snout2") as THREE.Object3D | null;
    const headpieceSnout = group.getObjectByName(
      "headpiece_snout",
    ) as THREE.Object3D | null;

    expect(body).toBeTruthy();
    expect(saddle).toBeTruthy();
    expect(neck2).toBeTruthy();
    expect(tail2).toBeTruthy();
    expect(headpieceNeck).toBeTruthy();
    expect(snout2).toBeTruthy();
    expect(headpieceSnout).toBeTruthy();

    // Saddle is authored as a root part but should inherit body motion.
    expect(saddle!.parent?.name).toBe("body");

    // neck2/tail2 are children of body in the JEM structure.
    expect(neck2!.parent?.name).toBe("body");
    expect(tail2!.parent?.name).toBe("body");

    const bodyOriginPx = Array.isArray((body as any).userData?.originPx)
      ? ((body as any).userData.originPx as [number, number, number])
      : ([0, 0, 0] as [number, number, number]);

    // neck2.ty/tz are authored as absolute origin values with invertAxis="xy".
    const neck2UserData = (neck2 as any).userData ?? {};
    const neck2Axes =
      typeof neck2UserData.absoluteTranslationAxes === "string"
        ? (neck2UserData.absoluteTranslationAxes as string)
        : "";
    expect(neck2Axes).toContain("y");
    expect(neck2Axes).toContain("z");
    expect(neck2UserData.cemYOriginPx).toBe(0);

    const neck2Ty = engine.getBoneValue("neck2", "ty");
    const neck2Tz = engine.getBoneValue("neck2", "tz");

    const neckInvertAxis =
      typeof neck2UserData.invertAxis === "string"
        ? (neck2UserData.invertAxis as string)
        : "";
    const expectedNeck2Y =
      (neckInvertAxis.includes("y") ? -1 : 1) * (neck2Ty / PX) -
      bodyOriginPx[1] / PX;
    const expectedNeck2Z =
      ((neckInvertAxis.includes("z") ? -1 : 1) * neck2Tz - bodyOriginPx[2]) /
      PX;
    expect(neck2!.position.y).toBeCloseTo(expectedNeck2Y, 6);
    expect(neck2!.position.z).toBeCloseTo(expectedNeck2Z, 6);

    // tail2.ty is authored as an absolute origin value.
    const tail2UserData = (tail2 as any).userData ?? {};
    const tail2Axes =
      typeof tail2UserData.absoluteTranslationAxes === "string"
        ? (tail2UserData.absoluteTranslationAxes as string)
        : "";
    expect(tail2Axes).toContain("y");
    expect(tail2UserData.cemYOriginPx).toBe(0);

    const tail2Ty = engine.getBoneValue("tail2", "ty");
    const tailInvertAxis =
      typeof tail2UserData.invertAxis === "string"
        ? (tail2UserData.invertAxis as string)
        : "";
    const expectedTail2Y =
      (tailInvertAxis.includes("y") ? -1 : 1) * (tail2Ty / PX) -
      bodyOriginPx[1] / PX;
    expect(tail2!.position.y).toBeCloseTo(expectedTail2Y, 6);

    // Tack copies neck2 translation values onto headpiece_neck, which should use
    // the same absolute translation semantics (relative to the saddle pivot).
    expect(headpieceNeck!.parent?.name).toBe("saddle");
    const saddleOriginPx = Array.isArray((saddle as any).userData?.originPx)
      ? ((saddle as any).userData.originPx as [number, number, number])
      : ([0, 0, 0] as [number, number, number]);

    const headpieceNeckUserData = (headpieceNeck as any).userData ?? {};
    const headpieceNeckAxes =
      typeof headpieceNeckUserData.absoluteTranslationAxes === "string"
        ? (headpieceNeckUserData.absoluteTranslationAxes as string)
        : "";
    expect(headpieceNeckAxes).toContain("y");
    expect(headpieceNeckAxes).toContain("z");
    expect(headpieceNeckUserData.cemYOriginPx).toBe(0);

    const headpieceNeckTy = engine.getBoneValue("headpiece_neck", "ty");
    const headpieceNeckTz = engine.getBoneValue("headpiece_neck", "tz");
    const headpieceNeckInvertAxis =
      typeof headpieceNeckUserData.invertAxis === "string"
        ? (headpieceNeckUserData.invertAxis as string)
        : "";
    const expectedHeadpieceNeckY =
      (headpieceNeckInvertAxis.includes("y") ? -1 : 1) *
        (headpieceNeckTy / PX) -
      saddleOriginPx[1] / PX;
    const expectedHeadpieceNeckZ =
      ((headpieceNeckInvertAxis.includes("z") ? -1 : 1) * headpieceNeckTz -
        saddleOriginPx[2]) /
      PX;
    expect(headpieceNeck!.position.y).toBeCloseTo(expectedHeadpieceNeckY, 6);
    expect(headpieceNeck!.position.z).toBeCloseTo(expectedHeadpieceNeckZ, 6);

    // Snout translations include their base translate, so treat them as local absolute.
    const snout2UserData = (snout2 as any).userData ?? {};
    expect(snout2UserData.absoluteTranslationSpace).toBe("local");
    const snout2Axes =
      typeof snout2UserData.absoluteTranslationAxes === "string"
        ? (snout2UserData.absoluteTranslationAxes as string)
        : "";
    expect(snout2Axes).toContain("y");

    const snout2Ty = engine.getBoneValue("snout2", "ty");
    const snoutInvertAxis =
      typeof snout2UserData.invertAxis === "string"
        ? (snout2UserData.invertAxis as string)
        : "";
    const expectedSnout2Y =
      (snoutInvertAxis.includes("y") ? -1 : 1) * (snout2Ty / PX);
    expect(snout2!.position.y).toBeCloseTo(expectedSnout2Y, 6);

    const headpieceSnoutUserData = (headpieceSnout as any).userData ?? {};
    expect(headpieceSnoutUserData.absoluteTranslationSpace).toBe("local");
    const headpieceSnoutAxes =
      typeof headpieceSnoutUserData.absoluteTranslationAxes === "string"
        ? (headpieceSnoutUserData.absoluteTranslationAxes as string)
        : "";
    expect(headpieceSnoutAxes).toContain("y");

    const headpieceSnoutTy = engine.getBoneValue("headpiece_snout", "ty");
    const headpieceSnoutInvertAxis =
      typeof headpieceSnoutUserData.invertAxis === "string"
        ? (headpieceSnoutUserData.invertAxis as string)
        : "";
    const expectedHeadpieceSnoutY =
      (headpieceSnoutInvertAxis.includes("y") ? -1 : 1) *
      (headpieceSnoutTy / PX);
    expect(headpieceSnout!.position.y).toBeCloseTo(expectedHeadpieceSnoutY, 6);
  });
});
