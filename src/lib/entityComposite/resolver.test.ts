import { describe, expect, it } from "vitest";
import {
  isEntityFeatureLayerTextureAssetId,
  resolveEntityCompositeSchema,
} from "@lib/entityComposite";
import type { EntityCemModelLayerDefinition, EntityCloneTextureLayerDefinition } from "@lib/entityComposite/types";

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

    // Equipment textures (except humanoid layer-1).
    expect(isEntityFeatureLayerTextureAssetId("minecraft:entity/equipment/humanoid/chainmail")).toBe(
      false,
    );
    expect(
      isEntityFeatureLayerTextureAssetId("minecraft:entity/equipment/humanoid_leggings/chainmail"),
    ).toBe(true);
    expect(
      isEntityFeatureLayerTextureAssetId("minecraft:entity/equipment/horse_saddle/saddle"),
    ).toBe(true);
    expect(
      isEntityFeatureLayerTextureAssetId("minecraft:entity/equipment/horse_body/diamond"),
    ).toBe(true);
    expect(isEntityFeatureLayerTextureAssetId("minecraft:entity/equipment/llama_body/black")).toBe(
      true,
    );

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

  it("uses energy swirl material mode for creeper charge", () => {
    const all = [
      "minecraft:entity/creeper/creeper",
      "minecraft:entity/creeper/creeper_armor",
    ];
    const schema = resolveEntityCompositeSchema("minecraft:entity/creeper/creeper", all);
    expect(schema).toBeTruthy();
    expect(schema!.controls.some((c) => c.id === "creeper.charge")).toBe(true);

    const layers = schema!.getActiveLayers({
      toggles: { "creeper.charge": true },
      selects: {},
    });
    const charge = layers.find((l) => l.id === "creeper_charge") as EntityCemModelLayerDefinition;
    expect(charge).toBeTruthy();
    expect(charge.materialMode?.kind).toBe("energySwirl");
  });

  it("resolves equipment (armor) controls + slot toggles + underlay behavior", () => {
    const all = [
      "minecraft:entity/equipment/humanoid/chainmail",
      "minecraft:entity/equipment/humanoid_leggings/chainmail",
    ];
    const schema = resolveEntityCompositeSchema(all[0]!, all);
    expect(schema).toBeTruthy();

    expect(schema!.controls.some((c) => c.id === "equipment.add_player")).toBe(true);
    expect(schema!.controls.some((c) => c.id === "equipment.add_armor_stand")).toBe(true);
    expect(schema!.controls.some((c) => c.id === "equipment.show_helmet")).toBe(true);
    expect(schema!.controls.some((c) => c.id === "equipment.show_chestplate")).toBe(true);
    expect(schema!.controls.some((c) => c.id === "equipment.show_leggings")).toBe(true);
    expect(schema!.controls.some((c) => c.id === "equipment.show_boots")).toBe(true);

    expect(schema!.getBoneRenderOverrides).toBeTruthy();
    // With no underlay toggles enabled, the base armor-stand rig is hidden.
    const baseHidden = schema!.getBoneRenderOverrides!({
      toggles: {},
      selects: {},
    });
    expect(baseHidden["*"]?.visible).toBe(false);

    // Humanoid equipment previews always use an armor-stand rig as the base
    // (player optional), so armor is rendered as overlays.
    expect(schema!.getBaseTextureAssetId).toBeTruthy();
    expect(schema!.getBaseTextureAssetId!({ toggles: {}, selects: {} })).toBe(
      "minecraft:entity/armor_stand",
    );
    expect(
      schema!.getBaseTextureAssetId!({ toggles: { "equipment.add_player": true }, selects: {} }),
    ).toBe("minecraft:entity/player/wide/steve");
    expect(schema!.getCemEntityType).toBeTruthy();
    expect(
      schema!.getCemEntityType!({ toggles: { "equipment.add_player": true }, selects: {} })
        .entityType,
    ).toBe("player");
    expect(schema!.getCemEntityType!({ toggles: {}, selects: {} }).entityType).toBe(
      "armor_stand",
    );

    const layers = schema!.getActiveLayers({ toggles: {}, selects: {} });
    expect(layers.some((l) => l.id === "equipment_armor_layer_1")).toBe(true);
    expect(layers.some((l) => l.id === "equipment_armor_layer_2")).toBe(true);

    // Piece selection is applied to the armor overlay layers (not the hidden base rig).
    const helmetOnlyState = {
      toggles: {
        "equipment.show_helmet": true,
        "equipment.show_chestplate": false,
        "equipment.show_boots": false,
        "equipment.show_leggings": false,
      },
      selects: {},
    } as const;
    const layersHelmetOnly = schema!.getActiveLayers(helmetOnlyState);
    const layer1 = layersHelmetOnly.find((l) => l.id === "equipment_armor_layer_1") as EntityCemModelLayerDefinition;
    expect(layer1).toBeTruthy();
    expect(layer1.boneRenderOverrides?.["*"]?.visible).toBe(false);
    expect(layer1.boneRenderOverrides?.head?.visible).toBe(true);
    expect(layer1.boneScaleMultipliers?.head).toEqual({ x: 1.01, y: 1.01, z: 1.01 });
    expect(layer1.bonePositionOffsets).toBeUndefined();

    // When previewing on the player, hide only headwear (not head) under helmets.
    const playerUnderlayOverrides = schema!.getBoneRenderOverrides!({
      toggles: { "equipment.add_player": true, "equipment.show_helmet": true },
      selects: {},
    });
    expect(playerUnderlayOverrides.head).toBeUndefined();
    expect(playerUnderlayOverrides.headwear?.visible).toBe(false);

    const layersOnPlayer = schema!.getActiveLayers({
      toggles: { "equipment.add_player": true },
      selects: {},
    });
    const playerLayer1 = layersOnPlayer.find((l) => l.id === "equipment_armor_layer_1") as EntityCemModelLayerDefinition;
    expect(playerLayer1?.bonePositionOffsets?.head?.y).toBeCloseTo(0.5 / 16, 6);
  });

  it("resolves decorated pot patterns as a single entity feature selector", () => {
    const all = [
      "minecraft:entity/decorated_pot/decorated_pot_base",
      "minecraft:entity/decorated_pot/decorated_pot_side",
      "minecraft:entity/decorated_pot/angler_pottery_pattern",
      "minecraft:entity/decorated_pot/archer_pottery_pattern",
    ];

    // Selecting a pattern should still normalize to the base pot schema key.
    const schema = resolveEntityCompositeSchema(
      "minecraft:entity/decorated_pot/angler_pottery_pattern",
      all,
    );
    expect(schema).toBeTruthy();
    expect(schema!.baseAssetId).toBe("minecraft:entity/decorated_pot/decorated_pot_base");
    expect(schema!.controls.some((c) => c.id === "decorated_pot.pattern")).toBe(true);
    expect(schema!.getBaseTextureAssetId).toBeTruthy();
    expect(schema!.getPartTextureOverrides).toBeTruthy();

    expect(schema!.getBaseTextureAssetId!({ toggles: {}, selects: {} })).toBe(
      "minecraft:entity/decorated_pot/decorated_pot_base",
    );

    const overrides = schema!.getPartTextureOverrides!({
      toggles: {},
      selects: { "decorated_pot.pattern": "archer_pottery_pattern" },
    });
    expect(overrides.front).toBe("minecraft:entity/decorated_pot/archer_pottery_pattern");
    expect(overrides.neck).toBe("minecraft:entity/decorated_pot/decorated_pot_base");

    const defaultSides = schema!.getPartTextureOverrides!({
      toggles: {},
      selects: { "decorated_pot.pattern": "none" },
    });
    expect(defaultSides.front).toBe("minecraft:entity/decorated_pot/decorated_pot_side");
  });

  it("resolves horse equipment controls + layers", () => {
    const all = [
      "minecraft:entity/horse/horse_brown",
      "minecraft:entity/horse/horse_markings_white",
      "minecraft:entity/equipment/horse_body/diamond",
      "minecraft:entity/equipment/horse_saddle/saddle",
    ];
    const schema = resolveEntityCompositeSchema("minecraft:entity/horse/horse_brown", all);
    expect(schema).toBeTruthy();
    expect(schema!.controls.some((c) => c.id === "horse.markings")).toBe(true);
    expect(schema!.controls.some((c) => c.id === "horse.armor")).toBe(true);
    expect(schema!.controls.some((c) => c.id === "horse.saddle")).toBe(true);
    expect(schema!.controls.some((c) => c.id === "horse.rider")).toBe(true);

    const layers = schema!.getActiveLayers({
      toggles: { "horse.saddle": true },
      selects: { "horse.armor": "diamond" },
    });
    expect(layers.some((l) => l.id === "horse_armor")).toBe(true);
    expect(layers.some((l) => l.id === "horse_saddle")).toBe(true);
  });

  it("resolves llama decor controls + layers", () => {
    const all = [
      "minecraft:entity/llama/llama_creamy",
      "minecraft:entity/equipment/llama_body/black",
      "minecraft:entity/equipment/llama_body/white",
    ];
    const schema = resolveEntityCompositeSchema("minecraft:entity/llama/llama_creamy", all);
    expect(schema).toBeTruthy();
    expect(schema!.controls.some((c) => c.id === "llama.decor")).toBe(true);

    const layers = schema!.getActiveLayers({
      toggles: { "llama.decor": true },
      selects: { "llama.decor_color": "black" },
    });
    expect(layers.some((l) => l.id === "llama_decor")).toBe(true);
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

  it("resolves armadillo rolled/unrolled pose visibility", () => {
    const all = ["minecraft:entity/armadillo/armadillo"];
    const schema = resolveEntityCompositeSchema("minecraft:entity/armadillo/armadillo", all);
    expect(schema).toBeTruthy();
    expect(schema!.controls.some((c) => c.id === "armadillo.pose")).toBe(true);
    expect(schema!.getBoneRenderOverrides).toBeTruthy();

    const unrolled = schema!.getBoneRenderOverrides!({ toggles: {}, selects: {} });
    expect(unrolled?.["*"]?.visible).toBe(true);
    expect(unrolled?.cube?.visible).toBe(false);

    const rolled = schema!.getBoneRenderOverrides!({
      toggles: {},
      selects: { "armadillo.pose": "rolled" },
    });
    expect(rolled?.["*"]?.visible).toBe(false);
    expect(rolled?.cube?.visible).toBe(true);
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
    const control = schema!.controls.find((c) => c.id === "entity.variant");
    expect(control).toBeTruthy();
    expect(control!.label).toBe("Color");
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
    const control = schema!.controls.find((c) => c.id === "entity.variant");
    expect(control).toBeTruthy();
    expect(control!.label).toBe("Wood Type");
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
    const control = schema!.controls.find((c) => c.id === "entity.variant");
    expect(control).toBeTruthy();
    expect(control!.label).toBe("Cat Type");
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
    const undercoat = full.find((l) => l.id === "sheep_undercoat") as EntityCloneTextureLayerDefinition;
    const wool = full.find((l) => l.id === "sheep_wool") as EntityCloneTextureLayerDefinition;
    expect(undercoat).toBeTruthy();
    expect(wool).toBeTruthy();
    expect(undercoat.textureAssetId).toBe(
      "minecraft:entity/sheep/sheep_wool_undercoat",
    );
    expect(wool.textureAssetId).toBe("minecraft:entity/sheep/sheep_wool");

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
