#!/usr/bin/env tsx
/**
 * Script to scrape Minecraft color data from wiki and generate constants files.
 *
 * Usage:
 *   npm run generate:colors
 *   or
 *   tsx scripts/scrapeMinecraftColors.ts
 *
 * This scrapes https://minecraft.wiki/w/Block_colors once to extract:
 * 1. Block tinting information (grass/foliage/water/special)
 * 2. Biome colormap coordinates (x, y positions)
 *
 * Outputs:
 * - src/constants/vanillaBlockColors.ts
 * - src/constants/biomeCoordinates.ts
 */

import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const WIKI_URL = "https://minecraft.wiki/w/Block_colors";
const BLOCK_COLORS_OUTPUT = path.join(
  __dirname,
  "../src/constants/vanillaBlockColors.ts",
);
const BIOME_COORDS_OUTPUT = path.join(
  __dirname,
  "../src/constants/biomeCoordinates.ts",
);

// ============================================================================
// DATA STRUCTURES
// ============================================================================

interface ScrapedBlocks {
  grass: Set<string>;
  foliage: Set<string>;
  water: Set<string>;
  special: Set<string>;
  fixedColor: Set<string>;
}

interface BiomeColorData {
  biomeId: string;
  name: string;
  coords: { x: number; y: number } | null;
  grassHexColor: string | null;
  foliageHexColor: string | null;
  waterHexColor: string | null;
  dryFoliageHexColor: string | null;
  usesNoise: boolean;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Normalize block name to Minecraft ID format
 */
function normalizeBlockName(name: string): string {
  return `minecraft:${name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")}`;
}

/**
 * Normalize biome name to ID format
 */
function normalizeBiomeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

/**
 * Parse coordinate string like "50, 173" or "(50, 173)" to {x, y}
 */
function parseCoordinates(coordText: string): { x: number; y: number } | null {
  // Match patterns like "50, 173", "(50, 173)", or "50,173"
  const match = coordText.match(/\(?\s*(\d+)\s*,\s*(\d+)\s*\)?/);
  if (match) {
    return {
      x: parseInt(match[1], 10),
      y: parseInt(match[2], 10),
    };
  }
  return null;
}

// ============================================================================
// SCRAPER
// ============================================================================

/**
 * Scrape both block colors and biome coordinates from Minecraft Wiki
 */
async function scrapeMinecraftColors(): Promise<{
  blocks: ScrapedBlocks;
  biomes: BiomeColorData[];
}> {
  console.log(`\n🌐 Launching browser...`);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log(`📥 Navigating to ${WIKI_URL}...`);
  await page.goto(WIKI_URL, { waitUntil: "domcontentloaded" });

  // Initialize data structures
  const blocks: ScrapedBlocks = {
    grass: new Set(),
    foliage: new Set(),
    water: new Set(),
    special: new Set(),
    fixedColor: new Set(),
  };
  const biomesMap = new Map<string, BiomeColorData>();

  console.log(`🔍 Scraping page content...`);

  // Find all tables with class "wikitable"
  const tables = await page.locator("table.wikitable").all();

  for (const table of tables) {
    // Get the heading before this table (and parent section if needed)
    const headingInfo = await table.evaluateHandle((node) => {
      let prev = node.previousElementSibling;
      while (
        prev &&
        prev.tagName !== "H3" &&
        prev.tagName !== "H4" &&
        prev.tagName !== "H2"
      ) {
        prev = prev.previousElementSibling;
      }
      const immediateHeading = prev?.textContent || "";

      // Also get parent section (H3) if current is H4
      let parentHeading = "";
      if (prev && prev.tagName === "H4") {
        let parent = prev.previousElementSibling;
        while (parent && parent.tagName !== "H3" && parent.tagName !== "H2") {
          parent = parent.previousElementSibling;
        }
        parentHeading = parent?.textContent || "";
      }

      return { immediate: immediateHeading, parent: parentHeading };
    });
    const headings = await headingInfo.jsonValue();
    const headingText = (
      headings.immediate +
      " " +
      headings.parent
    ).toLowerCase();

    // Check if this is a biome coordinate table
    // Skip Bedrock Edition tables
    const isBedrockOnly =
      headingText.includes("bedrock") && !headingText.includes("java");

    const isGrassTable =
      headingText.includes("grass") &&
      !headingText.includes("dry") &&
      !isBedrockOnly;
    const isFoliageTable =
      headingText.includes("foliage") &&
      !headingText.includes("dry") &&
      !isBedrockOnly;
    const isWaterTable = headingText.includes("water") && !isBedrockOnly;
    const isDryFoliageTable =
      headingText.includes("dry") &&
      headingText.includes("foliage") &&
      !isBedrockOnly;
    const isBiomeTable =
      isGrassTable || isFoliageTable || isWaterTable || isDryFoliageTable;

    if (isBiomeTable) {
      // Parse biome coordinates
      const tableType = isGrassTable
        ? "grass"
        : isFoliageTable
          ? "foliage"
          : isWaterTable
            ? "water"
            : "dry foliage";
      console.log(`  📊 Found ${tableType} biome table`);

      const rows = await table.locator("tr").all();
      let lastHexColor: string | null = null;
      let lastCoordText: string | null = null;

      for (const row of rows) {
        const cells = await row.locator("td").all();
        if (cells.length === 0) continue; // Skip empty rows

        // Column layout: [Biome(s), Color (hex), Colormap Coordinate, Renders...]
        // Due to rowspan, some rows only have 1 cell (biome name), others have all cells
        let hexColor: string | null;
        let coordText: string | null;

        if (cells.length >= 3) {
          // This row has color and coordinate cells
          hexColor = (await cells[1].textContent())?.trim() || null;
          coordText = (await cells[2].textContent())?.trim() || null;
          lastHexColor = hexColor;
          lastCoordText = coordText;
        } else {
          // This row only has biome name - use previous row's color/coords (rowspan)
          hexColor = lastHexColor;
          coordText = lastCoordText;
        }

        // Get all biome name links
        // Each biome has both an image link and a text link - we want both since they point to the same place
        const allLinks = await cells[0]
          .locator("a[href^='/w/']:not([class*='image'])")
          .all();
        if (allLinks.length === 0) continue;

        // Process each biome link in this row
        for (const link of allLinks) {
          const biomeName = (await link.textContent())?.trim();
          if (!biomeName || biomeName.length < 2) continue;

          // Skip edition marker links (BE, JE, etc.)
          if (
            biomeName === "BE" ||
            biomeName === "JE" ||
            biomeName === "Java Edition" ||
            biomeName === "Bedrock Edition" ||
            biomeName.startsWith("Java Edition") ||
            biomeName.startsWith("Bedrock Edition")
          ) {
            continue;
          }

          // Skip BE-only biomes (we only want Java Edition)
          if (biomeName.includes("[BE") || biomeName.includes("‌[BE")) {
            continue;
          }

          // Clean up biome name by removing edition markers
          const cleanBiomeName = biomeName
            .replace(/‌?\[JE\s+only\]/gi, "")
            .replace(/‌?\[BE\s+only\]/gi, "")
            .trim();

          const biomeId = normalizeBiomeName(cleanBiomeName);
          let coords: { x: number; y: number } | null = null;
          let usesNoise = false;

          if (
            !coordText ||
            coordText === "N/A" ||
            coordText.toLowerCase().includes("noise") ||
            coordText.toLowerCase().includes("n/a")
          ) {
            usesNoise = true;
          } else {
            coords = parseCoordinates(coordText);
          }

          let biome = biomesMap.get(biomeId);
          if (!biome) {
            biome = {
              biomeId,
              name: cleanBiomeName,
              coords: null,
              grassHexColor: null,
              foliageHexColor: null,
              waterHexColor: null,
              dryFoliageHexColor: null,
              usesNoise: false,
            };
            biomesMap.set(biomeId, biome);
          }

          if (isGrassTable) {
            biome.coords = coords;
            biome.grassHexColor = hexColor || null;
            biome.usesNoise = biome.usesNoise || usesNoise;
          } else if (isFoliageTable) {
            biome.coords = coords;
            biome.foliageHexColor = hexColor || null;
            biome.usesNoise = biome.usesNoise || usesNoise;
          } else if (isWaterTable) {
            biome.waterHexColor = hexColor || null;
          } else if (isDryFoliageTable) {
            biome.dryFoliageHexColor = hexColor || null;
          }
        } // End of biome link loop
      }
    } else {
      // Parse block tinting information
      const blockLinks = await table
        .locator('a[href*="/Block/"], a[title*="Block"]')
        .all();

      for (const link of blockLinks) {
        try {
          const text = await link.textContent();
          if (!text) continue;

          // Skip wiki-specific internal links
          if (
            text.includes("block_colors") ||
            text.includes("removed_blocks")
          ) {
            continue;
          }

          const blockId = normalizeBlockName(text);
          const parent = link.locator(
            "xpath=ancestor::*[self::p or self::li or self::td][1]",
          );
          const context = await parent.textContent().catch(() => "");
          const contextLower = context.toLowerCase();

          // Categorize based on context
          if (
            contextLower.includes("grass") ||
            text.toLowerCase().includes("grass") ||
            text.toLowerCase().includes("fern")
          ) {
            blocks.grass.add(blockId);
          } else if (
            contextLower.includes("foliage") ||
            contextLower.includes("leaves") ||
            text.toLowerCase().includes("leaves") ||
            text.toLowerCase().includes("vine")
          ) {
            // Check for fixed color leaves
            if (
              text.toLowerCase().includes("birch") ||
              text.toLowerCase().includes("spruce") ||
              text.toLowerCase().includes("cherry") ||
              text.toLowerCase().includes("azalea")
            ) {
              blocks.fixedColor.add(blockId);
            } else {
              blocks.foliage.add(blockId);
            }
          } else if (
            contextLower.includes("water") ||
            text.toLowerCase().includes("water")
          ) {
            blocks.water.add(blockId);
          } else if (contextLower.includes("redstone")) {
            blocks.special.add(blockId);
          }
        } catch (error) {
          // Skip
        }
      }
    }
  }

  // Add known blocks that might not be caught by scraping
  const knownBlocks = {
    grass: [
      "minecraft:grass_block",
      "minecraft:grass",
      "minecraft:short_grass",
      "minecraft:tall_grass",
      "minecraft:fern",
      "minecraft:large_fern",
      "minecraft:sugar_cane",
      "minecraft:lily_pad",
      "minecraft:pink_petals",
      "minecraft:attached_melon_stem",
      "minecraft:attached_pumpkin_stem",
      "minecraft:melon_stem",
      "minecraft:pumpkin_stem",
      "minecraft:potted_fern",
    ],
    foliage: [
      "minecraft:oak_leaves",
      "minecraft:jungle_leaves",
      "minecraft:acacia_leaves",
      "minecraft:dark_oak_leaves",
      "minecraft:mangrove_leaves",
      "minecraft:vine",
    ],
    water: [
      "minecraft:water",
      "minecraft:flowing_water",
      "minecraft:bubble_column",
      "minecraft:water_cauldron",
    ],
    special: [
      "minecraft:redstone_wire",
      "minecraft:bamboo",
      "minecraft:bamboo_sapling",
    ],
    fixedColor: [
      "minecraft:birch_leaves",
      "minecraft:spruce_leaves",
      "minecraft:cherry_leaves",
      "minecraft:azalea_leaves",
      "minecraft:flowering_azalea_leaves",
    ],
  };

  Object.entries(knownBlocks).forEach(([category, blockList]) => {
    blockList.forEach((b) => blocks[category as keyof ScrapedBlocks].add(b));
  });

  // Clean up: Remove any blocks with wiki-specific artifacts in their names
  const cleanBlocks = (blockSet: Set<string>) => {
    const toRemove: string[] = [];
    blockSet.forEach((block) => {
      if (block.includes("block_colors") || block.includes("removed_blocks")) {
        toRemove.push(block);
      }
    });
    toRemove.forEach((block) => blockSet.delete(block));
  };

  cleanBlocks(blocks.grass);
  cleanBlocks(blocks.foliage);
  cleanBlocks(blocks.water);
  cleanBlocks(blocks.special);
  cleanBlocks(blocks.fixedColor);

  await browser.close();
  console.log(`✓ Scraping complete\n`);

  return {
    blocks,
    biomes: Array.from(biomesMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
  };
}

// ============================================================================
// FILE GENERATORS
// ============================================================================

/**
 * Generate vanillaBlockColors.ts
 */
function generateBlockColorsFile(blocks: ScrapedBlocks): string {
  const timestamp = new Date().toISOString();
  const grassBlocks = Array.from(blocks.grass).sort();
  const foliageBlocks = Array.from(blocks.foliage).sort();
  const waterBlocks = Array.from(blocks.water).sort();
  const specialBlocks = Array.from(blocks.special).sort();
  const fixedColorBlocks = Array.from(blocks.fixedColor).sort();

  return `/**
 * Vanilla Minecraft Block Colors
 *
 * This file contains all vanilla blocks that support biome-based color tinting.
 *
 * ⚠️ AUTO-GENERATED - DO NOT EDIT MANUALLY
 * Generated by scraping the Minecraft Wiki.
 *
 * Generation info:
 * - Source: ${WIKI_URL}
 * - Generated: ${timestamp}
 * - Script: scripts/scrapeMinecraftColors.ts
 *
 * To regenerate: npm run generate:colors
 */

/**
 * Blocks that use the grass.png colormap
 */
export const GRASS_TINTED_BLOCKS = [
${grassBlocks.map((b) => `  "${b}",`).join("\n")}
] as const;

/**
 * Blocks that use the foliage.png colormap
 */
export const FOLIAGE_TINTED_BLOCKS = [
${foliageBlocks.map((b) => `  "${b}",`).join("\n")}
] as const;

/**
 * Blocks that use water colormap
 */
export const WATER_TINTED_BLOCKS = [
${waterBlocks.map((b) => `  "${b}",`).join("\n")}
] as const;

/**
 * Blocks with special/custom tinting logic
 */
export const SPECIAL_TINTED_BLOCKS = [
${specialBlocks.map((b) => `  "${b}",`).join("\n")}
] as const;

/**
 * Blocks with fixed colors (NOT biome-dependent)
 */
export const FIXED_COLOR_BLOCKS = [
${fixedColorBlocks.map((b) => `  "${b}",`).join("\n")}
] as const;

export type TintType = "grass" | "foliage" | "water" | "special";

/**
 * Get the tint type for a block ID.
 */
export function getBlockTintType(blockId: string): TintType | undefined {
  if (GRASS_TINTED_BLOCKS.includes(blockId as any)) return "grass";
  if (FOLIAGE_TINTED_BLOCKS.includes(blockId as any)) return "foliage";
  if (WATER_TINTED_BLOCKS.includes(blockId as any)) return "water";
  if (SPECIAL_TINTED_BLOCKS.includes(blockId as any)) return "special";
  return undefined;
}

export const BLOCK_COLORS_METADATA = {
  source: "${WIKI_URL}",
  generatedAt: "${timestamp}",
  totalBlocks: ${grassBlocks.length + foliageBlocks.length + waterBlocks.length + specialBlocks.length},
} as const;
`;
}

/**
 * Generate biomeCoordinates.ts
 */
function generateBiomeCoordsFile(biomes: BiomeColorData[]): string {
  const timestamp = new Date().toISOString();
  const standardBiomes = biomes.filter((b) => !b.usesNoise);
  const noiseBiomes = biomes.filter((b) => b.usesNoise);

  return `/**
 * Minecraft Biome Colormap Coordinates
 *
 * Contains exact colormap coordinates for sampling grass.png and foliage.png.
 *
 * ⚠️ AUTO-GENERATED - DO NOT EDIT MANUALLY
 * Generated by scraping the Minecraft Wiki.
 *
 * Generation info:
 * - Source: ${WIKI_URL}
 * - Generated: ${timestamp}
 * - Script: scripts/scrapeMinecraftColors.ts
 *
 * To regenerate: npm run generate:colors
 */

export interface BiomeCoords {
  biomeId: string;
  name: string;
  coords: { x: number; y: number } | null;
  grassHexColor: string | null;
  foliageHexColor: string | null;
  waterHexColor: string | null;
  dryFoliageHexColor: string | null;
  usesNoise: boolean;
}

/**
 * Biomes with fixed colormap coordinates
 */
export const STANDARD_BIOMES: BiomeCoords[] = [
${standardBiomes
  .map((b) => {
    const coords = b.coords ? `{ x: ${b.coords.x}, y: ${b.coords.y} }` : "null";
    const grassHex = b.grassHexColor ? `"${b.grassHexColor}"` : "null";
    const foliageHex = b.foliageHexColor ? `"${b.foliageHexColor}"` : "null";
    const waterHex = b.waterHexColor ? `"${b.waterHexColor}"` : "null";
    const dryFoliageHex = b.dryFoliageHexColor
      ? `"${b.dryFoliageHexColor}"`
      : "null";
    return `  { biomeId: "${b.biomeId}", name: "${b.name}", coords: ${coords}, grassHexColor: ${grassHex}, foliageHexColor: ${foliageHex}, waterHexColor: ${waterHex}, dryFoliageHexColor: ${dryFoliageHex}, usesNoise: false },`;
  })
  .join("\n")}
];

/**
 * Biomes that use noise-based coloring (Swamp, Badlands, etc.)
 */
export const NOISE_BIOMES: BiomeCoords[] = [
${noiseBiomes
  .map((b) => {
    const grassHex = b.grassHexColor ? `"${b.grassHexColor}"` : "null";
    const foliageHex = b.foliageHexColor ? `"${b.foliageHexColor}"` : "null";
    const waterHex = b.waterHexColor ? `"${b.waterHexColor}"` : "null";
    const dryFoliageHex = b.dryFoliageHexColor
      ? `"${b.dryFoliageHexColor}"`
      : "null";
    return `  { biomeId: "${b.biomeId}", name: "${b.name}", coords: null, grassHexColor: ${grassHex}, foliageHexColor: ${foliageHex}, waterHexColor: ${waterHex}, dryFoliageHexColor: ${dryFoliageHex}, usesNoise: true },`;
  })
  .join("\n")}
];

export const ALL_BIOMES: BiomeCoords[] = [...STANDARD_BIOMES, ...NOISE_BIOMES];

/**
 * Get coordinates for a specific biome
 */
export function getBiomeCoords(biomeId: string): BiomeCoords | undefined {
  return ALL_BIOMES.find((b) => b.biomeId === biomeId);
}

/**
 * Convert hex color to RGB object
 * @param hex - Hex color string (e.g., "#91BD59" or "91BD59")
 * @returns RGB color object or null if invalid
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace('#', '');
  const match = cleaned.match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!match) return null;

  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

/**
 * Get grass color for a biome with fallback logic
 * 1. Try using coordinates to sample colormap
 * 2. Fall back to hex color if no coordinates
 * @param biomeId - Biome identifier
 * @returns Coordinates to sample or RGB from hex
 */
export function getGrassColorForBiome(
  biomeId: string
): { coords: { x: number; y: number } | null; hex: string | null; rgb: { r: number; g: number; b: number } | null } {
  const biome = getBiomeCoords(biomeId);
  if (!biome) return { coords: null, hex: null, rgb: null };

  return {
    coords: biome.coords,
    hex: biome.grassHexColor,
    rgb: biome.grassHexColor ? hexToRgb(biome.grassHexColor) : null,
  };
}

/**
 * Get foliage color for a biome with fallback logic
 * 1. Try using coordinates to sample colormap
 * 2. Fall back to hex color if no coordinates
 * @param biomeId - Biome identifier
 * @returns Coordinates to sample or RGB from hex
 */
export function getFoliageColorForBiome(
  biomeId: string
): { coords: { x: number; y: number } | null; hex: string | null; rgb: { r: number; g: number; b: number } | null } {
  const biome = getBiomeCoords(biomeId);
  if (!biome) return { coords: null, hex: null, rgb: null };

  return {
    coords: biome.coords,
    hex: biome.foliageHexColor,
    rgb: biome.foliageHexColor ? hexToRgb(biome.foliageHexColor) : null,
  };
}

export const BIOME_COORDS_METADATA = {
  source: "${WIKI_URL}",
  generatedAt: "${timestamp}",
  totalBiomes: ${biomes.length},
  standardBiomes: ${standardBiomes.length},
  noiseBiomes: ${noiseBiomes.length},
} as const;
`;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log(`\n🎨 Generating Minecraft color data from wiki\n`);

  try {
    // Scrape the wiki once
    const { blocks, biomes } = await scrapeMinecraftColors();

    // Display block results
    console.log("📊 Block tinting data:");
    console.log(`  - Grass blocks:       ${blocks.grass.size}`);
    console.log(`  - Foliage blocks:     ${blocks.foliage.size}`);
    console.log(`  - Water blocks:       ${blocks.water.size}`);
    console.log(`  - Special blocks:     ${blocks.special.size}`);
    console.log(`  - Fixed color blocks: ${blocks.fixedColor.size}\n`);

    // Display biome results
    const standardBiomes = biomes.filter((b) => !b.usesNoise);
    const noiseBiomes = biomes.filter((b) => b.usesNoise);
    console.log("📊 Biome coordinate data:");
    console.log(`  - Standard biomes: ${standardBiomes.length}`);
    console.log(`  - Noise biomes:    ${noiseBiomes.length}`);
    console.log(`  - Total biomes:    ${biomes.length}\n`);

    // Generate files
    console.log("📝 Generating TypeScript files...");

    const blockColorsContent = generateBlockColorsFile(blocks);
    const biomeCoordsContent = generateBiomeCoordsFile(biomes);

    // Ensure output directory exists
    const outputDir = path.dirname(BLOCK_COLORS_OUTPUT);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write files
    fs.writeFileSync(BLOCK_COLORS_OUTPUT, blockColorsContent, "utf-8");
    fs.writeFileSync(BIOME_COORDS_OUTPUT, biomeCoordsContent, "utf-8");

    console.log(`✓ ${path.relative(process.cwd(), BLOCK_COLORS_OUTPUT)}`);
    console.log(`✓ ${path.relative(process.cwd(), BIOME_COORDS_OUTPUT)}\n`);

    console.log("✅ Generation complete!\n");

    // Display samples
    console.log("📋 Sample blocks:");
    console.log(
      "  Grass:  ",
      Array.from(blocks.grass).slice(0, 3).join(", "),
      "...",
    );
    console.log(
      "  Foliage:",
      Array.from(blocks.foliage).slice(0, 3).join(", "),
      "...\n",
    );

    console.log("📋 Sample biomes:");
    standardBiomes.slice(0, 3).forEach((b) => {
      const coords = b.coords ? `(${b.coords.x}, ${b.coords.y})` : "N/A";
      console.log(`  ${b.name.padEnd(20)} - Coords: ${coords}`);
    });
    console.log();
  } catch (error) {
    console.error("❌ Error generating color data:");
    console.error(error);
    process.exit(1);
  }
}

main();
