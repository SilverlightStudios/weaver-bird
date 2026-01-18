/**
 * Utilities for working with Minecraft asset IDs and names
 */

import {
  EXACT_RENAMES,
  PREFIX_MAPPINGS,
  REGEX_TRANSFORMS,
  PRESERVED_NAMES,
  PRESSURE_PLATE_MAPPINGS,
  WALL_PATTERNS,
  SPECIAL_PATH_PATTERNS,
  VARIANT_GROUP_OVERRIDES,
  VARIANT_GROUP_PATTERNS,
  STRUCTURAL_SUFFIX_REGEX,
  STATE_SUFFIX_REGEX,
  VARIANT_STRUCTURAL_SUFFIX_REGEX,
  VARIANT_STATE_SUFFIX_REGEX,
  BLOCKSTATE_NUMERIC_SUFFIX_REGEX,
} from "./assetMappings";

// ============================================================================
// PARSED ASSET ID INTERFACE
// ============================================================================

export interface ParsedAssetId {
  /** Original asset ID */
  original: string;
  /** Namespace (e.g., "minecraft") */
  namespace: string;
  /** Category path (e.g., "block", "item", "entity") */
  category: string;
  /** Base name for blockstate lookup (e.g., "acacia_door" from "acacia_door_bottom") */
  baseName: string;
  /** Key for grouping variants in UI (e.g., "block/acacia_leaves") */
  variantGroupKey: string;
  /** Variant number if present (e.g., "1" from "acacia_planks1"), null otherwise */
  variantNumber: string | null;
  /** Whether this is an inventory texture variant */
  isInventory: boolean;
}

// ============================================================================
// UNIFIED ASSET ID PARSER
// ============================================================================

/**
 * Parse an asset ID into its components using data-driven mappings
 * This is the single source of truth for asset ID normalization
 */
export function parseAssetId(assetId: string): ParsedAssetId {
  // Normalize first (remove .png, underscores before numbers, trailing underscores)
  const normalized = normalizeAssetId(assetId);

  // Extract namespace and path
  const colonIndex = normalized.indexOf(":");
  const namespace = colonIndex >= 0 ? normalized.slice(0, colonIndex) : "minecraft";
  const fullPath = colonIndex >= 0 ? normalized.slice(colonIndex + 1) : normalized;

  // Extract category (first path segment)
  const firstSlash = fullPath.indexOf("/");
  const category = firstSlash >= 0 ? fullPath.slice(0, firstSlash) : "";
  let name = firstSlash >= 0 ? fullPath.slice(firstSlash + 1) : fullPath;

  // Compute base name for blockstate lookup
  const baseName = computeBaseName(name);

  // Compute variant group key for UI grouping
  const variantGroupKey = computeVariantGroupKey(fullPath);

  // Extract variant number
  const variantNumber = extractVariantNumber(name);

  // Check if inventory variant
  const isInventory = /_inventory\d*$/.test(name);

  return {
    original: assetId,
    namespace,
    category,
    baseName,
    variantGroupKey,
    variantNumber,
    isInventory,
  };
}

/**
 * Compute the base name for blockstate lookup
 * Handles exact renames, prefix mappings, regex transforms, and suffix stripping
 */
