/**
 * Fetches and parses Minecraft's BlockColors registry from Fabric Yarn's GitHub source.
 *
 * This module retrieves the BlockColors.java file which contains all vanilla blocks
 * that support biome-based tinting, including which colormap they use.
 */

import { getYarnTag } from "./yarnVersions";

/**
 * Parsed tint entry from BlockColors.java
 */
export interface ParsedTintEntry {
  /** Block IDs that use this tint (e.g., ["minecraft:oak_leaves"]) */
  blocks: string[];
  /** Type of tinting applied */
  tint:
    | "grass"
    | "foliage"
    | "water"
    | `fixed_${string}` // e.g., "fixed_0x80A755"
    | "special"; // Custom logic like redstone wire
}

/**
 * Complete registry of block colors for a Minecraft version
 */
export interface BlockColorRegistry {
  /** Minecraft version (e.g., "1.21.4") */
  version: string;
  /** Yarn tag used to fetch the data */
  yarnTag: string;
  /** Timestamp when this was fetched */
  fetchedAt: string;
  /** Parsed tint entries */
  entries: ParsedTintEntry[];
}

/**
 * Cache configuration
 */
const CACHE_PREFIX = "blockColors:";
const CACHE_EXPIRY_DAYS = 7;

/**
 * Get the cache key for a Minecraft version
 */
function getCacheKey(mcVersion: string): string {
  return `${CACHE_PREFIX}${mcVersion}`;
}

/**
 * Check if cached data is still valid
 */
