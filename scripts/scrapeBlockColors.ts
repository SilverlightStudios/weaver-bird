#!/usr/bin/env tsx
/**
 * Script to scrape block colors from Minecraft Wiki and generate constants file.
 *
 * Usage:
 *   npm run generate:blockcolors
 *   or
 *   tsx scripts/scrapeBlockColors.ts
 *
 * This scrapes https://minecraft.wiki/w/Block_colors to extract which blocks
 * support biome-based tinting and generates a TypeScript constants file.
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
const OUTPUT_FILE = path.join(__dirname, "../src/constants/vanillaBlockColors.ts");

interface ScrapedBlocks {
  grass: Set<string>;
  foliage: Set<string>;
  water: Set<string>;
  special: Set<string>;
  fixedColor: Set<string>;
}

/**
 * Normalize block name to Minecraft ID format
 */
function normalizeBlockName(name: string): string {
  // Remove any wiki formatting, convert to lowercase, replace spaces with underscores
  return `minecraft:${name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")}`;
}

/**
 * Scrape block colors from Minecraft Wiki
 */
async function scrapeBlockColors(): Promise<ScrapedBlocks> {
  console.log(`\n🌐 Launching browser...`);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log(`📥 Navigating to ${WIKI_URL}...`);
  await page.goto(WIKI_URL, { waitUntil: "domcontentloaded" });

  const blocks: ScrapedBlocks = {
    grass: new Set(),
    foliage: new Set(),
    water: new Set(),
    special: new Set(),
    fixedColor: new Set(),
  };

  console.log(`🔍 Scraping block information...`);

  // Look for sections describing grass colors
  const grassSection = await page.locator('text=/grass/i').first();
  if (grassSection) {
    console.log("  Found grass section");
  }

  // Strategy: Find all block links and categorize them based on surrounding text
  const blockLinks = await page.locator('a[href*="/Block/"]').all();

  for (const link of blockLinks) {
    try {
      const text = await link.textContent();
      if (!text) continue;

      const blockId = normalizeBlockName(text);

      // Get surrounding context to determine category
      const parent = link.locator('xpath=ancestor::*[self::p or self::li or self::td][1]');
      const context = await parent.textContent().catch(() => "");
      const contextLower = context.toLowerCase();

      // Categorize based on context and block name
      if (
        contextLower.includes("grass") ||
        text.toLowerCase().includes("grass") ||
        text.toLowerCase().includes("fern") ||
        contextLower.includes("stem")
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
        text.toLowerCase().includes("water") ||
        text.toLowerCase().includes("cauldron")
      ) {
        blocks.water.add(blockId);
      } else if (
        contextLower.includes("redstone") ||
        text.toLowerCase().includes("bamboo")
      ) {
        blocks.special.add(blockId);
      }
    } catch (error) {
      // Skip links that can't be processed
    }
  }

  // Manual additions for well-known blocks that might not be caught
  const knownGrassBlocks = [
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
  ];

  const knownFoliageBlocks = [
    "minecraft:oak_leaves",
    "minecraft:jungle_leaves",
    "minecraft:acacia_leaves",
    "minecraft:dark_oak_leaves",
    "minecraft:mangrove_leaves",
    "minecraft:vine",
  ];

  const knownWaterBlocks = [
    "minecraft:water",
    "minecraft:flowing_water",
    "minecraft:bubble_column",
    "minecraft:water_cauldron",
  ];

  const knownSpecialBlocks = [
    "minecraft:redstone_wire",
    "minecraft:bamboo",
    "minecraft:bamboo_sapling",
  ];

  const knownFixedColorBlocks = [
    "minecraft:birch_leaves",
    "minecraft:spruce_leaves",
    "minecraft:cherry_leaves",
    "minecraft:azalea_leaves",
    "minecraft:flowering_azalea_leaves",
  ];

  // Add known blocks
  knownGrassBlocks.forEach(b => blocks.grass.add(b));
  knownFoliageBlocks.forEach(b => blocks.foliage.add(b));
  knownWaterBlocks.forEach(b => blocks.water.add(b));
  knownSpecialBlocks.forEach(b => blocks.special.add(b));
  knownFixedColorBlocks.forEach(b => blocks.fixedColor.add(b));

  await browser.close();
  console.log(`✓ Scraping complete\n`);

  return blocks;
}

/**
 * Generate TypeScript constants file
 */
