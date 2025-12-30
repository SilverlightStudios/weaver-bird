/**
 * Tests for JEM loader
 */

import { describe, it, expect } from "vitest";
import { parseJEM, jemToThreeJS, loadJEM } from "./jemLoader";
import type { JEMFile } from "./jemLoader";
import { readFileSync } from "fs";
import { join } from "path";

// Load test JEM files
const cowJEMPath = join(__dirname, "../../../__mocks__/cem/cow.jem");
const cowJEM = JSON.parse(readFileSync(cowJEMPath, "utf-8")) as JEMFile;

const chickenJEMPath = join(__dirname, "../../../__mocks__/cem/chicken.jem");
const chickenJEM = JSON.parse(readFileSync(chickenJEMPath, "utf-8")) as JEMFile;

const piglinJEMPath = join(
  __dirname,
  "../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/piglin.jem",
);
const piglinJEM = JSON.parse(readFileSync(piglinJEMPath, "utf-8")) as JEMFile;

const skeletonJEMPath = join(
  __dirname,
  "../../../__mocks__/resourcepacks/FreshAnimations_v1.10.2/assets/minecraft/optifine/cem/skeleton.jem",
);
const skeletonJEM = JSON.parse(readFileSync(skeletonJEMPath, "utf-8")) as JEMFile;

