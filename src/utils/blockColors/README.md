# BlockColors System

This directory contains utilities for fetching and managing Minecraft's BlockColors registry from Fabric Yarn's GitHub source code. The system automatically retrieves which vanilla blocks support biome-based tinting and which colormaps they use.

## Overview

Minecraft's block tinting is determined by **two factors**:

1. **`tintindex` in model JSON** - Indicates IF a face should be tinted (data-driven)
2. **`BlockColors` registry in Java code** - Specifies WHICH blocks can be tinted (hardcoded in game)

This system solves the second factor by parsing Fabric Yarn's decompiled source code to extract the `BlockColors` registry.

## Architecture

### Files

- **`yarnVersions.ts`** - Maps Minecraft versions to Yarn tags
- **`fetchBlockColors.ts`** - Fetches and parses BlockColors.java from GitHub
- **`index.ts`** - Barrel export for easy importing
- **`README.md`** - This file

### Related Files

- **`src/hooks/useBlockColors.ts`** - React hook for using block colors in components
- **`src/components/DebugBlockColorList.tsx`** - Debug UI for visualizing block colors

## Usage

### Basic Usage

```typescript
import { fetchBlockColors } from "@/utils/blockColors";

// Fetch block colors for a specific Minecraft version
const registry = await fetchBlockColors("1.21.4");

console.log(`Found ${registry.entries.length} tint entries`);

// Check if a specific block supports tinting
for (const entry of registry.entries) {
  if (entry.blocks.includes("minecraft:oak_leaves")) {
    console.log(`Oak leaves uses: ${entry.tint}`); // "foliage"
  }
}
```

### Using the React Hook

```typescript
import { useBlockColors } from "@/hooks/useBlockColors";

function MyComponent() {
  const { loading, error, data } = useBlockColors("1.21.4");

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return null;

  return (
    <div>
      <h2>Block Colors for {data.version}</h2>
      <p>Found {data.entries.length} tint entries</p>
      {data.entries.map((entry, i) => (
        <div key={i}>
          <strong>{entry.tint}:</strong> {entry.blocks.join(", ")}
        </div>
      ))}
    </div>
  );
}
```

### Helper Functions

```typescript
import { getBlockTintType, clearBlockColorsCache } from "@/utils/blockColors";

// Check if a block supports tinting
const tintType = getBlockTintType("minecraft:oak_leaves", registry);
console.log(tintType); // "foliage"

// Clear cache for a specific version
clearBlockColorsCache("1.21.4");

// Clear all caches
clearBlockColorsCache();
```

## Data Types

### BlockColorRegistry

```typescript
interface BlockColorRegistry {
  version: string;        // e.g., "1.21.4"
  yarnTag: string;        // e.g., "1.21.4+build.3"
  fetchedAt: string;      // ISO timestamp
  entries: ParsedTintEntry[];
}
```

### ParsedTintEntry

```typescript
interface ParsedTintEntry {
  blocks: string[];       // e.g., ["minecraft:oak_leaves", "minecraft:jungle_leaves"]
  tint: 
    | "grass"             // Uses grass.png colormap
    | "foliage"           // Uses foliage.png colormap
    | "water"             // Uses water colormap
    | `fixed_${string}`   // Fixed hex color (e.g., "fixed_0x80A755")
    | "special";          // Custom logic (e.g., redstone wire)
}
```

## Tint Types Explained

| Tint Type | Description | Examples |
|-----------|-------------|----------|
| `grass` | Uses `assets/minecraft/textures/colormap/grass.png` | grass_block, tall_grass, fern |
| `foliage` | Uses `assets/minecraft/textures/colormap/foliage.png` | oak_leaves, jungle_leaves, vines |
| `water` | Uses water colormap (varies by biome) | water, flowing_water, cauldron |
| `fixed_0xHEX` | Fixed color tint (not biome-dependent) | stem blocks |
| `special` | Custom tinting logic in code | redstone_wire |

## Caching

The system automatically caches fetched data in `localStorage` with a 7-day expiry:

- **Cache Key Format**: `blockColors:<mcVersion>`
- **Expiry**: 7 days from fetch
- **Automatic**: Cache is checked first on every fetch
- **Manual Control**: Use `clearBlockColorsCache()` to invalidate

