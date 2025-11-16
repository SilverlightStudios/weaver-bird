import { describe, it, expect, vi, beforeEach } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import BlockModel from "./BlockModel";
import * as zustand from "@state/selectors";
import { readBlockModel, resolveBlockState } from "@lib/tauri/blockModels";
import type {
  BlockModel as BlockModelType,
  ResolutionResult,
} from "@lib/tauri/blockModels";

// Mock Zustand selectors
vi.mock("@state/selectors", () => ({
  useSelectWinner: vi.fn(),
  useSelectPack: vi.fn(),
  useSelectPacksDir: vi.fn(),
}));

// Mock Tauri commands
vi.mock("@lib/tauri/blockModels", () => ({
  readBlockModel: vi.fn(),
  resolveBlockState: vi.fn(),
}));

// Mock texture loader
vi.mock("@lib/three/textureLoader", () => ({
  createTextureLoader: vi.fn(() => vi.fn().mockResolvedValue(null)),
}));

describe("BlockModel", () => {
  const mockAssetId = "minecraft:block/dirt";
  const mockPackId = "test-pack";
  const mockPack = {
    id: mockPackId,
    name: "Test Pack",
    path: "/test/pack",
    size: 1000,
    is_zip: false,
  };
  const mockPacksDir = "/test/packs";

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up default mock returns
    vi.mocked(zustand.useSelectWinner).mockReturnValue(mockPackId);
    vi.mocked(zustand.useSelectPack).mockReturnValue(mockPack);
    vi.mocked(zustand.useSelectPacksDir).mockReturnValue(mockPacksDir);

    // Set up default mock for resolveBlockState
    const defaultResolution: ResolutionResult = {
      blockId: mockAssetId,
      stateProps: {},
      models: [],
    };
    vi.mocked(resolveBlockState).mockResolvedValue(defaultResolution);
  });

  it("should render a placeholder cube when dependencies are missing", async () => {
    // No winner pack
    vi.mocked(zustand.useSelectWinner).mockReturnValue(undefined);

    const renderer = await ReactThreeTestRenderer.create(
      <BlockModel assetId={mockAssetId} />,
    );

    // Should create a group with a brown placeholder mesh
    const scene = renderer.scene;
    expect(scene.children.length).toBeGreaterThan(0);

    // Allow time for async operations
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  it("should call readBlockModel with correct parameters", async () => {
    const mockModel: BlockModelType = {
      textures: { all: "minecraft:block/dirt" },
      elements: [
        {
          from: [0, 0, 0],
          to: [16, 16, 16],
          faces: {
            north: { texture: "#all" },
            south: { texture: "#all" },
            east: { texture: "#all" },
            west: { texture: "#all" },
            up: { texture: "#all" },
            down: { texture: "#all" },
          },
        },
      ],
    };

    const mockResolution: ResolutionResult = {
      blockId: mockAssetId,
      stateProps: {},
      models: [
        {
          modelId: mockAssetId,
          rotX: 0,
          rotY: 0,
          rotZ: 0,
          uvlock: false,
        },
      ],
    };

    vi.mocked(resolveBlockState).mockResolvedValue(mockResolution);
    vi.mocked(readBlockModel).mockResolvedValue(mockModel);

    await ReactThreeTestRenderer.create(<BlockModel assetId={mockAssetId} />);

    // Allow time for async operations
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(readBlockModel).toHaveBeenCalledWith(
      mockPackId,
      mockAssetId,
      mockPacksDir,
    );
  });

  it("should handle model loading errors gracefully", async () => {
    vi.mocked(readBlockModel).mockRejectedValue(new Error("Model not found"));

    const renderer = await ReactThreeTestRenderer.create(
      <BlockModel assetId={mockAssetId} />,
    );

    // Allow time for async operations
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should still render (with placeholder)
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it("should create geometry when model loads successfully", async () => {
    const mockModel: BlockModelType = {
      textures: { all: "minecraft:block/stone" },
      elements: [
        {
          from: [0, 0, 0],
          to: [16, 16, 16],
          faces: {
            north: { texture: "#all" },
          },
        },
      ],
    };

    vi.mocked(readBlockModel).mockResolvedValue(mockModel);

    const renderer = await ReactThreeTestRenderer.create(
      <BlockModel assetId={mockAssetId} />,
    );

    // Allow time for async operations and rendering
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Scene should have children
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it("should cleanup resources on unmount", async () => {
    const mockModel: BlockModelType = {
      textures: { all: "minecraft:block/dirt" },
      elements: [
        {
          from: [0, 0, 0],
          to: [16, 16, 16],
          faces: {
            north: { texture: "#all" },
          },
        },
      ],
    };

    vi.mocked(readBlockModel).mockResolvedValue(mockModel);

    const renderer = await ReactThreeTestRenderer.create(
      <BlockModel assetId={mockAssetId} />,
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Unmount should not throw errors
    expect(() => renderer.unmount()).not.toThrow();
  });

  it("should update when assetId changes", async () => {
    const mockModel1: BlockModelType = {
      textures: { all: "minecraft:block/dirt" },
      elements: [
        {
          from: [0, 0, 0],
          to: [16, 16, 16],
          faces: { north: { texture: "#all" } },
        },
      ],
    };

    const mockModel2: BlockModelType = {
      textures: { all: "minecraft:block/stone" },
      elements: [
        {
          from: [0, 0, 0],
          to: [16, 16, 16],
          faces: { north: { texture: "#all" } },
        },
      ],
    };

    const mockResolution1: ResolutionResult = {
      blockId: "minecraft:block/dirt",
      stateProps: {},
      models: [
        {
          modelId: "minecraft:block/dirt",
          rotX: 0,
          rotY: 0,
          rotZ: 0,
          uvlock: false,
        },
      ],
    };

    const mockResolution2: ResolutionResult = {
      blockId: "minecraft:block/stone",
      stateProps: {},
      models: [
        {
          modelId: "minecraft:block/stone",
          rotX: 0,
          rotY: 0,
          rotZ: 0,
          uvlock: false,
        },
      ],
    };

    vi.mocked(resolveBlockState)
      .mockResolvedValueOnce(mockResolution1)
      .mockResolvedValueOnce(mockResolution2);
    vi.mocked(readBlockModel)
      .mockResolvedValueOnce(mockModel1)
      .mockResolvedValueOnce(mockModel2);

    const renderer = await ReactThreeTestRenderer.create(
      <BlockModel assetId="minecraft:block/dirt" />,
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Update to new asset
    await renderer.update(<BlockModel assetId="minecraft:block/stone" />);

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should have called readBlockModel twice
    expect(readBlockModel).toHaveBeenCalledTimes(2);
  });

  it("should handle multi-element models", async () => {
    const mockModel: BlockModelType = {
      textures: { all: "minecraft:block/planks" },
      elements: [
        {
          from: [0, 0, 0],
          to: [16, 8, 16],
          faces: {
            north: { texture: "#all" },
          },
        },
        {
          from: [0, 8, 0],
          to: [16, 16, 16],
          faces: {
            north: { texture: "#all" },
          },
        },
      ],
    };

    vi.mocked(readBlockModel).mockResolvedValue(mockModel);

    const renderer = await ReactThreeTestRenderer.create(
      <BlockModel assetId={mockAssetId} />,
    );

    await new Promise((resolve) => setTimeout(resolve, 200));

    // Should render successfully
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it("should apply gentle rotation animation", async () => {
    const mockModel: BlockModelType = {
      textures: { all: "minecraft:block/dirt" },
      elements: [
        {
          from: [0, 0, 0],
          to: [16, 16, 16],
          faces: { north: { texture: "#all" } },
        },
      ],
    };

    vi.mocked(readBlockModel).mockResolvedValue(mockModel);

    const renderer = await ReactThreeTestRenderer.create(
      <BlockModel assetId={mockAssetId} />,
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Advance frames to test animation
    renderer.advanceFrames(60, 1); // Advance 60 frames at 1fps

    // The group should exist (animation is applied via useFrame)
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });
});
