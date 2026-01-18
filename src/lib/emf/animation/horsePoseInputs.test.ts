import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import type * as THREE from "three";
import { parseJEM, jemToThreeJS, type JEMFile, type ParsedPart, type ParsedEntityModel } from "../jemLoader";
import { AnimationEngine } from "./AnimationEngine";
import type { AnimationLayer } from "../types";

function indexPartsByName(parts: ParsedPart[]): Map<string, ParsedPart> {
  const map = new Map<string, ParsedPart>();
  const visit = (part: ParsedPart) => {
    map.set(part.name, part);
    for (const child of part.children ?? []) visit(child);
  };
  for (const part of parts) visit(part);
  return map;
}

function mergeVanillaPivotsIntoAttachPlaceholders(parsed: ParsedEntityModel, vanilla: ParsedEntityModel) {
  const vanillaMap = indexPartsByName(vanilla.parts);
  const apply = (part: ParsedPart) => {
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

describe("Fresh Animations (horse) JPM input bones", () => {
  it("seeds placeholder bone values so `var.Nty = neck.ty` doesn't force rearing", () => {
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
      animations?: AnimationLayer[];
    };

    const parsed = parseJEM(faJem);
    parsed.animations = jpm.animations;

    const groupUnmerged = jemToThreeJS(parsed, null, {});
    const engineUnmerged = new AnimationEngine(groupUnmerged, parsed.animations);
    engineUnmerged.tick(0);

    // The horse-family rig uses `neck.ty` as a vanilla-driven state input.
    // Our engine seeds a neutral default so it doesn't start in rearing/eating.
    expect(engineUnmerged.getVariable("Nty")).toBeCloseTo(4, 3);
    expect(engineUnmerged.getVariable("rearing")).toBeCloseTo(0, 3);
    expect(engineUnmerged.getVariable("eating")).toBeCloseTo(0, 3);

    const parsedMerged = parseJEM(faJem);
    parsedMerged.animations = jpm.animations;
    const vanillaParsed = parseJEM(vanillaJem);
    mergeVanillaPivotsIntoAttachPlaceholders(parsedMerged, vanillaParsed);

    const group = jemToThreeJS(parsedMerged, null, {});
    const engine = new AnimationEngine(group, parsedMerged.animations);
    engine.tick(0);

    // With vanilla pivots merged and rest bone values seeded, `neck.ty` is
    // meaningful and should not trigger rearing by default.
    expect(engine.getVariable("Nty")).toBeCloseTo(4, 3);
    expect(engine.getVariable("rearing")).toBeCloseTo(0, 3);
    expect(engine.getVariable("eating")).toBeCloseTo(0, 3);

    const neck = group.getObjectByName("neck") as THREE.Object3D | null;
    expect(neck).toBeTruthy();
  });
});
