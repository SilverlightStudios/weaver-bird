import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import * as THREE from "three";
import { parseJEM, jemToThreeJS, type JEMFile } from "../jemLoader";
import { AnimationEngine } from "./AnimationEngine";

describe("Fresh Animations (sniffer) playback sanity", () => {
  const loadEngine = (): { group: THREE.Group; engine: AnimationEngine } => {
    const jemPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/sniffer.jem",
    );
    const jpmPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/sniffer_animations.jpm",
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

  it("does not force the sniffer into digging mode under ground presets", () => {
    const { engine } = loadEngine();

    engine.setPreset("walking", true);
    for (let i = 0; i < 20; i++) engine.tick(0.05);

    // FA sniffer uses `var.digging` as a stateful integrator. Ensure the value
    // stays within its intended [0,1] clamp range.
    const digging = engine.getVariable("digging");
    expect(digging).toBeGreaterThanOrEqual(0);
    expect(digging).toBeLessThanOrEqual(1);
  });

  it("animates leg swing under the walking preset (not identical to idle)", () => {
    const tickOnce = (preset: "idle" | "walking") => {
      const { group, engine } = loadEngine();
      engine.setPreset(preset, true);
      // Advance enough for limb_swing to move and for expressions to evaluate.
      engine.tick(0.1);

      const leg = group.getObjectByName("front_left_leg") as THREE.Object3D | null;
      expect(leg).toBeTruthy();
      return leg!.rotation.x;
    };

    const idleRot = tickOnce("idle");
    const walkRot = tickOnce("walking");

    expect(Math.abs(walkRot - idleRot)).toBeGreaterThan(0.02);
  });

  it("does not push the swimming body far above rest", () => {
    const { group, engine } = loadEngine();

    engine.setPreset("swimming", false);
    engine.tick(0);

    const body = group.getObjectByName("body") as THREE.Object3D | null;
    expect(body).toBeTruthy();

    const frontLeft = group.getObjectByName("front_left_leg") as THREE.Object3D | null;
    const middleLeft = group.getObjectByName("middle_left_leg") as THREE.Object3D | null;
    const backLeft = group.getObjectByName("back_left_leg") as THREE.Object3D | null;
    expect(frontLeft).toBeTruthy();
    expect(middleLeft).toBeTruthy();
    expect(backLeft).toBeTruthy();

    // Swimming preset should not collapse legs into the torso.
    expect(body!.position.y - frontLeft!.position.y).toBeGreaterThan(0.35);
    expect(body!.position.y - middleLeft!.position.y).toBeGreaterThan(0.35);
    expect(body!.position.y - backLeft!.position.y).toBeGreaterThan(0.35);

    // Keep the body in a reasonable range (it should not jump to ~2.0y).
    expect(body!.position.y).toBeGreaterThan(0.3);
    expect(body!.position.y).toBeLessThan(1.5);
  });
});
