# Weaverbird Development Guidelines

## Universal Block Handling Philosophy

Weaverbird is designed as a **universal Minecraft resource pack parser** that works with all current and future blocks by leveraging Minecraft's blockstate system rather than hardcoding specific block behaviors.

### Core Principle: Blockstate Properties Over Block Names

**DO:** Write code that works with blockstate properties (axis, face, facing, powered, etc.)
**DON'T:** Write code that checks for specific block names (oak_log, stone_button, etc.)

#### Why This Matters

Minecraft uses a flexible blockstate system where blocks define their variants and properties in JSON files. By working with these properties generically, our code:

- ✅ Works with all vanilla blocks automatically
- ✅ Works with modded blocks that follow standard conventions
- ✅ Supports future Minecraft versions without code changes
- ✅ Handles custom resource pack blocks correctly

#### Examples

**❌ Bad - Hardcoding specific blocks:**
```typescript
if (name.includes("oak_log") || name.includes("birch_log") || name.includes("spruce_log")) {
  props.axis = "y";
}
```

**✅ Good - Working with properties:**
```typescript
// Any block with an "axis" property defaults to "y"
if (!props.axis) {
  props.axis = "y";
}
```

### When to Use Block Names

Use specific block names **only** when:

1. **No blockstate property exists** - The behavior is truly specific to that block
2. **Special rendering logic** - The block requires unique visual handling (e.g., chests, shulker boxes)
3. **Minecraft-specific quirks** - Edge cases in Minecraft's data format that don't follow patterns

Even in these cases, document why the block name is necessary and consider if there's a more general pattern.

### Practical Guidelines

1. **Check blockstate schemas first** - Use `getBlockStateSchema()` to understand what properties a block supports
2. **Think in properties** - When solving a problem, ask "what property determines this?" not "what blocks need this?"
3. **Test broadly** - Verify solutions work across multiple block types (logs, buttons, rails, etc.)
4. **Future-proof defaults** - Set sensible defaults for common properties (axis=y, face=floor, facing=down)

### Implementation Pattern

```typescript
// 1. Extract/merge properties from multiple sources
const props = extractBlockStateProperties(assetId);
const merged = { ...props, ...userProvided };

// 2. Apply universal defaults based on properties
const withDefaults = applyNaturalBlockStateDefaults(merged);

// 3. Let Rust resolver handle the rest
const resolution = await resolveBlockState(packId, blockId, withDefaults);
```

This approach ensures Weaverbird remains a robust, universal tool that grows with Minecraft rather than requiring constant maintenance.
