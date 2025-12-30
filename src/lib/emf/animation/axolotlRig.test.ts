import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import * as THREE from "three";
import { parseJEM, jemToThreeJS, type JEMFile } from "../jemLoader";
import { AnimationEngine } from "./AnimationEngine";

const getMeshSide = (mesh: THREE.Mesh): THREE.Side => {
  const mat = mesh.material;
  if (Array.isArray(mat)) return mat[0]?.side ?? THREE.FrontSide;
  return (mat as THREE.Material).side ?? THREE.FrontSide;
};

describe("Fresh Animations (axolotl) rig", () => {
  it("does not snap body to rotationPointY=0 when body.ty is a zeroed channel", () => {
    const jemPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/axolotl.jem",
    );
    const jpmPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/axolotl_animations.jpm",
    );

    const jem = JSON.parse(readFileSync(jemPath, "utf-8")) as JEMFile;
    const jpm = JSON.parse(readFileSync(jpmPath, "utf-8")) as {
      animations?: Record<string, any>[];
    };

    const parsed = parseJEM(jem);
    parsed.animations = jpm.animations as any;

    const group = jemToThreeJS(parsed, null, {});
    const body = group.getObjectByName("body") as THREE.Object3D | null;
    expect(body).toBeTruthy();
    const restY = body!.position.y;

    const engine = new AnimationEngine(group, parsed.animations);
    engine.setPreset("idle", true);
    engine.tick(0);

    // Some rigs require a small post-eval correction to keep the torso/legs
    // attached; allow for that, but ensure we don't snap to rotationPointY=0
    // (which would move the body up to ~24px/16 = 1.5 in our space).
    expect(Math.abs(body!.position.y - restY)).toBeLessThan(0.25);
  });

  it("renders planar boxes as DoubleSide even when inflated", () => {
    const jemPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/axolotl.jem",
    );
    const jem = JSON.parse(readFileSync(jemPath, "utf-8")) as JEMFile;
    const parsed = parseJEM(jem);
    const group = jemToThreeJS(parsed, null, {});

    const tail2 = group.getObjectByName("tail2_box0") as THREE.Mesh | null;
    const backFin = group.getObjectByName("back_fin_box0") as THREE.Mesh | null;
    const leg5 = group.getObjectByName("leg5_box0") as THREE.Mesh | null;

    expect(tail2).toBeTruthy();
    expect(backFin).toBeTruthy();
    expect(leg5).toBeTruthy();

    expect(getMeshSide(tail2!)).toBe(THREE.DoubleSide);
    expect(getMeshSide(backFin!)).toBe(THREE.DoubleSide);
    expect(getMeshSide(leg5!)).toBe(THREE.DoubleSide);
  });

  it("keeps head2 near its JEM rest height under idle", () => {
    const jemPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/axolotl.jem",
    );
    const jpmPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/axolotl_animations.jpm",
    );

    const jem = JSON.parse(readFileSync(jemPath, "utf-8")) as JEMFile;
    const jpm = JSON.parse(readFileSync(jpmPath, "utf-8")) as {
      animations?: Record<string, any>[];
    };

    const parsed = parseJEM(jem);
    parsed.animations = jpm.animations as any;

    const group = jemToThreeJS(parsed, null, {});
    const head2 = group.getObjectByName("head2") as THREE.Object3D | null;
    expect(head2).toBeTruthy();

    const engine = new AnimationEngine(group, parsed.animations);
    engine.setPreset("idle", true);
    engine.tick(0);

    // `head2` is authored under the `body` part; it should not be snapped to an
    // absolute rotationPointY origin by quadruped heuristics.
    expect(Math.abs(head2!.position.y)).toBeLessThan(0.2);
  });

  it("preserves the authored land-leg splay angle (rz) under idle", () => {
    const jemPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/axolotl.jem",
    );
    const jpmPath = join(
      __dirname,
      "../../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/axolotl_animations.jpm",
    );

    const jem = JSON.parse(readFileSync(jemPath, "utf-8")) as JEMFile;
    const jpm = JSON.parse(readFileSync(jpmPath, "utf-8")) as {
      animations?: Record<string, any>[];
    };

    const parsed = parseJEM(jem);
    parsed.animations = jpm.animations as any;

    const group = jemToThreeJS(parsed, null, {});
    const leg1 = group.getObjectByName("leg1") as THREE.Object3D | null;
    expect(leg1).toBeTruthy();

    const engine = new AnimationEngine(group, parsed.animations);
    engine.setPreset("idle", true);
    engine.tick(0);

    // Land legs are posed with a large Z rotation (≈70°) at rest. This should be
    // treated as an intentional idle pose, not a calibration offset to subtract.
    expect(Math.abs(leg1!.rotation.z)).toBeGreaterThan(1.0);
  });
});