describe("JEM Loader", () => {
  describe("parseJEM", () => {
    it("should parse cow.jem correctly", () => {
      const parsed = parseJEM(cowJEM as JEMFile);

      expect(parsed).toBeDefined();
      expect(parsed.textureSize).toEqual([64, 64]);
      expect(parsed.parts.length).toBe(6); // head, body, leg1, leg2, leg3, leg4

      // Check head part
      const head = parsed.parts.find((p) => p.name === "head");
      expect(head).toBeDefined();
      // Negated translate: [0, -20, 8] -> [-0, 20, -8]
      expect(head?.origin[0]).toBeCloseTo(0);
      expect(head?.origin[1]).toBe(20);
      expect(head?.origin[2]).toBe(-8);
      expect(head?.boxes.length).toBe(4); // Main head + 2 horns + nose
    });

    it("should correctly negate translate to get origin", () => {
      const parsed = parseJEM(cowJEM as JEMFile);

      // Cow head has translate: [0, -20, 8]
      // Origin should be negated: [-0, 20, -8]
      const head = parsed.parts.find((p) => p.name === "head");
      expect(head?.origin[0]).toBeCloseTo(0);
      expect(head?.origin[1]).toBe(20);
      expect(head?.origin[2]).toBe(-8);

      // Cow body has translate: [0, -19, -2]
      // Origin should be: [-0, 19, 2]
      const body = parsed.parts.find((p) => p.name === "body");
      expect(body?.origin[0]).toBeCloseTo(0);
      expect(body?.origin[1]).toBe(19);
      expect(body?.origin[2]).toBe(2);
    });

    it("should parse box coordinates correctly", () => {
      const parsed = parseJEM(cowJEM as JEMFile);
      const head = parsed.parts.find((p) => p.name === "head");

      expect(head?.boxes.length).toBeGreaterThan(0);

      // First box in head: coordinates: [-4, 16, -14, 8, 8, 6]
      // Should parse to: from: [-4, 16, -14], to: [4, 24, -8]
      const mainBox = head?.boxes[0];
      expect(mainBox?.from).toEqual([-4, 16, -14]);
      expect(mainBox?.to).toEqual([4, 24, -8]);
    });

    it("should calculate UV coordinates from textureOffset", () => {
      const parsed = parseJEM(cowJEM as JEMFile);
      const head = parsed.parts.find((p) => p.name === "head");
      const mainBox = head?.boxes[0];

      // Main head box has textureOffset: [0, 0] and size [8, 8, 6]
      // UV layout should follow Minecraft box UV pattern
      expect(mainBox?.uv.north).toBeDefined();
      expect(mainBox?.uv.south).toBeDefined();
      expect(mainBox?.uv.east).toBeDefined();
      expect(mainBox?.uv.west).toBeDefined();
      expect(mainBox?.uv.up).toBeDefined();
      expect(mainBox?.uv.down).toBeDefined();
    });

    it("should not accumulate depth=1 submodel translate", () => {
      const parsed = parseJEM(piglinJEM as JEMFile);
      const headwear = parsed.parts.find((p) => p.name === "headwear");
      const head2 = headwear?.children.find((c) => c.name === "head2");
      expect(head2?.origin).toEqual([0, 24, 0]);
    });

    it("should apply mirrorTexture to box_uv UVs", () => {
      const parsed = parseJEM(skeletonJEM as JEMFile);
      const leftArm = parsed.parts.find((p) => p.name === "left_arm");
      const box = leftArm?.boxes[0];
      // Expected mirrored face layout per Blockbench updateUV
      expect(box?.uv.east).toEqual([46, 18, 44, 30]);
      expect(box?.uv.west).toEqual([42, 18, 40, 30]);
    });

    it("should inherit and override textures per part/box", () => {
      const synthetic: JEMFile = {
        texture: "textures/entity/foo.png",
        textureSize: [64, 64],
        models: [
          {
            part: "body",
            id: "body",
            texture: "minecraft:textures/entity/bar.png",
            textureSize: [32, 32],
            boxes: [
              {
                coordinates: [0, 0, 0, 2, 2, 2],
                textureOffset: [0, 0],
                textureSize: [16, 16],
              },
            ],
          },
        ],
      };

      const parsed = parseJEM(synthetic);
      const body = parsed.parts[0];
      expect(body.texturePath).toBe("minecraft:textures/entity/bar.png");
      expect(body.textureSize).toEqual([32, 32]);
      expect(body.boxes[0].texturePath).toBe("minecraft:textures/entity/bar.png");
      expect(body.boxes[0].textureSize).toEqual([16, 16]);
    });
  });

  describe("jemToThreeJS", () => {
    it("should convert parsed model to Three.js group", () => {
      const parsed = parseJEM(cowJEM as JEMFile);
      const group = jemToThreeJS(parsed, null);

      expect(group).toBeDefined();
      expect(group.name).toBe("jem_entity");
      expect(group.children.length).toBe(6); // 6 parts

      // Check that parts are positioned correctly (origin / 16)
      const headGroup = group.children.find((c) => c.name === "head");
      expect(headGroup).toBeDefined();

      // Origin [0, 20, -8] in pixels = [0, 1.25, -0.5] in Three.js units
      expect(headGroup?.position.x).toBeCloseTo(0);
      expect(headGroup?.position.y).toBeCloseTo(1.25);
      expect(headGroup?.position.z).toBeCloseTo(-0.5);
    });

    it("should create meshes for each box", () => {
      const parsed = parseJEM(cowJEM as JEMFile);
      const group = jemToThreeJS(parsed, null);

      // Count total meshes in the scene
      let meshCount = 0;
      group.traverse((obj) => {
        if (obj.type === "Mesh") meshCount++;
      });

      // Cow has: head(4 boxes) + body(2 boxes) + leg1-4(1 box each) = 10 boxes total
      expect(meshCount).toBe(10);
    });
  });

  describe("loadJEM (convenience function)", () => {
    it("should parse and convert in one step", () => {
      const group = loadJEM(cowJEM as JEMFile, null);

      expect(group).toBeDefined();
      expect(group.name).toBe("jem_entity");
      expect(group.children.length).toBe(6);
    });
  });

  describe("Chicken Model Regression Tests", () => {
    it("should parse chicken.jem correctly", () => {
      const parsed = parseJEM(chickenJEM as JEMFile);

      expect(parsed).toBeDefined();
      expect(parsed.textureSize).toEqual([64, 32]);
      expect(parsed.parts.length).toBe(8); // head, bill, chin, body, left_wing, right_wing, left_leg, right_leg
    });

    it("should correctly negate translate for chicken parts", () => {
      const parsed = parseJEM(chickenJEM as JEMFile);

      // Head has translate: [0, -9, 4]
      // Origin should be negated: [-0, 9, -4] (note: -0 === 0 in JS but arrays preserve the sign)
      const head = parsed.parts.find((p) => p.name === "head");
      expect(head?.origin[0]).toBeCloseTo(0);
      expect(head?.origin[1]).toBe(9);
      expect(head?.origin[2]).toBe(-4);

      // Body has translate: [0, -8, 0]
      // Origin should be: [-0, 8, -0]
      const body = parsed.parts.find((p) => p.name === "body");
      expect(body?.origin[0]).toBeCloseTo(0);
      expect(body?.origin[1]).toBe(8);
      expect(body?.origin[2]).toBeCloseTo(0);

      // Left leg has translate: [1, -5, -1]
      // Origin should be: [-1, 5, 1]
      const leftLeg = parsed.parts.find((p) => p.name === "left_leg");
      expect(leftLeg?.origin).toEqual([-1, 5, 1]);
    });

    it("should parse chicken box coordinates correctly", () => {
      const parsed = parseJEM(chickenJEM as JEMFile);
      const head = parsed.parts.find((p) => p.name === "head");

      // Head box: coordinates: [-2, 9, -6, 4, 6, 3]
      // Should parse to: from: [-2, 9, -6], to: [2, 15, -3]
      expect(head?.boxes.length).toBe(1);
      expect(head?.boxes[0]?.from).toEqual([-2, 9, -6]);
      expect(head?.boxes[0]?.to).toEqual([2, 15, -3]);
    });

    it("should handle body rotation correctly", () => {
      const parsed = parseJEM(chickenJEM as JEMFile);
      const body = parsed.parts.find((p) => p.name === "body");

      // Body has rotate: [-90, 0, 0]
      // Rotation is stored as-is in degrees (NOT negated, NOT converted to radians yet)
      expect(body?.rotation).toBeDefined();
      expect(body?.rotation?.[0]).toBe(-90);
      expect(body?.rotation?.[1]).toBe(0);
      expect(body?.rotation?.[2]).toBe(0);
    });

    it("should create correct Three.js structure for chicken", () => {
      const parsed = parseJEM(chickenJEM as JEMFile);
      const group = jemToThreeJS(parsed, null);

      expect(group).toBeDefined();
      expect(group.name).toBe("jem_entity");
      expect(group.children.length).toBe(8); // 8 parts

      // Check head positioning (origin [0, 9, -4] in pixels = [0, 0.5625, -0.25] in Three.js units)
      const headGroup = group.children.find((c) => c.name === "head");
      expect(headGroup).toBeDefined();
      expect(headGroup?.position.x).toBeCloseTo(0);
      expect(headGroup?.position.y).toBeCloseTo(0.5625);
      expect(headGroup?.position.z).toBeCloseTo(-0.25);

      // Check body positioning (origin [0, 8, 0] in pixels = [0, 0.5, 0] in Three.js units)
      const bodyGroup = group.children.find((c) => c.name === "body");
      expect(bodyGroup).toBeDefined();
      expect(bodyGroup?.position.x).toBeCloseTo(0);
      expect(bodyGroup?.position.y).toBeCloseTo(0.5);
      expect(bodyGroup?.position.z).toBeCloseTo(0);

      // Check body rotation (converted from degrees to radians)
      // -90 degrees = -π/2 radians
      expect(bodyGroup?.rotation.x).toBeCloseTo(-Math.PI / 2);
      expect(bodyGroup?.rotation.y).toBeCloseTo(0);
      expect(bodyGroup?.rotation.z).toBeCloseTo(0);
    });

    it("should create correct number of meshes for chicken", () => {
      const parsed = parseJEM(chickenJEM as JEMFile);
      const group = jemToThreeJS(parsed, null);

      // Count total meshes in the scene
      let meshCount = 0;
      group.traverse((obj) => {
        if (obj.type === "Mesh") meshCount++;
      });

      // Chicken has: head(1) + bill(1) + chin(1) + body(1) + left_wing(1) + right_wing(1) + left_leg(1) + right_leg(1) = 8 boxes total
      expect(meshCount).toBe(8);
    });

    it("should maintain correct wing positions", () => {
      const parsed = parseJEM(chickenJEM as JEMFile);
      const group = jemToThreeJS(parsed, null);

      // Left wing has translate: [4, -11, 0] -> origin: [-4, 11, 0]
      const leftWing = group.children.find((c) => c.name === "left_wing");
      expect(leftWing).toBeDefined();
      expect(leftWing?.position.x).toBeCloseTo(-0.25); // -4 / 16
      expect(leftWing?.position.y).toBeCloseTo(0.6875); // 11 / 16
      expect(leftWing?.position.z).toBeCloseTo(0);

      // Right wing has translate: [-4, -11, 0] -> origin: [4, 11, 0]
      const rightWing = group.children.find((c) => c.name === "right_wing");
      expect(rightWing).toBeDefined();
      expect(rightWing?.position.x).toBeCloseTo(0.25); // 4 / 16
      expect(rightWing?.position.y).toBeCloseTo(0.6875); // 11 / 16
      expect(rightWing?.position.z).toBeCloseTo(0);
    });

    it("should handle chicken texture size correctly", () => {
      const parsed = parseJEM(chickenJEM as JEMFile);

      expect(parsed.textureSize).toEqual([64, 32]);

      // Verify UV calculations use correct texture size
      const head = parsed.parts.find((p) => p.name === "head");
      const headBox = head?.boxes[0];

      // Head has textureOffset: [0, 0] and dimensions [4, 6, 3]
      // UV should be calculated relative to 64x32 texture
      expect(headBox?.uv).toBeDefined();
      expect(headBox?.uv.north).toBeDefined();
      expect(headBox?.uv.south).toBeDefined();
      expect(headBox?.uv.east).toBeDefined();
      expect(headBox?.uv.west).toBeDefined();
      expect(headBox?.uv.up).toBeDefined();
      expect(headBox?.uv.down).toBeDefined();
    });
  });
});
