# Weaverbird Scripts

This directory contains utility scripts for generating constants from Minecraft sources.

## Color Data Generator

Scrapes Minecraft Wiki **once** to generate both block tinting data and biome colormap coordinates.

```bash
npm run generate:colors
```

**Outputs:**
- `src/constants/vanillaBlockColors.ts` - Blocks that support biome-based tinting
- `src/constants/biomeCoordinates.ts` - Exact colormap coordinates for each biome

**What it does:**
1. Fetches https://minecraft.wiki/w/Block_colors
2. Parses all tables on the page
3. Extracts block tinting categories (grass/foliage/water/special/fixed)
4. Extracts biome colormap coordinates (x, y) for grass and foliage maps
5. Generates two TypeScript constants files with helper functions

**Use cases:**
- Update when new Minecraft versions add blocks or biomes
- Ensure biome selection matches vanilla Minecraft exactly
- Verify which blocks should respond to biome color changes

---

## When to Regenerate

### After Minecraft Updates
When a new Minecraft version is released:
```bash
npm run generate:colors
```

### After Wiki Updates
If the Minecraft Wiki structure changes, you may need to update the parser in `scripts/scrapeMinecraftColors.ts`.

### Manual Verification
After regenerating, always verify the output files by checking a few known values:

**Block Colors** (`src/constants/vanillaBlockColors.ts`):
- Oak leaves → foliage tint
- Grass block → grass tint
- Birch leaves → fixed color (NOT tinted)

**Biome Coordinates** (`src/constants/biomeCoordinates.ts`):
- Plains: ~(50, 173)
- Desert: (0, 255)
- Jungle: ~(12, 36)
- Swamp: uses noise (no fixed coords)

---

## Technical Details

### Dependencies
- **Playwright** - Headless browser for web scraping
- **tsx** - TypeScript execution for Node.js

### Performance
Single page fetch = ~2-3 seconds total generation time

### Output Format
Generated files include:
- ✅ TypeScript constants (arrays and objects)
- ✅ Helper functions for lookups
- ✅ Metadata (source URL, generation timestamp)
- ✅ JSDoc comments
- ✅ Auto-generated warning header

---

## Examples

### Using Generated Block Colors
```typescript
import { getBlockTintType, GRASS_TINTED_BLOCKS } from '@/constants/vanillaBlockColors';

// Check if a block uses grass tinting
const isGrass = getBlockTintType('minecraft:grass_block') === 'grass'; // true

// Get all grass-tinted blocks
console.log(GRASS_TINTED_BLOCKS);
// ["minecraft:grass_block", "minecraft:grass", ...]
```

### Using Generated Biome Coordinates
```typescript
import { getBiomeCoords, STANDARD_BIOMES } from '@/constants/biomeCoordinates';

// Get coordinates for Plains biome
const plains = getBiomeCoords('plains');
console.log(plains?.grassCoords); // { x: 50, y: 173 }

// Get all biomes with fixed coordinates
console.log(STANDARD_BIOMES);
```

---

## Troubleshooting

### Script Fails to Run
```bash
# Ensure dependencies are installed
npm install

# Run directly with tsx
npx tsx scripts/scrapeMinecraftColors.ts
```

### Parser Errors
If the wiki HTML structure changes:
1. Check the wiki page: https://minecraft.wiki/w/Block_colors
2. Update CSS selectors in the script
3. Add debug logging to inspect table structure

### Coordinates Look Wrong
Compare against the wiki manually:
1. Open https://minecraft.wiki/w/Block_colors
2. Find the "Grass color" and "Foliage color" tables
3. Verify coordinates match the scraped values

---

## Architecture

The single script approach:
- ✅ **Faster** - One page fetch instead of multiple
- ✅ **Simpler** - One script to maintain
- ✅ **Consistent** - Data from same page snapshot
- ✅ **Efficient** - Reuses browser instance and DOM parsing

Old approach (removed):
- ❌ `scrapeBlockColors.ts` - Separate block scraper
- ❌ `scrapeBiomeColors.ts` - Separate biome scraper

New approach:
- ✅ `scrapeMinecraftColors.ts` - Single unified scraper
