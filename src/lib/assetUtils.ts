/**
 * Utilities for working with Minecraft asset IDs and names
 */

/**
 * Normalize an asset ID by removing trailing underscores and underscores before numbers
 * This fixes malformed asset IDs from certain resource packs (especially VanillaTweaks)
 *
 * Examples:
 * - "minecraft:block/acacia_planks_" -> "minecraft:block/acacia_planks"
 * - "minecraft:block/acacia_planks_01" -> "minecraft:block/acacia_planks01"
 */
export function normalizeAssetId(assetId: string): string {
  let normalized = assetId;

  // Remove underscores before numbers (e.g., "acacia_planks_01" -> "acacia_planks01")
  normalized = normalized.replace(/_(\d+)/g, "$1");

  // Remove trailing underscores (e.g., "acacia_planks_" -> "acacia_planks")
  normalized = normalized.replace(/_+$/, "");

  return normalized;
}

/**
 * Beautify an asset ID for display
 *
 * Examples:
 * - "minecraft:block/acacia_door_bottom" -> "Acacia Door Bottom"
 * - "minecraft:block/acacia_leaves_bushy" -> "Acacia Leaves (Bushy)"
 * - "minecraft:block/acacia_leaves_bushy1" -> "Acacia Leaves (Bushy 1)"
 * - "minecraft:block/acacia_planks" -> "Acacia Planks"
 * - "minecraft:block/acacia_planks1" -> "Acacia Planks (1)"
 * - "minecraft:block/acacia_log_top" -> "Acacia Log (Top)"
 */
export function beautifyAssetName(assetId: string): string {
  // Remove "minecraft:block/" or "minecraft:" prefix
  let name = assetId.replace(/^minecraft:(block\/|item\/|)/, "");

  // For multi-level paths (gui/sprites/hud/jump_bar_background, mob_effect/jump_boost),
  // extract just the last part of the path for cleaner display names
  if (name.includes('/')) {
    const parts = name.split('/');
    name = parts[parts.length - 1]; // Get the last part (e.g., "jump_bar_background")
  }

  // Handle numbered variants at the end (e.g., "acacia_planks1" -> "acacia_planks (1)")
  const numberMatch = name.match(/^(.+?)(\d+)$/);
  let suffix = "";

  if (numberMatch) {
    name = numberMatch[1];
    suffix = ` (${numberMatch[2]})`;
  }

  // Handle common suffixes that should be in parentheses
  const suffixPatterns = [
    { pattern: /_top$/, replacement: " (Top)" },
    { pattern: /_bottom$/, replacement: " (Bottom)" },
    { pattern: /_side$/, replacement: " (Side)" },
    { pattern: /_front$/, replacement: " (Front)" },
    { pattern: /_back$/, replacement: " (Back)" },
    { pattern: /_left$/, replacement: " (Left)" },
    { pattern: /_right$/, replacement: " (Right)" },
    { pattern: /_inventory$/, replacement: " (Inventory)" },
    { pattern: /_bushy$/, replacement: " (Bushy)" },
    { pattern: /_stage(\d+)$/, replacement: " (Stage $1)" },
  ];

  for (const { pattern, replacement } of suffixPatterns) {
    if (pattern.test(name)) {
      name = name.replace(pattern, replacement);
      // Convert to title case and return early
      return titleCase(name) + suffix;
    }
  }

  // Replace underscores with spaces
  name = name.replace(/_/g, " ");

  // Convert to title case
  name = titleCase(name);

  return name + suffix;
}

/**
 * Convert a string to Title Case
 */