function computeBaseName(name: string): string {
  // Remove .png extension if present
  name = name.replace(/\.png$/, "");

  // Handle special path patterns first
  const variatedMatch = name.match(SPECIAL_PATH_PATTERNS.variated);
  if (variatedMatch) {
    return variatedMatch[1];
  }

  if (SPECIAL_PATH_PATTERNS.break.test(name)) {
    name = name.replace(SPECIAL_PATH_PATTERNS.break, "");
  }

  if (SPECIAL_PATH_PATTERNS.oldIron.test(name)) {
    name = name.replace(SPECIAL_PATH_PATTERNS.oldIron, "");
  }

  // Handle nested paths (extract first segment, skip readme)
  const nestedMatch = name.match(SPECIAL_PATH_PATTERNS.nestedPath);
  if (nestedMatch) {
    if (name.includes("readme")) {
      return "readme";
    }
    name = nestedMatch[1];
  }

  // Apply fungi -> fungus transformation
  name = name.replace(/^(warped|crimson)_fungi/, "$1_fungus");

  // Handle wall patterns (pattern-based, not name-based)
  if (WALL_PATTERNS.wallPrefix.test(name)) {
    name = name.replace(WALL_PATTERNS.wallPrefix, "");
  } else if (WALL_PATTERNS.wallInfix.test(name)) {
    name = name.replace(WALL_PATTERNS.wallInfix, "_");
  }

  // Check exact renames first
  if (EXACT_RENAMES[name]) {
    return EXACT_RENAMES[name];
  }

  // Check prefix mappings (sorted by length, longest first)
  for (const { prefix, target } of PREFIX_MAPPINGS) {
    if (name.startsWith(prefix)) {
      return target;
    }
  }

  // Apply regex transformations
  for (const { pattern, replacement } of REGEX_TRANSFORMS) {
    if (pattern.test(name)) {
      if (typeof replacement === "function") {
        const match = name.match(pattern);
        if (match) {
          return replacement(match);
        }
      } else {
        return name.replace(pattern, replacement);
      }
    }
  }

  // Check preserved names (stems that shouldn't have suffixes stripped)
  if (PRESERVED_NAMES.has(name)) {
    return name;
  }

  // Handle pressure plate shorthand
  if (name.endsWith("_pp")) {
    const base = name.replace(/_pp$/, "");
    if (PRESSURE_PLATE_MAPPINGS[base]) {
      return PRESSURE_PLATE_MAPPINGS[base];
    }
    return `${base}_pressure_plate`;
  }

  // Remove _dfx suffix (custom format)
  name = name.replace(/_dfx$/, "");

  // Strip structural suffixes
  name = name.replace(STRUCTURAL_SUFFIX_REGEX, "");

  // Strip state suffixes
  name = name.replace(STATE_SUFFIX_REGEX, "");

  // Remove trailing numbers (texture variants)
  name = name.replace(/\d+$/, "");

  return name;
}

/**
 * Compute the variant group key for UI grouping
 * Similar to baseName but optimized for grouping related textures together
 */
