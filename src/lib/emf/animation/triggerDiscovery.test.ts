import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { getAvailableAnimationTriggerIdsForAnimationLayers } from "./triggerDiscovery";
import { parseJEM, type JEMFile } from "../jemLoader";

describe("trigger discovery", () => {
  it("detects horse-family triggers (rearing/eating) and core state triggers", () => {
    const jpmPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/horse_animations.jpm",
    );
    const jpm = JSON.parse(readFileSync(jpmPath, "utf-8")) as {
      animations?: Record<string, any>[];
    };

    const triggers = getAvailableAnimationTriggerIdsForAnimationLayers(
      jpm.animations as any,
    );

    expect(triggers).toContain("trigger.horse_rearing");
    expect(triggers).toContain("trigger.eat");
    // FA horse uses hurt/death/swing variables in later layers.
    expect(triggers).toContain("trigger.hurt");
    expect(triggers).toContain("trigger.death");
  });

  it("detects sheep eating trigger via var.eat", () => {
    const jpmPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/sheep_animations.jpm",
    );
    const jpm = JSON.parse(readFileSync(jpmPath, "utf-8")) as {
      animations?: Record<string, any>[];
    };

    const triggers = getAvailableAnimationTriggerIdsForAnimationLayers(
      jpm.animations as any,
    );

    expect(triggers).toContain("trigger.eat");
  });

  it("detects chicken eating trigger via var.NAeat/varb.index_eat", () => {
    const jemPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/chicken.jem",
    );
    const jpmPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/chicken_animations.jpm",
    );
    const jem = JSON.parse(readFileSync(jemPath, "utf-8")) as JEMFile;
    const jpm = JSON.parse(readFileSync(jpmPath, "utf-8")) as {
      animations?: Record<string, any>[];
    };

    const parsed = parseJEM(jem);
    const layers = [
      ...(parsed.animations ?? []),
      ...((jpm.animations ?? []) as any),
    ];

    const triggers = getAvailableAnimationTriggerIdsForAnimationLayers(
      layers as any,
    );

    expect(triggers).toContain("trigger.eat");
  });

  it("does not include hurt/death triggers if the model does not reference them", () => {
    const jpmPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/allay_animations.jpm",
    );
    const jpm = JSON.parse(readFileSync(jpmPath, "utf-8")) as {
      animations?: Record<string, any>[];
    };

    const triggers = getAvailableAnimationTriggerIdsForAnimationLayers(
      jpm.animations as any,
    );

    expect(triggers).not.toContain("trigger.horse_rearing");
    expect(triggers).not.toContain("trigger.eat");
  });
});
