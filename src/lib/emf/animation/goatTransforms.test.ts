import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

import { parseJEM, jemToThreeJS, type JEMFile } from "../jemLoader";
import { AnimationEngine } from "./AnimationEngine";
import type { AnimationLayer, BoneWithUserData } from "../types";

const PX = 16;

// Helper functions for test assertions
function getAbsoluteAxes(bone: BoneWithUserData): string {
  return typeof bone.userData.absoluteTranslationAxes === "string"
    ? (bone.userData.absoluteTranslationAxes as string)
    : "";
}

function getInvertAxis(bone: BoneWithUserData): string {
  return typeof bone.userData.invertAxis === "string"
    ? (bone.userData.invertAxis as string)
    : "";
}

function getCemYOriginPx(bone: BoneWithUserData): number {
  return typeof bone.userData.cemYOriginPx === "number"
    ? (bone.userData.cemYOriginPx as number)
    : 24;
}

function getOriginPx(bone: BoneWithUserData): [number, number, number] {
  return Array.isArray(bone.userData?.originPx)
    ? (bone.userData.originPx as [number, number, number])
    : [0, 0, 0];
}

function computeCoatExpectedY(
  coatTy: number,
  coatUserData: Record<string, unknown>,
  bodyOriginPx: [number, number, number]
): number {
  const coatInvertAxis = getInvertAxis({ userData: coatUserData } as BoneWithUserData);
  const coatCemYOriginPx = getCemYOriginPx({ userData: coatUserData } as BoneWithUserData);
  const expectedCoatOriginY = coatInvertAxis.includes("y")
    ? (coatCemYOriginPx - coatTy) / PX
    : (coatTy - coatCemYOriginPx) / PX;
  return expectedCoatOriginY - bodyOriginPx[1] / PX;
}

function computeExpectedPosition(value: number, invertAxis: string, axis: string): number {
  return (invertAxis.includes(axis) ? -1 : 1) * (value / PX);
}

describe("Fresh Animations (goat) translation semantics", () => {
  it("treats coat/mouth/eye translations as authored (absolute, not additive)", () => {
    const jemPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/goat.jem",
    );
    const jpmPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/goat_animations.jpm",
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
    const coat = group.getObjectByName("coat") as BoneWithUserData | null;
    const mouth = group.getObjectByName("mouth") as BoneWithUserData | null;
    const rightEye = group.getObjectByName("right_eye") as BoneWithUserData | null;
    const leftEye = group.getObjectByName("left_eye") as BoneWithUserData | null;

    expect(body).toBeTruthy();
    expect(coat).toBeTruthy();
    expect(mouth).toBeTruthy();
    expect(rightEye).toBeTruthy();
    expect(leftEye).toBeTruthy();

    // Coat: `coat.ty` in FA goat is an absolute origin value (CEM-space),
    // so we treat Y as absolute with a 0px Y origin.
    expect(coat!.parent?.name).toBe("body");
    const coatAxes = getAbsoluteAxes(coat!);
    expect(coatAxes).toContain("y");
    expect(coat!.userData.cemYOriginPx).toBe(0);

    const coatTy = engine.getBoneValue("coat", "ty");
    const bodyOriginPx = getOriginPx(body!);
    const expectedCoatY = computeCoatExpectedY(coatTy, coat!.userData, bodyOriginPx);
    expect(coat!.position.y).toBeCloseTo(expectedCoatY, 6);

    // Mouth: FA goat sets mouth.ty/mouth.tz as absolute local positions, not offsets.
    expect(mouth!.parent?.name).toBe("snout");
    const mouthAxes = getAbsoluteAxes(mouth!);
    expect(mouthAxes).toContain("y");
    expect(mouthAxes).toContain("z");
    expect(mouth!.userData.absoluteTranslationSpace).toBe("local");

    const mouthTy = engine.getBoneValue("mouth", "ty");
    const mouthTz = engine.getBoneValue("mouth", "tz");
    const mouthInvertAxis = getInvertAxis(mouth!);
    const expectedMouthY = computeExpectedPosition(mouthTy, mouthInvertAxis, "y");
    const expectedMouthZ = computeExpectedPosition(mouthTz, mouthInvertAxis, "z");
    expect(mouth!.position.y).toBeCloseTo(expectedMouthY, 6);
    expect(mouth!.position.z).toBeCloseTo(expectedMouthZ, 6);

    // Eyes: `right_eye.tx` and `left_eye.tx` include the base translate.
    expect(rightEye!.parent?.name).toBe("eyes");
    expect(leftEye!.parent?.name).toBe("eyes");
    const rightEyeAxes = getAbsoluteAxes(rightEye!);
    expect(rightEyeAxes).toContain("x");
    expect(rightEye!.userData.absoluteTranslationSpace).toBe("local");

    const rightEyeTx = engine.getBoneValue("right_eye", "tx");
    const leftEyeTx = engine.getBoneValue("left_eye", "tx");
    const eyeInvertAxis = getInvertAxis(rightEye!);
    const expectedRightEyeX = computeExpectedPosition(rightEyeTx, eyeInvertAxis, "x");
    const expectedLeftEyeX = computeExpectedPosition(leftEyeTx, eyeInvertAxis, "x");
    expect(rightEye!.position.x).toBeCloseTo(expectedRightEyeX, 6);
    expect(leftEye!.position.x).toBeCloseTo(expectedLeftEyeX, 6);
  });
});