### Cache Benefits

- ✅ **Offline support** - Works without internet after first fetch
- ✅ **Performance** - Instant load for cached versions
- ✅ **Reduced API calls** - Respects GitHub's rate limits

## Adding New Versions

To add support for a new Minecraft version:

1. Find the Yarn tag at <https://github.com/FabricMC/yarn/tags>
2. Add to `yarnVersions.ts`:

```typescript
export const yarnVersionMap: Record<string, string> = {
  "1.21.5": "1.21.5+build.1",  // Add new version here
  "1.21.4": "1.21.4+build.3",
  // ...
};
```

3. Optionally update `DEFAULT_MC_VERSION` to the latest stable version

## Debug Component

Use the `DebugBlockColorList` component to visualize block colors:

```typescript
import DebugBlockColorList from "@components/DebugBlockColorList";

function App() {
  return <DebugBlockColorList />;
}
```

Features:

- Version selector dropdown
- Grouped by tint type
- Shows all blocks per entry
- Cache management buttons
- Live refresh

## Integration with Rendering

The block colors registry should be used in conjunction with `tintindex` from model files:

```typescript
// 1. Check if face has tintindex (from model JSON)
const shouldTint = face.tintindex !== undefined && face.tintindex !== null;

// 2. Check if block supports tinting (from BlockColors registry)
const blockId = "minecraft:oak_leaves";
const tintType = getBlockTintType(blockId, registry);

// 3. Apply tint only if BOTH conditions are true
if (shouldTint && tintType) {
  if (tintType === "grass") {
    // Apply grass colormap
  } else if (tintType === "foliage") {
    // Apply foliage colormap
  }
}
```

## Error Handling

The system handles several error cases:

```typescript
try {
  const registry = await fetchBlockColors("1.21.4");
} catch (error) {
  // Possible errors:
  // - Unsupported version (not in yarnVersionMap)
  // - Network failure (GitHub unreachable)
  // - Parsing failure (source format changed)
  // - Cache read/write errors
}
```

### Common Issues

**"Unsupported Minecraft version"**

- The version isn't in `yarnVersionMap`
- Add the version mapping or use a supported version

**"Failed to fetch BlockColors"**

- Network is offline
- GitHub is unavailable
- Yarn tag doesn't exist
- Check if cached data is available as fallback

**"Parsing failed"**

- Yarn source format has changed
- Update regex patterns in `parseBlockColorsSource()`

## Future Enhancements

Possible improvements:

1. **Pre-generated static files** - Ship JSON files instead of parsing at runtime
2. **Multiple format support** - Support other mappings (MCP, Mojmap)
3. **Diff detection** - Detect changes between versions
4. **Validation** - Cross-reference with model files
5. **Export/Import** - Allow manual registry management

## Technical Details

### Why Fabric Yarn?

- **Open Source**: Publicly available on GitHub
- **Accurate**: Official decompiled + remapped code
- **Maintained**: Updated for every Minecraft version
- **Accessible**: Can be fetched via raw.githubusercontent.com

### Parsing Strategy

The parser extracts `register()` calls from `BlockColors.java`:

```java
// Example from source
blockColors.register((state, world, pos, tintIndex) -> 
  world != null && pos != null 
    ? BiomeColors.getGrassColor(world, pos) 
    : GrassColors.getDefaultColor(), 
  Blocks.GRASS_BLOCK
);
```

Extracted:

- **Blocks**: `GRASS_BLOCK` → `minecraft:grass_block`
- **Tint**: `BiomeColors.getGrassColor` → `grass`

### Alternative Paths

The system tries multiple URL patterns:

1. `.mapping` file (newer Yarn versions)
2. `.java` file (older Yarn versions)

This ensures compatibility across Yarn version changes.

## Contributing

When modifying this system:

1. Test with multiple Minecraft versions
2. Verify parsing with actual Yarn source
3. Update type definitions if structure changes
4. Document breaking changes
5. Consider cache invalidation strategy

## References

- Fabric Yarn: <https://github.com/FabricMC/yarn>
- Minecraft Wiki - Colors: <https://minecraft.wiki/w/Color>
- Minecraft Wiki - Block Colors: <https://minecraft.wiki/w/Block_colors>
