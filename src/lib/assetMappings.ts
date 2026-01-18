/**
 * Data-driven asset ID normalization mappings
 * Extracted from hardcoded logic in assetUtils.ts for maintainability
 */

// ============================================================================
// EXACT RENAMES
// When an asset name matches exactly, rename it to this target
// ============================================================================

export const EXACT_RENAMES: Record<string, string> = {
  // Block name corrections (old/abbreviated -> correct)
  magma: "magma_block",
  grass: "short_grass",
  blackstonebutton: "polished_blackstone_button",
  tripbase: "tripwire_hook",
  sandstonetrim: "chiseled_sandstone",
  diamond_ore_new: "diamond_ore",
  sandstone_smooth: "smooth_sandstone",
  red_sandstone_smooth: "smooth_red_sandstone",

  // Nether stem mappings
  warped_side: "warped_stem",
  warped: "warped_stem",
  warped_block: "warped_wart_block",

  // Potted plant corrections
  crimson_roots_pot: "potted_crimson_roots",
  warped_roots_pot: "potted_warped_roots",
  azalea_plant: "azalea",

  // Texture-to-block mappings
  beehive_end: "beehive",
  mushroom_block_inside: "brown_mushroom_block",
  piston_top_sticky: "sticky_piston",
  dispenser_front_vertical: "dispenser",
  dropper_front_vertical: "dropper",

  // Campfire texture mappings
  campfire_log: "campfire",
  campfire_log_lit: "campfire",
  campfire_fire: "campfire",
  soul_campfire_log: "soul_campfire",
  soul_campfire_log_lit: "soul_campfire",
  soul_campfire_fire: "soul_campfire",
};

// ============================================================================
// PREFIX MAPPINGS
// When a name starts with this prefix, return this target
// Sorted by specificity (longer prefixes first to match correctly)
// ============================================================================

export interface PrefixMapping {
  prefix: string;
  target: string;
}

export const PREFIX_MAPPINGS: PrefixMapping[] = [
  // Most specific first (longest prefixes)
  { prefix: "potted_flowering_azalea_bush", target: "potted_flowering_azalea_bush" },
  { prefix: "potted_azalea_bush", target: "potted_azalea_bush" },
  { prefix: "calibrated_sculk_sensor", target: "calibrated_sculk_sensor" },
  { prefix: "small_dripleaf_stem", target: "small_dripleaf" },
  { prefix: "chiseled_bookshelf", target: "chiseled_bookshelf" },
  { prefix: "sculk_sensor_tendril", target: "sculk_sensor" },
  { prefix: "pointed_dripstone", target: "pointed_dripstone" },
  { prefix: "stonecutter_saw", target: "stonecutter" },
  { prefix: "moss_block_side_overlay", target: "moss_block" },
  { prefix: "daylight_detector", target: "daylight_detector" },
  { prefix: "quartz_block_slab", target: "quartz_slab" },
  { prefix: "structure_block", target: "structure_block" },
  { prefix: "respawn_anchor", target: "respawn_anchor" },
  { prefix: "sculk_catalyst", target: "sculk_catalyst" },
  { prefix: "sculk_shrieker", target: "sculk_shrieker" },
  { prefix: "trial_spawner", target: "trial_spawner" },
  { prefix: "destroy_stage", target: "destroy_stage" },
  { prefix: "observer_back", target: "observer" },
  { prefix: "redstone_dust", target: "redstone_wire" },
  { prefix: "big_dripleaf", target: "big_dripleaf" },
  { prefix: "pitcher_crop", target: "pitcher_crop" },
  { prefix: "sniffer_egg", target: "sniffer_egg" },
  { prefix: "grass_block", target: "grass_block" },
  { prefix: "pink_petals", target: "pink_petals" },
  { prefix: "turtle_egg", target: "turtle_egg" },
  { prefix: "barrel_top", target: "barrel" },
  { prefix: "pitcherbot", target: "pitcher_crop" },
  { prefix: "pitchertop", target: "pitcher_crop" },
  { prefix: "dirt_path", target: "dirt_path" },
  { prefix: "moss_side", target: "moss_block" },
  { prefix: "kelp_age", target: "kelp" },
  { prefix: "crafter_", target: "crafter" },
  { prefix: "lectern", target: "lectern" },
  { prefix: "jigsaw", target: "jigsaw" },
  { prefix: "vault_", target: "vault" },
  { prefix: "water_", target: "water" },
  { prefix: "lava_", target: "lava" },
];

