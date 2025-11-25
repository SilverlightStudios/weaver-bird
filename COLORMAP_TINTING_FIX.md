# Colormap Tinting System - Fix Summary

## Problem

The colormap tinting system was not correctly tinting grass and foliage blocks. Biome selection had no visible effect on block colors in either MinecraftCSSBlock (2D) or BlockModel (3D) renderers.

## Root Cause

The issue was **incorrect coordinate calculation** in `biomeData.ts`. The code had two separate formulas:

- **Grass**: Direct mapping `(temperature, humidity)`  
- **Foliage**: Inverted mapping `((1-temperature), (1-humidity))`

This was based on a misunderstanding of how Minecraft colormaps work.

## The Truth About Minecraft Colormaps

According to [Minecraft Wiki - Block Colors](https://minecraft.wiki/w/Block_colors):

1. **Both grass.png and foliage.png use the SAME coordinate system**
2. Coordinates are calculated as:
   - `x = (1 - temperature) × 255` → hot biomes LEFT (x=0), cold biomes RIGHT (x=255)
   - `y = (1 - humidity) × 255` → wet biomes TOP (y=0), dry biomes BOTTOM (y=255)
   - Where `humidity = rainfall × temperature` (clamped 0-1)
3. The difference in colors comes from **the pixel colors in each image**, not different coordinate calculations

## The Fix

### Files Changed

1. **`src/components/BiomeColorPicker/biomeData.ts`**
   - Replaced separate `getGrassColormapCoords()` and `getFoliageColormapCoords()` with single `getColormapCoords()`
   - Updated documentation to clarify both colormaps use same coordinate system
   - Simplified `getBiomeCoords()` and `getBiomesWithCoords()` to use unified formula

2. **`src/app/BiomeColorCard/index.tsx`**
   - Removed type parameter from `getBiomesWithCoords()` call

3. **`src/components/BiomeColorPicker/index.tsx`**
   - Removed type parameter from `getBiomesWithCoords()` call

4. **`src/lib/colormapManager.ts`**
   - Simplified `coordinatesToBiome()` and `biomeToCoordinates()` to use single formula

### How It Works Now

1. **App opens** → Plains biome coordinates (51, 173) calculated
2. **User clicks biome or colormap** → coordinates stored in global `colormapCoordinates` state
3. **Coordinates update** → triggers effect in `main.tsx` that:
   - Samples grass colormap at those coordinates → grass color
   - Samples foliage colormap at **same** coordinates → foliage color
   - Updates `selectedGrassColor` and `selectedFoliageColor` in global state
4. **Components auto re-render**:
   - `MinecraftCSSBlock` subscribes to colors → applies tint via CSS
   - `BlockModel` (3D) receives colors via props → applies tint to materials

## Biome & Block Color Data Generation

### The Problem

The original `biomeData.ts` used **hardcoded temperature/rainfall values** that didn't exactly match Minecraft's coordinates:

- **Plains** (wiki): `(50, 173)`
- **Plains** (calculated): `(51, 173)` ← off by 1!

### The Solution: Wiki Scraping

Created a **unified scraper** that fetches from Minecraft Wiki once and generates two files:

```bash
npm run generate:colors
```

**Outputs:**
1. `src/constants/vanillaBlockColors.ts` - Which blocks use which colormap
2. `src/constants/biomeCoordinates.ts` - Exact (x, y) coordinates per biome

**Benefits:**
- ✅ **Single source of truth** - Minecraft Wiki
- ✅ **Exact coordinates** - No rounding errors from formulas
- ✅ **Auto-updates** - Run after Minecraft updates
- ✅ **Fast** - Single page fetch (~2-3 seconds)
- ✅ **Type-safe** - TypeScript constants with helper functions

### Usage Examples

```typescript
// Check block tinting
import { getBlockTintType } from '@/constants/vanillaBlockColors';
const tint = getBlockTintType('minecraft:oak_leaves'); // "foliage"

// Get biome coordinates  
import { getBiomeCoords } from '@/constants/biomeCoordinates';
const plains = getBiomeCoords('plains');
console.log(plains.grassCoords); // { x: 50, y: 173 }
```

### Integration Status

- ✅ Script created: `scripts/scrapeMinecraftColors.ts`
- ✅ Package.json updated with `generate:colors` command
- ⏳ TODO: Update `biomeData.ts` to import from generated constants
- ⏳ TODO: Remove hardcoded temperature/rainfall calculations

## Technical Details

### Coordinate System

Both colormaps use the Minecraft standard:

```
(0,0)           (255,0)
  ┌─────────────┐
  │ Hot & Wet   │ Cold & Wet
  │             │
  │             │
  │ Hot & Dry   │ Cold & Dry
  └─────────────┘
(0,255)       (255,255)
```

### Colormap Sampling Flow

```
User clicks biome "Plains"
  ↓
BiomeColorCard.handleBiomeSelect()
  ↓
setColormapCoordinates({ x: 50, y: 173 })
  ↓
main.tsx useEffect (listens to colormapCoordinates)
  ↓
colormapSamplerWorker.sampleSingle(grassUrl, foliageUrl, 50, 173)
  ↓
Worker samples both images at (50, 173)
  ↓
Returns { grassColor: RGB, foliageColor: RGB }
  ↓
Updates global state
  ↓
All subscribed components re-render with new colors
```

### Component Subscriptions

**MinecraftCSSBlock:**
- Only subscribes to colors if block uses tinting (performance optimization)
- Checks `getBlockTintType()` to determine grass vs foliage
- Applies tint via CSS `filter: brightness()` or canvas tinting

**BlockModel (3D):**
- Receives `biomeColor` as prop
- Applies as THREE.Color to material
- Multiplies texture color by tint color in shader

## Verification

To verify the fix works:

1. Open the app
2. Navigate to "BIOME & COLORMAPS" tab
3. Click different biomes on the grass colormap
4. Grass blocks should immediately change color
5. Click different biomes on the foliage colormap
6. Leaf blocks should immediately change color
7. 3D preview should also update when viewing tintable blocks

## References

- [Minecraft Wiki - Block Colors](https://minecraft.wiki/w/Block_colors)
- [Fabric Yarn - BlockColors.java](https://github.com/FabricMC/yarn)
- Original issue analysis in this conversation
