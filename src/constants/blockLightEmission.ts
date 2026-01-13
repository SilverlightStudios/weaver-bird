/**
 * Block Light Emission Levels for Minecraft
 *
 * ⚠️ AUTO-GENERATED - DO NOT EDIT MANUALLY
 *
 * Extracted from Minecraft 1.21.11-0.18.3 JAR by decompiling the Blocks class.
 * Light levels range from 0-15, where 15 is the brightest.
 *
 * This data is used to:
 * 1. Determine which blocks should have emissive rendering in Three.js
 * 2. Calculate appropriate emissive intensity based on light level
 * 3. Handle conditional light emission based on blockstate properties
 *
 * Source: /Users/nicholaswillette/Library/Caches/weaverbird/block_light_emissions.json
 * Extraction date: 2026-01-11
 */

/**
 * Blocks that always emit the same light level regardless of blockstate
 */
export const STATIC_LIGHT_SOURCES: Record<string, number> = {
  // Maximum brightness (15)
  lava: 15,
  fire: 15,
  glowstone: 15,
  jack_o_lantern: 15,
  lantern: 15,
  sea_lantern: 15,
  beacon: 15,
  shroomlight: 15,
  ochre_froglight: 15,
  verdant_froglight: 15,
  pearlescent_froglight: 15,
  end_portal: 15,
  end_gateway: 15,
  conduit: 15,
  lava_cauldron: 15,
  copper_lantern: 15,
  exposed_copper_lantern: 15,
  weathered_copper_lantern: 15,
  oxidized_copper_lantern: 15,
  waxed_copper_lantern: 15,
  waxed_exposed_copper_lantern: 15,
  waxed_weathered_copper_lantern: 15,
  waxed_oxidized_copper_lantern: 15,

  // High brightness (10-14)
  soul_fire: 10,
  torch: 14,
  wall_torch: 14,
  copper_torch: 14,
  copper_wall_torch: 14,
  soul_torch: 10,
  soul_wall_torch: 10,
  soul_lantern: 10,
  end_rod: 14,
  nether_portal: 11,
  crying_obsidian: 10,

  // Medium brightness (3-7)
  enchanting_table: 7,
  ender_chest: 7,
  sculk_catalyst: 6,
  amethyst_cluster: 5,
  large_amethyst_bud: 4,
  magma_block: 3,

  // Low brightness (1-2)
  brown_mushroom: 1,
  dragon_egg: 1,
  end_portal_frame: 1,
  brewing_stand: 1,
  firefly_bush: 2,
  medium_amethyst_bud: 2,
  small_amethyst_bud: 1,
};

/**
 * Conditional light emission configuration
 */
export interface ConditionalLightConfig {
  /** Property that controls light emission */
  property: string;
  /** Light level when property condition is met */
  lightWhenTrue: number;
  /** Light level when property condition is not met */
  lightWhenFalse: number;
}

/**
 * Complex light emission formula configuration
 */
export interface LightFormulaConfig {
  /** Type of formula */
  type: "candles" | "respawn_anchor" | "light_block" | "custom";
  /** Properties involved in the calculation */
  properties: string[];
  /** JavaScript function to calculate light level */
  calculate: (props: Record<string, string>) => number;
}

/**
 * Blocks that emit light based on blockstate properties (lit, powered, etc.)
 */
export const CONDITIONAL_LIGHT_SOURCES: Record<
  string,
  ConditionalLightConfig
> = {
  redstone_ore: { property: "lit", lightWhenTrue: 9, lightWhenFalse: 0 },
  deepslate_redstone_ore: {
    property: "lit",
    lightWhenTrue: 9,
    lightWhenFalse: 0,
  },
  redstone_torch: { property: "lit", lightWhenTrue: 7, lightWhenFalse: 0 },
  redstone_wall_torch: {
    property: "lit",
    lightWhenTrue: 7,
    lightWhenFalse: 0,
  },
  redstone_lamp: { property: "lit", lightWhenTrue: 15, lightWhenFalse: 0 },
  campfire: { property: "lit", lightWhenTrue: 15, lightWhenFalse: 0 },
  soul_campfire: { property: "lit", lightWhenTrue: 10, lightWhenFalse: 0 },
};

/**
 * Blocks with complex light emission formulas
 */
