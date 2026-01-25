/**
 * Fetches biome colormap coordinates from Minecraft Wiki.
 *
 * This module retrieves the actual colormap coordinates used by Minecraft
 * for each biome, as documented on the Block Colors wiki page.
 */

/**
 * Biome color coordinate data
 */
export interface BiomeColorCoords {
  /** Biome identifier (e.g., "plains", "desert") */
  biomeId: string;
  /** Display name (e.g., "Plains", "Desert") */
  name: string;
  /** Grass colormap coordinates (x, y) or null if N/A */
  grassCoords: { x: number; y: number } | null;
  /** Foliage colormap coordinates (x, y) or null if N/A */
  foliageCoords: { x: number; y: number } | null;
  /** Whether this biome uses noise-based coloring */
  usesNoise: boolean;
}

/**
 * Complete registry of biome colors
 */
export interface BiomeColorRegistry {
  /** Timestamp when this was fetched */
  fetchedAt: string;
  /** Source URL */
  sourceUrl: string;
  /** Biome entries */
  biomes: BiomeColorCoords[];
}

/**
 * Cache configuration
 */
const CACHE_KEY = "biomeColors:registry";
const CACHE_EXPIRY_DAYS = 30; // Biome coords change less frequently than block colors

/**
 * Minecraft Wiki URL for block colors
 */
const WIKI_URL = "https://minecraft.wiki/w/Block_colors";

/**
 * Check if cached data is still valid
 */
function isCacheValid(fetchedAt: string): boolean {
  const fetchedDate = new Date(fetchedAt);
  const now = new Date();
  const daysDiff =
    (now.getTime() - fetchedDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff < CACHE_EXPIRY_DAYS;
}

/**
 * Get cached biome colors if available and valid
 */
function getCachedBiomeColors(): BiomeColorRegistry | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);

    if (!cached) {
      return null;
    }

    const registry: BiomeColorRegistry = JSON.parse(cached);

    if (isCacheValid(registry.fetchedAt)) {
      console.log("[fetchBiomeColors] Using cached biome color data");
      return registry;
    } else {
      console.log("[fetchBiomeColors] Cache expired");
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
  } catch (error) {
    console.error("[fetchBiomeColors] Error reading cache:", error);
    return null;
  }
}

/**
 * Save biome colors to cache
 */
function cacheBiomeColors(registry: BiomeColorRegistry): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(registry));
    console.log("[fetchBiomeColors] Cached biome color data");
  } catch (error) {
    console.error("[fetchBiomeColors] Error writing cache:", error);
  }
}

/**
 * Normalize biome name to ID
 * Example: "Plains" -> "plains", "Old Growth Pine Taiga" -> "old_growth_pine_taiga"
 */
function normalizeBiomeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

/**
 * Parse coordinate text from wiki table cell
 */
function parseCoordinates(coordText: string): { coords: { x: number; y: number } | null; usesNoise: boolean } {
  if (coordText === "N/A" || coordText.toLowerCase().includes("noise")) {
    return { coords: null, usesNoise: true };
  }

  const match = coordText.match(/(\d+)\s*,\s*(\d+)/);
  if (match) {
    return {
      coords: {
        x: parseInt(match[1], 10),
        y: parseInt(match[2], 10),
      },
      usesNoise: false,
    };
  }

  return { coords: null, usesNoise: false };
}

/**
 * Find or create biome entry in list
 */
function findOrCreateBiome(biomes: BiomeColorCoords[], biomeId: string, biomeName: string): BiomeColorCoords {
  let biome = biomes.find((b) => b.biomeId === biomeId);

  if (!biome) {
    biome = {
      biomeId,
      name: biomeName,
      grassCoords: null,
      foliageCoords: null,
      usesNoise: false,
    };
    biomes.push(biome);
  }

  return biome;
}

/**
 * Process a single table row and update biome data
 */
