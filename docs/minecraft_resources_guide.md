# Minecraft Resource Pack Development Guide

This document provides guidance for developers working on Weaverbird's Minecraft resource pack rendering features. It explains how to research Minecraft's implementation before making changes to blockstate parsing or rendering logic.

## Available Local Resources

### 1. Mock Resource Packs
Location: `__mocks__/resourcepacks/`

We have complete resource packs available for testing and research:
- **Stay True** - A comprehensive community resource pack with many custom models

Example paths:
```
__mocks__/resourcepacks/Stay True/assets/minecraft/models/block/
__mocks__/resourcepacks/Stay True/assets/minecraft/blockstates/
__mocks__/resourcepacks/Stay True/assets/minecraft/textures/block/
```

### 2. Vanilla Texture Cache
Location: `~/Library/Caches/weaverbird/vanilla_textures/`

The vanilla Minecraft assets extracted from the JAR file:
```
~/Library/Caches/weaverbird/vanilla_textures/assets/minecraft/models/block/
~/Library/Caches/weaverbird/vanilla_textures/assets/minecraft/blockstates/
~/Library/Caches/weaverbird/vanilla_textures/assets/minecraft/textures/
```

**Important**: The vanilla cache is the ultimate fallback. If a model references a parent that doesn't exist in a resource pack, it will be in the vanilla cache.

## Research Process Before Making Changes

### Step 1: Identify Example Blocks

Before implementing a feature, identify 3-5 representative blocks that use that feature:

**Example for tintindex:**
- `oak_leaves` - Uses foliage colormap
- `lily_pad` - Uses grass colormap  
- `crimson_planks` - Does NOT use tinting
- `grass_block` - Uses grass colormap
- `birch_leaves` - Has tintindex but uses fixed color

### Step 2: Examine Block Models Locally

Use the Read tool or grep to examine actual block model JSON files:

```bash
# Example: Looking at oak_leaves model
cat "__mocks__/resourcepacks/Stay True/assets/minecraft/models/block/oak_leaves.json"

# Example: Finding all models with tintindex
grep -r "tintindex" "__mocks__/resourcepacks/Stay True/assets/minecraft/models/block/"
```

**Key things to look for in models:**
- `parent` - Parent model inheritance (may need to follow chain)
- `textures` - Texture variable mappings
- `elements` - Cuboid definitions with faces
- `faces[].tintindex` - Whether face should be tinted
- `faces[].uv` - UV coordinates for texture clipping
- `faces[].cullface` - Face culling information
- `faces[].rotation` - Texture rotation

### Step 3: Follow Parent Model Chain

Models often inherit from parents. Follow the chain to find the actual element definitions:

```
oak_leaves.json (parent: "block/leaves_cross")
  → leaves_cross.json (parent: "block/block", has elements with tintindex)
    → block.json (base model)
```

**Important**: If a parent isn't in the resource pack, check the vanilla cache!

### Step 4: Check Online Documentation

Before implementing, verify your understanding with official documentation:

#### Primary Resources:
1. **Minecraft Wiki - Models**: https://minecraft.wiki/w/Model
   - Complete specification of block model JSON format
   - Lists all valid properties and their types

2. **Minecraft Wiki - Block States**: https://minecraft.wiki/w/Block_states
   - How blockstate files select models based on properties

3. **Minecraft Wiki - Resource Pack**: https://minecraft.wiki/w/Resource_pack
   - Overall structure and file organization

4. **Minecraft Wiki - Tutorials/Creating Resource Pack**: https://minecraft.wiki/w/Tutorials/Creating_a_resource_pack
   - Practical examples and common patterns

#### Search Strategy:
```
Query format: "Minecraft [feature] model json 2025"
Examples:
- "Minecraft tintindex model json 2025"
- "Minecraft block model rotation 2025"
- "Minecraft blockstate multipart 2025"
```

**Note**: Include "2025" to get recent documentation that matches current Minecraft versions.

### Step 5: Verify with Multiple Examples

