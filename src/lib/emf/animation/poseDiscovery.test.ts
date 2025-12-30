import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { getAvailablePoseToggleIdsForAnimationLayers } from "./poseDiscovery";

describe("pose toggle discovery", () => {
  it("returns null when no CEM animation layers exist", () => {
    expect(getAvailablePoseToggleIdsForAnimationLayers(undefined)).toBeNull();
    expect(getAvailablePoseToggleIdsForAnimationLayers([] as any)).toBeNull();
  });

  it("detects piglin pose toggles via var.crossbow/melee variables", () => {
    const jpmPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/piglin_animations.jpm",
    );
    const jpm = JSON.parse(readFileSync(jpmPath, "utf-8")) as {
      animations?: Record<string, any>[];
    };

    const ids = getAvailablePoseToggleIdsForAnimationLayers(jpm.animations as any);
    expect(ids).not.toBeNull();
    expect(ids!).toContain("pose.aim_crossbow");
    expect(ids!).toContain("pose.hold_axe_right");
    expect(ids!).toContain("pose.hold_axe_left");
  });
});