function computeVariantGroupKey(fullPath: string): string {
  let path = fullPath;

  // Check for direct overrides
  if (VARIANT_GROUP_OVERRIDES[path]) {
    return VARIANT_GROUP_OVERRIDES[path];
  }

  // Check pattern-based overrides
  for (const { pattern, groupKey } of VARIANT_GROUP_PATTERNS) {
    if (pattern.test(path)) {
      return groupKey;
    }
  }

  // Handle break/ overlay paths
  if (path.startsWith("block/break/")) {
    path = `block/${path.slice("block/break/".length)}`;
  }

  // Handle wall patterns for grouping
  if (path.includes("/wall_")) {
    path = path.replace(/\/wall_/, "/");
  } else if (path.includes("_wall_")) {
    path = path.replace(/_wall_/, "_");
  }

  // Handle colormap paths
  if (path.startsWith("colormap/")) {
    const parts = path.split("/");
    if (parts.length > 1) {
      return `colormap/${parts[parts.length - 1]}`;
    }
  }

  // Strip potted prefix/suffix for grouping with base plant
  if (path.includes("/potted_")) {
    path = path.replace("/potted_", "/");
    path = path.replace("/azalea_bush", "/azalea");
    path = path.replace("/flowering_azalea_bush", "/flowering_azalea");
  } else if (path.endsWith("_potted")) {
    path = path.replace(/_potted$/, "");
  }

  // Preserve stem blockstate names
  if (
    /(^|\/)pumpkin_stem$/.test(path) ||
    /(^|\/)melon_stem$/.test(path) ||
    /(^|\/)attached_pumpkin_stem$/.test(path) ||
    /(^|\/)attached_melon_stem$/.test(path)
  ) {
    return path;
  }

  // Handle variated texture paths
  const variatedMatch = path.match(/^(.+?)\/variated\/([^/]+)\//);
  if (variatedMatch) {
    return `${variatedMatch[1]}/${variatedMatch[2]}`;
  }
  const variatedMatchEnd = path.match(/^(.+?)\/variated\/([^/]+)\/([^/]+)$/);
  if (variatedMatchEnd) {
    return `${variatedMatchEnd[1]}/${variatedMatchEnd[2]}`;
  }

  // Extract block name for suffix processing
  const pathParts = path.split("/");
  let blockName = pathParts[pathParts.length - 1];
  let pathPrefix = pathParts.slice(0, -1).join("/");

  // Group wall hanging signs with base hanging sign
  if (blockName.endsWith("_wall_hanging_sign")) {
    blockName = blockName.replace(/_wall_hanging_sign$/, "_hanging_sign");
  }
  if (blockName.endsWith("_wall_sign")) {
    blockName = blockName.replace(/_wall_sign$/, "_sign");
  }

  // Group redstone_dust with redstone_wire
  if (blockName.startsWith("redstone_dust")) {
    blockName = "redstone_wire";
    pathPrefix = "block";
  }

  // Group campfire textures
  if (blockName === "campfire_fire" || blockName === "campfire_log") {
    blockName = "campfire";
    pathPrefix = "block";
  } else if (blockName === "soul_campfire_fire" || blockName === "soul_campfire_log") {
    blockName = "soul_campfire";
    pathPrefix = "block";
  }

  // Strip suffixes iteratively
  let changed = true;
  while (changed) {
    const before = blockName;
    blockName = blockName.replace(VARIANT_STRUCTURAL_SUFFIX_REGEX, "");
    if (blockName === before) {
      blockName = blockName.replace(VARIANT_STATE_SUFFIX_REGEX, "");
    }
    changed = blockName !== before;
  }

  // Reconstruct path
  path = pathPrefix ? `${pathPrefix}/${blockName}` : blockName;

  // Remove trailing numbers (texture variants)
  const numberMatch = path.match(/^(.+?)_?(\d+)$/);
  if (numberMatch) {
    return numberMatch[1].replace(/_$/, "");
  }

  return path;
}

/**
 * Extract variant number from a name
 * Returns null if not a numbered variant or if it's a blockstate property
 */
function extractVariantNumber(name: string): string | null {
  // Don't treat blockstate numeric properties as variant numbers
  if (BLOCKSTATE_NUMERIC_SUFFIX_REGEX.test(name)) {
    return null;
  }

  const match = name.match(/(\d+)$/);
  return match ? match[1] : null;
}

// ============================================================================
// PUBLIC API FUNCTIONS
// ============================================================================

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

  // Remove .png extension (e.g., "seagrass.png" -> "seagrass")
  normalized = normalized.replace(/\.png$/i, "");

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
  if (name.includes("/")) {
    const parts = name.split("/");
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
 * Check if an asset is a 2D-only texture (GUI, particle, etc.)
 * These textures should be displayed as flat 2D sprites, not as 3D objects
 *
 * NOTE: Items are NOT included here - they use PreviewItem for 3D dropped item rendering
 * NOTE: Entity textures are NOT included here - they use PreviewEntity with 2D/3D toggle
 */
export function is2DOnlyTexture(assetId: string): boolean {
  // Extract the path after the namespace (e.g., "minecraft:gui/container" -> "gui/container")
  const path = assetId.includes(":") ? assetId.split(":")[1] : assetId;

  // Entity textures have their own universal preview component
  if (path.startsWith("entity/")) {
    return false;
  }

  // List of texture categories that are 2D-only
  const twoDOnlyPaths = [
    "gui/", // GUI elements (containers, widgets, buttons)
    "particle/", // Particle effects
    "painting/", // Painting textures
    "mob_effect/", // Potion/status effect icons
    "font/", // Font textures
    "misc/", // Miscellaneous textures
    "entity/", // Entity textures (mob skins, etc.)
    "map/", // Map decorations
    "models/", // Model textures
    "environment/", // Environment textures (moon, sun, clouds)
    "effect/", // Effect textures
  ];

  // Check if it's a path-based 2D texture
  return twoDOnlyPaths.some((prefix) => path.startsWith(prefix));
}

/**
 * Check if a block should use 2D item texture for resource card thumbnail
 * These blocks have 3D models but look better as 2D items in small previews
 */
export function shouldUseItemTextureForCard(assetId: string): boolean {
  const path = assetId.includes(":") ? assetId.split(":")[1] : assetId;

  // Cross-shaped plants render poorly in isometric CSS view
  // Use 2D item texture for cards but allow 3D preview
  const crossShapedPlants = [
    "seagrass",
    "tall_seagrass",
    "tall_seagrass_top",
    "tall_seagrass_bottom",
    "kelp",
    "kelp_plant",
  ];

  const blockName =
    path
      .split("/")
      .pop()
      ?.replace(/\.png$/i, "") || "";
  return crossShapedPlants.includes(blockName);
}

/**
 * Check if an asset is an entity texture (any entity)
 * Entity textures are rendered with a 2D/3D toggle preview using the universal entity renderer
 *
 * Includes: chests, shulker boxes, mobs, decorated pots, beds, signs, etc.
 */
export function isEntityTexture(assetId: string): boolean {
  const path = assetId.includes(":") ? assetId.split(":")[1] : assetId;
  return path.startsWith("entity/");
}

/**
 * Check if an asset is an entity decorated pot texture
 * @deprecated Use isEntityTexture() instead - kept for backward compatibility
 */
export function isEntityDecoratedPot(assetId: string): boolean {
  const path = assetId.includes(":") ? assetId.split(":")[1] : assetId;
  return path.startsWith("entity/decorated_pot/");
}

/**
 * Check if an asset is a Minecraft item texture
 * Items are rendered as 3D dropped items (not flat 2D sprites)
 */
export function isMinecraftItem(assetId: string): boolean {
  return assetId.includes(":item/");
}

/**
 * Check if an asset is a sign texture
 * Returns true for both regular signs and hanging signs
 * Examples:
 * - minecraft:block/oak_sign
 * - minecraft:block/oak_hanging_sign
 * - minecraft:gui/hanging_signs/oak
 * - minecraft:gui/signs/oak
 */
export function isSignTexture(assetId: string): boolean {
  const path = assetId.includes(":") ? assetId.split(":")[1] : assetId;

  // Check for GUI sign textures (minecraft:gui/signs/*, minecraft:gui/hanging_signs/*)
  if (path.startsWith("gui/signs/") || path.startsWith("gui/hanging_signs/")) {
    return true;
  }

  // Check for block sign textures
  if (path.startsWith("block/")) {
    // Match sign patterns: oak_sign, birch_hanging_sign, etc.
    // Signs end with "_sign" or "_hanging_sign"
    return /_sign$|_hanging_sign$/.test(path);
  }

  return false;
}

/**
 * Check if an asset is a hanging sign specifically
 */
export function isHangingSign(assetId: string): boolean {
  const path = assetId.includes(":") ? assetId.split(":")[1] : assetId;
  return (
    path.includes("_hanging_sign") || path.startsWith("gui/hanging_signs/")
  );
}

/**
 * Get the texture category from an asset ID
 * Returns the category path (e.g., "gui", "particle", "block", "item")
 */
export function getTextureCategory(assetId: string): string | null {
  const path = assetId.includes(":") ? assetId.split(":")[1] : assetId;
  const firstSlash = path.indexOf("/");

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
 * Example: "oak_log" -> { axis: "y" } (logs default to vertical)
 */
export function extractBlockStateProperties(
  assetId: string,
): Record<string, string> {
  const name = assetId.replace(/^minecraft:(block\/|item\/|)/, "");
  const props: Record<string, string> = {};

  // Check for suffix-based properties first
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

  // Pattern-based: wall-mounted blocks in asset ID set wall=true and facing=south
  // Examples: wall_torch, redstone_wall_torch, oak_wall_sign, oak_wall_banner, etc.
  // We default to south so the block faces forward at the default camera angle
  // Note: This only applies to actual wall_ asset IDs
  if (name.includes("wall_")) {
    props.wall = "true";
    props.facing = "south";
  }

  return props;
}

/**
 * Apply sensible defaults for common blockstate properties
 * This is called AFTER the Rust resolver provides its defaults (which are alphabetically first)
 * We override those defaults to match Minecraft's natural placement and appearance
 *
 * This is property-based, not block-name-based, so it works for all blocks with these properties
 *
 * @param props - Property map from blockstate resolver (may have Rust's alphabetic defaults)
 * @returns Updated property map with more natural defaults
 */
export function applyNaturalBlockStateDefaults(
  props: Record<string, string>,
  assetId?: string,
): Record<string, string> {
  const result = { ...props };
  const name = assetId ? getBaseName(assetId) : "";

  // axis: Default to "y" (vertical/upright)
  // Only apply to blocks that actually have an axis property
  const hasAxis =
    name.includes("log") ||
    name.includes("wood") ||
    name.includes("stem") ||
    name.includes("hyphae") ||
    name.includes("pillar") ||
    name.includes("basalt") ||
    name.includes("bone_block") ||
    name.includes("hay_block") ||
    name.includes("chain");

  if (!result.axis && hasAxis) {
    result.axis = "y";
  }

  // face: Default to "floor"
  // Only apply to blocks that have a face property (buttons, levers, grindstones, etc.)
  const hasFace =
    name.includes("button") ||
    name.includes("lever") ||
    name.includes("grindstone") ||
    name.includes("switch");

  if (!result.face && hasFace) {
    result.face = "floor";
  }

  // facing: Context-aware defaults
  if (!result.facing) {
    // Shelves: Default to south so front face shows at 135° rotation
    if (name.includes("shelf") && !name.includes("bookshelf")) {
      result.facing = "south";
    }
    // Case 1: Blocks that typically face UP by default
    else {
      const defaultsUp = [
        "amethyst_cluster",
        "pointed_dripstone",
        "end_rod",
        "lightning_rod",
        "candle",
        "torch", // wall torch has facing, normal doesn't, but safe to check name
        "lantern",
      ];

      // Case 2: Blocks that typically face DOWN by default
      const defaultsDown = ["hopper"];

      // Case 3: Blocks that MUST be horizontal (north/south/east/west)
      // Only apply to blocks known to have horizontal facing
      const isHorizontalOnly =
        name.includes("trapdoor") ||
        name.includes("stairs") ||
        name.includes("furnace") ||
        name.includes("chest") ||
        name.includes("loom") ||
        name.includes("stonecutter") ||
        name.includes("gate") || // fence gates
        name.includes("campfire") ||
        name.includes("stem") ||
        name.includes("repeater") ||
        name.includes("comparator") ||
        name.includes("bed") ||
        name.includes("door") ||
        name.includes("glazed_terracotta") ||
        name.includes("anvil") ||
        name.includes("piston") ||
        name.includes("observer") ||
        name.includes("dropper") ||
        name.includes("dispenser") ||
        name.includes("beehive") ||
        name.includes("bee_nest") ||
        name.includes("lectern") ||
        (name.includes("button") && result.face !== "wall") ||
        (name.includes("lever") && result.face !== "wall") ||
        (name.includes("grindstone") && result.face !== "wall");

      if (defaultsUp.some((v) => name.includes(v))) {
        // Only set facing=up if the block actually supports it
        // (Some of these might be directional but not have 'facing' property in all cases,
        // but usually safe for these specific ones if they are missing the prop)
        // Actually, we should be careful. 'torch' doesn't have facing, 'wall_torch' does.
        // If name is 'torch', we shouldn't add facing.
        if (name !== "torch" && name !== "lantern" && name !== "campfire") {
          result.facing = "up";
        }
      } else if (defaultsDown.some((v) => name.includes(v))) {
        result.facing = "down";
      } else if (isHorizontalOnly) {
        result.facing = "north";
      }
    }
  }

  // half: Default to "bottom" (trapdoors, doors, stairs)
  const hasHalf =
    name.includes("trapdoor") ||
    name.includes("door") ||
    name.includes("stairs") ||
    name.includes("peony") ||
    name.includes("lilac") ||
    name.includes("rose_bush") ||
    name.includes("sunflower") ||
    name.includes("tall_seagrass") ||
    name.includes("tall_grass") ||
    name.includes("large_fern");

  if (!result.half && hasHalf) {
    result.half = "bottom";
  }

  // shape: Default to "straight" for stairs
  if (!result.shape && name.includes("stairs")) {
    result.shape = "straight";
  }

  // open: Default to "false"
  const hasOpen =
    name.includes("door") ||
    name.includes("gate") ||
    name.includes("trapdoor") ||
    name.includes("barrel");

  if (!result.open && hasOpen) {
    result.open = "false";
  }

  // powered: Default to "false"
  // Many blocks have powered, safe to check common ones
  const hasPowered =
    name.includes("pressure_plate") ||
    name.includes("button") ||
    name.includes("lever") ||
    name.includes("rail") ||
    name.includes("note_block") ||
    name.includes("door") ||
    name.includes("trapdoor") ||
    name.includes("gate") ||
    name.includes("repeater") ||
    name.includes("comparator") ||
    name.includes("observer") ||
    name.includes("daylight_detector") ||
    name.includes("sculk");

  if (!result.powered && hasPowered) {
    result.powered = "false";
  }

  // lit: Context-aware defaults
  // Campfires default to "true" (lit is the normal state)
  // Furnaces, lamps, torches, candles default to "false" (unlit is the normal state)
  if (!result.lit) {
    if (name.includes("campfire")) {
      result.lit = "true";
    } else if (
      name.includes("furnace") ||
      name.includes("smoker") ||
      name.includes("redstone_ore") ||
      name.includes("redstone_torch") ||
      name.includes("redstone_lamp") ||
      name.includes("candle")
    ) {
      result.lit = "false";
    }
  }

  // signal_fire: Default to "false" for campfires (true only when hay bale below)
  if (!result.signal_fire && name.includes("campfire")) {
    result.signal_fire = "false";
  }

  // power: Default to "15" (fully powered) for redstone_wire
  // Redstone wire has power levels 0-15, where 0 = no particles/dark, 15 = full particles/bright red
  // Default to 15 to show the active/powered state in previews
  if (!result.power && name.includes("redstone_wire")) {
    result.power = "15";
  }

  return result;
}

/**
 * Check if an asset should be excluded from the asset list
 * Filters out non-texture assets, metadata files, and special debug textures
 */
export function shouldExcludeAsset(assetId: string, allAssetIds?: Set<string>): boolean {
  // Exclude empty/malformed asset IDs
  if (!assetId || assetId === "minecraft:" || assetId === "minecraft:block/") {
    return true;
  }

  // Data-driven exclusion: Hide entity models that are already rendered as part of blocks
  // Example: Hide "minecraft:entity/bell/bell_body" because "minecraft:block/bell" renders both
  if (assetId.includes("entity/") && allAssetIds) {
    const match = assetId.match(/entity\/([^/]+)/);
    if (match && match[1]) {
      const entityName = match[1];
      const normalized = normalizeAssetId(assetId);

      // Extract namespace (e.g., "minecraft:entity/bell" → "minecraft")
      const parts = normalized.split(":");
      const namespace = parts.length === 2 ? parts[0] : "minecraft";

      // Check if a corresponding block exists
      const blockId = normalizeAssetId(`${namespace}:block/${entityName}`);
      if (allAssetIds.has(blockId)) {
        // Entity is already rendered as part of the block - exclude this card
        return true;
      }
    }
  }

  // Exclude invalid entity paths (e.g., "minecraft:entity/" with no entity name)
  if (assetId.includes("entity/")) {
    const match = assetId.match(/entity\/(.+)/);
    if (!match || !match[1] || match[1].trim() === "") {
      return true;
    }
  }

  // Similar validation for chest and shulker_box paths
  if (assetId.includes("chest/")) {
    const match = assetId.match(/chest\/(.+)/);
    if (!match || !match[1] || match[1].trim() === "") {
      return true;
    }
  }

  if (assetId.includes("shulker_box/")) {
    const match = assetId.match(/shulker_box\/(.+)/);
    if (!match || !match[1] || match[1].trim() === "") {
      return true;
    }
  }

  // Exclude readme files
  if (assetId.toLowerCase().includes("readme")) {
    return true;
  }

  // Exclude colormap assets (now handled in Biome & Colormaps tab)
  if (assetId.includes("colormap/")) {
    return true;
  }

  // Exclude debug textures
  if (assetId.includes("/debug")) {
    return true;
  }

  // Exclude desktop.ini and other OS metadata files
  if (assetId.toLowerCase().includes("desktop")) {
    return true;
  }

  // Exclude common non-texture files that might appear in resource packs
  const lowercaseId = assetId.toLowerCase();
  const excludedExtensions = [
    ".txt",
    ".md",
    ".json",
    ".mcmeta",
    ".ini",
    ".ds_store",
    "thumbs.db",
  ];
  if (excludedExtensions.some((ext) => lowercaseId.endsWith(ext))) {
    return true;
  }

  return false;
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
 *
 * Uses the data-driven parseAssetId() internally for consistent normalization
 */
export function getBaseName(assetId: string): string {
  // Extract just the name portion for parsing
  let name = assetId.replace(/^minecraft:(block\/|item\/|)/, "");

  // Remove .png extension if present
  name = name.replace(/\.png$/, "");

  // Use the unified computeBaseName function
  return computeBaseName(name);
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
 *
 * Uses the data-driven computeVariantGroupKey() internally for consistent grouping
 */
export function getVariantGroupKey(assetId: string): string {
  // Normalize the asset ID first (remove trailing underscores, etc.)
  const normalized = normalizeAssetId(assetId);

  // Extract just the path portion, ignoring namespace
  // This allows grouping variants from different namespaces
  const pathMatch = normalized.match(/^[^:]*:(.+)$/);
  const fullPath = pathMatch ? pathMatch[1] : normalized;

  return computeVariantGroupKey(fullPath);
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
 *
 * Uses BLOCKSTATE_NUMERIC_SUFFIX_REGEX to exclude blockstate properties
 */
export function isNumberedVariant(assetId: string): boolean {
  const name = assetId.replace(/^minecraft:(block\/|item\/|)/, "");
  // Exclude blockstate numeric properties (stage_0, age_7, etc.)
  if (BLOCKSTATE_NUMERIC_SUFFIX_REGEX.test(name)) {
    return false;
  }
  return /\d+$/.test(name);
}

/**
 * Extract the variant number from an asset ID
 * Example: "minecraft:block/allium3" -> "3"
 * Example: "minecraft:block/acacia_planks_01" -> "01"
 * Example: "minecraft:block/oak_planks" -> null
 *
 * Uses BLOCKSTATE_NUMERIC_SUFFIX_REGEX to exclude blockstate properties
 */
export function getVariantNumber(assetId: string): string | null {
  const name = assetId.replace(/^minecraft:(block\/|item\/|)/, "");
  // Exclude blockstate numeric properties (stage_0, age_7, etc.)
  if (BLOCKSTATE_NUMERIC_SUFFIX_REGEX.test(name)) {
    return null;
  }
  const match = name.match(/(\d+)$/);
  return match ? match[1] : null;
}

export function getBlockItemPair(
  assetId: string,
  allAssetIds: string[],
): { blockId?: string; itemId?: string } {
  const normalizedAssetId = normalizeAssetId(assetId);
  const namespace = normalizedAssetId.includes(":")
    ? normalizedAssetId.split(":")[0]!
    : "minecraft";
  const assetPath = normalizedAssetId.includes(":")
    ? normalizedAssetId.split(":")[1]!
    : normalizedAssetId;

  const findByPath = (path: string): string | undefined => {
    const exactMatch = allAssetIds.find((id) => {
      const normalized = normalizeAssetId(id);
      return (
        normalized.startsWith(`${namespace}:`) &&
        normalized.split(":")[1] === path
      );
    });
    if (exactMatch) return exactMatch;

    return allAssetIds.find((id) => {
      const normalized = normalizeAssetId(id);
      return normalized.split(":")[1] === path;
    });
  };

  const findBlockVariantByGroupKey = (groupKey: string): string | undefined => {
    const candidates = allAssetIds.filter((id) => {
      if (!id.includes(":block/")) return false;
      return getVariantGroupKey(id) === groupKey;
    });
    if (candidates.length === 0) return undefined;

    const inNamespace = candidates.filter((id) =>
      normalizeAssetId(id).startsWith(`${namespace}:`),
    );
    const ordered = inNamespace.length > 0 ? inNamespace : candidates;
    return ordered.find((id) => !isInventoryVariant(id)) ?? ordered[0];
  };

  if (assetPath.startsWith("item/")) {
    const baseName = assetPath.slice("item/".length);

    // Minecart items render as entity previews (3D) even without a block counterpart.
    if (baseName === "minecart" || baseName.endsWith("_minecart")) {
      const entityId =
        findByPath(`entity/${baseName}`) ??
        findByPath("entity/minecart") ??
        normalizeAssetId(`${namespace}:entity/minecart`);
      return {
        blockId: entityId,
        itemId:
          findByPath(`item/${baseName}`) ??
          normalizeAssetId(`${namespace}:item/${baseName}`),
      };
    }

    // Special case: redstone item -> redstone_wire block
    // Similar to how campfire item -> campfire block, sniffer_egg item -> sniffer_egg block
    if (baseName === "redstone") {
      return {
        blockId: findByPath("block/redstone_dust_dot") ??
                 findByPath("block/redstone_dust_line0") ??
                 findBlockVariantByGroupKey("block/redstone_wire"),
        itemId: findByPath(`item/${baseName}`),
      };
    }

    return {
      blockId:
        findByPath(`block/${baseName}`) ??
        findBlockVariantByGroupKey(`block/${baseName}`),
      itemId: findByPath(`item/${baseName}`),
    };
  }

  if (assetPath.startsWith("block/")) {
    const groupKey = getVariantGroupKey(normalizedAssetId);
    const baseName = groupKey.startsWith("block/")
      ? groupKey.slice("block/".length)
      : assetPath.slice("block/".length);

    // Special case: redstone_wire block -> redstone item
    // The block is called "redstone_wire" but the item is "redstone"
    if (baseName === "redstone_wire") {
      return {
        blockId: findByPath(`block/${baseName}`) ??
                 findByPath("block/redstone_dust_dot") ??
                 findByPath("block/redstone_dust_line0"),
        itemId: findByPath("item/redstone"),
      };
    }

    return {
      blockId: findByPath(`block/${baseName}`),
      itemId: findByPath(`item/${baseName}`),
    };
  }

  return {};
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

  const baseName = getBaseName(assetId);
  const pottedName =
    baseName === "azalea"
      ? "azalea_bush"
      : baseName === "flowering_azalea"
        ? "flowering_azalea_bush"
        : baseName;

  return `${namespace}block/potted_${pottedName}`;
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

  if (plantName === "azalea_bush") {
    plantName = "azalea";
  } else if (plantName === "flowering_azalea_bush") {
    plantName = "flowering_azalea";
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

// ============================================================================
// PARTICLE UTILITIES
// ============================================================================

/**
 * Check if an asset is a particle texture
 * Example: "minecraft:particle/flame" -> true
 */
export function isParticleTexture(assetId: string): boolean {
  const path = assetId.includes(":") ? assetId.split(":")[1] : assetId;
  return path.startsWith("particle/");
}

/**
 * Extract particle type from asset ID
 * Example: "minecraft:particle/flame" -> "flame"
 * Example: "minecraft:particle/campfire_cosy_smoke" -> "campfire_cosy_smoke"
 */
export function getParticleTypeFromAssetId(assetId: string): string | null {
  if (!isParticleTexture(assetId)) return null;
  const path = assetId.includes(":") ? assetId.split(":")[1] : assetId;
  return path.replace("particle/", "");
}

/**
 * Get the asset ID for a particle type
 * Example: "flame" -> "minecraft:particle/flame"
 */
export function getParticleAssetId(particleType: string): string {
  return `minecraft:particle/${particleType}`;
}

/**
 * Get a display name for a particle type
 * Example: "campfire_cosy_smoke" -> "Campfire Cosy Smoke"
 */
export function getParticleDisplayName(particleType: string): string {
  return particleType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
