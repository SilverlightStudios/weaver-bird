# Resource Pack Reference Guide

This directory contains sample resource packs for development and testing. The **Stay True** pack is particularly useful as a reference for understanding Minecraft resource pack structure.

## Purpose

When implementing features for Weaverbird, **always explore the actual resource pack data first** before writing code. This ensures solutions are:

1. **Data-driven** - Based on actual file structures, not hardcoded assumptions
2. **Universal** - Works across Minecraft versions and different resource packs
3. **Future-proof** - Continues to work as new blocks/items are added

## Key Principle: Avoid String-Specific Solutions

**BAD** - Hardcoding specific block names:
```typescript
const POTTABLE_PLANTS = ["sapling", "dandelion", "poppy", ...];

function canBePotted(assetId: string): boolean {
  return POTTABLE_PLANTS.some(plant => assetId.includes(plant));
}
```

**GOOD** - Using data-driven approaches:
```typescript
// Check if a potted version exists in loaded assets
function canBePotted(assetId: string, allAssets: string[]): boolean {
  const pottedVersion = getPottedAssetId(assetId);
  return allAssets.includes(pottedVersion);
}
```

## Stay True Pack Structure

```
Stay True/
├── assets/
│   └── minecraft/
│       ├── blockstates/     # Block state definitions
│       ├── models/
│       │   └── block/       # Block model definitions
│       └── textures/
│           └── block/       # Block textures
```

## Exploring Resource Pack Data

### Blockstates

Blockstates define which model(s) to use based on block properties.

**Location:** `assets/minecraft/blockstates/*.json`

**Simple block** (single variant):
```json
// allium.json
{
  "variants": {
    "": { "model": "minecraft:block/allium" }
  }
}
```

**Block with properties** (multiple variants):
```json
// dark_oak_trapdoor.json
{
  "variants": {
    "facing=east,half=bottom,open=false": { "model": "..." },
    "facing=east,half=bottom,open=true": { "model": "...", "y": 90 },
    // ... more variants
  }
}
```

**Randomized variants** (weighted selection):
```json
// birch_planks.json
{
  "variants": {
    "": [
      { "model": "minecraft:block/birch_planks", "weight": 5 },
      { "model": "minecraft:block/birch_planks_01", "weight": 1 },
      { "model": "minecraft:block/birch_planks_02", "weight": 1 }
    ]
  }
}
```

### Models

Models define geometry and texture references.

**Location:** `assets/minecraft/models/block/*.json`

**Standard block** (inherits from parent):
```json
// birch_planks.json
{
  "parent": "minecraft:block/cube_all",
  "textures": {
    "all": "minecraft:block/birch_planks"
  }
}
```

**Potted plant** (uses flower_pot_cross parent):
```json
// potted_dandelion.json
{
  "parent": "minecraft:block/flower_pot_cross",
  "textures": {
    "plant": "minecraft:block/dandelion2"
  }
}
```

**Custom geometry** (defines elements):
```json
{
  "parent": "minecraft:block/block",
  "textures": { ... },
  "elements": [
    {
      "from": [0, 0, 0],
      "to": [16, 16, 16],
      "faces": {
        "north": { "texture": "#north", "uv": [0, 0, 16, 16] },
        // ... other faces
      }
    }
  ]
}
```

### Textures

**Location:** `assets/minecraft/textures/block/*.png`

Textures are referenced in models using the format:
- `minecraft:block/texture_name` → `textures/block/texture_name.png`

### UV Mapping

UV coordinates define which part of a texture to use on each face:
- `"uv": [u1, v1, u2, v2]` - coordinates from 0-16
- Origin (0,0) is top-left of texture
- Default is full texture: `[0, 0, 16, 16]`

## Common Patterns to Recognize

### Multi-Block Structures

Detected by block state properties, not hardcoded names:

- **Doors**: Have `half: "upper"/"lower"` property
- **Beds**: Have `part: "head"/"foot"` property
- **Tall plants**: Have `half: "upper"/"lower"` property

### Potted Plants

Identified by:
- Model parent: `minecraft:block/flower_pot_cross` (or similar)
- Asset ID pattern: `potted_*` or `*_potted`

### Numbered Variants

Texture packs often add numbered variants:
- `birch_planks.png`, `birch_planks_01.png`, `birch_planks_02.png`

### Block State Properties

Common properties found in blockstates:
- `facing`: north/south/east/west
- `half`: upper/lower/top/bottom
- `open`: true/false
- `powered`: true/false
- `lit`: true/false
- `age`: 0-7 (crops)
- `level`: 0-15 (water/lava)

## How to Explore

### Find all blockstates for a block type:
```bash
ls "Stay True/assets/minecraft/blockstates/" | grep -i door
```

### View a blockstate file:
```bash
cat "Stay True/assets/minecraft/blockstates/dark_oak_trapdoor.json"
```

### Find models with specific parent:
```bash
grep -r "flower_pot" "Stay True/assets/minecraft/models/block/"
```

### Find all potted plant models:
```bash
ls "Stay True/assets/minecraft/models/block/" | grep potted
```

### Check texture references in a model:
```bash
cat "Stay True/assets/minecraft/models/block/potted_dandelion.json"
```

## Implementation Checklist

Before implementing a feature:

1. [ ] Explore relevant files in Stay True pack
2. [ ] Identify patterns in the data structure
3. [ ] Check if info can be derived from existing data (blockstates, models, loaded assets)
4. [ ] Avoid hardcoding specific block/item names
5. [ ] Test with multiple resource packs if possible
6. [ ] Consider how the solution handles future Minecraft updates

## Examples from Codebase

### Detecting pottable plants (data-driven)
Instead of hardcoding plant names, check if a potted version exists:
```typescript
const canBePotted = assetId && !isPlantPotted
  ? allAssetIds.some(id => id === getPottedAssetId(assetId))
  : false;
```

### Grouping variants
Use `getVariantGroupKey()` which strips prefixes/suffixes based on patterns:
- Numbered variants: `acacia_planks_01` → `acacia_planks`
- Potted variants: `potted_oak_sapling` → `oak_sapling`
- Structural parts: `door_top` → `door`

### Multi-block detection
Check blockstate properties rather than asset names:
```typescript
function getMultiBlockParts(assetId: string, blockProps: Record<string, string>) {
  // Check for half/part properties in blockProps
  const halfProp = blockProps.half || blockProps.double_block_half;
  // ... logic based on actual properties
}
```
