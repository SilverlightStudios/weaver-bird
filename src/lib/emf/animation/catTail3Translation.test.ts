import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import * as THREE from "three";
import { parseJEM, jemToThreeJS, type JEMFile } from "../jemLoader";
import { AnimationEngine } from "./AnimationEngine";

const PX = 16;

describe("Fresh Animations (cat) tail3 translation", () => {
  it("treats tail3.ty/tail3.tz as absolute origin values (not additive)", () => {
    const jemPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/cat.jem",
    );
    const jpmPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/cat_animations.jpm",
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

    const tail3 = group.getObjectByName("tail3") as THREE.Object3D | null;
    const body = group.getObjectByName("body") as THREE.Object3D | null;
    expect(tail3).toBeTruthy();
    expect(body).toBeTruthy();
    expect(tail3!.parent?.name).toBe("body");

    const tail3UserData = (tail3 as any).userData ?? {};
    const absoluteAxes =
      typeof tail3UserData.absoluteTranslationAxes === "string"
        ? (tail3UserData.absoluteTranslationAxes as string)
        : "";
    expect(absoluteAxes).toContain("y");
    expect(absoluteAxes).toContain("z");
    expect(tail3UserData.cemYOriginPx).toBe(0);

    const ty = engine.getBoneValue("tail3", "ty");
    const tz = engine.getBoneValue("tail3", "tz");

    const bodyOriginPx = Array.isArray((body as any).userData?.originPx)
      ? ((body as any).userData.originPx as [number, number, number])
      : ([0, 0, 0] as [number, number, number]);

    const invertAxis =
      typeof tail3UserData.invertAxis === "string"
        ? (tail3UserData.invertAxis as string)
        : "";
    const cemYOriginPx =
      typeof tail3UserData.cemYOriginPx === "number"
        ? (tail3UserData.cemYOriginPx as number)
        : 24;

    const expectedOriginY =
      invertAxis.includes("y") ? (cemYOriginPx - ty) / PX : (ty - cemYOriginPx) / PX;
    const expectedY = expectedOriginY - bodyOriginPx[1] / PX;
    const expectedZ =
      ((invertAxis.includes("z") ? -tz : tz) - bodyOriginPx[2]) / PX;

    expect(tail3!.position.y).toBeCloseTo(expectedY, 6);
    expect(tail3!.position.z).toBeCloseTo(expectedZ, 6);
  });
});