// ============================================================================
// REGEX TRANSFORMATIONS
// Applied in order; first match wins
// ============================================================================

export interface RegexTransform {
  pattern: RegExp;
  replacement: string | ((match: RegExpMatchArray) => string);
}

export const REGEX_TRANSFORMS: RegexTransform[] = [
  // Fungi -> Fungus (Nether biome)
  { pattern: /^(warped|crimson)_fungi$/, replacement: "$1_fungus" },

  // Crop stages: wheat_stage6_bottom -> wheat, potatoes_stage3 -> potatoes
  { pattern: /^(.+?)_stage_?\d+.*$/, replacement: "$1" },

  // Leaves inventory variants: acacia_leaves_bushy_inventory -> acacia_leaves
  { pattern: /^(.+_leaves)_bushy_inventory$/, replacement: "$1" },

  // Furnace/smoker/blast_furnace face textures
  { pattern: /^(furnace|smoker|blast_furnace)_(front|top)(_on)?$/, replacement: "$1" },

  // Double slabs: cut_copper_slab_double -> cut_copper_slab
  { pattern: /^(.+_slab)_double$/, replacement: "$1" },

  // Copper bulb variants (preserve oxidation prefix)
  { pattern: /^((?:exposed_|oxidized_|weathered_)?copper_bulb).*$/, replacement: "$1" },

  // Bee nest/hive honey textures: bee_nest_front_honey -> bee_nest
  { pattern: /^(.+?)(_front)?_honey$/, replacement: "$1" },

  // Dried kelp textures (not the block itself): dried_kelp_top -> dried_kelp_block
  {
    pattern: /^dried_kelp_(top|side|bottom)$/,
    replacement: "dried_kelp_block",
  },

  // Campfire/soul_campfire texture patterns
  {
    pattern: /^(soul_)?campfire_(fire|log|log_lit)$/,
    replacement: (m) => (m[1] ? "soul_campfire" : "campfire"),
  },
];

// ============================================================================
// STRUCTURAL SUFFIXES
// Face/part/orientation identifiers that don't affect blockstate lookup
// ============================================================================

export const STRUCTURAL_SUFFIXES = [
  // Orientations/faces
  "top",
  "bottom",
  "upper",
  "lower",
  "side",
  "front",
  "back",
  "end",
  "left",
  "right",
  "north",
  "south",
  "east",
  "west",

  // Parts
  "head",
  "foot",
  "inner",
  "base",
  "arm",
  "inside",
  "outside",
  "post",
  "walls",
  "tip",
  "frustum",
  "merge",
  "middle",
  "corner",
  "pivot",
  "round",

  // Texture variants (for display, not blockstate)
  "inventory",
  "bushy",
  "stalk",
  "stem",
  "plant",
  "large_leaves",
  "small_leaves",
  "singleleaf",
  "overlay",
  "particle",
  "snow",

  // Block-specific parts
  "eye", // end portal frame
  "conditional", // command block
  "occupied",
  "empty",
  "moist", // farmland
  "flow",
  "still", // liquids
  "dead",
  "compost",
  "ready",
  "bloom",
  "hanging",
  "crafting",
  "ejecting",
  "ominous",
] as const;

// ============================================================================
// STATE SUFFIXES
// Block state property indicators (on/off, lit, powered, etc.)
// ============================================================================

export const STATE_SUFFIXES = [
  // Binary states
  "on",
  "off",
  "lit",
  "unlit",
  "open",
  "closed",
  "locked",
  "unlocked",
  "active",
  "inactive",
  "enabled",
  "disabled",
  "powered",
  "unpowered",
  "triggered",
  "untriggered",
  "extended",
  "retracted",
  "attached",
  "detached",
  "connected",
  "disconnected",
  "disarmed",
  "unstable",
  "tipped",
  "filled",

  // Special states
  "honey",
  "partial_tilt",
  "full_tilt",
  "not_cracked",
  "slightly_cracked",
  "very_cracked",
] as const;

// ============================================================================
// NUMERIC STATE SUFFIXES
// Block state properties with numeric values (level_0, age_7, etc.)
// These are stripped for base name but NOT counted as texture variants
// ============================================================================

