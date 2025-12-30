import { describe, expect, it, vi } from "vitest";
import { loadEntityModel } from "@lib/emf";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("loadEntityModel (versioned CEM folders)", () => {
  it("loads a JEM from a version folder and resolves JPM relative to that folder", async () => {
    const { invoke } = await import("@tauri-apps/api/core");

    const jem = {
      textureSize: [64, 32],
      models: [
        { part: "root", id: "root", model: "camel_animations.jpm", attach: "true" },
        {
          part: "body",
          id: "body",
          invertAxis: "xy",
          translate: [0, -24, 0],
          boxes: [{ coordinates: [-4, 12, -2, 8, 12, 4], textureOffset: [16, 16] }],
        },
      ],
    };

    const jpm = {
      animations: [{ "body.rx": "torad(10)" }],
    };

    vi.mocked(invoke).mockImplementation(async (command: string, payload: any) => {
      if (command !== "read_pack_file") throw new Error("unexpected command");
      const filePath = String(payload?.filePath ?? "");
      if (filePath === "assets/minecraft/optifine/cem/camel.jem") {
        throw new Error("not found");
      }
      if (filePath === "assets/minecraft/optifine/cem/1.21.4/camel.jem") {
        return JSON.stringify(jem);
      }
      if (filePath === "assets/minecraft/optifine/cem/1.21.4/camel_animations.jpm") {
        return JSON.stringify(jpm);
      }
      throw new Error(`unexpected filePath: ${filePath}`);
    });

    const result = await loadEntityModel(
      "camel",
      "/pack/path",
      false,
      null,
      { camel: ["1.21.4"] },
      null,
      99,
      undefined,
    );

    expect(result).toBeTruthy();
    expect(result?.animations?.length ?? 0).toBeGreaterThan(0);

    expect(vi.mocked(invoke)).toHaveBeenCalledWith("read_pack_file", {
      packPath: "/pack/path",
      filePath: "assets/minecraft/optifine/cem/1.21.4/camel.jem",
      isZip: false,
    });
    expect(vi.mocked(invoke)).toHaveBeenCalledWith("read_pack_file", {
      packPath: "/pack/path",
      filePath: "assets/minecraft/optifine/cem/1.21.4/camel_animations.jpm",
      isZip: false,
    });
  });
});