export const FORMULA_LIGHT_SOURCES: Record<string, LightFormulaConfig> = {
  // Candles: light = lit ? 3 * candles : 0
  candle: {
    type: "candles",
    properties: ["lit", "candles"],
    calculate: (props) => {
      const lit = props.lit === "true";
      const candles = parseInt(props.candles ?? "1", 10);
      return lit ? 3 * candles : 0;
    },
  },
  white_candle: {
    type: "candles",
    properties: ["lit", "candles"],
    calculate: (props) => {
      const lit = props.lit === "true";
      const candles = parseInt(props.candles ?? "1", 10);
      return lit ? 3 * candles : 0;
    },
  },
  orange_candle: {
    type: "candles",
    properties: ["lit", "candles"],
    calculate: (props) => {
      const lit = props.lit === "true";
      const candles = parseInt(props.candles ?? "1", 10);
      return lit ? 3 * candles : 0;
    },
  },
  magenta_candle: {
    type: "candles",
    properties: ["lit", "candles"],
    calculate: (props) => {
      const lit = props.lit === "true";
      const candles = parseInt(props.candles ?? "1", 10);
      return lit ? 3 * candles : 0;
    },
  },
  light_blue_candle: {
    type: "candles",
    properties: ["lit", "candles"],
    calculate: (props) => {
      const lit = props.lit === "true";
      const candles = parseInt(props.candles ?? "1", 10);
      return lit ? 3 * candles : 0;
    },
  },
  yellow_candle: {
    type: "candles",
    properties: ["lit", "candles"],
    calculate: (props) => {
      const lit = props.lit === "true";
      const candles = parseInt(props.candles ?? "1", 10);
      return lit ? 3 * candles : 0;
    },
  },
  lime_candle: {
    type: "candles",
    properties: ["lit", "candles"],
    calculate: (props) => {
      const lit = props.lit === "true";
      const candles = parseInt(props.candles ?? "1", 10);
      return lit ? 3 * candles : 0;
    },
  },
  pink_candle: {
    type: "candles",
    properties: ["lit", "candles"],
    calculate: (props) => {
      const lit = props.lit === "true";
      const candles = parseInt(props.candles ?? "1", 10);
      return lit ? 3 * candles : 0;
    },
  },
  gray_candle: {
    type: "candles",
    properties: ["lit", "candles"],
    calculate: (props) => {
      const lit = props.lit === "true";
      const candles = parseInt(props.candles ?? "1", 10);
      return lit ? 3 * candles : 0;
    },
  },
  light_gray_candle: {
    type: "candles",
    properties: ["lit", "candles"],
    calculate: (props) => {
      const lit = props.lit === "true";
      const candles = parseInt(props.candles ?? "1", 10);
      return lit ? 3 * candles : 0;
    },
  },
  cyan_candle: {
    type: "candles",
    properties: ["lit", "candles"],
    calculate: (props) => {
      const lit = props.lit === "true";
      const candles = parseInt(props.candles ?? "1", 10);
      return lit ? 3 * candles : 0;
    },
  },
  purple_candle: {
    type: "candles",
    properties: ["lit", "candles"],
    calculate: (props) => {
      const lit = props.lit === "true";
      const candles = parseInt(props.candles ?? "1", 10);
      return lit ? 3 * candles : 0;
    },
  },
  blue_candle: {
    type: "candles",
    properties: ["lit", "candles"],
    calculate: (props) => {
      const lit = props.lit === "true";
      const candles = parseInt(props.candles ?? "1", 10);
      return lit ? 3 * candles : 0;
    },
  },
  brown_candle: {
    type: "candles",
    properties: ["lit", "candles"],
    calculate: (props) => {
      const lit = props.lit === "true";
      const candles = parseInt(props.candles ?? "1", 10);
      return lit ? 3 * candles : 0;
    },
  },
  green_candle: {
    type: "candles",
    properties: ["lit", "candles"],
    calculate: (props) => {
      const lit = props.lit === "true";
      const candles = parseInt(props.candles ?? "1", 10);
      return lit ? 3 * candles : 0;
    },
  },
  red_candle: {
    type: "candles",
    properties: ["lit", "candles"],
    calculate: (props) => {
      const lit = props.lit === "true";
      const candles = parseInt(props.candles ?? "1", 10);
      return lit ? 3 * candles : 0;
    },
  },
  black_candle: {
    type: "candles",
    properties: ["lit", "candles"],
    calculate: (props) => {
      const lit = props.lit === "true";
      const candles = parseInt(props.candles ?? "1", 10);
      return lit ? 3 * candles : 0;
    },
  },

  // Candle cakes: always 1 candle, light = lit ? 3 : 0
  candle_cake: {
    type: "candles",
    properties: ["lit"],
    calculate: (props) => (props.lit === "true" ? 3 : 0),
  },
  white_candle_cake: {
    type: "candles",
    properties: ["lit"],
    calculate: (props) => (props.lit === "true" ? 3 : 0),
  },
  orange_candle_cake: {
    type: "candles",
    properties: ["lit"],
    calculate: (props) => (props.lit === "true" ? 3 : 0),
  },
  magenta_candle_cake: {
    type: "candles",
    properties: ["lit"],
    calculate: (props) => (props.lit === "true" ? 3 : 0),
  },
  light_blue_candle_cake: {
    type: "candles",
    properties: ["lit"],
    calculate: (props) => (props.lit === "true" ? 3 : 0),
  },
  yellow_candle_cake: {
    type: "candles",
    properties: ["lit"],
    calculate: (props) => (props.lit === "true" ? 3 : 0),
  },
  lime_candle_cake: {
    type: "candles",
    properties: ["lit"],
    calculate: (props) => (props.lit === "true" ? 3 : 0),
  },
  pink_candle_cake: {
    type: "candles",
    properties: ["lit"],
    calculate: (props) => (props.lit === "true" ? 3 : 0),
  },
  gray_candle_cake: {
    type: "candles",
    properties: ["lit"],
    calculate: (props) => (props.lit === "true" ? 3 : 0),
  },
  light_gray_candle_cake: {
    type: "candles",
    properties: ["lit"],
    calculate: (props) => (props.lit === "true" ? 3 : 0),
  },
  cyan_candle_cake: {
    type: "candles",
    properties: ["lit"],
    calculate: (props) => (props.lit === "true" ? 3 : 0),
  },
  purple_candle_cake: {
    type: "candles",
    properties: ["lit"],
    calculate: (props) => (props.lit === "true" ? 3 : 0),
  },
  blue_candle_cake: {
    type: "candles",
    properties: ["lit"],
    calculate: (props) => (props.lit === "true" ? 3 : 0),
  },
  brown_candle_cake: {
    type: "candles",
    properties: ["lit"],
    calculate: (props) => (props.lit === "true" ? 3 : 0),
  },
  green_candle_cake: {
    type: "candles",
    properties: ["lit"],
    calculate: (props) => (props.lit === "true" ? 3 : 0),
  },
  red_candle_cake: {
    type: "candles",
    properties: ["lit"],
    calculate: (props) => (props.lit === "true" ? 3 : 0),
  },
  black_candle_cake: {
    type: "candles",
    properties: ["lit"],
    calculate: (props) => (props.lit === "true" ? 3 : 0),
  },

  // Respawn anchor: light = floor(charges * 3.75)
  respawn_anchor: {
    type: "respawn_anchor",
    properties: ["charges"],
    calculate: (props) => {
      const charges = parseInt(props.charges ?? "0", 10);
      return Math.floor(charges * 3.75);
    },
  },

  // Light block: light = level property (0-15)
  light: {
    type: "light_block",
    properties: ["level"],
    calculate: (props) => {
      const level = parseInt(props.level ?? "0", 10);
      return Math.max(0, Math.min(15, level));
    },
  },

  // Glow lichen: always 7 when not waterlogged
  glow_lichen: {
    type: "custom",
    properties: ["waterlogged"],
    calculate: (props) => (props.waterlogged === "true" ? 0 : 7),
  },

  // Sculk sensor: light 1 when active
  sculk_sensor: {
    type: "custom",
    properties: ["sculk_sensor_phase"],
    calculate: (props) => (props.sculk_sensor_phase === "active" ? 1 : 0),
  },
};