export const NUMERIC_STATE_PREFIXES = [
  "stage",
  "age",
  "level",
  "distance",
  "power",
  "moisture",
  "rotation",
  "charges",
  "candles",
  "bites",
  "layers",
  "delay",
  "note",
  "pickles",
  "eggs",
  "hatch",
  "dusted",
] as const;

// ============================================================================
// SPECIAL PATH HANDLERS
// Paths that need special extraction before normal processing
// ============================================================================

export const SPECIAL_PATH_PATTERNS = {
  // Variated texture paths: "variated/andesite/0" -> extract "andesite"
  variated: /^variated\/([^/]+)\//,

  // Break textures: "break/black_candle" -> strip "break/"
  break: /^break\//,

  // Old iron prefix: "old iron/iron_block" -> strip "old iron/"
  oldIron: /^old iron\//,

  // Nested paths with readme: "green_birch_leaves/readme" -> extract parent
  nestedPath: /^([^/]+)\//,
} as const;

// ============================================================================
// WALL BLOCK PATTERNS
// Wall-mounted variants share blockstate with floor/standing variants
// ============================================================================

export const WALL_PATTERNS = {
  // "wall_torch" -> "torch"
  wallPrefix: /^wall_/,
  // "redstone_wall_torch" -> "redstone_torch"
  wallInfix: /_wall_/,
} as const;

// ============================================================================
// PRESERVED NAMES
// Names that should NOT have suffixes stripped (they're the actual block name)
// ============================================================================

export const PRESERVED_NAMES = new Set([
  "pumpkin_stem",
  "melon_stem",
  "attached_pumpkin_stem",
  "attached_melon_stem",
]);

// ============================================================================
// PRESSURE PLATE MAPPINGS
// _pp suffix shorthand from custom packs
// ============================================================================

export const PRESSURE_PLATE_MAPPINGS: Record<string, string> = {
  gold: "light_weighted_pressure_plate",
  iron: "heavy_weighted_pressure_plate",
  polished_bs: "polished_blackstone_pressure_plate",
};

// ============================================================================
// VARIANT GROUP SPECIAL CASES
// For getVariantGroupKey - paths that map to different group keys
// ============================================================================

export const VARIANT_GROUP_OVERRIDES: Record<string, string> = {
  "item/redstone": "block/redstone_wire",
};

// Patterns that should map to specific group keys
export const VARIANT_GROUP_PATTERNS: Array<{
  pattern: RegExp;
  groupKey: string;
}> = [
  // GUI redstone slot sprites group with redstone_wire
  {
    pattern: /^gui\/sprites\/container\/slot\/redstone_dust/,
    groupKey: "block/redstone_wire",
  },
  // Campfire fire/log textures group with base campfire
  { pattern: /campfire_fire|campfire_log/, groupKey: "block/campfire" },
  {
    pattern: /soul_campfire_fire|soul_campfire_log/,
    groupKey: "block/soul_campfire",
  },
];

// ============================================================================
// BUILD COMBINED SUFFIX REGEX
// Pre-compiled for performance
// ============================================================================

const structuralSuffixPattern = STRUCTURAL_SUFFIXES.join("|");
const stateSuffixPattern = STATE_SUFFIXES.join("|");
const numericStatePattern = NUMERIC_STATE_PREFIXES.map((p) => `${p}_?\\d+`).join("|");

// For getBaseName: strip structural suffixes with optional trailing number
export const STRUCTURAL_SUFFIX_REGEX = new RegExp(
  `_(${structuralSuffixPattern})\\d*$`
);

// For getBaseName: strip state suffixes
export const STATE_SUFFIX_REGEX = new RegExp(`_(${stateSuffixPattern})$`);

// For getVariantGroupKey: comprehensive suffix stripping (loops until no more matches)
export const VARIANT_STRUCTURAL_SUFFIX_REGEX = new RegExp(
  `_(${structuralSuffixPattern}|bushy_inventory)\\d*$`
);

export const VARIANT_STATE_SUFFIX_REGEX = new RegExp(
  `_(${stateSuffixPattern}|${numericStatePattern})$`
);

// For checking if a number suffix is a blockstate property (not a texture variant)
export const BLOCKSTATE_NUMERIC_SUFFIX_REGEX = new RegExp(
  `_(${NUMERIC_STATE_PREFIXES.join("|")})_?\\d+$`
);
