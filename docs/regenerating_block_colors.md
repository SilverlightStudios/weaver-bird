# Regenerating Block Colors

This document explains how to update the vanilla block colors registry when a new Minecraft version is released.

## Quick Start

```bash
npm run generate:blockcolors
```

That's it! The script will automatically:
1. Launch a headless browser
2. Scrape the Minecraft Wiki
3. Extract all tinted blocks
4. Generate the TypeScript constants file

## What Gets Generated

The script creates `src/constants/vanillaBlockColors.ts` with:

- **GRASS_TINTED_BLOCKS** - Blocks using grass.png colormap
- **FOLIAGE_TINTED_BLOCKS** - Blocks using foliage.png colormap  
- **WATER_TINTED_BLOCKS** - Blocks using water colormap
- **SPECIAL_TINTED_BLOCKS** - Blocks with custom tinting logic
- **FIXED_COLOR_BLOCKS** - Blocks with tintindex but fixed colors

## How the Scraper Works

The script (`scripts/scrapeBlockColors.ts`) uses Playwright to:

1. Navigate to https://minecraft.wiki/w/Block_colors
2. Find all block links on the page
3. Analyze surrounding text to determine category
4. Use keyword matching (grass, leaves, water, etc.)
5. Add well-known blocks as fallback for accuracy
6. Generate formatted TypeScript with proper types

## When to Regenerate

Run the script when:
- ✅ New Minecraft version is released
- ✅ Wiki updates with new tinted blocks
- ✅ You notice missing or incorrect blocks
- ✅ Testing different Minecraft versions

## Verification

After regenerating, verify the output:

```bash
# Check the generated file
cat src/constants/vanillaBlockColors.ts

# Run type check
npm run type-check

# Run build
npm run build
```

## Manual Adjustments

If the scraper misses blocks or miscategorizes them, you can:

### Option 1: Update the Fallback Lists

Edit `scripts/scrapeBlockColors.ts` and add to the known blocks:

```typescript
const knownGrassBlocks = [
  "minecraft:grass_block",
  "minecraft:new_grass_plant", // Add new blocks here
  // ...
];
```

Then regenerate:
```bash
npm run generate:blockcolors
```

### Option 2: Manual Override (Not Recommended)

If absolutely necessary, you can manually edit `src/constants/vanillaBlockColors.ts`, but:
- Remove the AUTO-GENERATED warning
- Document why manual override was needed
- Remember it will be overwritten next time you run the script

## Troubleshooting

### "Executable doesn't exist" Error

Install Playwright browsers:
```bash
npx playwright install chromium
```

### Scraper Returns Empty Results

1. Check if the Wiki URL has changed
2. Verify Wiki is accessible (not blocked)
3. Try running with headed browser for debugging:
   ```typescript
   // In scrapeBlockColors.ts, change:
   const browser = await chromium.launch({ headless: false });
   ```

### Wrong Blocks or Categories

The scraper uses context keywords to categorize blocks. If it gets it wrong:
1. Check the Wiki page structure - it may have changed
2. Update the categorization logic in the script
3. Add the correct blocks to the fallback lists

## Example Output

```typescript
export const GRASS_TINTED_BLOCKS = [
  "minecraft:attached_melon_stem",
  "minecraft:fern",
  "minecraft:grass",
  "minecraft:grass_block",
  // ... more blocks
] as const;

export const FOLIAGE_TINTED_BLOCKS = [
  "minecraft:acacia_leaves",
  "minecraft:jungle_leaves",
  "minecraft:oak_leaves",
  // ... more blocks
] as const;
```

## Integration with Rendering

The generated constants are used in:
- `src/components/MinecraftCSSBlock/index.tsx` - 2D CSS rendering
- `src/components/Preview3D/BlockModel.tsx` - 3D WebGL rendering

Both check:
1. Does the face have `tintindex`? (from model JSON)
2. Is the block in the tinted blocks list? (from generated constants)
3. If both true → apply colormap tinting

## Version History

Track which Minecraft version the constants are for:

```typescript
export const BLOCK_COLORS_METADATA = {
  source: "https://minecraft.wiki/w/Block_colors",
  generatedAt: "2025-11-20T19:45:22.032Z",
  totalBlocks: 27,
  // ...
} as const;
```

This metadata is included in every generated file.

## CI/CD Integration

To automatically regenerate on version updates:

```yaml
# .github/workflows/update-block-colors.yml
name: Update Block Colors
on:
  workflow_dispatch: # Manual trigger
  schedule:
    - cron: '0 0 * * 0' # Weekly on Sundays

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npx playwright install chromium
      - run: npm run generate:blockcolors
      - uses: peter-evans/create-pull-request@v5
        with:
          title: 'chore: update vanilla block colors'
```

## References

- Minecraft Wiki: https://minecraft.wiki/w/Block_colors
- Script: `scripts/scrapeBlockColors.ts`
- Generated file: `src/constants/vanillaBlockColors.ts`
- Playwright docs: https://playwright.dev/
