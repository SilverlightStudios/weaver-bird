import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseJEM, jemToThreeJS, type JEMFile } from "../jemLoader";
import { AnimationEngine } from "./AnimationEngine";

function indexPartsByName(parts: any[]): Map<string, any> {
  const map = new Map<string, any>();
  const visit = (part: any) => {
    map.set(part.name, part);
    for (const child of part.children ?? []) visit(child);
  };
  for (const part of parts) visit(part);
  return map;
}

function mergeVanillaPivotsIntoAttachPlaceholders(parsed: any, vanilla: any) {
  const vanillaMap = indexPartsByName(vanilla.parts);
  const apply = (part: any) => {
    if ((part.boxes?.length ?? 0) === 0 && (part.children?.length ?? 0) === 0) {
      const vanillaPart = vanillaMap.get(part.name);
      if (vanillaPart) {
        part.origin = [...vanillaPart.origin];
        part.rotation = [...vanillaPart.rotation];
        part.scale = vanillaPart.scale;
      }
    }
    for (const child of part.children ?? []) apply(child);
  };
  for (const part of parsed.parts ?? []) apply(part);
}

describe("Animation trigger overlays", () => {
  it("plays a one-shot horse rearing overlay without changing the base preset", () => {
    const faJemPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/horse.jem",
    );
    const vanillaJemPath = join(__dirname, "../../../../__mocks__/cem/horse.jem");
    const jpmPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/horse_animations.jpm",
    );

    const faJem = JSON.parse(readFileSync(faJemPath, "utf-8")) as JEMFile;
    const vanillaJem = JSON.parse(
      readFileSync(vanillaJemPath, "utf-8"),
    ) as JEMFile;
    const jpm = JSON.parse(readFileSync(jpmPath, "utf-8")) as {
      animations?: Record<string, any>[];
    };

    const parsed = parseJEM(faJem);
    parsed.animations = jpm.animations as any;
    const vanillaParsed = parseJEM(vanillaJem);
    mergeVanillaPivotsIntoAttachPlaceholders(parsed, vanillaParsed);

    const group = jemToThreeJS(parsed, null, {});
    const engine = new AnimationEngine(group, parsed.animations);

    engine.setPreset("walking", true);
    engine.tick(0.05);
    const limbSwingBefore = engine.getEntityState().limb_swing;

    engine.playTrigger("trigger.horse_rearing");
    engine.tick(0.5);

    expect(engine.getVariable("rearing")).toBeGreaterThan(0.7);
    expect(engine.getEntityState().limb_swing).toBeGreaterThan(limbSwingBefore);
  });

  it("plays a one-shot hurt overlay by setting and decaying hurt_time", () => {
    const jemPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/skeleton.jem",
    );
    const jpmPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/skeleton_animations.jpm",
    );

    const jem = JSON.parse(readFileSync(jemPath, "utf-8")) as JEMFile;
    const jpm = JSON.parse(readFileSync(jpmPath, "utf-8")) as {
      animations?: Record<string, any>[];
    };

    const parsed = parseJEM(jem);
    parsed.animations = jpm.animations as any;

    const group = jemToThreeJS(parsed, null, {});
    const engine = new AnimationEngine(group, parsed.animations);

    const baseY = group.position.y;

    engine.playTrigger("trigger.hurt");
    engine.tick(0.05);

    expect(engine.getEntityState().hurt_time).toBeGreaterThan(7);
    expect(engine.getEntityState().hurt_time).toBeLessThanOrEqual(10);
    expect(group.position.y).toBeGreaterThan(baseY);

    // After enough time, the overlay displacement should return to base.
    engine.tick(1.0);
    expect(group.position.y).toBeCloseTo(baseY, 3);
  });
});
