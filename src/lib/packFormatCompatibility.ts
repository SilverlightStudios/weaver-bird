/**
 * Pack format compatibility utilities
 *
 * Provides bidirectional mapping between Minecraft versions and pack formats,
 * along with utilities for parsing version folders and entity IDs.
 *
 * Data sourced from: https://minecraft.wiki/w/Pack_format
 */

/**
 * Resource Pack format data from Minecraft wiki
 * Maps pack format numbers to their corresponding Minecraft version ranges
 *
 * Source: https://minecraft.wiki/w/Pack_format (Resource Pack section)
 * Last updated: 2025-11-27
 */
const PACK_FORMAT_DATA = [
  { packFormat: 1, versions: "1.6.1 – 1.8.9" },
  { packFormat: 2, versions: "1.9 – 1.10.2" },
  { packFormat: 3, versions: "1.11 – 1.12.2" },
  { packFormat: 4, versions: "1.13 – 1.14.4" },
  { packFormat: 5, versions: "1.15 – 1.16.1" },
  { packFormat: 6, versions: "1.16.2 – 1.16.5" },
  { packFormat: 7, versions: "1.17 – 1.17.1" },
  { packFormat: 8, versions: "1.18 – 1.18.2" },
  { packFormat: 9, versions: "1.19 – 1.19.2" },
  { packFormat: 12, versions: "1.19.3" },
  { packFormat: 13, versions: "1.19.4" },
  { packFormat: 15, versions: "1.20 – 1.20.1" },
  { packFormat: 18, versions: "1.20.2" },
  { packFormat: 22, versions: "1.20.3 – 1.20.4" },
  { packFormat: 32, versions: "1.20.5 – 1.20.6" },
  { packFormat: 34, versions: "1.21 – 1.21.1" },
  { packFormat: 42, versions: "1.21.2 – 1.21.3" },
  { packFormat: 46, versions: "1.21.4" },
  { packFormat: 55, versions: "1.21.5" },
  { packFormat: 63, versions: "1.21.6" },
  { packFormat: 64, versions: "1.21.7 – 1.21.8" },
  { packFormat: 69, versions: "1.21.9 – 1.21.10" },
];

/**
 * Create bidirectional mappings for fast lookups
 */
const VERSION_TO_PACK_FORMAT = new Map<string, number>();
const PACK_FORMAT_TO_VERSION_RANGE = new Map<number, string>();

// Build lookups
for (const { packFormat, versions } of PACK_FORMAT_DATA) {
  PACK_FORMAT_TO_VERSION_RANGE.set(packFormat, versions);

  // Parse version range and add all versions
  const versionRange = parseVersionRange(versions);
  for (const version of versionRange) {
    VERSION_TO_PACK_FORMAT.set(version, packFormat);
  }
}

function expandPatchVersions(
  major: number,
  minor: number,
  startPatch: number,
  endPatch: number,
): string[] {
  const versions: string[] = [];
  for (let p = startPatch + 1; p < endPatch; p++) {
    versions.push(`${major}.${minor}.${p}`);
  }
  return versions;
}

function expandMinorVersions(
  major: number,
  minor1: number,
  minor2: number,
  patch1: number,
  patch2: number,
  existingVersions: string[],
): string[] {
  const versions: string[] = [];

  for (let m = minor1; m <= minor2; m++) {
    if (m === minor1 && patch1 > 0) {
      // Start version with patch
      for (let p = patch1; p <= 10; p++) {
        const v = `${major}.${m}.${p}`;
        if (!existingVersions.includes(v)) versions.push(v);
      }
    } else if (m === minor2) {
      // End version with patches
      for (let p = 0; p <= patch2; p++) {
        const v = `${major}.${m}.${p}`;
        if (!existingVersions.includes(v)) versions.push(v);
      }
    } else if (m !== minor1) {
      // Intermediate minor versions
      versions.push(`${major}.${m}`);
      versions.push(`${major}.${m}.0`);
    }
  }

  return versions;
}

