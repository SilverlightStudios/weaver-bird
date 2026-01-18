import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as THREE from "three";
import {
  loadPackTexture,
  loadVanillaTexture,
  createTextureLoader,
  clearTextureCache,
  uncacheTexture,
} from "./textureLoader";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";

// Mock Tauri API
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  convertFileSrc: vi.fn((path: string) => `asset://localhost/${path}`),
}));

// Mock THREE.TextureLoader by mocking the entire 'three' module
vi.mock("three", async () => {
  const actual = await vi.importActual<typeof THREE>("three");

  class MockTextureLoader {
    load(
      url: string,
      onLoad?: (texture: THREE.Texture) => void,
      _onProgress?: (event: ProgressEvent) => void,
      onError?: (error: Error) => void,
    ) {
      // Simulate async texture loading
      setTimeout(() => {
        if (url.includes("missing")) {
          onError?.(new Error("Texture not found"));
        } else {
          const texture = new actual.Texture();
          onLoad?.(texture);
        }
      }, 0);
    }
  }

  return {
    ...actual,
    TextureLoader: MockTextureLoader,
  };
});

describe("textureLoader", () => {
  beforeEach(() => {
    clearTextureCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearTextureCache();
  });

  describe("loadPackTexture", () => {
    it("should load a texture from a pack", async () => {
      const mockPath = "/path/to/texture.png";
      vi.mocked(invoke).mockResolvedValue(mockPath);

      const texture = await loadPackTexture(
        "/pack/path",
        "minecraft:block/dirt",
        false,
      );

      expect(texture).toBeInstanceOf(THREE.Texture);
      expect(invoke).toHaveBeenCalledWith("get_pack_texture_path", {
        packPath: "/pack/path",
        assetId: "minecraft:block/dirt",
        isZip: false,
      });
      expect(convertFileSrc).toHaveBeenCalledWith(mockPath);
    });

    it("should cache textures after loading", async () => {
      const mockPath = "/path/to/texture.png";
      vi.mocked(invoke).mockResolvedValue(mockPath);

      // First load
      const texture1 = await loadPackTexture(
        "/pack/path",
        "minecraft:block/dirt",
        false,
      );

      // Second load (should use cache)
      const texture2 = await loadPackTexture(
        "/pack/path",
        "minecraft:block/dirt",
        false,
      );

      expect(texture1).toBe(texture2); // Same instance from cache
      expect(invoke).toHaveBeenCalledTimes(1); // Only called once
    });

    it("should handle ZIP packs", async () => {
      const mockPath = "/path/to/texture.png";
      vi.mocked(invoke).mockResolvedValue(mockPath);

      await loadPackTexture("/pack.zip", "minecraft:block/stone", true);

      expect(invoke).toHaveBeenCalledWith("get_pack_texture_path", {
        packPath: "/pack.zip",
        assetId: "minecraft:block/stone",
        isZip: true,
      });
    });

    it("should return null when backend fails", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Texture not found"));

      const texture = await loadPackTexture(
        "/pack/path",
        "minecraft:block/missing",
        false,
      );

      expect(texture).toBeNull();
    });

    it("should configure textures with Minecraft-style settings", async () => {
      const mockPath = "/path/to/texture.png";
      vi.mocked(invoke).mockResolvedValue(mockPath);

      const texture = await loadPackTexture(
        "/pack/path",
        "minecraft:block/dirt",
        false,
      );

      expect(texture).not.toBeNull();
      if (texture) {
        expect(texture.magFilter).toBe(THREE.NearestFilter);
        expect(texture.minFilter).toBe(THREE.NearestFilter);
        expect(texture.wrapS).toBe(THREE.ClampToEdgeWrapping);
        expect(texture.wrapT).toBe(THREE.ClampToEdgeWrapping);
      }
    });
  });

  describe("loadVanillaTexture", () => {
    it("should load a vanilla texture", async () => {
      const mockPath = "/vanilla/textures/block/dirt.png";
      vi.mocked(invoke).mockResolvedValue(mockPath);

      const texture = await loadVanillaTexture("minecraft:block/dirt");

      expect(texture).toBeInstanceOf(THREE.Texture);
      expect(invoke).toHaveBeenCalledWith("get_vanilla_texture_path", {
        assetId: "minecraft:block/dirt",
      });
    });

    it("should cache vanilla textures", async () => {
      const mockPath = "/vanilla/textures/block/dirt.png";
      vi.mocked(invoke).mockResolvedValue(mockPath);

      const texture1 = await loadVanillaTexture("minecraft:block/dirt");
      const texture2 = await loadVanillaTexture("minecraft:block/dirt");

      expect(texture1).toBe(texture2);
      expect(invoke).toHaveBeenCalledTimes(1);
    });

    it("should return null when vanilla texture not found", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Not found"));

      const texture = await loadVanillaTexture("minecraft:block/nonexistent");

      expect(texture).toBeNull();
    });
  });

  describe("createTextureLoader", () => {
    it("should create a texture loader function", () => {
      const loader = createTextureLoader("/pack/path", false);

      expect(loader).toBeInstanceOf(Function);
    });

    it("should try pack texture first, then vanilla fallback", async () => {
      const mockVanillaPath = "/vanilla/texture.png";

      // Pack texture fails, vanilla succeeds
      vi.mocked(invoke)
        .mockRejectedValueOnce(new Error("Not in pack"))
        .mockResolvedValueOnce(mockVanillaPath);

      const loader = createTextureLoader("/pack/path", false);
      const texture = await loader("minecraft:block/dirt");

      expect(texture).toBeInstanceOf(THREE.Texture);
      expect(invoke).toHaveBeenCalledTimes(2); // Pack attempt + vanilla fallback
    });

    it("should use pack texture when available", async () => {
      const mockPath = "/pack/texture.png";
      vi.mocked(invoke).mockResolvedValue(mockPath);

      const loader = createTextureLoader("/pack/path", false);
      await loader("minecraft:block/dirt");

      // Should only call pack texture, not vanilla
      expect(invoke).toHaveBeenCalledTimes(1);
      expect(invoke).toHaveBeenCalledWith("get_pack_texture_path", {
        packPath: "/pack/path",
        assetId: "minecraft:block/dirt",
        isZip: false,
      });
    });

    it("should return null when both pack and vanilla fail", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Not found"));

      const loader = createTextureLoader("/pack/path", false);
      const texture = await loader("minecraft:block/nonexistent");

      expect(texture).toBeNull();
    });
  });

  describe("clearTextureCache", () => {
    it("should clear all cached textures", async () => {
      const mockPath = "/path/to/texture.png";
      vi.mocked(invoke).mockResolvedValue(mockPath);

      // Load a texture to cache it
      await loadPackTexture("/pack/path", "minecraft:block/dirt", false);

      // Clear cache
      clearTextureCache();

      // Load again (should hit backend again)
      await loadPackTexture("/pack/path", "minecraft:block/dirt", false);

      expect(invoke).toHaveBeenCalledTimes(2); // Called twice, not cached
    });
  });

  describe("uncacheTexture", () => {
    it("should remove a specific texture from cache", async () => {
      const mockPath1 = "/path/to/dirt.png";
      const mockPath2 = "/path/to/stone.png";
      vi.mocked(invoke).mockResolvedValue(mockPath1);

      // Load two textures
      await loadPackTexture("/pack/path", "minecraft:block/dirt", false);

      vi.mocked(invoke).mockResolvedValue(mockPath2);
      await loadPackTexture("/pack/path", "minecraft:block/stone", false);

      // Remove dirt from cache
      uncacheTexture("/pack/path", "minecraft:block/dirt");

      // Stone should still be cached
      await loadPackTexture("/pack/path", "minecraft:block/stone", false);

      // Dirt should be reloaded
      vi.mocked(invoke).mockResolvedValue(mockPath1);
      await loadPackTexture("/pack/path", "minecraft:block/dirt", false);

      // 2 initial loads + 1 reloaded dirt = 3 calls (stone is cached so not called again)
      expect(invoke).toHaveBeenCalledTimes(3);
    });
  });
});
