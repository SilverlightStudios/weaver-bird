/**
 * Web Worker for Asset Variant Grouping
 *
 * Handles CPU-intensive asset grouping and name beautification processing.
 * Runs off the main thread to keep UI responsive during pagination and search.
 *
 * Expected performance gain: ~30-50ms saved per operation
 */

// Define message types for type safety
export interface WorkerRequest {
  id: string;
  assetIds: string[];
}

export interface AssetGroup {
  baseId: string; // The primary/base asset ID (without number suffix)
  variantIds: string[]; // All variants including the base
  displayName: string; // Pre-computed beautified name
}

export interface WorkerResponse {
  id: string;
  groups: AssetGroup[];
}

/**
 * Normalize an asset ID by removing trailing underscores and underscores before numbers
 * This fixes malformed asset IDs from certain resource packs (especially VanillaTweaks)
 *
 * Examples:
 * - "minecraft:block/acacia_planks_" -> "minecraft:block/acacia_planks"
 * - "minecraft:block/acacia_planks_01" -> "minecraft:block/acacia_planks01"
 */
function normalizeAssetId(assetId: string): string {
  let normalized = assetId;

  // Remove underscores before numbers (e.g., "acacia_planks_01" -> "acacia_planks01")
  normalized = normalized.replace(/_(\d+)/g, "$1");

  // Remove trailing underscores (e.g., "acacia_planks_" -> "acacia_planks")
  normalized = normalized.replace(/_+$/, "");

  return normalized;
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
function beautifyAssetName(assetId: string): string {
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
function getVariantGroupKey(assetId: string): string {
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
  // This matches the logic in getBaseName for consistent grouping
  // Includes: face directions, texture variants, animation states, etc.
  blockName = blockName.replace(
    /_(top|bottom|upper|lower|head|foot|side|front|back|left|right|north|south|east|west|inventory|bushy|bushy_inventory|stage\d+|stalk|large_leaves|small_leaves|singleleaf|occupied|empty|inner|base|round|pivot|overlay|moist|corner|flow|still|arm|inside|outside|eye|conditional|dead|compost|ready|bloom|hanging|particle|post|walls|tip|frustum|merge|middle|crafting|ejecting|ominous)\d*$/,
    "",
  );

  // Remove block state suffixes (on/off, lit, powered, open/closed, etc.)
  // These are Minecraft block states that shouldn't create separate asset cards
  blockName = blockName.replace(
    /_(on|off|lit|unlit|powered|unpowered|open|closed|locked|unlocked|connected|disconnected|triggered|untriggered|enabled|disabled|active|inactive|extended|retracted|attached|detached|disarmed|unstable|tipped|filled|empty|level_\d+|age_\d+|bites_\d+|layers_\d+|delay_\d+|note_\d+|power_\d+|moisture_\d+|rotation_\d+|distance_\d+|charges_\d+|candles_\d+|pickles_\d+|eggs_\d+|hatch_\d+|dusted_\d+)$/,
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
 * Check if an asset ID represents a numbered variant
 * Example: "minecraft:block/acacia_leaves1" -> true
 */
function isNumberedVariant(assetId: string): boolean {
  return /\d+$/.test(assetId);
}

/**
 * Group assets by their variant group key
 * Returns an array of asset groups with pre-computed display names
 */
function groupAssetsByVariant(assetIds: string[]): AssetGroup[] {
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

    // Pre-compute the display name for the base ID
    const displayName = beautifyAssetName(baseId);

    result.push({ baseId, variantIds: sorted, displayName });
  }

  return result;
}

// Worker message handler
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, assetIds } = event.data;

  try {
    // Do the heavy work - group assets and compute display names
    const groups = groupAssetsByVariant(assetIds);

    // Send result back to main thread
    const response: WorkerResponse = { id, groups };
    self.postMessage(response);
  } catch (error) {
    console.error("[AssetGroupingWorker] Error:", error);
    // Send empty result on error
    self.postMessage({ id, groups: [] });
  }
};
