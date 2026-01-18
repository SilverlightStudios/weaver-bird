import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import type * as THREE from "three";
import { parseJEM, jemToThreeJS, type JEMFile } from "../jemLoader";
import { AnimationEngine } from "./AnimationEngine";
import type { AnimationLayer, BoneWithUserData } from "../types";

const PX = 16;

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
    const coatUserData = coat!.userData;
    const coatAxes =
      typeof coatUserData.absoluteTranslationAxes === "string"
        ? (coatUserData.absoluteTranslationAxes as string)
        : "";
    expect(coatAxes).toContain("y");
    expect(coatUserData.cemYOriginPx).toBe(0);

    const coatTy = engine.getBoneValue("coat", "ty");
    const bodyOriginPx = Array.isArray(body!.userData?.originPx)
      ? (body!.userData.originPx as [number, number, number])
      : ([0, 0, 0] as [number, number, number]);
    const coatInvertAxis =
      typeof coatUserData.invertAxis === "string"
        ? (coatUserData.invertAxis as string)
        : "";
    const coatCemYOriginPx =
      typeof coatUserData.cemYOriginPx === "number"
        ? (coatUserData.cemYOriginPx as number)
        : 24;
    const expectedCoatOriginY =
      coatInvertAxis.includes("y")
        ? (coatCemYOriginPx - coatTy) / PX
        : (coatTy - coatCemYOriginPx) / PX;
    const expectedCoatY = expectedCoatOriginY - bodyOriginPx[1] / PX;
    expect(coat!.position.y).toBeCloseTo(expectedCoatY, 6);

    // Mouth: FA goat sets mouth.ty/mouth.tz as absolute local positions, not offsets.
    expect(mouth!.parent?.name).toBe("snout");
    const mouthUserData = mouth!.userData;
    const mouthAxes =
      typeof mouthUserData.absoluteTranslationAxes === "string"
        ? (mouthUserData.absoluteTranslationAxes as string)
        : "";
    expect(mouthAxes).toContain("y");
    expect(mouthAxes).toContain("z");
    expect(mouthUserData.absoluteTranslationSpace).toBe("local");

    const mouthTy = engine.getBoneValue("mouth", "ty");
    const mouthTz = engine.getBoneValue("mouth", "tz");
    const mouthInvertAxis =
      typeof mouthUserData.invertAxis === "string"
        ? (mouthUserData.invertAxis as string)
        : "";
    const expectedMouthY =
      (mouthInvertAxis.includes("y") ? -1 : 1) * (mouthTy / PX);
    const expectedMouthZ =
      (mouthInvertAxis.includes("z") ? -1 : 1) * (mouthTz / PX);
    expect(mouth!.position.y).toBeCloseTo(expectedMouthY, 6);
    expect(mouth!.position.z).toBeCloseTo(expectedMouthZ, 6);

    // Eyes: `right_eye.tx` and `left_eye.tx` include the base translate.
    expect(rightEye!.parent?.name).toBe("eyes");
    expect(leftEye!.parent?.name).toBe("eyes");
    const rightEyeUserData = rightEye!.userData;
    const rightEyeAxes =
      typeof rightEyeUserData.absoluteTranslationAxes === "string"
        ? (rightEyeUserData.absoluteTranslationAxes as string)
        : "";
    expect(rightEyeAxes).toContain("x");
    expect(rightEyeUserData.absoluteTranslationSpace).toBe("local");

    const rightEyeTx = engine.getBoneValue("right_eye", "tx");
    const leftEyeTx = engine.getBoneValue("left_eye", "tx");
    const eyeInvertAxis =
      typeof rightEyeUserData.invertAxis === "string"
        ? (rightEyeUserData.invertAxis as string)
        : "";
    const expectedRightEyeX =
      (eyeInvertAxis.includes("x") ? -1 : 1) * (rightEyeTx / PX);
    const expectedLeftEyeX =
      (eyeInvertAxis.includes("x") ? -1 : 1) * (leftEyeTx / PX);
    expect(rightEye!.position.x).toBeCloseTo(expectedRightEyeX, 6);
    expect(leftEye!.position.x).toBeCloseTo(expectedLeftEyeX, 6);
  });
});