Test your understanding with multiple blocks:
- At least one "simple" example (e.g., planks)
- At least one "complex" example (e.g., leaves with bushy variants)
- At least one "edge case" (e.g., birch leaves with fixed color)

## Common Implementation Patterns

### Pattern 1: Parent Model Resolution

**Problem**: A model references `parent: "block/cube_all"` but we need to find the actual elements.

**Solution**:
1. Check resource pack for parent model
2. If not found, check vanilla cache
3. Recursively resolve until you find a model with `elements`
4. Merge textures from child models into parent

**Code Reference**: `src-tauri/src/util/block_models.rs` - `resolve_block_model()`

### Pattern 2: Texture Variable Resolution

**Problem**: Face has `texture: "#all"` but we need the actual texture path.

**Solution**:
1. Look up `#all` in the model's `textures` object
2. If value is another variable (e.g., `#base`), recursively resolve
3. Continue until you get a texture path (e.g., `minecraft:block/oak_leaves`)

**Code Reference**: `src/components/MinecraftCSSBlock/index.tsx` - `resolveTextureRef()`

### Pattern 3: Data-Driven vs Hardcoded Logic

**Problem**: Should this behavior be read from JSON or hardcoded?

**Decision Matrix**:

| Behavior | Source | Why |
|----------|--------|-----|
| Should face be tinted? | JSON (`tintindex`) | Data-driven - specified per model |
| Which colormap (grass/foliage)? | Hardcoded | Minecraft's Java code has this logic |
| Face culling | JSON (`cullface`) | Data-driven - specified per face |
| UV coordinates | JSON (`uv`) | Data-driven - specified per face |
| Block rotation transforms | JSON (blockstate) | Data-driven - specified in blockstate |

**Rule of Thumb**: If it's in the JSON, it should be data-driven. If Minecraft hardcodes it in Java, we should too.

## Example Research Workflow

### Scenario: Implementing Support for Block Rotation

**1. Identify examples:**
```
furnace - has facing property
stairs - has facing, half, shape properties
logs - has axis property
```

**2. Examine blockstates:**
```bash
cat "__mocks__/resourcepacks/Stay True/assets/minecraft/blockstates/furnace.json"
cat "~/Library/Caches/weaverbird/vanilla_textures/assets/minecraft/blockstates/furnace.json"
```

**3. Look for rotation patterns:**
```json
{
  "variants": {
    "facing=north": { "model": "minecraft:block/furnace" },
    "facing=south": { "model": "minecraft:block/furnace", "y": 180 },
    "facing=east": { "model": "minecraft:block/furnace", "y": 90 },
    "facing=west": { "model": "minecraft:block/furnace", "y": 270 }
  }
}
```

**4. Check documentation:**
- Search: "Minecraft blockstate rotation y property 2025"
- Verify: `y` property rotates model around Y-axis in 90° increments
- Check if there are also `x` and `z` rotation properties

**5. Examine model:**
```bash
cat "~/Library/Caches/weaverbird/vanilla_textures/assets/minecraft/models/block/furnace.json"
```

**6. Implement:**
- Parse `y`, `x`, `z` rotation properties from blockstate
- Apply rotations to block model in rendering code
- Test with furnace, stairs, and logs

## File Naming Conventions

### Block Models
- Location: `assets/[namespace]/models/block/[name].json`
- Naming: Usually matches block ID without namespace
- Example: `minecraft:oak_planks` → `assets/minecraft/models/block/oak_planks.json`

### Block States  
- Location: `assets/[namespace]/blockstates/[name].json`
- Naming: Exactly matches block ID without namespace
- Example: `minecraft:furnace` → `assets/minecraft/blockstates/furnace.json`

### Textures
- Location: `assets/[namespace]/textures/block/[name].png`
- Naming: Referenced in models without file extension
- Example: `minecraft:block/stone` → `assets/minecraft/textures/block/stone.png`

## Common Gotchas

### 1. Parent Models in Vanilla Cache
Many resource packs only override specific models and rely on vanilla parents.