/**
 * Parse a version range string into individual versions
 * e.g., "1.21 – 1.21.1" → ["1.21", "1.21.1"]
 * e.g., "1.21.4" → ["1.21.4"]
 */
function parseVersionRange(range: string): string[] {
  const versions: string[] = [];

  // Check if it's a range (contains dash or en-dash)
  if (range.includes("–") || range.includes("-")) {
    const [start, end] = range.split(/[–-]/).map((v) => v.trim());
    versions.push(start);

    // For ranges, we need to expand intermediate versions
    // For now, just add start and end - we can expand this if needed
    if (end && end !== start) {
      versions.push(end);

      // Expand intermediate versions
      const startParts = start.split(".").map(Number);
      const endParts = end.split(".").map(Number);

      // Handle simple increments (e.g., 1.21.0 to 1.21.3)
      if (startParts.length === endParts.length) {
        const [major1, minor1, patch1 = 0] = startParts;
        const [major2, minor2, patch2 = 0] = endParts;

        if (major1 === major2 && minor1 === minor2) {
          // Same major.minor, increment patch
          const patchVersions = expandPatchVersions(major1, minor1, patch1, patch2);
          versions.push(...patchVersions);
        } else if (major1 === major2) {
          // Same major, different minor - add intermediate minors
          const minorVersions = expandMinorVersions(
            major1,
            minor1,
            minor2,
            patch1,
            patch2,
            versions,
          );
          versions.push(...minorVersions);
        }
      }
    }
  } else {
    // Single version
    versions.push(range.trim());

    // Also add .0 variant if not present
    if (!range.includes(".0") && range.split(".").length === 2) {
      versions.push(`${range}.0`);
    }
  }

  return versions;
}

/**
 * Convert a Minecraft version to its pack format number
 * @param version - e.g., "1.21.4", "1.21", "1.21.0"
 * @returns Pack format number, or undefined if version not found
 */
export function versionToPackFormat(version: string): number | undefined {
  // Normalize version (try with and without .0)
  let packFormat = VERSION_TO_PACK_FORMAT.get(version);

  if (packFormat === undefined && !version.endsWith(".0")) {
    // Try with .0 appended
    packFormat = VERSION_TO_PACK_FORMAT.get(`${version}.0`);
  }

  if (packFormat === undefined && version.endsWith(".0")) {
    // Try without .0
    packFormat = VERSION_TO_PACK_FORMAT.get(version.slice(0, -2));
  }

  return packFormat;
}

/**
 * Convert a pack format number to its Minecraft version range string
 * @param format - Pack format number (e.g., 46)
 * @returns Version range string (e.g., "1.21.4"), or undefined if not found
 */
export function packFormatToVersionRange(format: number): string | undefined {
  return PACK_FORMAT_TO_VERSION_RANGE.get(format);
}

/**
 * Parse a version folder name to extract version and pack format
 * Supports various formats: "21.4", "1.21.4", "21_4", etc.
 *
 * @param folderName - Folder name (e.g., "21.4", "1.21.4")
 * @returns Object with version and packFormat, or null if parsing failed
 */
export function parseVersionFolder(
  folderName: string,
): { version: string; packFormat: number } | null {
  // Normalize separators to dots
  let normalized = folderName.replace(/_/g, ".");

  // If it doesn't start with "1.", prepend it
  if (!normalized.startsWith("1.")) {
    normalized = `1.${normalized}`;
  }

  // Look up the pack format
  const packFormat = versionToPackFormat(normalized);

  if (packFormat === undefined) {
    console.warn(
      `[packFormatCompatibility] Could not find pack format for version folder: ${folderName} (normalized: ${normalized})`,
    );
    return null;
  }

  return {
    version: normalized,
    packFormat,
  };
}

/**
 * Extract entity ID from an asset ID
 * @param assetId - e.g., "minecraft:entity/cow/cow", "minecraft:entity/zombie"
 * @returns Entity ID (e.g., "cow", "zombie"), or null if not an entity asset
 */
