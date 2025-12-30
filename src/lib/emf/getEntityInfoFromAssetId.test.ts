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

  it("maps bamboo boat + chest boat to raft models", () => {
    expect(getEntityInfoFromAssetId("minecraft:entity/boat/bamboo")).toEqual({
      variant: "raft",
      parent: null,
    });
    expect(getEntityInfoFromAssetId("minecraft:entity/chest_boat/bamboo")).toEqual({
      variant: "chest_raft",
      parent: null,
    });
  });

  it("maps decorated pot texture variants to the decorated_pot model", () => {
    expect(
      getEntityInfoFromAssetId("minecraft:entity/decorated_pot/decorated_pot_base"),
    ).toEqual({
      variant: "decorated_pot",
      parent: null,
    });
    expect(
      getEntityInfoFromAssetId("minecraft:entity/decorated_pot/angler_pottery_pattern"),
    ).toEqual({
      variant: "decorated_pot",
      parent: null,
    });
  });

  it("maps equipment textures to preview rigs", () => {
    expect(
      getEntityInfoFromAssetId("minecraft:entity/equipment/humanoid/chainmail"),
    ).toEqual({
      variant: "armor_layer_1",
      parent: null,
    });
    expect(
      getEntityInfoFromAssetId(
        "minecraft:entity/equipment/humanoid_leggings/chainmail",
      ),
    ).toEqual({
      variant: "armor_layer_2",
      parent: null,
    });
    expect(
      getEntityInfoFromAssetId("minecraft:entity/equipment/horse_body/diamond"),
    ).toEqual({
      variant: "horse_armor",
      parent: null,
    });
    expect(
      getEntityInfoFromAssetId("minecraft:entity/equipment/wolf_body/wolf_armor"),
    ).toEqual({
      variant: "wolf_armor",
      parent: null,
    });

    // Saddles/harnesses use equipment-kind-specific models.
    expect(
      getEntityInfoFromAssetId("minecraft:entity/equipment/pig_saddle/saddle"),
    ).toEqual({
      variant: "pig_saddle",
      parent: null,
    });
    expect(
      getEntityInfoFromAssetId("minecraft:entity/equipment/donkey_saddle/saddle"),
    ).toEqual({
      variant: "donkey_saddle",
      parent: null,
    });
  });
});
