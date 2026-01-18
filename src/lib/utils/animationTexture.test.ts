/**
 * Unit tests for animation texture parser
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  parseAnimationTexture,
  isAnimatedTexture,
  getFrameCount,
  getThreeJsFrameConfig,
} from "./animationTexture";

// Mock Image for testing
class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 0;
  naturalHeight = 0;

  set src(value: string) {
    // Simulate async load
    setTimeout(() => {
      // Parse dimensions from URL for testing
      // Format: /path/to/texture_WxH.png
      const match = value.match(/_(\d+)x(\d+)\.png/);
      if (match) {
        this.naturalWidth = parseInt(match[1], 10);
        this.naturalHeight = parseInt(match[2], 10);
        this.onload?.();
      } else {
        this.onerror?.();
      }
    }, 0);
  }
}

// Mock fetch for .mcmeta files
const mockFetch = vi.fn();

describe("animationTexture", () => {
  beforeEach(() => {
    // Setup mocks
    global.Image = MockImage as unknown as typeof Image;
    global.fetch = mockFetch;
    mockFetch.mockReset();
  });

  describe("isAnimatedTexture", () => {
    it("should detect animated texture (height > width, evenly divisible)", () => {
      expect(isAnimatedTexture(16, 288)).toBe(true); // seagrass (18 frames)
      expect(isAnimatedTexture(16, 512)).toBe(true); // water (32 frames)
      expect(isAnimatedTexture(16, 320)).toBe(true); // lava (20 frames)
    });

    it("should not detect non-animated textures", () => {
      expect(isAnimatedTexture(16, 16)).toBe(false); // square
      expect(isAnimatedTexture(32, 16)).toBe(false); // width > height
      expect(isAnimatedTexture(16, 17)).toBe(false); // not evenly divisible
    });
  });

  describe("getFrameCount", () => {
    it("should calculate correct frame count", () => {
      expect(getFrameCount(16, 288)).toBe(18); // seagrass
      expect(getFrameCount(16, 512)).toBe(32); // water
      expect(getFrameCount(16, 320)).toBe(20); // lava
    });

    it("should return 1 for non-animated textures", () => {
      expect(getFrameCount(16, 16)).toBe(1);
      expect(getFrameCount(32, 16)).toBe(1);
    });
  });

  describe("getThreeJsFrameConfig", () => {
    it("should generate correct config for first frame", () => {
      const config = getThreeJsFrameConfig(0, 18);
      expect(config.repeat).toEqual([1, 1 / 18]);
      expect(config.offset).toEqual([0, 17 / 18]);
    });

    it("should generate correct config for middle frame", () => {
      const config = getThreeJsFrameConfig(9, 18);
      expect(config.repeat).toEqual([1, 1 / 18]);
      expect(config.offset).toEqual([0, 8 / 18]);
    });

    it("should generate correct config for last frame", () => {
      const config = getThreeJsFrameConfig(17, 18);
      expect(config.repeat).toEqual([1, 1 / 18]);
      expect(config.offset).toEqual([0, 0]);
    });

    it("should handle non-animated textures", () => {
      const config = getThreeJsFrameConfig(0, 1);
      expect(config.repeat).toEqual([1, 1]);
      expect(config.offset).toEqual([0, 0]);
    });

    it("should clamp frame index", () => {
      const config1 = getThreeJsFrameConfig(-1, 10);
      expect(config1).toEqual(getThreeJsFrameConfig(0, 10));

      const config2 = getThreeJsFrameConfig(100, 10);
      expect(config2).toEqual(getThreeJsFrameConfig(9, 10));
    });
  });

  describe("parseAnimationTexture", () => {
    it("should parse animated texture without .mcmeta", async () => {
      // Mock fetch to return 404 (no .mcmeta)
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await parseAnimationTexture("/test/seagrass_16x288.png");

      expect(result.isAnimated).toBe(true);
      expect(result.frameCount).toBe(18);
      expect(result.frameWidth).toBe(16);
      expect(result.frameHeight).toBe(16);
      expect(result.metadata).toBe(null);

      // Check CSS config
      expect(result.firstFrameCSS.height).toBe(`${(1 / 18) * 100}%`);
      expect(result.firstFrameCSS.objectFit).toBe("none");

      // Check Three.js config
      expect(result.threeJsConfig.repeat).toEqual([1, 1 / 18]);
      expect(result.threeJsConfig.offset).toEqual([0, 17 / 18]);
    });

    it("should parse animated texture with .mcmeta", async () => {
      // Mock fetch to return .mcmeta file
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({
            animation: {
              frametime: 2,
              interpolate: true,
              frames: [0, 1, 2, 1],
            },
          }),
      });

      const result = await parseAnimationTexture("/test/custom_16x64.png");

      expect(result.isAnimated).toBe(true);
      expect(result.frameCount).toBe(4);
      expect(result.metadata).toEqual({
        frametime: 2,
        interpolate: true,
        frames: [0, 1, 2, 1],
      });
    });

    it("should handle non-animated texture", async () => {
      mockFetch.mockResolvedValue({ ok: false });

      const result = await parseAnimationTexture("/test/stone_16x16.png");

      expect(result.isAnimated).toBe(false);
      expect(result.frameCount).toBe(1);
      expect(result.firstFrameCSS.width).toBe("100%");
      expect(result.firstFrameCSS.height).toBe("100%");
      expect(result.threeJsConfig.repeat).toEqual([1, 1]);
      expect(result.threeJsConfig.offset).toEqual([0, 0]);
    });

    it("should handle invalid .mcmeta gracefully", async () => {
      // Mock fetch to return invalid JSON
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => "invalid json",
      });

      const result = await parseAnimationTexture("/test/broken_16x32.png");

      // Should still detect animation from dimensions
      expect(result.isAnimated).toBe(true);
      expect(result.frameCount).toBe(2);
      expect(result.metadata).toBe(null);
    });

    it("should handle image load failure", async () => {
      const result = await parseAnimationTexture("/test/invalid.png");

      // Should return safe defaults
      expect(result.isAnimated).toBe(false);
      expect(result.frameCount).toBe(1);
      expect(result.frameWidth).toBe(16);
      expect(result.frameHeight).toBe(16);
    });

    it("should handle .mcmeta with missing fields", async () => {
      // Mock fetch to return minimal .mcmeta
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({
            animation: {},
          }),
      });

      const result = await parseAnimationTexture("/test/minimal_16x48.png");

      expect(result.metadata).toEqual({
        frametime: 1,
        interpolate: false,
        frames: undefined,
      });
    });
  });

  describe("CSS configuration", () => {
    it("should generate correct CSS for 18-frame animation", async () => {
      mockFetch.mockResolvedValue({ ok: false });

      const result = await parseAnimationTexture("/test/anim_16x288.png");

      expect(result.firstFrameCSS).toEqual({
        width: "100%",
        height: `${(1 / 18) * 100}%`,
        objectFit: "none",
        objectPosition: "0% 0%",
      });
    });
  });

  describe("Three.js configuration", () => {
    it("should generate correct Three.js config for various frame counts", async () => {
      mockFetch.mockResolvedValue({ ok: false });

      // 2 frames
      const result2 = await parseAnimationTexture("/test/2f_16x32.png");
      expect(result2.threeJsConfig.repeat).toEqual([1, 0.5]);
      expect(result2.threeJsConfig.offset).toEqual([0, 0.5]);

      // 4 frames
      const result4 = await parseAnimationTexture("/test/4f_16x64.png");
      expect(result4.threeJsConfig.repeat).toEqual([1, 0.25]);
      expect(result4.threeJsConfig.offset).toEqual([0, 0.75]);

      // 32 frames (water/fire)
      const result32 = await parseAnimationTexture("/test/32f_16x512.png");
      expect(result32.threeJsConfig.repeat).toEqual([1, 1 / 32]);
      expect(result32.threeJsConfig.offset).toEqual([0, 31 / 32]);
    });
  });
});