export function getEntityId(assetId: string): string | null {
  // Remove namespace prefix
  const path = assetId.replace(/^[^:]+:/, "");

  // Must contain "entity/"
  if (!path.includes("entity/")) {
    return null;
  }

  // Extract entity type from path
  // Pattern: entity/{entityType}[/anything]
  const match = path.match(/entity\/([^/]+)/);
  if (!match) {
    return null;
  }

  return match[1];
}

/**
 * Get all available Minecraft versions in chronological order
 */
export function getAllMinecraftVersions(): string[] {
  const versions = new Set<string>();

  for (const { versions: range } of PACK_FORMAT_DATA) {
    const parsedVersions = parseVersionRange(range);
    for (const v of parsedVersions) {
      versions.add(v);
    }
  }

  return Array.from(versions).sort((a, b) => {
    const [aMajor, aMinor, aPatch = 0] = a.split(".").map(Number);
    const [bMajor, bMinor, bPatch = 0] = b.split(".").map(Number);

    if (aMajor !== bMajor) return aMajor - bMajor;
    if (aMinor !== bMinor) return aMinor - bMinor;
    return aPatch - bPatch;
  });
}

/**
 * Get the latest Minecraft version
 */
export function getLatestMinecraftVersion(): string {
  const versions = getAllMinecraftVersions();
  return versions[versions.length - 1];
}

/**
 * Compare two Minecraft versions
 * @returns -1 if a < b, 0 if equal, 1 if a > b
 */
export function compareVersions(a: string, b: string): number {
  const [aMajor, aMinor, aPatch = 0] = a.split(".").map(Number);
  const [bMajor, bMinor, bPatch = 0] = b.split(".").map(Number);

  if (aMajor !== bMajor) return aMajor - bMajor;
  if (aMinor !== bMinor) return aMinor - bMinor;
  return aPatch - bPatch;
}

/**
 * Check if an entity/pack combination is compatible with the target version
 *
 * Shows warning when:
 * - Entity has version variants (detected from JEM scan)
 * - Winning pack's pack format doesn't match target version's pack format
 *
 * @param entityId - Entity ID (e.g., "cow")
 * @param winningPackFormat - Pack format of the winning pack
 * @param targetVersion - Target Minecraft version
 * @param entityVersionVariants - Map of entities with version variants
 * @returns true if compatible (no warning needed), false otherwise
 */
export function isEntityCompatible(
  entityId: string,
  winningPackFormat: number | undefined,
  targetVersion: string | null,
  entityVersionVariants: Record<string, string[]>,
): boolean {
  // If entity doesn't have version variants, it's always compatible
  if (
    !entityVersionVariants[entityId] ||
    entityVersionVariants[entityId].length === 0
  ) {
    return true;
  }

  // If no target version or no pack format, can't determine compatibility
  if (!targetVersion || winningPackFormat === undefined) {
    return true;
  }

  // Get target pack format
  const targetPackFormat = versionToPackFormat(targetVersion);
  if (!targetPackFormat) {
    return true; // Can't determine, assume compatible
  }

  // Check if pack formats match
  return winningPackFormat === targetPackFormat;
}

/**
 * Get incompatibility warning message for an entity
 *
 * @param entityId - Entity ID (e.g., "cow")
 * @param winningPackFormat - Pack format of the winning pack
 * @param targetVersion - Target Minecraft version
 * @returns Warning message, or empty string if compatible
 */
export function getIncompatibilityMessage(
  entityId: string,
  winningPackFormat: number,
  targetVersion: string,
): string {
  const targetPackFormat = versionToPackFormat(targetVersion);
  if (!targetPackFormat) return "";

  const winningVersionRange = packFormatToVersionRange(winningPackFormat);
  const targetVersionRange = packFormatToVersionRange(targetPackFormat);

  if (!winningVersionRange || !targetVersionRange) return "";

  if (winningPackFormat < targetPackFormat) {
    // Winning pack is older
    return `This ${entityId} texture is for Minecraft ${winningVersionRange} but you're targeting ${targetVersion}`;
  } else {
    // Winning pack is newer
    return `This ${entityId} texture is for Minecraft ${winningVersionRange} but you're targeting ${targetVersion}`;
  }
}
