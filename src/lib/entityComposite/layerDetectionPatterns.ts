/**
 * Pattern matching configuration for entity layer detection
 */

/**
 * Known entity overlay suffixes that indicate feature layers
 */
export const OVERLAY_SUFFIXES = [
  "_eyes",
  "_overlay",
  "_outer",
  "_outer_layer",
  "_fur",
  "_wool",
  "_wool_undercoat",
  "_undercoat",
  "_collar",
  "_saddle",
  "_armor",
  "_charge",
  "_crackiness_low",
  "_crackiness_medium",
  "_crackiness_high",
];

/**
 * Entity path prefixes that indicate feature layers
 */
export const FEATURE_LAYER_PREFIXES = [
  "villager/type/",
  "villager/profession/",
  "villager/profession_level/",
  "zombie_villager/type/",
  "zombie_villager/profession/",
  "zombie_villager/profession_level/",
];

/**
 * Bee variants that should be treated as feature layers
 */
export const BEE_LAYER_VARIANTS = [
  "bee_angry",
  "bee_nectar",
  "bee_angry_nectar",
  "bee_stinger",
  "bee_angry_stinger",
  "bee_nectar_stinger",
  "bee_angry_nectar_stinger",
];

/**
 * Breeze variants that should be treated as feature layers
 */
export const BREEZE_LAYER_VARIANTS = [
  "breeze_wind",
  "breeze_wind_charge",
  "breeze_air",
];

/**
 * Equipment kinds mapped to their owning entity names
 */
export const EQUIPMENT_ENTITY_MAP: Record<string, string[]> = {
  camel: ["camel"],
  donkey: ["donkey"],
  mule: ["mule"],
  horse: ["horse"],
  skeleton_horse: ["skeleton_horse"],
  zombie_horse: ["zombie_horse"],
  pig_saddle: ["pig"],
  strider: ["strider"],
  llama: ["llama", "trader_llama"],
  happy_ghast: ["happy_ghast"],
  piglin: ["piglin", "piglin_brute"],
};
