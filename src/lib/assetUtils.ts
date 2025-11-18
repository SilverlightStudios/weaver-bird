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
 */
export function getBaseName(assetId: string): string {
  let name = assetId.replace(/^minecraft:(block\/|item\/|)/, "");

  // Remove common structural suffixes (top/bottom, head/foot, etc.)
  name = name.replace(
    /_(top|bottom|upper|lower|head|foot|side|front|back|left|right|inventory|bushy|stage\d+)\d*$/,
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
  const path = pathMatch ? pathMatch[1] : normalized;

  if (path.startsWith("colormap/")) {
    const parts = path.split("/");
    if (parts.length > 1) {
      return `colormap/${parts[parts.length - 1]}`;
    }
  }

  // Remove structural suffixes like _top/_bottom/_head/_foot
  const structuralMatch = path.match(
    /^(.*)_(top|bottom|upper|lower|head|foot)$/,
  );
  if (structuralMatch) {
    return structuralMatch[1];
  }

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