function isCacheValid(fetchedAt: string): boolean {
  const fetchedDate = new Date(fetchedAt);
  const now = new Date();
  const daysDiff = (now.getTime() - fetchedDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff < CACHE_EXPIRY_DAYS;
}

/**
 * Get cached block colors if available and valid
 */
function getCachedBlockColors(mcVersion: string): BlockColorRegistry | null {
  try {
    const cacheKey = getCacheKey(mcVersion);
    const cached = localStorage.getItem(cacheKey);

    if (!cached) {
      return null;
    }

    const registry: BlockColorRegistry = JSON.parse(cached);

    if (isCacheValid(registry.fetchedAt)) {
      console.log(`[fetchBlockColors] Using cached data for ${mcVersion}`);
      return registry;
    } else {
      console.log(`[fetchBlockColors] Cache expired for ${mcVersion}`);
      localStorage.removeItem(cacheKey);
      return null;
    }
  } catch (error) {
    console.error("[fetchBlockColors] Error reading cache:", error);
    return null;
  }
}

/**
 * Save block colors to cache
 */
function cacheBlockColors(registry: BlockColorRegistry): void {
  try {
    const cacheKey = getCacheKey(registry.version);
    localStorage.setItem(cacheKey, JSON.stringify(registry));
    console.log(`[fetchBlockColors] Cached data for ${registry.version}`);
  } catch (error) {
    console.error("[fetchBlockColors] Error writing cache:", error);
  }
}

/**
 * Normalize a block name from Java constant to Minecraft ID
 * Example: "OAK_LEAVES" -> "minecraft:oak_leaves"
 */
function normalizeBlockName(javaConstant: string): string {
  return `minecraft:${javaConstant.toLowerCase()}`;
}

/**
 * Determine tint type from BiomeColors method call
 */
function getTintType(javaCode: string): ParsedTintEntry["tint"] {
  // Check for BiomeColors method calls
  const grassMatch = javaCode.match(/BiomeColors\.getGrassColor/);
  if (grassMatch) return "grass";

  const foliageMatch = javaCode.match(/BiomeColors\.getFoliageColor/);
  if (foliageMatch) return "foliage";

  const waterMatch = javaCode.match(/BiomeColors\.getWaterColor/);
  if (waterMatch) return "water";

  // Check for hex color literals
  const hexMatch = javaCode.match(/0x[0-9A-Fa-f]+/);
  if (hexMatch) {
    return `fixed_${hexMatch[0]}`;
  }

  // Check for special cases (e.g., REDSTONE_WIRE_COLOR)
  if (javaCode.includes("REDSTONE_WIRE")) {
    return "special";
  }

  // Default to special for unknown cases
  return "special";
}

/**
 * Parse a single register() call from BlockColors.java
 */
function parseRegisterCall(registerCall: string): ParsedTintEntry | null {
  try {
    // Extract all Blocks.<NAME> references
    const blockRegex = /Blocks\.(\w+)/g;
    const blocks: string[] = [];
    let match;

    while ((match = blockRegex.exec(registerCall)) !== null) {
      const blockName = match[1];
      blocks.push(normalizeBlockName(blockName));
    }

    if (blocks.length === 0) {
      return null;
    }

    // Determine tint type
    const tint = getTintType(registerCall);

    return {
      blocks,
      tint,
    };
  } catch (error) {
    console.error("[parseRegisterCall] Error parsing:", error);
    return null;
  }
}

/**
 * Parse BlockColors.java source code to extract tinting information
 */
function parseBlockColorsSource(javaSource: string): ParsedTintEntry[] {
  const entries: ParsedTintEntry[] = [];

  // Match all register() calls
  // This regex captures the entire register call including nested parentheses
  const registerRegex = /\.register\(([\s\S]*?)\);/g;
  let match;

  while ((match = registerRegex.exec(javaSource)) !== null) {
    const registerCall = match[1];
    const entry = parseRegisterCall(registerCall);

    if (entry) {
      entries.push(entry);
    }
  }

  return entries;
}

/**
 * Fetch BlockColors.java from Fabric Yarn's GitHub repository
 */
async function fetchBlockColorsSource(yarnTag: string): Promise<string> {
  const url = `https://raw.githubusercontent.com/FabricMC/yarn/${yarnTag}/mappings/net/minecraft/client/color/block/BlockColors.mapping`;

  console.log(`[fetchBlockColors] Fetching from: ${url}`);

  const response = await fetch(url);

  if (!response.ok) {
    // Try alternative path (sometimes the structure changes)
    const altUrl = `https://raw.githubusercontent.com/FabricMC/yarn/${yarnTag}/net/minecraft/client/color/block/BlockColors.java`;
    console.log(`[fetchBlockColors] Trying alternative URL: ${altUrl}`);

    const altResponse = await fetch(altUrl);
    if (!altResponse.ok) {
      throw new Error(`Failed to fetch BlockColors: ${response.status} ${response.statusText}`);
    }
    return await altResponse.text();
  }

  return await response.text();
}

/**
 * Fetch and parse Minecraft's BlockColors registry for a given version.
 *
 * This function:
 * 1. Checks localStorage cache first
 * 2. If not cached or expired, fetches from Fabric Yarn GitHub
 * 3. Parses the Java source to extract tinting information
 * 4. Caches the result for future use
 *
 * @param mcVersion - Minecraft version (e.g., "1.21.4")
 * @returns Promise resolving to BlockColorRegistry
 * @throws Error if version is not supported or fetch fails
 */
export async function fetchBlockColors(mcVersion: string): Promise<BlockColorRegistry> {
  // Check cache first
  const cached = getCachedBlockColors(mcVersion);
  if (cached) {
    return cached;
  }

  // Get Yarn tag for this version
  const yarnTag = getYarnTag(mcVersion);
  if (!yarnTag) {
    throw new Error(`Unsupported Minecraft version: ${mcVersion}`);
  }

  console.log(`[fetchBlockColors] Fetching block colors for MC ${mcVersion} (Yarn ${yarnTag})`);

  try {
    // Fetch the source
    const source = await fetchBlockColorsSource(yarnTag);

    // Parse it
    const entries = parseBlockColorsSource(source);

    // Create registry
    const registry: BlockColorRegistry = {
      version: mcVersion,
      yarnTag,
      fetchedAt: new Date().toISOString(),
      entries,
    };

    // Cache it
    cacheBlockColors(registry);

    console.log(`[fetchBlockColors] Successfully parsed ${entries.length} tint entries`);

    return registry;
  } catch (error) {
    console.error(`[fetchBlockColors] Failed to fetch block colors:`, error);
    throw error;
  }
}

/**
 * Clear cached block colors for a specific version or all versions
 */
export function clearBlockColorsCache(mcVersion?: string): void {
  if (mcVersion) {
    const cacheKey = getCacheKey(mcVersion);
    localStorage.removeItem(cacheKey);
    console.log(`[fetchBlockColors] Cleared cache for ${mcVersion}`);
  } else {
    // Clear all block colors caches
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
    console.log("[fetchBlockColors] Cleared all block colors caches");
  }
}

/**
 * Check if a block supports tinting according to the registry
 *
 * @param blockId - Block ID (e.g., "minecraft:oak_leaves")
 * @param registry - Block color registry
 * @returns Tint type if block supports tinting, undefined otherwise
 */
export function getBlockTintType(
  blockId: string,
  registry: BlockColorRegistry,
): ParsedTintEntry["tint"] | undefined {
  for (const entry of registry.entries) {
    if (entry.blocks.includes(blockId)) {
      return entry.tint;
    }
  }
  return undefined;
}
