import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseJEM, type JEMFile, jemToThreeJS } from "../jemLoader";
import { AnimationEngine } from "./AnimationEngine";
import type { AnimationLayer } from "../types";

describe("Fresh Animations (blaze) cross-bone translation handling", () => {
  it("does not baseline-normalize cross-bone `rod*.ty = stick*.ty + k` channels", () => {
    const jemPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/blaze.jem",
    );
    const jpmPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/blaze_animations.jpm",
    );

    const jem = JSON.parse(readFileSync(jemPath, "utf-8")) as JEMFile;
    const jpm = JSON.parse(readFileSync(jpmPath, "utf-8")) as {
      animations?: AnimationLayer[];
    };

    const parsed = parseJEM(jem);
    parsed.animations = [
      ...(parsed.animations ?? []),
      ...(jpm.animations ?? []),
    ];

    const group = jemToThreeJS(parsed, null, {});
    const engine = new AnimationEngine(group, parsed.animations);

    // stick* bones are vanilla-driven placeholders; without runtime values we seed them to 0.
    expect(engine.getBoneValue("stick1", "ty")).toBeCloseTo(0, 2);
    expect(engine.getBoneValue("stick5", "ty")).toBeCloseTo(0, 2);

    // The rods author Y as a cross-bone translation (reads stickN.ty), so the
    // baseline should remain non-zero (i.e. not subtracted away by normalization).
    expect(engine.getBaselineBoneValue("rod1", "ty")).toBeCloseTo(4, 1);
    expect(engine.getBaselineBoneValue("rod5", "ty")).toBeCloseTo(6, 1);
  });
});
