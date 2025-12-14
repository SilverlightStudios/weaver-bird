import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import * as THREE from "three";
import { parseJEM, jemToThreeJS, type JEMFile } from "../jemLoader";
import { AnimationEngine } from "./AnimationEngine";

const PX = 16;

describe("Fresh Animations (pig) pupil transforms", () => {
  it("treats r_pupil/l_pupil translations as local absolute (not additive)", () => {
    const jemPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/pig.jem",
    );
    const jpmPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/pig_animations.jpm",
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

    const rPupil = group.getObjectByName("r_pupil") as THREE.Object3D | null;
    const lPupil = group.getObjectByName("l_pupil") as THREE.Object3D | null;
    expect(rPupil).toBeTruthy();
    expect(lPupil).toBeTruthy();
    expect(rPupil!.parent?.name).toBe("right_eye");
    expect(lPupil!.parent?.name).toBe("left_eye");

    const rTx = engine.getBoneValue("r_pupil", "tx");
    const rTy = engine.getBoneValue("r_pupil", "ty");
    const lTx = engine.getBoneValue("l_pupil", "tx");
    const lTy = engine.getBoneValue("l_pupil", "ty");

    // Pupils use invertAxis="xy" and local-absolute semantics, so:
    //   x = -tx/16, y = -ty/16
    expect(rPupil!.position.x).toBeCloseTo(-rTx / PX, 6);
    expect(rPupil!.position.y).toBeCloseTo(-rTy / PX, 6);
    expect(lPupil!.position.x).toBeCloseTo(-lTx / PX, 6);
    expect(lPupil!.position.y).toBeCloseTo(-lTy / PX, 6);
  });
});

