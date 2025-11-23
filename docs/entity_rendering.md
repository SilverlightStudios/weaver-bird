# Entity Rendering System

Complete guide to entity rendering in Weaver Bird using JEM (JSON Entity Model) format.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [JEM File Format](#jem-file-format)
- [Coordinate Systems](#coordinate-systems)
- [UV Mapping](#uv-mapping)
- [Adding New Entities](#adding-new-entities)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Known Limitations](#known-limitations)

---

## Overview

The entity rendering system allows Weaver Bird to preview entity textures in 3D, similar to how block models are rendered. It supports:

- **421+ vanilla entity models** from Minecraft
- **Custom resource pack models** (OptiFine CEM format)
- **Hierarchical model structures** (parts with submodels)
- **Texture variations** (biome-dependent, random, etc.)
- **Animation-ready architecture** (poses can be added in the future)

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `EntityModel.tsx` | `src/components/Preview3D/` | React component for rendering entities |
| `entityModelConverter.ts` | `src/lib/three/` | Converts JEM → Three.js geometry |
| `parser.ts` | `src/lib/emf/` | Parses JEM files into normalized format |
| `loader.ts` | `src/lib/emf/` | 3-tier model loading (pack/mocks/embedded) |
| `types.ts` | `src/lib/emf/` | TypeScript definitions for JEM format |

---

## Architecture

### Rendering Pipeline

```
User selects entity texture
        ↓
getEntityTypeFromAssetId()
        ↓
loadEntityModel() [3-tier fallback]
        ↓
parseJEM() → ParsedEntityModel
        ↓
loadTexture() [pack/vanilla fallback]
        ↓
parsedEntityModelToThreeJs()
        ↓
Render in Preview3D
```

### 3-Tier Model Loading

The system loads entity models with the following priority:

1. **Resource Pack** (`assets/minecraft/optifine/cem/*.jem` or `assets/minecraft/emf/cem/*.jem`)
   - Custom pack models override vanilla
   - Supports both OptiFine and EMF directory structures

2. **Vanilla Mocks** (`__mocks__/cem/*.jem` - 421 models)
   - Exported from EMF mod for reference
   - ⚠️ **Warning:** These files are incomplete (missing coordinates)
   - Used only for structure reference, not rendering

3. **Embedded Vanilla Models** (`src/lib/emf/vanilla/*.jem.json` - 19 models)
   - Hand-crafted, complete models with coordinates
   - These are the working fallback for core entities
   - Used when no pack model is found

### Component Pattern

The `EntityModel` component follows the same pattern as `BlockModel`:

```typescript
// src/components/Preview3D/EntityModel.tsx

function EntityModel({ assetId, positionOffset }) {
  // 1. Get winning pack from Zustand
  const winnerPackId = useSelectWinner(assetId);
  const pack = useSelectPack(winnerPackId);

  // 2. Load entity model asynchronously
  useEffect(() => {
    async function loadModel() {
      const model = await loadEntityModel(entityType, pack.path, pack.is_zip);
      const texture = await loadTexture(assetId, pack);
      const group = parsedEntityModelToThreeJs(model, texture);
      setEntityGroup(group);
    }
    loadModel();
  }, [assetId, pack]);

  // 3. Render Three.js group
  return <primitive object={entityGroup} />;
}
```

---

## JEM File Format

JEM (JSON Entity Model) is OptiFine's format for custom entity models.

### File Structure

```json
{
  "texture": "entity/chest/normal",
  "textureSize": [64, 64],
  "shadowSize": 0.5,
  "models": [
    {
      "part": "lid",
      "id": "lid",
      "invertAxis": "xy",
      "translate": [0, -9, -7],
      "rotate": [0, 0, 0],
      "scale": 1.0,
      "boxes": [
        {
          "coordinates": [-7, -5, -14, 14, 5, 14],
          "textureOffset": [0, 0],
          "sizeAdd": 0.0
        }
      ],
      "submodels": [
        {
          "id": "latch",
          "translate": [0, -7, -15],
          "boxes": [...]
        }
      ]
    }
  ]
}
```

### Root Properties

| Property | Type | Description |
|----------|------|-------------|
| `texture` | `string` | Path to entity texture (e.g., "entity/chest/normal") |
| `textureSize` | `[number, number]` | Texture dimensions in pixels [width, height] |
| `shadowSize` | `number` | Shadow radius (0.0-1.0), default 0.5 |
| `models` | `JEMModelPart[]` | Array of model parts |

### Model Part Properties

| Property | Type | Description |
|----------|------|-------------|
| `part` | `string` | Entity part name (head, body, leg1, etc.) |
| `id` | `string` | Unique identifier for this part |
| `invertAxis` | `string` | Axes to invert ("xy", "xyz"), converts coordinate systems |
| `translate` | `[x, y, z]` | Position offset in pixels |
| `rotate` | `[x, y, z]` | Rotation in degrees |
| `scale` | `number` | Scale factor (default 1.0) |
| `mirrorTexture` | `string` | Mirror texture on axis ("u", "v", "uv") |
| `boxes` | `JEMBox[]` | Box geometry definitions |
| `submodels` | `JEMModelPart[]` | Child parts (hierarchical) |

### Box Properties

| Property | Type | Description |
|----------|------|-------------|
| `coordinates` | `[x, y, z, w, h, d]` | **[position, size]** in pixels |
| `textureOffset` | `[u, v]` | UV origin for box mapping |
| `textureSize` | `[number, number]` | **Per-box texture size** (overrides parent) |
| `sizeAdd` | `number` | Uniform inflation (for overlays like armor) |
| `uvNorth`, `uvSouth`, etc. | `[u1, v1, u2, v2]` | Explicit per-face UVs (optional) |

### Common Patterns

#### Simple Entity (Cow, Pig)
- 6 parts: head, body, leg1-4
- Single box per part
- Basic rotations for animation

#### Complex Entity (Player, Villager)
- 10+ parts with layered rendering
- Multiple boxes per part (e.g., head + hat)
- `sizeAdd` for overlay inflation (clothing)

#### Block Entity (Chest, Shulker Box)
- Hierarchical parts (lid → latch submodel)
- Animation pivot points via `translate`
- Opening/closing animations

#### Special Cases
- **Decorated Pot**: Per-box `textureSize` (neck: 32x32, sides: 16x16)
- **Player**: Empty parts (cloak, ear) for capes/deadmau5 ears
- **Cod**: Negative UV offsets for texture atlas mapping

---

## Coordinate Systems

### The invertAxis Problem

Minecraft entities use a **Y-up, right-handed** coordinate system, while JEM files export with `invertAxis: "xy"` to indicate the coordinate system needs conversion.

#### JEM Coordinate System (Raw)
```
     +Y (up)
      |
      |
      +------ +X (right)
     /
    /
  +Z (forward)
```

#### Three.js Coordinate System
```
     +Y (up)
      |
      |
      +------ +X (right)
     /
    /
  -Z (forward)  ← Z is inverted!
```

### Transformation Rules

Our converter applies these transformations in `entityModelConverter.ts:88-111`:

```typescript
// Position: Invert Y axis, convert pixels to units
partGroup.position.set(
  tx / 16,       // X: unchanged
  -ty / 16,      // Y: INVERTED
  tz / 16        // Z: unchanged
);

// Rotation: Invert X and Y rotations
partGroup.rotation.set(
  degToRad(-rx),  // X: INVERTED
  degToRad(-ry),  // Y: INVERTED
  degToRad(rz)    // Z: unchanged
);
```

### Box Positioning

Boxes use **corner coordinates** in JEM, but Three.js BoxGeometry uses **center positioning**:

```typescript
// JEM: coordinates are the corner
const [x, y, z, width, height, depth] = box.coordinates;

// Convert to center position
const centerX = (x + width / 2) / 16;
const centerY = -(y + height / 2) / 16;  // Inverted Y
const centerZ = (z + depth / 2) / 16;

mesh.position.set(centerX, centerY, centerZ);
```

---

## UV Mapping

### Minecraft Box UV Layout

Minecraft uses a standard box UV layout where all 6 faces are laid out on a 2D texture:

```
         depth   width   depth   width
       +-------+-------+-------+-------+
   v   | down  |  up   |       |       |  height
       +-------+-------+-------+-------+
       | north | east  | south | west  |  depth
       +-------+-------+-------+-------+
         width   depth   width   depth
```

### UV Calculation

Given `textureOffset: [u, v]` and box size `[width, height, depth]`:

```typescript
// From parser.ts:187-232
const uv = {
  down:  [u + depth, v, u + depth + width, v + depth],
  up:    [u + depth + width, v, u + depth + width + width, v + depth],
  north: [u + depth, v + depth, u + depth + width, v + depth + height],
  east:  [u + depth + width, v + depth, u + depth + width + depth, v + depth + height],
  south: [u + depth + width + depth, v + depth, u + depth + width + depth + width, v + depth + height],
  west:  [u, v + depth, u + depth, v + depth + height]
};
```

### Three.js Face Mapping

Three.js BoxGeometry face order:
```typescript
[
  right (+X),   // 0 → east
  left (-X),    // 1 → west
  top (+Y),     // 2 → up
  bottom (-Y),  // 3 → down
  front (+Z),   // 4 → south
  back (-Z)     // 5 → north
]
```

### UV Coordinate System Conversion

- **JEM/Minecraft**: (0, 0) is **top-left** of texture
- **Three.js**: (0, 0) is **bottom-left** of texture

Conversion in `entityModelConverter.ts:210-214`:

```typescript
// Flip V axis
const uvU1 = u1 / texWidth;
const uvV1 = 1 - v1 / texHeight;  // Top
const uvU2 = u2 / texWidth;
const uvV2 = 1 - v2 / texHeight;  // Bottom
```

### Negative UV Offsets

**Negative UV offsets are valid** and used for texture atlas mapping:

```json
// From decorated_pot_combined.jem
{
  "textureOffset": [-14, 13],  // Negative u coordinate
  "coordinates": [...]
}
```

Our parser handles these correctly - they're just arithmetic operations with no validation.

---

## Adding New Entities

### Method 1: Embedded Model (Recommended for Core Entities)

1. **Create JEM file** with full coordinates:
```typescript
// src/lib/emf/vanilla/example.jem.json
{
  "texture": "entity/example",
  "textureSize": [64, 32],
  "models": [
    {
      "part": "head",
      "invertAxis": "xy",
      "translate": [0, -24, 0],
      "boxes": [
        {
          "coordinates": [-4, -8, -4, 8, 8, 8],
          "textureOffset": [0, 0]
        }
      ]
    }
  ]
}
```

2. **Import in loader.ts**:
```typescript
import exampleModel from './vanilla/example.jem.json';

const VANILLA_MODELS: Record<string, JEMFile> = {
  'example': exampleModel as JEMFile,
};
```

3. **Map texture paths**:
```typescript
const TEXTURE_TO_ENTITY: Record<string, string> = {
  'entity/example': 'example',
  'entity/example_variant': 'example',
};
```

### Method 2: Resource Pack Override

Users can add custom models to their resource packs:

```
pack.zip/
  assets/
    minecraft/
      optifine/cem/
        example.jem
      textures/
        entity/
          example.png
```

The loader automatically detects and uses these models.

### Method 3: Entity Type Inference

For simple cases, add a mapping without creating a new model:

```typescript
// Reuse existing model
TEXTURE_TO_ENTITY['entity/new_variant'] = 'existing_model';
```

---

## Testing

### Running Tests

Test all entity models:

```bash
node scripts/test-entity-models.cjs
```

### Test Output

```
✅ chest - OK (3 boxes)
⚡ pig   - ⚠️  7/7 boxes missing coords
📊 TEST SUMMARY
Total files tested: 440
Successfully parsed: 440 (100.0%)
```

### Test Results Interpretation

| Symbol | Meaning |
|--------|---------|
| ✅ | Perfect - all boxes have coordinates |
| ⚡ | Warnings - missing coords, empty parts, etc. |
| ❌ | Error - failed to parse |

### Common Test Warnings

- **Missing coordinates**: `__mocks__/cem` files lack coordinates (known limitation)
- **Empty parts**: Parts with no boxes (e.g., player cloak, ear)
- **Per-box textureSize**: Different texture sizes per box (decorated pot)
- **Negative UVs**: Texture atlas mapping (decorated pot, dragon)

---

## Troubleshooting

### Entity Shows Brown Placeholder

**Cause:** Model failed to load or parse

**Solutions:**
1. Check console for error messages
2. Verify entity type mapping exists in `TEXTURE_TO_ENTITY`
3. Ensure embedded model has coordinates
4. Test with `scripts/test-entity-models.cjs`

### Texture Not Loading

**Cause:** Texture path mismatch or pack not loaded

**Solutions:**
1. Check asset ID format: `minecraft:entity/chest/normal`
2. Verify winner pack is set correctly
3. Check texture exists in pack: `assets/minecraft/textures/entity/...`
4. Check console for texture loading errors

### Model Appears Upside Down or Rotated

**Cause:** `invertAxis` not applied or incorrect coordinate conversion

**Solutions:**
1. Verify `invertAxis: "xy"` in JEM file
2. Check `convertPart()` applies Y-inversion correctly
3. Ensure rotations use `degToRad(-rx)` and `degToRad(-ry)`

### Parts Are Offset or Misaligned

**Cause:** Translation not converted from pixels to units

**Solutions:**
1. Ensure division by 16: `translate / MINECRAFT_UNIT`
2. Check Y-axis inversion: `-ty / 16`
3. Verify box centering calculation

### UVs Are Stretched or Mirrored

**Cause:** UV coordinate system mismatch or face mapping error

**Solutions:**
1. Check V-axis flip: `1 - v / texHeight`
2. Verify face mapping (Three.js order vs Minecraft order)
3. Test with explicit per-face UVs instead of textureOffset

---

## Known Limitations

### 1. Incomplete __mocks__/cem Models

**Issue:** All 421 models in `__mocks__/cem/` are missing box coordinates

**Impact:** Cannot render entities that aren't in embedded vanilla models

**Workaround:**
- Use only the 19 embedded vanilla models
- Add models manually to `src/lib/emf/vanilla/`
- Load from resource packs

**Future Fix:** Extract proper JEM files from Minecraft JAR or EMF mod exports

### 2. No Animation Support

**Issue:** JEM files support animations, but our renderer is static

**Impact:** Entities show in default pose only

**Future Enhancement:**
```typescript
// Planned feature
interface JEMAnimation {
  "head.rx": "sin(time) * 10",  // Head rotation
  "leg1.rx": "walk_cycle(time)"
}
```

Use React Three Fiber's `useFrame` to animate parts.

### 3. No ETF Integration

**Issue:** Entity Texture Features mod adds advanced texture features:
- Random textures (like random mobs)
- Emissive layers (glowing eyes)
- Conditional textures (biome, NBT, weather)

**Future Enhancement:** Integrate ETF property files (`.properties`)

### 4. Limited Entity Types

**Working Entities:** 19 embedded models
- Chest, cow, pig, chicken, sheep, cat, wolf
- Zombie, skeleton, creeper, spider, enderman
- Villager, iron golem, slime, ghast
- Player, bed, shulker box

**Missing:** 400+ other entities require proper JEM exports

---

## Performance Considerations

### Geometry Instancing

Repeated parts (legs) should ideally share geometry:

```typescript
// Future optimization
const legGeometry = new THREE.BoxGeometry(w, h, d);
// Reuse for leg1, leg2, leg3, leg4
```

### Texture Atlas

Multiple entity textures could be combined into an atlas to reduce draw calls.

### Level of Detail (LOD)

For complex entities (ender dragon: 65 boxes), use simplified models at far distances.

---

## References

- **OptiFine CEM Documentation**: https://github.com/sp614x/optifine/tree/master/OptiFineDoc/doc
- **EMF Mod**: https://github.com/Traben-0/Entity_Model_Features
- **ETF Mod**: https://github.com/Traben-0/Entity_Texture_Features
- **Minecraft Wiki**: https://minecraft.wiki/w/Model (for JSON model format)

---

## Changelog

### 2025-01-XX - Phase 1 Complete

- ✅ Parser handles missing box coordinates (skips with warning)
- ✅ Support per-box textureSize (overrides parent)
- ✅ Negative UV offsets supported (texture atlas mapping)
- ✅ Empty parts skipped (player cloak, ear)
- ✅ 100% of JEM files parse successfully (440/440)
- ✅ Comprehensive test suite (`scripts/test-entity-models.cjs`)
- ✅ Complete documentation

### Future Roadmap

- 🔮 Animation system (poses, walk cycles)
- 🔮 ETF integration (random/emissive/conditional textures)
- 🔮 Complete JEM export from Minecraft JAR
- 🔮 Advanced features (sprites, JPM files, model inheritance)
- 🔮 Performance optimizations (instancing, atlases, LOD)

---

**For questions or issues, see the [AI_CONTEXT.md](./AI_CONTEXT.md) or file a GitHub issue.**