function generateTypeScriptFile(blocks: ScrapedBlocks): string {
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
 * This file is automatically generated by scraping the Minecraft Wiki.
 *
 * Generation info:
 * - Source: ${WIKI_URL}
 * - Generated: ${timestamp}
 * - Script: scripts/scrapeBlockColors.ts
 *
 * To regenerate:
 *   npm run generate:blockcolors
 */

/**
 * Blocks that use the grass.png colormap
 * These blocks change color based on biome grass color.
 */
export const GRASS_TINTED_BLOCKS = [
${grassBlocks.map(b => `  "${b}",`).join('\n')}
] as const;

/**
 * Blocks that use the foliage.png colormap
 * These blocks change color based on biome foliage color.
 *
 * Note: Birch and Spruce leaves are NOT included as they have fixed colors.
 * Cherry and Azalea leaves also have fixed colors.
 */
export const FOLIAGE_TINTED_BLOCKS = [
${foliageBlocks.map(b => `  "${b}",`).join('\n')}
] as const;

/**
 * Blocks that use water colormap
 * These blocks change color based on biome water color.
 */
export const WATER_TINTED_BLOCKS = [
${waterBlocks.map(b => `  "${b}",`).join('\n')}
] as const;

/**
 * Blocks with special/custom tinting logic
 * These don't use colormaps directly but have hardcoded color logic.
 */
export const SPECIAL_TINTED_BLOCKS = [
${specialBlocks.map(b => `  "${b}",`).join('\n')}
] as const;

/**
 * Blocks with fixed colors (NOT biome-dependent)
 * These blocks have tintindex but don't change with biome.
 * Included here for completeness but should NOT be tinted by colormaps.
 */
export const FIXED_COLOR_BLOCKS = [
${fixedColorBlocks.map(b => `  "${b}",`).join('\n')}
] as const;

/**
 * All blocks that support any form of tinting
 */
export const ALL_TINTED_BLOCKS = [
  ...GRASS_TINTED_BLOCKS,
  ...FOLIAGE_TINTED_BLOCKS,
  ...WATER_TINTED_BLOCKS,
  ...SPECIAL_TINTED_BLOCKS,
] as const;

/**
 * Type for tint categories
 */
export type TintType = "grass" | "foliage" | "water" | "special";

/**
 * Get the tint type for a block ID.
 * Returns undefined if the block doesn't support biome-based tinting.
 *
 * Note: This only returns tint types for blocks that should use colormaps.
 * Blocks with fixed colors (birch_leaves, cherry_leaves, etc.) return undefined.
 *
 * @param blockId - Minecraft block ID (e.g., "minecraft:oak_leaves")
 * @returns Tint type or undefined
 */
export function getBlockTintType(blockId: string): TintType | undefined {
  if (GRASS_TINTED_BLOCKS.includes(blockId as any)) return "grass";
  if (FOLIAGE_TINTED_BLOCKS.includes(blockId as any)) return "foliage";
  if (WATER_TINTED_BLOCKS.includes(blockId as any)) return "water";
  if (SPECIAL_TINTED_BLOCKS.includes(blockId as any)) return "special";
  return undefined;
}

/**
 * Check if a block supports biome-based tinting.
 *
 * @param blockId - Minecraft block ID
 * @returns True if the block uses a colormap for tinting
 */
export function isBlockTinted(blockId: string): boolean {
  return getBlockTintType(blockId) !== undefined;
}

/**
 * Check if a block has a fixed color (has tintindex but doesn't change with biome).
 *
 * @param blockId - Minecraft block ID
 * @returns True if the block has fixed color
 */
export function hasFixedColor(blockId: string): boolean {
  return FIXED_COLOR_BLOCKS.includes(blockId as any);
}

/**
 * Metadata about this file
 */
export const BLOCK_COLORS_METADATA = {
  source: "${WIKI_URL}",
  generatedAt: "${timestamp}",
  totalBlocks: ${grassBlocks.length + foliageBlocks.length + waterBlocks.length + specialBlocks.length},
  grassBlocks: ${grassBlocks.length},
  foliageBlocks: ${foliageBlocks.length},
  waterBlocks: ${waterBlocks.length},
  specialBlocks: ${specialBlocks.length},
  fixedColorBlocks: ${fixedColorBlocks.length},
} as const;
`;
}

/**
 * Main function
 */
async function main() {
  console.log(`\n🎨 Generating vanilla block colors from Minecraft Wiki\n`);

  try {
    // Scrape the wiki
    const blocks = await scrapeBlockColors();

    // Display results
    console.log("📊 Scraped block counts:");
    console.log(`  - Grass:       ${blocks.grass.size} blocks`);
    console.log(`  - Foliage:     ${blocks.foliage.size} blocks`);
    console.log(`  - Water:       ${blocks.water.size} blocks`);
    console.log(`  - Special:     ${blocks.special.size} blocks`);
    console.log(`  - Fixed Color: ${blocks.fixedColor.size} blocks`);
    console.log(`  - Total:       ${blocks.grass.size + blocks.foliage.size + blocks.water.size + blocks.special.size} blocks\n`);

    // Generate TypeScript file
    console.log("📝 Generating TypeScript constants file...");
    const tsContent = generateTypeScriptFile(blocks);

    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write file
    fs.writeFileSync(OUTPUT_FILE, tsContent, "utf-8");
    console.log(`✓ File written to: ${path.relative(process.cwd(), OUTPUT_FILE)}\n`);

    console.log("✅ Block colors generated successfully!\n");

    // Display sample blocks
    console.log("📋 Sample blocks:");
    console.log("  Grass:  ", Array.from(blocks.grass).slice(0, 3).join(", "), "...");
    console.log("  Foliage:", Array.from(blocks.foliage).slice(0, 3).join(", "), "...");
    console.log("  Water:  ", Array.from(blocks.water).slice(0, 3).join(", "), "...");
    console.log();

  } catch (error) {
    console.error("❌ Error generating block colors:");
    console.error(error);
    process.exit(1);
  }
}

main();
