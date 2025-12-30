import { describe, expect, it } from "vitest";
import {
  isEntityFeatureLayerTextureAssetId,
  resolveEntityCompositeSchema,
} from "@lib/entityComposite";

describe("entityComposite", () => {
  it("detects feature-layer textures via heuristics", () => {
    expect(isEntityFeatureLayerTextureAssetId("minecraft:entity/enderman/enderman_eyes")).toBe(
      true,
    );
    expect(isEntityFeatureLayerTextureAssetId("minecraft:entity/sheep/sheep_fur")).toBe(true);
    expect(isEntityFeatureLayerTextureAssetId("minecraft:entity/creeper/creeper_armor")).toBe(
      true,
    );
    expect(isEntityFeatureLayerTextureAssetId("minecraft:entity/villager/type/plains")).toBe(true);
    expect(isEntityFeatureLayerTextureAssetId("minecraft:entity/villager/profession/farmer")).toBe(
      true,
    );
    expect(
      isEntityFeatureLayerTextureAssetId(
        "minecraft:entity/villager/profession_level/novice",
      ),
    ).toBe(true);
    expect(
      isEntityFeatureLayerTextureAssetId("minecraft:entity/zombie_villager/type/plains"),
    ).toBe(true);
    expect(isEntityFeatureLayerTextureAssetId("minecraft:entity/banner/creeper")).toBe(true);
    expect(isEntityFeatureLayerTextureAssetId("minecraft:entity/banner/base")).toBe(false);
    expect(isEntityFeatureLayerTextureAssetId("minecraft:entity/banner_base")).toBe(false);
    expect(isEntityFeatureLayerTextureAssetId("minecraft:entity/sheep/sheep_wool")).toBe(true);
    expect(isEntityFeatureLayerTextureAssetId("minecraft:entity/sheep/sheep_wool_undercoat")).toBe(
      true,
    );
    expect(
      isEntityFeatureLayerTextureAssetId(
        "minecraft:entity/iron_golem/iron_golem_crackiness_high",
      ),
    ).toBe(true);
    expect(isEntityFeatureLayerTextureAssetId("minecraft:entity/bee/bee_angry")).toBe(true);
    expect(isEntityFeatureLayerTextureAssetId("minecraft:entity/bee/bee_nectar")).toBe(true);
    expect(isEntityFeatureLayerTextureAssetId("minecraft:entity/bee/bee_angry_nectar")).toBe(true);
    expect(isEntityFeatureLayerTextureAssetId("minecraft:entity/bee/bee_stinger")).toBe(true);

    expect(isEntityFeatureLayerTextureAssetId("minecraft:entity/enderman/enderman")).toBe(false);
  });

  it("resolves glowing eyes overlay", () => {
    const all = [
      "minecraft:entity/enderman/enderman",
      "minecraft:entity/enderman/enderman_eyes",
    ];
    const schema = resolveEntityCompositeSchema("minecraft:entity/enderman/enderman", all);
    expect(schema).toBeTruthy();
    expect(schema!.controls.some((c) => c.id === "feature.glowing_eyes")).toBe(true);

    const layers = schema!.getActiveLayers({ toggles: {}, selects: {} });
    expect(layers.some((l) => l.id === "glowing_eyes")).toBe(true);

    const layersOff = schema!.getActiveLayers({
      toggles: { "feature.glowing_eyes": false },
      selects: {},
    });
    expect(layersOff.some((l) => l.id === "glowing_eyes")).toBe(false);
  });

  it("resolves bee base texture variants + stinger visibility", () => {
    const all = [
      "minecraft:entity/bee/bee",
      "minecraft:entity/bee/bee_angry",
      "minecraft:entity/bee/bee_nectar",
      "minecraft:entity/bee/bee_angry_nectar",
    ];
    const schema = resolveEntityCompositeSchema("minecraft:entity/bee/bee", all);
    expect(schema).toBeTruthy();
    expect(schema!.controls.some((c) => c.id === "bee.angry")).toBe(true);
    expect(schema!.controls.some((c) => c.id === "bee.has_stinger")).toBe(true);
    expect(schema!.getBaseTextureAssetId).toBeTruthy();
    expect(schema!.getBoneInputOverrides).toBeTruthy();

    expect(schema!.getBaseTextureAssetId!({ toggles: {}, selects: {} })).toBe(
      "minecraft:entity/bee/bee",
    );
    expect(
      schema!.getBaseTextureAssetId!({
        toggles: { "bee.angry": true },
        selects: {},
      }),
    ).toBe("minecraft:entity/bee/bee_angry");
    expect(
      schema!.getBaseTextureAssetId!({
        toggles: { "bee.nectar": true },
        selects: {},
      }),
    ).toBe("minecraft:entity/bee/bee_nectar");
    expect(
      schema!.getBaseTextureAssetId!({
        toggles: { "bee.angry": true, "bee.nectar": true },
        selects: {},
      }),
    ).toBe("minecraft:entity/bee/bee_angry_nectar");

    expect(schema!.getBoneInputOverrides!({ toggles: {}, selects: {} }).stinger.visible).toBe(1);
    expect(
      schema!.getBoneInputOverrides!({
        toggles: { "bee.has_stinger": false },
        selects: {},
      }).stinger.visible,
    ).toBe(0);
  });

  it("resolves axolotl variants as a base texture select", () => {
    const all = [
      "minecraft:entity/axolotl/axolotl_blue",
      "minecraft:entity/axolotl/axolotl_cyan",
      "minecraft:entity/axolotl/axolotl_gold",
      "minecraft:entity/axolotl/axolotl_lucy",
      "minecraft:entity/axolotl/axolotl_wild",
    ];
    const schema = resolveEntityCompositeSchema(
      "minecraft:entity/axolotl/axolotl_blue",
      all,
    );
    expect(schema).toBeTruthy();
    expect(schema!.controls.some((c) => c.id === "entity.variant")).toBe(true);
    expect(schema!.getBaseTextureAssetId).toBeTruthy();
    expect(schema!.getBaseTextureAssetId!({ toggles: {}, selects: {} })).toBe(
      "minecraft:entity/axolotl/axolotl_blue",
    );
    expect(
      schema!.getBaseTextureAssetId!({
        toggles: {},
        selects: { "entity.variant": "axolotl_lucy" },
      }),
    ).toBe("minecraft:entity/axolotl/axolotl_lucy");
  });

  it("resolves frog variants as a base texture select", () => {
    const all = [
      "minecraft:entity/frog/cold_frog",
      "minecraft:entity/frog/temperate_frog",
      "minecraft:entity/frog/warm_frog",
    ];
    const schema = resolveEntityCompositeSchema("minecraft:entity/frog/temperate_frog", all);
    expect(schema).toBeTruthy();
    expect(schema!.controls.some((c) => c.id === "entity.variant")).toBe(true);
    expect(schema!.getBaseTextureAssetId).toBeTruthy();
    expect(schema!.getBaseTextureAssetId!({ toggles: {}, selects: {} })).toBe(
      "minecraft:entity/frog/temperate_frog",
    );
    expect(
      schema!.getBaseTextureAssetId!({
        toggles: {},
        selects: { "entity.variant": "cold_frog" },
      }),
    ).toBe("minecraft:entity/frog/cold_frog");
  });

  it("resolves banner base + pattern selectors with tint layers", () => {
    const all = [
      "minecraft:entity/banner/base",
      "minecraft:entity/banner/creeper",
      "minecraft:entity/banner/skull",
      "minecraft:entity/banner_base",
    ];

    const schemaFromPattern = resolveEntityCompositeSchema("minecraft:entity/banner/creeper", all);
    expect(schemaFromPattern).toBeTruthy();
    expect(schemaFromPattern!.baseAssetId).toBe("minecraft:entity/banner/base");

    const schema = resolveEntityCompositeSchema("minecraft:entity/banner/base", all);
    expect(schema).toBeTruthy();
    expect(schema!.controls.some((c) => c.id === "banner.placement")).toBe(true);
    expect(schema!.controls.some((c) => c.id === "banner.facing")).toBe(true);
    expect(schema!.controls.some((c) => c.id === "banner.base_color")).toBe(true);
    expect(schema!.controls.some((c) => c.id === "banner.pattern")).toBe(true);
    expect(schema!.controls.some((c) => c.id === "banner.pattern_color")).toBe(true);
    expect(schema!.getBaseTextureAssetId).toBeTruthy();
    expect(schema!.getCemEntityType).toBeTruthy();
    expect(schema!.getRootTransform).toBeTruthy();
    expect(schema!.getBoneRenderOverrides).toBeTruthy();
    expect(schema!.getBaseTextureAssetId!({ toggles: {}, selects: {} })).toBe(
      "minecraft:entity/banner_base",
    );

    const none = schema!.getActiveLayers({ toggles: {}, selects: {} });
    expect(none.some((l) => l.id === "banner_pattern")).toBe(false);

    const colored = schema!.getActiveLayers({
      toggles: {},
      selects: {
        "banner.base_color": "red",
        "banner.pattern": "creeper",
        "banner.pattern_color": "white",
      },
    });
    expect(colored.some((l) => l.id === "banner_base_tint")).toBe(true);
    expect(colored.some((l) => l.id === "banner_pattern")).toBe(true);

    const wall = schema!.getActiveLayers({
      toggles: {},
      selects: {
        "banner.placement": "wall",
        "banner.facing": "east",
      },
    });
    expect(wall.some((l) => l.id === "banner_pattern")).toBe(false);
    expect(
      schema!.getCemEntityType!({
        toggles: {},
        selects: { "banner.placement": "wall" },
      }).entityType,
    ).toBe("banner");
  });

  it("resolves bed colors as a base texture select", () => {
    const all = [
      "minecraft:entity/bed/red",
      "minecraft:entity/bed/blue",
      "minecraft:entity/bed/white",
    ];
    const schema = resolveEntityCompositeSchema("minecraft:entity/bed/red", all);
    expect(schema).toBeTruthy();
    const control = schema!.controls.find((c) => c.id === "entity.variant") as any;
    expect(control).toBeTruthy();
    expect(control.label).toBe("Color");
    expect(schema!.getBaseTextureAssetId).toBeTruthy();
    expect(schema!.getBaseTextureAssetId!({ toggles: {}, selects: {} })).toBe(
      "minecraft:entity/bed/red",
    );
    expect(
      schema!.getBaseTextureAssetId!({
        toggles: {},
        selects: { "entity.variant": "blue" },
      }),
    ).toBe("minecraft:entity/bed/blue");
  });

  it("resolves boat wood types as a base texture select", () => {
    const all = [
      "minecraft:entity/boat/oak",
      "minecraft:entity/boat/spruce",
      "minecraft:entity/boat/mangrove",
    ];
    const schema = resolveEntityCompositeSchema("minecraft:entity/boat/oak", all);
    expect(schema).toBeTruthy();
    const control = schema!.controls.find((c) => c.id === "entity.variant") as any;
    expect(control).toBeTruthy();
    expect(control.label).toBe("Wood Type");
    expect(schema!.getBaseTextureAssetId).toBeTruthy();
    expect(
      schema!.getBaseTextureAssetId!({
        toggles: {},
        selects: { "entity.variant": "spruce" },
      }),
    ).toBe("minecraft:entity/boat/spruce");
  });

  it("resolves cat skins as a base texture select", () => {
    const all = [
      "minecraft:entity/cat/black",
      "minecraft:entity/cat/tabby",
      "minecraft:entity/cat/jellie",
    ];
    const schema = resolveEntityCompositeSchema("minecraft:entity/cat/tabby", all);
    expect(schema).toBeTruthy();
    const control = schema!.controls.find((c) => c.id === "entity.variant") as any;
    expect(control).toBeTruthy();
    expect(control.label).toBe("Cat Type");
    expect(schema!.getBaseTextureAssetId).toBeTruthy();
    expect(schema!.getBaseTextureAssetId!({ toggles: {}, selects: {} })).toBe(
      "minecraft:entity/cat/tabby",
    );
  });

  it("resolves villager outfit selects as overlays", () => {
    const all = [
      "minecraft:entity/villager/villager",
      "minecraft:entity/villager/type/plains",
      "minecraft:entity/villager/type/desert",
      "minecraft:entity/villager/profession/none",
      "minecraft:entity/villager/profession/farmer",
      "minecraft:entity/villager/profession_level/novice",
    ];
    const schema = resolveEntityCompositeSchema("minecraft:entity/villager/villager", all);
    expect(schema).toBeTruthy();
    expect(schema!.controls.some((c) => c.id === "villager.type")).toBe(true);
    expect(schema!.controls.some((c) => c.id === "villager.profession")).toBe(true);
    expect(schema!.controls.some((c) => c.id === "villager.level")).toBe(true);

    // Defaults should apply Plains even when state doesn't include explicit selects.
    const defaultLayers = schema!.getActiveLayers({ toggles: {}, selects: {} });
    expect(defaultLayers.some((l) => l.id === "villager_type")).toBe(true);

    const layers = schema!.getActiveLayers({
      toggles: {},
      selects: {
        "villager.type": "desert",
        "villager.profession": "farmer",
        "villager.level": "novice",
      },
    });
    expect(layers.some((l) => l.id === "villager_type")).toBe(true);
    expect(layers.some((l) => l.id === "villager_profession")).toBe(true);
    expect(layers.some((l) => l.id === "villager_level")).toBe(true);
  });

  it("resolves zombie villager outfit selects as overlays", () => {
    const all = [
      "minecraft:entity/zombie_villager/zombie_villager",
      "minecraft:entity/zombie_villager/type/plains",
      "minecraft:entity/zombie_villager/profession/farmer",
      "minecraft:entity/zombie_villager/profession_level/novice",
    ];
    const schema = resolveEntityCompositeSchema(
      "minecraft:entity/zombie_villager/zombie_villager",
      all,
    );
    expect(schema).toBeTruthy();
    expect(schema!.controls.some((c) => c.id === "zombie_villager.type")).toBe(true);
    expect(schema!.controls.some((c) => c.id === "zombie_villager.profession")).toBe(true);
    expect(schema!.controls.some((c) => c.id === "zombie_villager.level")).toBe(true);

    const layers = schema!.getActiveLayers({
      toggles: {},
      selects: {
        "zombie_villager.type": "plains",
        "zombie_villager.profession": "farmer",
        "zombie_villager.level": "novice",
      },
    });
    expect(layers.some((l) => l.id === "zombie_villager_type")).toBe(true);
    expect(layers.some((l) => l.id === "zombie_villager_profession")).toBe(true);
    expect(layers.some((l) => l.id === "zombie_villager_level")).toBe(true);
  });

  it("treats villager variants as the villager family", () => {
    const all = [
      "minecraft:entity/villager/villager2",
      "minecraft:entity/villager/type/plains",
      "minecraft:entity/villager/profession/farmer",
    ];
    const schema = resolveEntityCompositeSchema("minecraft:entity/villager/villager2", all);
    expect(schema).toBeTruthy();
    expect(schema!.controls.some((c) => c.id === "villager.type")).toBe(true);
  });

  it("resolves sheep coat layers from sheep_fur", () => {
    const all = [
      "minecraft:entity/sheep/sheep",
      "minecraft:entity/sheep/sheep_fur",
      "minecraft:entity/sheep/sheep_wool",
      "minecraft:entity/sheep/sheep_wool_undercoat",
    ];
    const schema = resolveEntityCompositeSchema("minecraft:entity/sheep/sheep", all);
    expect(schema).toBeTruthy();
    expect(schema!.controls.some((c) => c.id === "sheep.coat_state")).toBe(true);
    expect(schema!.controls.some((c) => c.id === "sheep.color")).toBe(true);

    const full = schema!.getActiveLayers({ toggles: {}, selects: { "sheep.coat_state": "full" } });
    const undercoat = full.find((l) => l.id === "sheep_undercoat");
    const wool = full.find((l) => l.id === "sheep_wool");
    expect(undercoat).toBeTruthy();
    expect(wool).toBeTruthy();
    expect((undercoat as any).textureAssetId).toBe(
      "minecraft:entity/sheep/sheep_wool_undercoat",
    );
    expect((wool as any).textureAssetId).toBe("minecraft:entity/sheep/sheep_wool");

    const sheared = schema!.getActiveLayers({
      toggles: {},
      selects: { "sheep.coat_state": "sheared" },
    });
    expect(sheared.some((l) => l.id === "sheep_undercoat")).toBe(true);
    expect(sheared.some((l) => l.id === "sheep_wool")).toBe(false);

    const bare = schema!.getActiveLayers({
      toggles: {},
      selects: { "sheep.coat_state": "bare" },
    });
    expect(bare.some((l) => l.id === "sheep_undercoat")).toBe(false);
    expect(bare.some((l) => l.id === "sheep_wool")).toBe(false);
  });

  it("resolves creeper charge overlay from creeper_armor", () => {
    const all = [
      "minecraft:entity/creeper/creeper",
      "minecraft:entity/creeper/creeper_armor",
    ];
    const schema = resolveEntityCompositeSchema("minecraft:entity/creeper/creeper", all);
    expect(schema).toBeTruthy();
    expect(schema!.controls.some((c) => c.id === "creeper.charge")).toBe(true);

    const off = schema!.getActiveLayers({ toggles: {}, selects: {} });
    expect(off.some((l) => l.id === "creeper_charge")).toBe(false);

    const on = schema!.getActiveLayers({
      toggles: { "creeper.charge": true },
      selects: {},
    });
    expect(on.some((l) => l.id === "creeper_charge")).toBe(true);
  });

  it("resolves drowned outer layer via _outer_layer texture", () => {
    const all = [
      "minecraft:entity/zombie/drowned",
      "minecraft:entity/zombie/drowned_outer_layer",
    ];
    const schema = resolveEntityCompositeSchema("minecraft:entity/zombie/drowned", all);
    expect(schema).toBeTruthy();
    expect(schema!.controls.some((c) => c.id === "feature.outer_layer")).toBe(true);

    const on = schema!.getActiveLayers({ toggles: {}, selects: {} });
    expect(on.some((l) => l.id === "outer_layer")).toBe(true);

    const off = schema!.getActiveLayers({
      toggles: { "feature.outer_layer": false },
      selects: {},
    });
    expect(off.some((l) => l.id === "outer_layer")).toBe(false);
  });

  it("resolves crackiness overlays as a select feature", () => {
    const all = [
      "minecraft:entity/iron_golem/iron_golem",
      "minecraft:entity/iron_golem/iron_golem_crackiness_low",
      "minecraft:entity/iron_golem/iron_golem_crackiness_high",
    ];
    const schema = resolveEntityCompositeSchema(
      "minecraft:entity/iron_golem/iron_golem",
      all,
    );
    expect(schema).toBeTruthy();
    expect(schema!.controls.some((c) => c.id === "feature.crackiness")).toBe(true);

    const none = schema!.getActiveLayers({ toggles: {}, selects: {} });
    expect(none.some((l) => l.id === "crackiness")).toBe(false);

    const high = schema!.getActiveLayers({
      toggles: {},
      selects: { "feature.crackiness": "high" },
    });
    expect(high.some((l) => l.id === "crackiness")).toBe(true);
  });
});