/**
 * Get the light emission level for a block given its ID and blockstate properties
 *
 * @param blockId - Block ID (e.g., "minecraft:torch" or "torch")
 * @param props - Blockstate properties (e.g., {lit: "true", candles: "3"})
 * @returns Light level (0-15), or null if block doesn't emit light
 */
export function getBlockLightLevel(
  blockId: string,
  props: Record<string, string> = {},
): number | null {
  // Strip namespace if present
  const cleanId = blockId.replace(/^minecraft:/, "");

  // Check static sources first (no properties needed)
  if (cleanId in STATIC_LIGHT_SOURCES) {
    return STATIC_LIGHT_SOURCES[cleanId];
  }

  // Check conditional sources (property-based)
  if (cleanId in CONDITIONAL_LIGHT_SOURCES) {
    const config = CONDITIONAL_LIGHT_SOURCES[cleanId];
    const propertyValue = props[config.property];
    return propertyValue === "true"
      ? config.lightWhenTrue
      : config.lightWhenFalse;
  }

  // Check formula-based sources (complex calculations)
  if (cleanId in FORMULA_LIGHT_SOURCES) {
    const config = FORMULA_LIGHT_SOURCES[cleanId];
    return config.calculate(props);
  }

  // Block doesn't emit light
  return null;
}

