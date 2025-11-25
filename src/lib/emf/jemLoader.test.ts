/**
 * Tests for JEM loader
 */

import { describe, it, expect } from "vitest";
import { parseJEM, jemToThreeJS, loadJEM } from "./jemLoader";
import type { JEMFile } from "./jemLoader";
import { readFileSync } from "fs";
import { join } from "path";

// Load cow.jem file
const cowJEMPath = join(__dirname, "../../../__mocks__/cem/cow.jem");
const cowJEM = JSON.parse(readFileSync(cowJEMPath, "utf-8")) as JEMFile;

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
});