**Example**: A pack has `oak_leaves.json` with `parent: "block/leaves_cross"` but doesn't include `leaves_cross.json` - you must check vanilla cache.

### 2. Texture Variable Indirection
Textures can have multiple levels of indirection:
```json
{
  "textures": {
    "all": "#main",
    "main": "#base", 
    "base": "minecraft:block/stone"
  }
}
```

### 3. Optional vs Required Properties
Not all properties are always present:
- `elements` is optional (inherited from parent)
- `uv` is optional (defaults to element bounds)
- `rotation` is optional (no rotation)
- `tintindex` is optional (no tinting)

Always use optional chaining and provide sensible defaults.

### 4. Blockstate Variants vs Multipart
Two different formats for blockstates:
- **Variants**: Map state properties to models (simpler)
- **Multipart**: Conditionally add model parts (complex, used for fences/walls)

**Example locations**:
- Variants: `blockstates/oak_planks.json`
- Multipart: `blockstates/oak_fence.json`

### 5. Model Coordinates
Minecraft uses a 0-16 coordinate system for model elements:
- `from: [0, 0, 0]` is bottom-south-west corner
- `to: [16, 16, 16]` is top-north-east corner
- Origin for rotation is `[8, 8, 8]` (center) unless specified

## Testing Strategy

### 1. Test with Local Resources First
```bash
# Use Stay True pack for testing
npm run dev
# Load blocks and verify rendering
```

### 2. Test Common Block Categories
- **Simple Cubes**: stone, planks, concrete
- **Partial Blocks**: slabs, stairs, trapdoors
- **Plants**: grass, flowers, saplings
- **Complex Models**: doors, beds, anvils
- **Rotatable**: furnaces, logs, pistons
- **Tinted**: leaves, grass blocks, lily pads

### 3. Test Edge Cases
- Blocks with no elements (should fall back to texture)
- Blocks with complex UV mapping
- Blocks with rotations in elements
- Blocks with missing parent models
- Blocks with circular parent references (should error gracefully)

## Quick Reference Commands

```bash
# Find all blocks with tintindex
grep -r "tintindex" "__mocks__/resourcepacks/Stay True/assets/minecraft/models/"

# Find all blockstates with rotation
grep -r '"y":' "__mocks__/resourcepacks/Stay True/assets/minecraft/blockstates/"

# List all block models in Stay True
ls "__mocks__/resourcepacks/Stay True/assets/minecraft/models/block/"

# Find blocks using specific parent
grep -l '"parent": "block/cube_all"' "__mocks__/resourcepacks/Stay True/assets/minecraft/models/block/"*.json

# Check if model exists in vanilla
test -f ~/Library/Caches/weaverbird/vanilla_textures/assets/minecraft/models/block/cube.json && echo "Found in vanilla"
```

## Resources for Future Reference

### Minecraft Wiki Pages
- Models: https://minecraft.wiki/w/Model
- Block States: https://minecraft.wiki/w/Block_states  
- Resource Pack: https://minecraft.wiki/w/Resource_pack
- Tutorials: https://minecraft.wiki/w/Tutorials/Creating_a_resource_pack
- Block Colors: https://minecraft.wiki/w/Block_colors

### Code References in Weaverbird
- Block model parsing (Rust): `src-tauri/src/util/block_models.rs`
- Block model types (TypeScript): `src/lib/tauri/blockModels.ts`
- CSS rendering: `src/components/MinecraftCSSBlock/index.tsx`
- 3D rendering: `src/components/Preview3D/BlockModel.tsx`
- Colormap sampling: `src/lib/colormapSampler.ts`

## Contributing

When implementing new features:

1. **Research first** using this guide
2. **Document findings** in code comments
3. **Test thoroughly** with multiple blocks
4. **Update this guide** if you discover new patterns or gotchas

Remember: Minecraft's resource pack system is complex and has evolved over many versions. When in doubt, check the actual JSON files in our mock packs and vanilla cache - they are the source of truth.
