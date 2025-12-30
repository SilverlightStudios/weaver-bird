import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { getAvailableAnimationPresetIdsForAnimationLayers } from "./presetDiscovery";

describe("preset discovery", () => {
  it("returns null when no CEM animation layers exist", () => {
    expect(getAvailableAnimationPresetIdsForAnimationLayers(undefined)).toBeNull();
    expect(getAvailableAnimationPresetIdsForAnimationLayers([])).toBeNull();
  });

  it("includes riding only when is_riding is referenced", () => {
    const layers = [
      {
        "body.rx": "if(is_riding, 1, 0)",
      },
    ];

    const ids = getAvailableAnimationPresetIdsForAnimationLayers(layers);
    expect(ids).not.toBeNull();
    expect(ids!).toContain("idle");
    expect(ids!).toContain("riding");
    expect(ids!).not.toContain("baby");
  });

  it("does not include baby just because limb_swing is used", () => {
    const layers = [
      {
        "leg1.rx": "sin(limb_swing)",
      },
    ];

    const ids = getAvailableAnimationPresetIdsForAnimationLayers(layers);
    expect(ids).not.toBeNull();
    expect(ids!).toContain("walking");
    expect(ids!).toContain("sprinting");
    expect(ids!).not.toContain("baby");
  });

  it("does not treat pose vars (crossbow/melee) as presets", () => {
    const jpmPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/piglin_animations.jpm",
    );
    const jpm = JSON.parse(readFileSync(jpmPath, "utf-8")) as {
      animations?: Record<string, any>[];
    };

    const ids = getAvailableAnimationPresetIdsForAnimationLayers(jpm.animations as any);
    expect(ids).not.toBeNull();
    expect(ids!).toContain("walking");
    expect(ids!).toContain("sprinting");
    expect(ids!).not.toContain("aim_crossbow");
    expect(ids!).not.toContain("hold_axe_right");
    expect(ids!).not.toContain("hold_axe_left");
  });
});
