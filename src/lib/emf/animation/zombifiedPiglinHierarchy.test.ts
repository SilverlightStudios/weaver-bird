import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseJEM, jemToThreeJS, type JEMFile } from "../jemLoader";
import { createAnimationEngine } from "./AnimationEngine";

describe("Fresh Animations (zombified piglin) hierarchy", () => {
  it("avoids re-parenting head under body when body translations reference head translations", () => {
    const jemPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/zombified_piglin.jem",
    );
    const jpmPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/zombified_piglin_animations.jpm",
    );

    const jem = JSON.parse(readFileSync(jemPath, "utf-8")) as JEMFile;
    const jpm = JSON.parse(readFileSync(jpmPath, "utf-8")) as {
      animations?: any[];
    };

    const parsed = parseJEM(jem);
    parsed.animations = jpm.animations ?? [];

    const group = jemToThreeJS(parsed, null, {});
    const engine = createAnimationEngine(group, parsed.animations);

    engine.setPreset("idle", true);
    engine.tick(0.05);

    const head = group.getObjectByName("head");
    const body = group.getObjectByName("body");
    expect(head).toBeTruthy();
    expect(body).toBeTruthy();

    // `body.tx/ty/tz` are authored in terms of `head.t*`, so parenting `head` under
    // `body` would double-apply translations.
    expect(head!.parent?.name).not.toBe("body");
  });
});

