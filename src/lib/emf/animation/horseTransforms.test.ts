import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseJEM, jemToThreeJS, type JEMFile } from "../jemLoader";
import { AnimationEngine } from "./AnimationEngine";
import type { AnimationLayer, BoneWithUserData } from "../types";

const PX = 16;

function getOriginPx(bone: BoneWithUserData | null): [number, number, number] {
  return Array.isArray(bone?.userData?.originPx)
    ? (bone.userData.originPx as [number, number, number])
    : [0, 0, 0];
}

function getAbsoluteTranslationAxes(userData: Record<string, unknown>): string {
  return typeof userData.absoluteTranslationAxes === "string"
    ? userData.absoluteTranslationAxes
    : "";
}

function getInvertAxis(userData: Record<string, unknown>): string {
  return typeof userData.invertAxis === "string" ? userData.invertAxis : "";
}

function calculateExpectedY(
  ty: number,
  invertAxis: string,
  originPxY: number,
): number {
  return (invertAxis.includes("y") ? -1 : 1) * (ty / PX) - originPxY / PX;
}

function calculateExpectedZ(
  tz: number,
  invertAxis: string,
  originPxZ: number,
): number {
  return ((invertAxis.includes("z") ? -1 : 1) * tz - originPxZ) / PX;
}

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
      animations?: AnimationLayer[];
    };

    const parsed = parseJEM(jem);
    parsed.animations = jpm.animations;

    const group = jemToThreeJS(parsed, null, {});
    const engine = new AnimationEngine(group, parsed.animations);

    engine.tick(0);

    const body = group.getObjectByName("body") as BoneWithUserData | null;
    const saddle = group.getObjectByName("saddle") as BoneWithUserData | null;
    const neck2 = group.getObjectByName("neck2") as BoneWithUserData | null;
    const tail2 = group.getObjectByName("tail2") as BoneWithUserData | null;
    const headpieceNeck = group.getObjectByName(
      "headpiece_neck",
    ) as BoneWithUserData | null;
    const snout2 = group.getObjectByName("snout2") as BoneWithUserData | null;
    const headpieceSnout = group.getObjectByName(
      "headpiece_snout",
    ) as BoneWithUserData | null;

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

    const bodyOriginPx = getOriginPx(body);

    // neck2.ty/tz are authored as absolute origin values with invertAxis="xy".
    const neck2UserData = neck2!.userData;
    const neck2Axes = getAbsoluteTranslationAxes(neck2UserData);
    expect(neck2Axes).toContain("y");
    expect(neck2Axes).toContain("z");
    expect(neck2UserData.cemYOriginPx).toBe(0);

    const neck2Ty = engine.getBoneValue("neck2", "ty");
    const neck2Tz = engine.getBoneValue("neck2", "tz");
    const neckInvertAxis = getInvertAxis(neck2UserData);

    const expectedNeck2Y = calculateExpectedY(neck2Ty, neckInvertAxis, bodyOriginPx[1]);
    const expectedNeck2Z = calculateExpectedZ(neck2Tz, neckInvertAxis, bodyOriginPx[2]);
    expect(neck2!.position.y).toBeCloseTo(expectedNeck2Y, 6);
    expect(neck2!.position.z).toBeCloseTo(expectedNeck2Z, 6);

    // tail2.ty is authored as an absolute origin value.
    const tail2UserData = tail2!.userData;
    const tail2Axes = getAbsoluteTranslationAxes(tail2UserData);
    expect(tail2Axes).toContain("y");
    expect(tail2UserData.cemYOriginPx).toBe(0);

    const tail2Ty = engine.getBoneValue("tail2", "ty");
    const tailInvertAxis = getInvertAxis(tail2UserData);
    const expectedTail2Y = calculateExpectedY(tail2Ty, tailInvertAxis, bodyOriginPx[1]);
    expect(tail2!.position.y).toBeCloseTo(expectedTail2Y, 6);

    // Tack copies neck2 translation values onto headpiece_neck, which should use
    // the same absolute translation semantics (relative to the saddle pivot).
    expect(headpieceNeck!.parent?.name).toBe("saddle");
    const saddleOriginPx = getOriginPx(saddle);

    const headpieceNeckUserData = headpieceNeck!.userData;
    const headpieceNeckAxes = getAbsoluteTranslationAxes(headpieceNeckUserData);
    expect(headpieceNeckAxes).toContain("y");
    expect(headpieceNeckAxes).toContain("z");
    expect(headpieceNeckUserData.cemYOriginPx).toBe(0);

    const headpieceNeckTy = engine.getBoneValue("headpiece_neck", "ty");
    const headpieceNeckTz = engine.getBoneValue("headpiece_neck", "tz");
    const headpieceNeckInvertAxis = getInvertAxis(headpieceNeckUserData);

    const expectedHeadpieceNeckY = calculateExpectedY(
      headpieceNeckTy,
      headpieceNeckInvertAxis,
      saddleOriginPx[1],
    );
    const expectedHeadpieceNeckZ = calculateExpectedZ(
      headpieceNeckTz,
      headpieceNeckInvertAxis,
      saddleOriginPx[2],
    );
    expect(headpieceNeck!.position.y).toBeCloseTo(expectedHeadpieceNeckY, 6);
    expect(headpieceNeck!.position.z).toBeCloseTo(expectedHeadpieceNeckZ, 6);

    // Snout translations include their base translate, so treat them as local absolute.
    const snout2UserData = snout2!.userData;
    expect(snout2UserData.absoluteTranslationSpace).toBe("local");
    const snout2Axes = getAbsoluteTranslationAxes(snout2UserData);
    expect(snout2Axes).toContain("y");

    const snout2Ty = engine.getBoneValue("snout2", "ty");
    const snoutInvertAxis = getInvertAxis(snout2UserData);
    const expectedSnout2Y = calculateExpectedY(snout2Ty, snoutInvertAxis, 0);
    expect(snout2!.position.y).toBeCloseTo(expectedSnout2Y, 6);

    const headpieceSnoutUserData = headpieceSnout!.userData;
    expect(headpieceSnoutUserData.absoluteTranslationSpace).toBe("local");
    const headpieceSnoutAxes = getAbsoluteTranslationAxes(headpieceSnoutUserData);
    expect(headpieceSnoutAxes).toContain("y");

    const headpieceSnoutTy = engine.getBoneValue("headpiece_snout", "ty");
    const headpieceSnoutInvertAxis = getInvertAxis(headpieceSnoutUserData);
    const expectedHeadpieceSnoutY = calculateExpectedY(headpieceSnoutTy, headpieceSnoutInvertAxis, 0);
    expect(headpieceSnout!.position.y).toBeCloseTo(expectedHeadpieceSnoutY, 6);
  });
});
