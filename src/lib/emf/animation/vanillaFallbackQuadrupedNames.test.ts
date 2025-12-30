import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createAnimationEngine } from "./AnimationEngine";

function makeBone(name: string): THREE.Group {
  const bone = new THREE.Group();
  bone.name = name;
  return bone;
}

describe("AnimationEngine vanilla fallback (quadruped leg naming)", () => {
  it("animates left/right front/hind legs when no JPM exists", () => {
    const group = new THREE.Group();
    group.name = "jem_entity";
    group.add(makeBone("left_front_leg"));
    group.add(makeBone("right_front_leg"));
    group.add(makeBone("left_hind_leg"));
    group.add(makeBone("right_hind_leg"));

    const engine = createAnimationEngine(group);
    engine.setPreset("walking", true);
    engine.tick(0.25);

    const lf = group.getObjectByName("left_front_leg")!;
    const rf = group.getObjectByName("right_front_leg")!;
    const lh = group.getObjectByName("left_hind_leg")!;
    const rh = group.getObjectByName("right_hind_leg")!;

    expect(Math.abs(lf.rotation.x)).toBeGreaterThan(1e-4);
    expect(lf.rotation.x).toBeCloseTo(rh.rotation.x, 6);
    expect(rf.rotation.x).toBeCloseTo(lh.rotation.x, 6);
    expect(lf.rotation.x).toBeCloseTo(-rf.rotation.x, 6);
  });

  it("supports *_rear_leg aliases (common on some exporters)", () => {
    const group = new THREE.Group();
    group.name = "jem_entity";
    group.add(makeBone("left_front_leg"));
    group.add(makeBone("right_front_leg"));
    group.add(makeBone("left_rear_leg"));
    group.add(makeBone("right_rear_leg"));

    const engine = createAnimationEngine(group);
    engine.setPreset("walking", true);
    engine.tick(0.25);

    const lf = group.getObjectByName("left_front_leg")!;
    const rf = group.getObjectByName("right_front_leg")!;
    const lr = group.getObjectByName("left_rear_leg")!;
    const rr = group.getObjectByName("right_rear_leg")!;

    expect(Math.abs(lf.rotation.x)).toBeGreaterThan(1e-4);
    expect(lf.rotation.x).toBeCloseTo(rr.rotation.x, 6);
    expect(rf.rotation.x).toBeCloseTo(lr.rotation.x, 6);
  });
});