/**
 * Calculate emissive intensity for Three.js based on light level
 * Maps Minecraft light levels (0-15) to Three.js emissive intensity (0-2)
 *
 * Light level 15 (brightest) = intensity 2.0
 * Light level 0 (no light) = intensity 0.0
 *
 * @param lightLevel - Minecraft light level (0-15)
 * @returns Three.js emissive intensity (0-2)
 */
export function calculateEmissiveIntensity(lightLevel: number): number {
  // Map 0-15 to 0-2 with slight curve to make lower lights more visible
  // Using a power curve: intensity = (lightLevel / 15)^0.7 * 2
  const normalized = lightLevel / 15.0;
  const curved = Math.pow(normalized, 0.7);
  return curved * 2.0;
}

/**
 * Check if a block emits any light
 *
 * @param blockId - Block ID (e.g., "minecraft:torch" or "torch")
 * @param props - Blockstate properties
 * @returns true if block emits light (level > 0), false otherwise
 */
export function isLightEmitter(
  blockId: string,
  props: Record<string, string> = {},
): boolean {
  const lightLevel = getBlockLightLevel(blockId, props);
  return lightLevel !== null && lightLevel > 0;
}

/**
 * Conditional visual emissive configuration
 * For blocks that glow visually based on properties but don't emit actual light
 */
export interface ConditionalVisualEmissiveConfig {
  /** Property that controls visual emissive */
  property: string;
  /** Condition for emissive to be active */
  condition: (value: string) => boolean;
  /** Description of the condition */
  description: string;
}

/**
 * Blocks that have conditional visual emissive glow without actual light emission
 * These use emissive texture overlays (_e.png) in resource packs
 */
export const CONDITIONAL_VISUAL_EMISSIVE: Record<
  string,
  ConditionalVisualEmissiveConfig
> = {
  redstone_wire: {
    property: "power",
    condition: (value: string) => parseInt(value, 10) > 0,
    description: "Glows when powered (power > 0)",
  },
  // Note: redstone_dust_* are the model parts, they inherit from redstone_wire
  redstone_dust_dot: {
    property: "power",
    condition: (value: string) => parseInt(value, 10) > 0,
    description: "Glows when powered (power > 0)",
  },
  redstone_dust_line0: {
    property: "power",
    condition: (value: string) => parseInt(value, 10) > 0,
    description: "Glows when powered (power > 0)",
  },
  redstone_dust_line1: {
    property: "power",
    condition: (value: string) => parseInt(value, 10) > 0,
    description: "Glows when powered (power > 0)",
  },
  redstone_dust_overlay: {
    property: "power",
    condition: (value: string) => parseInt(value, 10) > 0,
    description: "Glows when powered (power > 0)",
  },
};

/**
 * Check if a block should have visual emissive glow based on its properties
 *
 * @param blockId - Block ID (e.g., "minecraft:redstone_wire" or "redstone_wire")
 * @param props - Blockstate properties
 * @returns true if visual emissive should be active, false otherwise
 */
export function shouldHaveVisualEmissive(
  blockId: string,
  props: Record<string, string> = {},
): boolean {
  // Normalize block ID (remove minecraft: prefix)
  const normalizedId = blockId.replace(/^minecraft:/, "").replace(/^block\//, "");

  // Check conditional visual emissive
  const config = CONDITIONAL_VISUAL_EMISSIVE[normalizedId];
  if (config) {
    const propValue = props[config.property];
    if (propValue !== undefined) {
      return config.condition(propValue);
    }
    // If property is not set, assume false (no emissive)
    return false;
  }

  return false;
}

/**
 * Special blocks that have visual emissive glow without actual light emission
 * These use emissive texture overlays (_e.png) in resource packs
 *
 * @deprecated Use CONDITIONAL_VISUAL_EMISSIVE for blocks with conditional emissive
 */
export const VISUAL_EMISSIVE_BLOCKS = [
  // Legacy list - kept for backwards compatibility
  // New code should use CONDITIONAL_VISUAL_EMISSIVE instead
];