function titleCase(str: string): string {
  return str
    .split(" ")
    .map((word) => {
      if (word.length === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Get a short display name from asset ID (for compact views)
 * Removes namespace prefix only
 */
export function getShortAssetName(assetId: string): string {
  return assetId.replace(/^minecraft:(block\/|item\/|)/, "");
}

/**
 * Check if an asset is a block texture
 */
export function isBlockTexture(assetId: string): boolean {
  return assetId.includes(":block/");
}

/**
 * Check if an asset is an item texture
 */
export function isItemTexture(assetId: string): boolean {
  return assetId.includes(":item/");
}

/**
 * Check if an asset is a biome colormap (grass/foliage)
 */
export function isBiomeColormapAsset(assetId: string): boolean {
  return assetId.includes(":colormap/");
}

/**
 * Check if an asset is a 2D-only texture (GUI, particle, entity, etc.)
 * These textures should be displayed as flat 2D sprites, not as 3D objects
 *
 * NOTE: Items are NOT included here - they use Preview3DItem for 3D dropped item rendering
 */
export function is2DOnlyTexture(assetId: string): boolean {
  // Extract the path after the namespace (e.g., "minecraft:gui/container" -> "gui/container")
  const path = assetId.includes(':') ? assetId.split(':')[1] : assetId;

  // List of texture categories that are 2D-only
  const twoDOnlyPaths = [
    'gui/',           // GUI elements (containers, widgets, buttons)
    'particle/',      // Particle effects
    'painting/',      // Painting textures
    'mob_effect/',    // Potion/status effect icons
    'font/',          // Font textures
    'misc/',          // Miscellaneous textures
    'entity/',        // Entity textures (mob skins, etc.)
    'map/',           // Map decorations
    'models/',        // Model textures
    'environment/',   // Environment textures (moon, sun, clouds)
    'effect/',        // Effect textures
  ];

  return twoDOnlyPaths.some(prefix => path.startsWith(prefix));
}

/**
 * Check if an asset is a Minecraft item texture
 * Items are rendered as 3D dropped items (not flat 2D sprites)
 */
export function isMinecraftItem(assetId: string): boolean {
  return assetId.includes(':item/');
}

/**
 * Get the texture category from an asset ID
 * Returns the category path (e.g., "gui", "particle", "block", "item")
 */
export function getTextureCategory(assetId: string): string | null {
  const path = assetId.includes(':') ? assetId.split(':')[1] : assetId;
  const firstSlash = path.indexOf('/');

  if (firstSlash === -1) return null;

  return path.substring(0, firstSlash);
}

/**
 * Get the biome colormap type ("grass" or "foliage") from an asset ID
 */
export function getColormapTypeFromAssetId(
  assetId: string,
): "grass" | "foliage" | null {
  if (!isBiomeColormapAsset(assetId)) {
    return null;
  }

  const path = assetId.replace(/^[^:]*:/, "");
  const parts = path.split("/");
  const last = parts[parts.length - 1];

  if (last === "grass") {
    return "grass";
  }
  if (last === "foliage") {
    return "foliage";
  }
  return null;
}

/**
 * Extract the variant label (e.g., "No Orange Grass") for optional colormaps
 */
export function getColormapVariantLabel(assetId: string): string | null {
  if (!isBiomeColormapAsset(assetId)) {
    return null;
  }

  const match = assetId.match(/^[^:]*:colormap\/(.+)$/);
  if (!match) return null;

  const path = match[1];
  const parts = path.split("/");
  if (parts.length <= 1) {
    return null;
  }

  return parts.slice(0, -1).join(" / ");
}

/**
 * Convert an asset ID to its relative texture path inside a pack
 */
export function assetIdToTexturePath(assetId: string): string {
  const [namespace, rawPath] = assetId.includes(":")
    ? assetId.split(":")
    : ["minecraft", assetId];
  return `assets/${namespace}/textures/${rawPath}.png`;
}

/**
 * Get the canonical asset ID for a biome colormap type
 */
export function getColormapAssetId(type: "grass" | "foliage"): string {
  return `minecraft:colormap/${type}`;
}

const FOLIAGE_KEYWORDS = [
  "leaf",
  "leaves",
  "azalea",
  "bush",
  "vine",
  "cactus",
  "sapling",
  "flower",
  "fern",
  "hanging_roots",
  "moss",
];

/**
 * Heuristic guess for which colormap type a block asset should use
 */
export function guessColormapTypeForAsset(
  assetId?: string,
): "grass" | "foliage" {
  if (!assetId) return "grass";

  const normalized = assetId.toLowerCase();
  const isFoliage = FOLIAGE_KEYWORDS.some((keyword) =>
    normalized.includes(keyword),
  );

  return isFoliage ? "foliage" : "grass";
}

/**
 * Block state suffix patterns that should be extracted as properties
 * These are universal patterns used across many Minecraft blocks
 */
interface BlockStateSuffix {
  pattern: RegExp;
  property: string;
  value: string;
  // If true, also check for the opposite suffix (e.g., _on/_off)
  opposite?: { suffix: string; value: string };
}

const BLOCK_STATE_SUFFIXES: BlockStateSuffix[] = [
  // Redstone power state (rails, repeaters, comparators, etc.)
  {
    pattern: /_on$/,
    property: "powered",
    value: "true",
    opposite: { suffix: "_off", value: "false" },
  },
  // Lit state (furnaces, redstone torches, etc.)
  {
    pattern: /_lit$/,
    property: "lit",
    value: "true",
  },
  // Open/closed state (doors, trapdoors, fence gates)
  {
    pattern: /_open$/,
    property: "open",
    value: "true",
    opposite: { suffix: "_closed", value: "false" },
  },
  // Active state (sculk sensors, etc.)
  {
    pattern: /_active$/,
    property: "active",
    value: "true",
    opposite: { suffix: "_inactive", value: "false" },
  },
  // Triggered state (dispensers, droppers)
  {
    pattern: /_triggered$/,
    property: "triggered",
    value: "true",
  },
];

/**
 * Extract block state properties from an asset ID suffix
 * Example: "activator_rail_on" -> { powered: "true" }
 * Example: "furnace_lit" -> { lit: "true" }
 * Example: "oak_door_open" -> { open: "true" }
 */
export function extractBlockStateProperties(
  assetId: string,
): Record<string, string> {
  const name = assetId.replace(/^minecraft:(block\/|item\/|)/, "");
  const props: Record<string, string> = {};

  for (const suffix of BLOCK_STATE_SUFFIXES) {
    if (suffix.pattern.test(name)) {
      props[suffix.property] = suffix.value;
      break;
    }
    // Check for opposite suffix
    if (suffix.opposite && name.endsWith(suffix.opposite.suffix)) {
      props[suffix.property] = suffix.opposite.value;
      break;
    }
  }

  return props;
}

/**
 * Remove block state suffixes from an asset name
 * Example: "activator_rail_on" -> "activator_rail"
 * Example: "furnace_lit" -> "furnace"
 */
export function removeBlockStateSuffixes(name: string): string {
  let result = name;

  // Remove state suffixes
  for (const suffix of BLOCK_STATE_SUFFIXES) {
    result = result.replace(suffix.pattern, "");
    if (suffix.opposite) {
      result = result.replace(new RegExp(`${suffix.opposite.suffix}$`), "");
    }
  }

  return result;
}

/**
 * Transform asset name to match blockstate file naming convention
 * Handles potted plants and other special naming patterns
 * Example: "allium_potted" -> "potted_allium"
 * Example: "cactus_potted" -> "potted_cactus"
 */
export function normalizeBlockNameForBlockstate(name: string): string {
  // Handle "_potted" suffix -> "potted_" prefix
  // Minecraft blockstates use "potted_plant" format, not "plant_potted"
  if (name.endsWith("_potted")) {
    const plantName = name.replace(/_potted$/, "");
    return `potted_${plantName}`;
  }

  return name;
}

/**
 * Extract the base name without variant suffixes
 * Example: "acacia_leaves_bushy1" -> "acacia_leaves"
 * Example: "activator_rail_on" -> "activator_rail"
 * Example: "variated/andesite/0" -> "andesite"
 * Example: "wheat_stage6_bottom" -> "wheat"
 */
export function getBaseName(assetId: string): string {
  let name = assetId.replace(/^minecraft:(block\/|item\/|)/, "");

  // Remove .png extension if present (malformed asset IDs)
  name = name.replace(/\.png$/, "");

  // Handle variated/ texture paths: "variated/andesite/0" -> "andesite"
  const variatedMatch = name.match(/^variated\/([^/]+)\//);
  if (variatedMatch) {
    name = variatedMatch[1];
    return name;
  }

  // Handle break/ texture paths - these are particle textures, not blocks
  // We'll still try to extract a base name for grouping
  if (name.startsWith("break/")) {
    name = name.replace(/^break\//, "");
  }

  // Handle "old iron/" prefixed textures
  if (name.startsWith("old iron/")) {
    name = name.replace(/^old iron\//, "");
  }

  // Handle green_birch_leaves/readme type paths
  const slashMatch = name.match(/^([^/]+)\//);
  if (slashMatch) {
    // Skip readme files and similar non-texture files
    if (name.includes("readme")) {
      return "readme"; // This will fail but that's expected
    }
    name = slashMatch[1];
  }

  // Fix fungi -> fungus (warped_fungi -> warped_fungus, crimson_fungi -> crimson_fungus)
  name = name.replace(/^(warped|crimson)_fungi/, "$1_fungus");

  // Handle pitcherbot/pitchertop -> pitcher_crop (custom pack abbreviations)
  if (name.startsWith("pitcherbot") || name.startsWith("pitchertop")) {
    return "pitcher_crop";
  }

  // Handle blackstonebutton -> polished_blackstone_button
  if (name === "blackstonebutton") {
    return "polished_blackstone_button";
  }

  // Handle pitcher_crop patterns BEFORE general crop stage check
  // pitcher_crop_bottom_stage_4 -> pitcher_crop
  // pitcher_crop_top_stage_3 -> pitcher_crop
  if (name.startsWith("pitcher_crop")) {
    return "pitcher_crop";
  }

  // Handle crop stage patterns with multiple suffixes
  // wheat_stage6_bottom -> wheat, wheat_stage_6_top -> wheat
  // potatoes_stage3_bottom -> potatoes, carrots_stage3_top -> carrots
  const cropMatch = name.match(/^(.+?)_stage_?\d+/);
  if (cropMatch) {
    name = cropMatch[1];
    return name;
  }

  // Handle kelp_age_25 -> kelp
  if (name.startsWith("kelp_age")) {
    return "kelp";
  }

  // Handle turtle_egg patterns -> turtle_egg
  if (name.startsWith("turtle_egg")) {
    return "turtle_egg";
  }

  // Handle structure_block patterns -> structure_block
  if (name.startsWith("structure_block")) {
    return "structure_block";
  }

  // Handle sculk_catalyst patterns -> sculk_catalyst
  if (name.startsWith("sculk_catalyst")) {
    return "sculk_catalyst";
  }

  // Handle sculk_shrieker patterns -> sculk_shrieker
  if (name.startsWith("sculk_shrieker")) {
    return "sculk_shrieker";
  }

  // Handle pink_petals patterns -> pink_petals
  if (name.startsWith("pink_petals")) {
    return "pink_petals";
  }

  // Handle potted_azalea_bush patterns -> potted_azalea_bush or potted_flowering_azalea_bush
  if (name.startsWith("potted_flowering_azalea_bush")) {
    return "potted_flowering_azalea_bush";
  }
  if (name.startsWith("potted_azalea_bush")) {
    return "potted_azalea_bush";
  }

  // Handle bee nest/hive honey patterns
  // bee_nest_front_honey -> bee_nest, beehive_front_honey -> beehive
  if (name.includes("_honey")) {
    name = name.replace(/_front_honey$/, "").replace(/_honey$/, "");
  }

  // Handle beehive_end -> beehive
  if (name === "beehive_end") {
    return "beehive";
  }

  // Handle barrel_top_open -> barrel
  if (name.startsWith("barrel_top")) {
    return "barrel";
  }

  // Handle observer_back_on -> observer
  if (name.startsWith("observer_back")) {
    return "observer";
  }

  // Handle respawn_anchor_top_off -> respawn_anchor
  if (name.startsWith("respawn_anchor")) {
    return "respawn_anchor";
  }

  // Handle daylight_detector_inverted_top -> daylight_detector
  if (name.startsWith("daylight_detector")) {
    return "daylight_detector";
  }

  // Handle piston patterns -> piston or sticky_piston
  if (name === "piston_top_sticky") {
    return "sticky_piston";
  }

  // Handle furnace/smoker/blast_furnace _front_on patterns
  // These blocks use "lit" property, but textures use "_on" suffix
  const furnaceMatch = name.match(/^(furnace|smoker|blast_furnace)_(front|top)_on$/);
  if (furnaceMatch) {
    return furnaceMatch[1];
  }
  const furnaceMatch2 = name.match(/^(furnace|smoker|blast_furnace)_(front|top)$/);
  if (furnaceMatch2) {
    return furnaceMatch2[1];
  }

  // Handle _double suffix for slabs
  // cut_copper_slab_double -> cut_copper_slab
  const doubleSlabMatch = name.match(/^(.+_slab)_double$/);
  if (doubleSlabMatch) {
    return doubleSlabMatch[1];
  }

  // Handle dispenser/dropper _vertical patterns -> dispenser/dropper
  if (name === "dispenser_front_vertical") {
    return "dispenser";
  }
  if (name === "dropper_front_vertical") {
    return "dropper";
  }

  // Handle dirt_path_side_lower -> dirt_path
  if (name.startsWith("dirt_path")) {
    return "dirt_path";
  }

  // Handle grass_block patterns -> grass_block
  if (name.startsWith("grass_block")) {
    return "grass_block";
  }

  // Handle moss_block side overlay -> moss_block
  if (name.startsWith("moss_side") || name === "moss_block_side_overlay") {
    return "moss_block";
  }

  // Handle mushroom_block_inside -> brown_mushroom_block (or red, but we default to brown)
  if (name === "mushroom_block_inside") {
    return "brown_mushroom_block";
  }

  // Handle magma -> magma_block
  if (name === "magma") {
    return "magma_block";
  }

  // Handle grass (short grass plant) -> short_grass
  if (name === "grass") {
    return "short_grass";
  }

  // Handle lectern_sides -> lectern
  if (name.startsWith("lectern")) {
    return "lectern";
  }

  // Handle quartz_block_slab_side -> quartz_slab
  if (name.startsWith("quartz_block_slab")) {
    return "quartz_slab";
  }

  // Handle jigsaw_lock -> jigsaw
  if (name.startsWith("jigsaw")) {
    return "jigsaw";
  }

  // Handle tripbase -> tripwire_hook
  if (name === "tripbase") {
    return "tripwire_hook";
  }

  // Handle warped_side -> warped_stem
  if (name === "warped_side" || name === "warped") {
    return "warped_stem";
  }

  // Handle warped_block -> warped_wart_block
  if (name === "warped_block") {
    return "warped_wart_block";
  }

  // Handle crimson_roots_pot and warped_roots_pot -> potted versions
  if (name === "crimson_roots_pot") {
    return "potted_crimson_roots";
  }
  if (name === "warped_roots_pot") {
    return "potted_warped_roots";
  }

  // Handle chiseled_bookshelf_book_ends -> chiseled_bookshelf
  if (name.startsWith("chiseled_bookshelf")) {
    return "chiseled_bookshelf";
  }

  // Handle acacia_leaves_bushy_inventory -> acacia_leaves
  // and mangrove_leaves_bushy_inventory -> mangrove_leaves
  const leavesInventoryMatch = name.match(/^(.+_leaves)_bushy_inventory$/);
  if (leavesInventoryMatch) {
    return leavesInventoryMatch[1];
  }

  // Handle azalea_plant -> azalea
  if (name === "azalea_plant") {
    return "azalea";
  }

  // Handle water textures -> water
  if (name.startsWith("water_")) {
    return "water";
  }

  // Handle lava textures -> lava
  if (name.startsWith("lava_")) {
    return "lava";
  }

  // Handle sandstone_smooth -> smooth_sandstone
  if (name === "sandstone_smooth") {
    return "smooth_sandstone";
  }
  if (name === "red_sandstone_smooth") {
    return "smooth_red_sandstone";
  }

  // Handle sandstonetrim -> chiseled_sandstone (old naming)
  if (name === "sandstonetrim") {
    return "chiseled_sandstone";
  }

  // Handle diamond_ore_new -> diamond_ore
  if (name === "diamond_ore_new") {
    return "diamond_ore";
  }

  // Handle _dfx suffix (custom format) - strip it
  name = name.replace(/_dfx$/, "");

  // Handle _pp suffix (pressure plate shorthand from custom packs)
  // Map to actual Minecraft pressure plate names
  if (name.endsWith("_pp")) {
    const base = name.replace(/_pp$/, "");
    // Special cases for weighted pressure plates
    if (base === "gold") {
      return "light_weighted_pressure_plate";
    }
    if (base === "iron") {
      return "heavy_weighted_pressure_plate";
    }
    if (base === "polished_bs") {
      return "polished_blackstone_pressure_plate";
    }
    // For wood types, convert to pressure plate
    // oak_pp -> oak_pressure_plate, etc.
    return `${base}_pressure_plate`;
  }

  // Handle destroy_stage_X -> these aren't real blocks
  if (name.startsWith("destroy_stage")) {
    return "destroy_stage";
  }

  // Handle sniffer_egg patterns
  // sniffer_egg_not_cracked_bottom -> sniffer_egg
  // sniffer_egg_slightly_cracked_top -> sniffer_egg
  // sniffer_egg_very_cracked_east -> sniffer_egg
  if (name.startsWith("sniffer_egg")) {
    return "sniffer_egg";
  }

  // Handle trial_spawner textures -> trial_spawner
  if (name.startsWith("trial_spawner")) {
    return "trial_spawner";
  }

  // Handle vault textures -> vault
  if (name.startsWith("vault_")) {
    return "vault";
  }

  // Handle crafter textures -> crafter
  if (name.startsWith("crafter_")) {
    return "crafter";
  }

  // Handle copper_bulb variants -> copper_bulb (or exposed/oxidized/weathered variants)
  const copperBulbMatch = name.match(/^((?:exposed_|oxidized_|weathered_)?copper_bulb)/);
  if (copperBulbMatch) {
    return copperBulbMatch[1];
  }

  // Handle campfire patterns -> campfire or soul_campfire
  if (name.startsWith("campfire_") || name.startsWith("soul_campfire_")) {
    return name.startsWith("soul_") ? "soul_campfire" : "campfire";
  }

  // Handle sculk_sensor_tendril -> sculk_sensor
  if (name.startsWith("sculk_sensor_tendril")) {
    return "sculk_sensor";
  }

  // Handle calibrated_sculk_sensor patterns
  if (name.startsWith("calibrated_sculk_sensor")) {
    return "calibrated_sculk_sensor";
  }

  // Handle small_dripleaf_stem -> small_dripleaf
  if (name.startsWith("small_dripleaf_stem")) {
    return "small_dripleaf";
  }

  // Handle big_dripleaf patterns -> big_dripleaf
  if (name.startsWith("big_dripleaf")) {
    return "big_dripleaf";
  }

  // Handle pointed_dripstone patterns -> pointed_dripstone
  if (name.startsWith("pointed_dripstone")) {
    return "pointed_dripstone";
  }

  // Handle stonecutter_saw -> stonecutter
  if (name.startsWith("stonecutter_saw")) {
    return "stonecutter";
  }

  // Handle redstone_dust patterns -> redstone_wire
  if (name.startsWith("redstone_dust")) {
    return "redstone_wire";
  }

  // Handle dried_kelp_block patterns (dried_kelp_top/side/bottom are block textures)
  if (name.startsWith("dried_kelp_") && !name.includes("block")) {
    return "dried_kelp_block";
  }

  // Remove common structural suffixes (top/bottom, head/foot, etc.)
  // Also handles texture-specific suffixes that don't correspond to blockstates:
  // - bamboo_stalk, bamboo_large_leaves, bamboo_small_leaves -> bamboo
  // - chiseled_bookshelf_occupied, chiseled_bookshelf_empty -> chiseled_bookshelf
  name = name.replace(
    /_(top|bottom|upper|lower|head|foot|side|front|back|left|right|inventory|bushy|stage\d+|stalk|large_leaves|small_leaves|singleleaf|occupied|empty|inner|base|round|pivot|overlay|moist|corner|flow|still|arm|inside|outside|eye|conditional|dead|compost|ready|bloom|hanging|particle|post|walls|tip|frustum|merge|middle|crafting|ejecting|ominous)\d*$/,
    "",
  );

  // Remove block state suffixes (on/off, lit, open/closed, etc.)
  name = removeBlockStateSuffixes(name);

  // Remove trailing numbers
  name = name.replace(/\d+$/, "");

  return name;
}

/**
 * Convert a texture asset ID to the canonical blockstate asset ID
 * Example: "minecraft:block/acacia_door_bottom" -> "minecraft:block/acacia_door"
 * Example: "minecraft:block/activator_rail_on" -> "minecraft:block/activator_rail"
 * Example: "minecraft:block/allium_potted" -> "minecraft:block/potted_allium"
 */
export function getBlockStateIdFromAssetId(assetId: string): string {
  const namespaceMatch = assetId.match(/^([^:]+):/);
  const namespace = namespaceMatch ? namespaceMatch[1] : "minecraft";

  let baseName = getBaseName(assetId);

  // Apply special naming transformations (e.g., potted plants)
  baseName = normalizeBlockNameForBlockstate(baseName);

  return `${namespace}:block/${baseName}`;
}

/**
 * Get the variant group key for an asset
 * This groups assets that should be displayed together with a variant selector
 * Example: "minecraft:block/acacia_leaves" and "minecraft:block/acacia_leaves1" -> "minecraft:block/acacia_leaves"
 *
 * Also handles cases where the base exists alongside numbered variants:
 * - "bamboo_planks", "bamboo_planks01", and "bamboo_planks_01" all group to "bamboo_planks"
 *
 * Groups variants across different namespaces:
 * - "minecraft:block/bamboo_planks" and "custom:block/bamboo_planks01" -> same group
 */
export function getVariantGroupKey(assetId: string): string {
  // Normalize the asset ID first (remove trailing underscores)
  const normalized = normalizeAssetId(assetId);

  // Extract just the path portion, ignoring namespace
  // This allows grouping variants from different namespaces
  const pathMatch = normalized.match(/^[^:]*:(.+)$/);
  let path = pathMatch ? pathMatch[1] : normalized;

  if (path.startsWith("colormap/")) {
    const parts = path.split("/");
    if (parts.length > 1) {
      return `colormap/${parts[parts.length - 1]}`;
    }
  }

  // Strip potted prefix/suffix to group with base plant
  // "block/potted_oak_sapling" -> "block/oak_sapling"
  // "block/oxeye_daisy_potted" -> "block/oxeye_daisy"
  if (path.includes("/potted_")) {
    path = path.replace("/potted_", "/");
  } else if (path.endsWith("_potted")) {
    path = path.replace(/_potted$/, "");
  }

  // Extract the block name from the path for suffix processing
  const pathParts = path.split("/");
  let blockName = pathParts[pathParts.length - 1];
  const pathPrefix = pathParts.slice(0, -1).join("/");

  // Remove comprehensive structural and texture-specific suffixes
  // This groups block states/faces on the same card (e.g., activator_rail + activator_rail_on)
  // Note: Variant counting logic separately determines what's a "texture variant"
  blockName = blockName.replace(
    /_(top|bottom|upper|lower|head|foot|side|front|back|left|right|north|south|east|west|inventory|bushy|bushy_inventory|stage\d+|stalk|stem|large_leaves|small_leaves|singleleaf|occupied|empty|inner|base|round|pivot|overlay|moist|corner|flow|still|arm|inside|outside|eye|conditional|dead|compost|ready|bloom|hanging|particle|post|walls|tip|frustum|merge|middle|crafting|ejecting|ominous)\d*$/,
    "",
  );

  // Remove block state suffixes (on/off, lit, powered, open/closed, etc.)
  // This keeps block states on the same card
  blockName = blockName.replace(
    /_(on|off|lit|unlit|powered|unpowered|open|closed|locked|unlocked|connected|disconnected|triggered|untriggered|enabled|disabled|active|inactive|extended|retracted|attached|detached|disarmed|unstable|tipped|filled|empty|honey|partial_tilt|full_tilt|level_\d+|age_\d+|bites_\d+|layers_\d+|delay_\d+|note_\d+|power_\d+|moisture_\d+|rotation_\d+|distance_\d+|charges_\d+|candles_\d+|pickles_\d+|eggs_\d+|hatch_\d+|dusted_\d+)$/,
    "",
  );

  // Reconstruct path with cleaned block name
  path = pathPrefix ? `${pathPrefix}/${blockName}` : blockName;

  // Remove trailing numbers with optional underscore separator
  // Handles: "acacia_planks1", "acacia_planks01", "acacia_planks_1", "acacia_planks_01"
  const numberMatch = path.match(/^(.+?)_?(\d+)$/);
  if (numberMatch) {
    // Remove any trailing underscore from the base
    return numberMatch[1].replace(/_$/, "");
  }
  return path;
}

/**
 * Check if an asset ID represents an inventory texture variant
 * Inventory textures are used when a block is displayed in the player's inventory
 * (e.g., leaves have grey base textures that get biome-colored in-world, but inventory shows pre-colored version)
 * Example: "minecraft:block/acacia_leaves_inventory" -> true
 * Example: "minecraft:block/acacia_leaves_bushy_inventory" -> true
 */
export function isInventoryVariant(assetId: string): boolean {
  return /_inventory\d*$/.test(assetId);
}

/**
 * Categorize variants into world (placed block) and inventory (held item) types
 * @param variantIds Array of asset IDs representing variants of the same block
 * @returns Object with worldVariants and inventoryVariants arrays
 */
export function categorizeVariants(variantIds: string[]): {
  worldVariants: string[];
  inventoryVariants: string[];
} {
  const worldVariants: string[] = [];
  const inventoryVariants: string[] = [];

  for (const variantId of variantIds) {
    if (isInventoryVariant(variantId)) {
      inventoryVariants.push(variantId);
    } else {
      worldVariants.push(variantId);
    }
  }

  return { worldVariants, inventoryVariants };
}

/**
 * Check if an asset ID represents a numbered variant
 * Example: "minecraft:block/acacia_leaves1" -> true
 */
export function isNumberedVariant(assetId: string): boolean {
  return /\d+$/.test(assetId);
}

/**
 * Extract the variant number from an asset ID
 * Example: "minecraft:block/allium3" -> "3"
 * Example: "minecraft:block/acacia_planks_01" -> "01"
 * Example: "minecraft:block/oak_planks" -> null
 */
export function getVariantNumber(assetId: string): string | null {
  const match = assetId.match(/(\d+)$/);
  return match ? match[1] : null;
}

/**
 * Check if an asset is a potted plant
 * Example: "minecraft:block/oxeye_daisy_potted" -> true
 * Example: "minecraft:block/potted_oak_sapling" -> true
 */
export function isPottedPlant(assetId: string): boolean {
  const path = assetId.replace(/^[^:]*:/, ""); // Remove namespace
  return path.includes("potted") || path.includes("_pot");
}

/**
 * Get the potted version asset ID for a plant
 * Example: "minecraft:block/oak_sapling" -> "minecraft:block/potted_oak_sapling"
 * Example: "minecraft:block/dandelion" -> "minecraft:block/potted_dandelion"
 */
export function getPottedAssetId(assetId: string): string {
  // Extract namespace
  const namespaceMatch = assetId.match(/^([^:]*:)/);
  const namespace = namespaceMatch ? namespaceMatch[1] : "minecraft:";

  // Get the block name without namespace and block/ prefix
  const blockName = assetId.replace(/^[^:]*:/, "").replace(/^block\//, "");

  return `${namespace}block/potted_${blockName}`;
}

/**
 * Extract the plant name from a potted plant asset ID
 * Returns the full asset ID for the plant (with namespace and block/ prefix)
 * Example: "minecraft:block/oxeye_daisy_potted" -> "minecraft:block/oxeye_daisy"
 * Example: "minecraft:block/potted_oak_sapling" -> "minecraft:block/oak_sapling"
 */
export function getPlantNameFromPotted(assetId: string): string | null {
  // Extract namespace (e.g., "minecraft:")
  const namespaceMatch = assetId.match(/^([^:]*:)/);
  const namespace = namespaceMatch ? namespaceMatch[1] : "minecraft:";

  const path = assetId.replace(/^[^:]*:/, ""); // Remove namespace
  const blockPath = path.replace(/^block\//, ""); // Remove "block/" prefix

  let plantName: string | null = null;

  // Handle "plant_potted" format
  if (blockPath.endsWith("_potted")) {
    plantName = blockPath.replace(/_potted$/, "");
  }
  // Handle "potted_plant" format
  else if (blockPath.startsWith("potted_")) {
    plantName = blockPath.replace(/^potted_/, "");
  }

  // Return full asset ID with namespace and block/ prefix
  return plantName ? `${namespace}block/${plantName}` : null;
}

/**
 * Group assets by their variant group key
 * Returns a map where each key is a group identifier and the value is an array of asset IDs
 */
export interface AssetGroup {
  baseId: string; // The primary/base asset ID (without number suffix)
  variantIds: string[]; // All variants including the base
}

export function groupAssetsByVariant(assetIds: string[]): AssetGroup[] {
  const groups = new Map<string, string[]>();

  // Group all assets by their variant group key
  for (const assetId of assetIds) {
    const groupKey = getVariantGroupKey(assetId);
    const existing = groups.get(groupKey) || [];
    existing.push(assetId);
    groups.set(groupKey, existing);
  }

  // Convert to array of AssetGroup objects
  const result: AssetGroup[] = [];
  for (const [baseId, variantIds] of groups.entries()) {
    // Sort variants: base first (no number), then by number
    const sorted = variantIds.sort((a, b) => {
      const structuralPriority = (id: string) => {
        if (/_bottom|_lower|_foot/.test(id)) return 0;
        if (/_top|_upper|_head/.test(id)) return 1;
        return 0;
      };

      const aStructural = structuralPriority(a);
      const bStructural = structuralPriority(b);
      if (aStructural !== bStructural) {
        return aStructural - bStructural;
      }

      const aIsNumbered = isNumberedVariant(a);
      const bIsNumbered = isNumberedVariant(b);

      if (!aIsNumbered && bIsNumbered) return -1;
      if (aIsNumbered && !bIsNumbered) return 1;

      // Both are numbered, sort numerically
      const aNum = parseInt(a.match(/(\d+)$/)?.[1] || "0");
      const bNum = parseInt(b.match(/(\d+)$/)?.[1] || "0");
      return aNum - bNum;
    });

    result.push({ baseId, variantIds: sorted });
  }

  return result;
}
