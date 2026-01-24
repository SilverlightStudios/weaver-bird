/**
 * Display name formatting utilities for asset IDs
 */

/** Suffix patterns that should be displayed in parentheses */
const SUFFIX_DISPLAY_PATTERNS: Array<{ pattern: RegExp; replacement: string }> =
  [
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

/** Convert a string to Title Case */
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
 * - "minecraft:block/acacia_planks1" -> "Acacia Planks (1)"
 */
export function beautifyAssetName(assetId: string): string {
  // Remove namespace prefix
  let name = assetId.replace(/^minecraft:(block\/|item\/|)/, "");

  // Extract last path segment for multi-level paths
  if (name.includes("/")) {
    const parts = name.split("/");
    name = parts[parts.length - 1];
  }

  // Handle numbered variants at the end
  const numberMatch = name.match(/^(.+?)(\d+)$/);
  let suffix = "";

  if (numberMatch) {
    name = numberMatch[1];
    suffix = ` (${numberMatch[2]})`;
  }

  // Handle suffix patterns that should be in parentheses
  for (const { pattern, replacement } of SUFFIX_DISPLAY_PATTERNS) {
    if (pattern.test(name)) {
      name = name.replace(pattern, replacement);
      return titleCase(name) + suffix;
    }
  }

  // Replace underscores with spaces and convert to title case
  name = name.replace(/_/g, " ");
  return titleCase(name) + suffix;
}

/**
 * Get a short display name from asset ID (for compact views)
 * Removes namespace prefix only
 */
export function getShortAssetName(assetId: string): string {
  return assetId.replace(/^minecraft:(block\/|item\/|)/, "");
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
