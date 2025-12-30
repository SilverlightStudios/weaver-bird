import { describe, expect, it } from "vitest";
import { groupAssetsByVariant } from "./assetGrouping";

describe("assetGrouping (entity variants)", () => {
  it("groups axolotl skins into a single variant family", () => {
    const ids = [
      "minecraft:entity/axolotl/axolotl_blue",
      "minecraft:entity/axolotl/axolotl_cyan",
      "minecraft:entity/axolotl/axolotl_gold",
      "minecraft:entity/axolotl/axolotl_lucy",
      "minecraft:entity/axolotl/axolotl_wild",
    ];

    const groups = groupAssetsByVariant(ids);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.baseId).toBe("entity/axolotl");
    expect(groups[0]!.variantIds).toHaveLength(5);
  });

  it("does not group mixed entity directories (e.g. horse + donkey)", () => {
    const ids = [
      "minecraft:entity/horse/horse_brown",
      "minecraft:entity/horse/horse_black",
      "minecraft:entity/horse/donkey",
    ];

    const groups = groupAssetsByVariant(ids);
    expect(groups.some((g) => g.baseId === "entity/horse")).toBe(false);
  });

  it("groups bed colors into a single variant family", () => {
    const ids = [
      "minecraft:entity/bed/red",
      "minecraft:entity/bed/blue",
      "minecraft:entity/bed/white",
    ];

    const groups = groupAssetsByVariant(ids);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.baseId).toBe("entity/bed");
    expect(groups[0]!.variantIds).toHaveLength(3);
  });

  it("groups boat wood types into a single variant family", () => {
    const ids = [
      "minecraft:entity/boat/oak",
      "minecraft:entity/boat/spruce",
      "minecraft:entity/boat/mangrove",
    ];

    const groups = groupAssetsByVariant(ids);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.baseId).toBe("entity/boat");
    expect(groups[0]!.variantIds).toHaveLength(3);
  });

  it("groups cat skins into a single variant family", () => {
    const ids = [
      "minecraft:entity/cat/black",
      "minecraft:entity/cat/tabby",
      "minecraft:entity/cat/jellie",
    ];

    const groups = groupAssetsByVariant(ids);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.baseId).toBe("entity/cat");
    expect(groups[0]!.variantIds).toHaveLength(3);
  });

  it("groups banner base aliases into a single resource card", () => {
    const ids = ["minecraft:entity/banner/base", "minecraft:entity/banner_base"];

    const groups = groupAssetsByVariant(ids);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.baseId).toBe("entity/banner");
    expect(groups[0]!.variantIds).toHaveLength(2);
  });

  it("groups decorated pot patterns into a single resource card", () => {
    const ids = [
      "minecraft:entity/decorated_pot/decorated_pot_base",
      "minecraft:entity/decorated_pot/angler_pottery_pattern",
      "minecraft:entity/decorated_pot/archer_pottery_pattern",
    ];

    const groups = groupAssetsByVariant(ids);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.baseId).toBe("entity/decorated_pot");
    expect(groups[0]!.variantIds).toHaveLength(3);
  });
});
