import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import * as THREE from "three";
import { parseJEM, jemToThreeJS, type JEMFile } from "../jemLoader";
import { AnimationEngine } from "./AnimationEngine";

const PX = 16;

describe("Fresh Animations (piglin) snout transforms", () => {
  it("treats nose/tusks ty as local absolute (not additive)", () => {
    const jemPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/piglin.jem",
    );
    const jpmPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/piglin_animations.jpm",
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

    const nose = group.getObjectByName("nose") as THREE.Object3D | null;
    const tusks = group.getObjectByName("tusks") as THREE.Object3D | null;
    expect(nose).toBeTruthy();
    expect(tusks).toBeTruthy();
    expect(nose!.parent?.name).toBe("head2");
    expect(tusks!.parent?.name).toBe("head2");

    const noseTy = engine.getBoneValue("nose", "ty");
    const tusksTy = engine.getBoneValue("tusks", "ty");

    // Piglin nose/tusks use invertAxis="xy" and local-absolute semantics, so:
    //   y = -ty/16
    expect(nose!.position.y).toBeCloseTo(-noseTy / PX, 6);
    expect(tusks!.position.y).toBeCloseTo(-tusksTy / PX, 6);
  });
});
