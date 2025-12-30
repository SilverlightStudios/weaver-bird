import { describe, expect, it } from "vitest";
import { getEntityInfoFromAssetId } from "./index";

describe("emf getEntityInfoFromAssetId", () => {
  it("maps banner patterns to the banner model", () => {
    expect(getEntityInfoFromAssetId("minecraft:entity/banner/creeper")).toEqual({
      variant: "banner",
      parent: null,
    });
    expect(getEntityInfoFromAssetId("minecraft:entity/banner/base")).toEqual({
      variant: "banner",
      parent: null,
    });
  });

  it("maps banner_base to the banner model", () => {
    expect(getEntityInfoFromAssetId("minecraft:entity/banner_base")).toEqual({
      variant: "banner",
      parent: null,
    });
  });
});

