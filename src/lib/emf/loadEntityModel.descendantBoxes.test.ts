import { describe, expect, it, vi } from "vitest";
import { loadEntityModel } from "@lib/emf";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("loadEntityModel (descendant boxes)", () => {
  it("does not reject models where boxes exist only in submodels", async () => {
    const { invoke } = await import("@tauri-apps/api/core");

    const jem = {
      textureSize: [64, 32],
      models: [
        {
          part: "body",
          id: "body",
          invertAxis: "xy",
          translate: [0, -24, 0],
          submodels: [
            {
              id: "body2",
              invertAxis: "xy",
              translate: [0, 24, 0],
              boxes: [{ coordinates: [-4, 0, -2, 8, 12, 4], textureOffset: [16, 16] }],
            },
          ],
        },
      ],
    };

    vi.mocked(invoke).mockImplementation(async (command: string, payload: any) => {
      if (command !== "read_pack_file") throw new Error("unexpected command");
      const filePath = String(payload?.filePath ?? "");
      if (filePath === "assets/minecraft/optifine/cem/enderman.jem") {
        return JSON.stringify(jem);
      }
      throw new Error(`unexpected filePath: ${filePath}`);
    });

    const result = await loadEntityModel(
      "enderman",
      "/pack/path",
      false,
      null,
      {},
      null,
      99,
      undefined,
    );

    expect(result).toBeTruthy();
    expect(result?.parts?.length ?? 0).toBeGreaterThan(0);
  });
});

