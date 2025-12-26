import { describe, it, expect } from "vitest";
import * as THREE from "three";
import type { AnimationLayer } from "./types";
import { AnimationEngine } from "./AnimationEngine";

describe("varb evaluation", () => {
  it("evaluates varb.* assignments and allows expressions to read them", () => {
    const root = new THREE.Group();
    root.name = "jem_entity";
    const body = new THREE.Group();
    body.name = "body";
    root.add(body);

    const layers: AnimationLayer[] = [
      {
        "varb.test": "frame_counter > 1",
      },
      {
        "body.tx": "if(varb.test, 2, 0)",
      },
    ];

    const engine = new AnimationEngine(root, layers);

    engine.tick(0);
    expect(body.position.x).toBeCloseTo(0, 6);

    engine.tick(0.05);
    expect(body.position.x).toBeGreaterThan(0.1);
  });
});