function processTableRow(
  row: Element,
  isGrassTable: boolean,
  isFoliageTable: boolean,
  biomes: BiomeColorCoords[],
): void {
  const cells = row.querySelectorAll("td");

  if (cells.length < 2) {
    return; // Skip header rows
  }

  const biomeName = cells[0].textContent?.trim();
  if (!biomeName) return;

  const coordText = cells[1].textContent?.trim();
  if (!coordText) return;

  const biomeId = normalizeBiomeName(biomeName);
  const { coords, usesNoise } = parseCoordinates(coordText);

  const biome = findOrCreateBiome(biomes, biomeId, biomeName);

  if (isGrassTable) {
    biome.grassCoords = coords;
    biome.usesNoise = biome.usesNoise || usesNoise;
  } else if (isFoliageTable) {
    biome.foliageCoords = coords;
    biome.usesNoise = biome.usesNoise || usesNoise;
  }
}

/**
 * Parse the wiki HTML to extract biome colormap coordinates
 *
 * Note: This function parses the HTML structure of the Minecraft Wiki.
 * If the wiki structure changes, this parser will need to be updated.
 */
function parseWikiHTML(html: string): BiomeColorCoords[] {
  const biomes: BiomeColorCoords[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const tables = doc.querySelectorAll("table.wikitable");

  for (const table of Array.from(tables)) {
    const prevHeading = table.previousElementSibling;
    const headingText = prevHeading?.textContent?.toLowerCase() ?? "";

    const isGrassTable = headingText.includes("grass");
    const isFoliageTable = headingText.includes("foliage");

    if (!isGrassTable && !isFoliageTable) {
      continue;
    }

    const rows = table.querySelectorAll("tr");
    for (const row of Array.from(rows)) {
      processTableRow(row, isGrassTable, isFoliageTable, biomes);
    }
  }

  return biomes;
}

/**
 * Fetch and parse biome colormap coordinates from Minecraft Wiki.
 *
 * This function:
 * 1. Checks localStorage cache first
 * 2. If not cached or expired, fetches from Minecraft Wiki
 * 3. Parses the HTML to extract biome coordinates
 * 4. Caches the result for future use
 *
 * @returns Promise resolving to BiomeColorRegistry
 * @throws Error if fetch or parse fails
 */
export async function fetchBiomeColors(): Promise<BiomeColorRegistry> {
  // Check cache first
  const cached = getCachedBiomeColors();
  if (cached) {
    return cached;
  }

  console.log("[fetchBiomeColors] Fetching biome colors from wiki");

  try {
    // Fetch the wiki page
    const response = await fetch(WIKI_URL);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch wiki page: ${response.status} ${response.statusText}`,
      );
    }

    const html = await response.text();

    // Parse it
    const biomes = parseWikiHTML(html);

    // Create registry
    const registry: BiomeColorRegistry = {
      fetchedAt: new Date().toISOString(),
      sourceUrl: WIKI_URL,
      biomes,
    };

    // Cache it
    cacheBiomeColors(registry);

    console.log(
      `[fetchBiomeColors] Successfully parsed ${biomes.length} biome entries`,
    );

    return registry;
  } catch (error) {
    console.error("[fetchBiomeColors] Failed to fetch biome colors:", error);
    throw error;
  }
}

/**
 * Clear cached biome colors
 */
export function clearBiomeColorsCache(): void {
  localStorage.removeItem(CACHE_KEY);
  console.log("[fetchBiomeColors] Cleared cache");
}

/**
 * Get colormap coordinates for a specific biome
 *
 * @param biomeId - Biome identifier (e.g., "plains")
 * @param registry - Biome color registry
 * @returns Biome color coordinates or undefined if not found
 */
export function getBiomeCoords(
  biomeId: string,
  registry: BiomeColorRegistry,
): BiomeColorCoords | undefined {
  return registry.biomes.find((b) => b.biomeId === biomeId);
}
