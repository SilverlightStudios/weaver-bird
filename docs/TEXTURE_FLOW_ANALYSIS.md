# Texture, Blockstate & MCMETA Flow Analysis

This document identifies areas in the texture extraction, blockstate resolution, and mcmeta flow where hardcoded values could be replaced with more data-driven approaches, and where code could be made more DRY and maintainable.

## Table of Contents

1. [Fixed Issues](#fixed-issues)
2. [High Priority Improvements](#high-priority-improvements)
3. [Medium Priority Improvements](#medium-priority-improvements)
4. [Low Priority / Future Considerations](#low-priority--future-considerations)

---

## Fixed Issues

### 1. Duplicated Animated Texture Setup (`src/lib/three/textureLoader.ts`)

**Status: FIXED**

The animated texture setup logic was duplicated between `loadPackTexture()` and `loadVanillaTexture()`. Both functions had ~40 lines of identical code for:
- Checking if texture is animated (height > width && height % width === 0)
- Setting UV repeat/offset
- Loading .mcmeta metadata
- Building animation timeline
- Registering in `animatedTextures` Map

**Solution Applied:** Extracted shared helper `setupAnimatedTexture()` that both functions now call.

---

## High Priority Improvements

### 2. Massive `getBaseName()` Function (`src/lib/assetUtils.ts:782-1219`)

**Problem:** The `getBaseName()` function is 437 lines of hardcoded pattern matching and special cases. It contains:
- ~60 explicit block name mappings (e.g., `"blackstonebutton" -> "polished_blackstone_button"`)
- ~40 `startsWith` checks for texture prefix patterns
- Mixed approaches: some pattern-based, some hardcoded

**Examples of hardcoded cases that could be data-driven:**
```typescript
// Line 852-854: Hardcoded abbreviation mapping
if (name === "blackstonebutton") {
  return "polished_blackstone_button";
}

// Line 996-998: Hardcoded name transformation
if (name === "magma") {
  return "magma_block";
}

// Line 1001-1004: Hardcoded synonym mapping
if (name === "grass") {
  return "short_grass";
}
```

**Recommended Approach:**
1. Create a `textureToBlockMappings.json` or TypeScript constant file with:
   - Direct name mappings (abbreviations, synonyms, renames)
   - Prefix-based patterns with target blockstates
   - Suffix removal rules

2. Refactor `getBaseName()` to:
   - First check direct mappings
   - Then apply prefix/suffix pattern rules
   - Fall back to general suffix stripping

**Example data structure:**
```typescript
const TEXTURE_NAME_MAPPINGS = {
  // Direct mappings (abbreviations, old names, pack-specific names)
  directMappings: {
    "blackstonebutton": "polished_blackstone_button",
    "magma": "magma_block",
    "grass": "short_grass",
    "tripbase": "tripwire_hook",
    "warped_block": "warped_wart_block",
    "sandstonetrim": "chiseled_sandstone",
    "diamond_ore_new": "diamond_ore",
    // ... etc
  },

  // Prefix patterns -> base blockstate
  prefixPatterns: [
    { prefix: "pitcher_crop", target: "pitcher_crop" },
    { prefix: "turtle_egg", target: "turtle_egg" },
    { prefix: "sniffer_egg", target: "sniffer_egg" },
    { prefix: "trial_spawner", target: "trial_spawner" },
    { prefix: "sculk_catalyst", target: "sculk_catalyst" },
    // ... etc
  ],

  // Suffix removal patterns (applied in order)
  suffixPatterns: [
    /_stage_?\d+.*$/,  // Crop stages
    /_age_?\d+$/,      // Age properties
    /_top|_bottom|_side|_front|_back$/,  // Face suffixes
    /_on|_off|_lit|_open|_closed$/,  // State suffixes
    /\d+$/,            // Trailing numbers
  ]
};
```

**Benefits:**
- Easier to maintain and extend
- Self-documenting (mappings are explicit)
- Could be auto-generated from block registry data
- Testable in isolation

---

### 3. Hardcoded Transparent Blocks List (`src/components/Preview3D/index.tsx:162-197`)

**Problem:** A hardcoded list of ~35 "transparent" blocks is used to determine shadow casting.

```typescript
const transparentBlocks = [
  'redstone_wire',
  'redstone_dust',
  'glass',
  'tinted_glass',
  'white_stained_glass',
  // ... 16 stained glass colors listed individually
  'glass_pane',
  // ... 16 stained glass panes listed individually
  'tripwire',
  'string',
  'scaffolding',
  'ladder',
  'vine',
  'glow_lichen',
  'sculk_vein',
];
```

**Issues:**
- Glass colors are listed individually instead of using pattern matching
- Missing many transparent blocks (ice, leaves when fancy graphics disabled, barriers, etc.)
- This data could be derived from block properties

**Recommended Approach:**
1. Create a `blockRenderProperties.ts` constants file with blocks categorized by render behavior
2. Use pattern matching for color variants
3. Ideally, derive from block registry data (renderType: "cutout", "translucent")

**Example:**
```typescript
// Pattern-based approach
const isTransparentBlock = (blockId: string): boolean => {
  const name = blockId.replace(/^minecraft:(block\/)?/, '').toLowerCase();

  // Pattern matches
  if (name.includes('glass')) return true;
  if (name.includes('_pane')) return true;
  if (name.endsWith('_wire')) return true;

  // Explicit transparent blocks
  const explicitTransparent = new Set([
    'tripwire', 'string', 'scaffolding', 'ladder',
    'vine', 'glow_lichen', 'sculk_vein', 'ice',
    'frosted_ice', 'barrier', 'light', 'structure_void'
  ]);

  return explicitTransparent.has(name);
};
```

---

### 4. Overlapping Asset ID Normalization Functions (`src/lib/assetUtils.ts`)

**Problem:** Multiple functions with overlapping responsibilities:
- `normalizeAssetId()` - removes trailing underscores, underscores before numbers
- `getBaseName()` - extracts base block name from texture ID
- `getBlockStateIdFromAssetId()` - converts texture to blockstate ID
- `getVariantGroupKey()` - groups variant textures together
- `removeBlockStateSuffixes()` - removes state suffixes

These functions often call each other and have duplicated logic.

**Example of overlap:**
```typescript
// Both functions handle underscore normalization
function normalizeAssetId(assetId: string): string {
  normalized = normalized.replace(/_(\d+)/g, "$1");  // underscore before numbers
  normalized = normalized.replace(/_+$/, "");        // trailing underscores
}

function getBaseName(assetId: string): string {
  // Duplicates much of the same logic
  name = name.replace(/\.png$/, "");  // Also removes extension
  // ... then lots more transformations
}
```

**Recommended Approach:**
1. Define a clear pipeline: Raw ID → Normalized → Base Name → Blockstate ID
2. Each function should have a single responsibility
3. Create a unified `AssetIdParser` class or set of composable functions

**Example structure:**
```typescript
interface ParsedAssetId {
  namespace: string;      // "minecraft"
  category: string;       // "block", "item", "entity"
  path: string;          // "acacia_leaves_bushy1"
  baseName: string;      // "acacia_leaves"
  variant: string | null; // "bushy1"
  blockstateId: string;  // "minecraft:block/acacia_leaves"
}

function parseAssetId(assetId: string): ParsedAssetId {
  // Single parsing pass that extracts all components
}
```

---

## Medium Priority Improvements

### 5. Candle Light Calculation Duplication (`src/constants/blockLightEmission.ts`)

**Note:** This file is marked as auto-generated. Fix should be in the extractor.

**Problem:** The candle light formula is repeated 17 times (once per color):
```typescript
white_candle: {
  type: "candles",
  properties: ["lit", "candles"],
  calculate: (props) => {
    const lit = props.lit === "true";
    const candles = parseInt(props.candles ?? "1", 10);
    return lit ? 3 * candles : 0;
  },
},
// Repeated for orange_candle, magenta_candle, etc.
```

**Recommended Fix (in extractor):**
When generating the file, detect that multiple blocks share the same formula and generate a shared helper:

```typescript
// Generated shared formula
const candleLightFormula = (props: Record<string, string>) => {
  const lit = props.lit === "true";
  const candles = parseInt(props.candles ?? "1", 10);
  return lit ? 3 * candles : 0;
};

// Reference it for all candle colors
export const FORMULA_LIGHT_SOURCES = {
  candle: { type: "candles", properties: ["lit", "candles"], calculate: candleLightFormula },
  white_candle: { type: "candles", properties: ["lit", "candles"], calculate: candleLightFormula },
  // ... etc
};
```

Similarly for candle cakes (17 entries all with `(props) => props.lit === "true" ? 3 : 0`).

---

### 6. Verbose Logging in textureLoader.ts

**Problem:** The texture loader has very verbose logging that clutters the console:
```typescript
console.log(`=== [textureLoader] Loading Pack Texture ===`);
console.log(`[textureLoader] Texture ID: ${textureId}`);
console.log(`[textureLoader] Pack path: ${packPath}`);
console.log(`[textureLoader] Is ZIP: ${isZip}`);
// ... 10+ more log statements per texture load
```

**Recommendation:**
- Use a configurable log level
- Reduce to single-line logging for normal operation
- Keep verbose logging behind a DEBUG flag

---

### 7. Biome Tint Blocks Hardcoded in Multiple Places

**Problem:** Blocks that need biome tinting (grass, leaves, water) are identified in multiple places:
- `modelConverter.ts` - applies tint to materials
- Block model JSON files - via `tintindex` property
- Various other places that check for specific block names

**Current approach relies on:**
1. Model JSON having `tintindex` property (correct approach)
2. Additional hardcoded checks for specific block names (redundant)

**Recommendation:**
Trust the `tintindex` property from model JSON exclusively. Remove hardcoded block name checks and let the data-driven model definition control tinting.

---

## Low Priority / Future Considerations

### 8. Wall Variant Handling Pattern

**Status: Partially addressed**

The code handles wall variants (wall_torch → torch) through pattern matching:
```typescript
if (name.startsWith("wall_")) {
  name = name.replace(/^wall_/, "");
} else if (name.includes("_wall_")) {
  name = name.replace(/_wall_/, "_");
}
```

This is a good pattern-based approach. However, it's mixed with many hardcoded special cases in the same function. Consider separating pattern-based rules from special case mappings.

---

### 9. Entity Model Fallback

**Status: Documented placeholder**

When a block has no model elements (block entities like decorated pots), the code falls back to an orange placeholder cube. This is documented in `modelConverter.ts:76-93` with a clear TODO and implementation notes.

This is not a code quality issue but a feature gap that's properly documented.

---

### 10. Fuzzy Blockstate Matching in Rust

**Location:** `src-tauri/src/util/blockstates.rs:86+`

The `find_blockstate_file()` function uses fuzzy matching (removing underscores) to find blockstate files. This is a good approach for handling pack-specific naming variations, but could potentially be enhanced to:
- Cache the mapping after first scan
- Support more sophisticated fuzzy matching for abbreviations

---

## Summary

| Priority | Issue | Location | Type |
|----------|-------|----------|------|
| ✅ Fixed | Animated texture setup duplication | textureLoader.ts | Code duplication |
| High | Massive getBaseName() function | assetUtils.ts:782-1219 | Hardcoded mappings |
| High | Hardcoded transparent blocks | Preview3D/index.tsx:162-197 | Hardcoded list |
| High | Overlapping normalization functions | assetUtils.ts | Architecture |
| Medium | Candle light formula duplication | blockLightEmission.ts | Extractor issue |
| Medium | Verbose logging | textureLoader.ts | Code quality |
| Medium | Biome tint hardcoding | Multiple files | Redundant logic |
| Low | Pattern vs hardcoded mixing | assetUtils.ts | Organization |

## Next Steps

1. **Immediate:** The `getBaseName()` refactoring is the highest impact change - it would significantly improve maintainability and make adding new block mappings trivial.

2. **Short-term:** Consolidate the asset ID normalization functions into a clear pipeline with single-responsibility functions.

3. **Medium-term:** Create a block render properties system that can be auto-generated or derived from Minecraft's block registry data.

4. **Long-term:** Consider extracting more of this logic to the Rust backend where it can benefit from compile-time checking and better performance for batch operations.
