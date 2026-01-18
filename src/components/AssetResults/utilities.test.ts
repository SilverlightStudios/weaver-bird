import { describe, expect, it } from "vitest";
import { generateDisplayName } from "./utilities";
import type { AssetItem } from "./types";

describe("AssetResults utilities", () => {
  it("names the decorated pot base card as 'Decorated Pot'", () => {
    expect(
      generateDisplayName({
        id: "minecraft:entity/decorated_pot/decorated_pot_base",
        name: "",
      } as AssetItem),
    ).toBe("Decorated Pot");
  });

  it("names decorated pot patterns as '<Pattern> - Decorated Pot'", () => {
    expect(
      generateDisplayName({
        id: "minecraft:entity/decorated_pot/angler_pottery_pattern",
        name: "",
      } as AssetItem),
    ).toBe("Angler - Decorated Pot");
  });
});

