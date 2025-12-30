import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import * as THREE from "three";
import { parseJEM, jemToThreeJS, type JEMFile } from "../jemLoader";
import { AnimationEngine } from "./AnimationEngine";

describe("Fresh Animations (dolphin) fin orientation", () => {
  const loadEngine = (): { group: THREE.Group; engine: AnimationEngine } => {
    const jemPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/dolphin.jem",
    );
    const jpmPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/dolphin_animations.jpm",
    );

    const jem = JSON.parse(readFileSync(jemPath, "utf-8")) as JEMFile;
    const jpm = JSON.parse(readFileSync(jpmPath, "utf-8")) as {
      animations?: Record<string, any>[];
    };

    const parsed = parseJEM(jem);
    parsed.animations = jpm.animations as any;

    const group = jemToThreeJS(parsed, null, {});
    const engine = new AnimationEngine(group, parsed.animations);
    return { group, engine };
  };

  it("keeps fins oriented outward under the swimming preset", () => {
    const { group, engine } = loadEngine();

    engine.setPreset("swimming", false);
    engine.tick(0);

    const right = group.getObjectByName("right_fin2") as THREE.Object3D | null;
    const left = group.getObjectByName("left_fin2") as THREE.Object3D | null;
    expect(right).toBeTruthy();
    expect(left).toBeTruthy();

    // Rest pose is around -90° / +90° Z with some motion on top; if we mistakenly
    // treat the land-flop baseline (-98°) as a calibration offset, the swim pose
    // ends up near 0° (fins rotate upward).
    expect(right!.rotation.z).toBeLessThan(-1.0);
    expect(left!.rotation.z).toBeGreaterThan(1.0);
  });
});

