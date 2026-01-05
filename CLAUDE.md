# Weaverbird Development Guidelines

## ⚠️ CRITICAL: Never Manually Edit Generated Code

**This is the most important principle in Weaverbird development.**

### The Iron Rule

**NEVER manually add, modify, or "fix" any generated data files.** This includes:
- Particle physics cache files (`/Library/Caches/weaverbird/particle_physics/*.json`)
- Block emission cache files (`/Library/Caches/weaverbird/block_emissions/*.json`)
- Generated TypeScript constants (`/src/constants/particles/generated.ts`)
- Generated TypeScript constants (`/src/constants/blockParticleEmissions.ts`)
- Generated TypeScript constants (`/src/constants/particlePhysics.ts`)
- Any other file marked with `Auto-generated` or `Do not edit manually` headers

### Why This Matters

1. **Version Compatibility**: When Minecraft updates (e.g., 1.21.4 → 1.21.5), our extractors regenerate all data from the new JAR. Manual edits are immediately lost.

2. **Modded Minecraft Support**: Different Minecraft versions and mod loaders (Fabric, Forge, Quilt) have different particle behaviors. Manual fixes only work for one specific version.

3. **Maintainability**: Manual edits create hidden dependencies that aren't documented in code. When bugs appear, we can't tell if they're from extraction logic or manual patches.

4. **Trust in Data**: Weaverbird's value proposition is **100% accurate Minecraft rendering**. Manual edits break this guarantee and introduce subtle bugs that don't match vanilla behavior.

5. **Future Blocks/Features**: Minecraft constantly adds new blocks, particles, and mechanics. Manual fixes don't apply to future content, causing breakage on updates.

### The Correct Approach

**If generated data is incorrect:**

1. ✅ **Fix the extractor** - Enhance the Rust extractor to properly parse the pattern from Minecraft's source code
2. ✅ **Regenerate everything** - Delete caches and regenerate all data with the improved extractor
3. ✅ **Test across versions** - Verify the fix works for multiple Minecraft versions
4. ✅ **Document the pattern** - Add comments explaining what Minecraft pattern is being detected

**Never:**
- ❌ Edit JSON cache files directly
- ❌ Add hardcoded values in TypeScript
- ❌ Create manual "override" files
- ❌ Patch generated data as a "temporary fix"

### Example: The Lava Particle Lesson

**Problem**: Lava particles weren't shooting upward like in Minecraft.

**Wrong approach** ❌:
```bash
# Manually edit the physics cache
python3 -c "
import json
with open('particle_physics.json', 'r+') as f:
    data = json.load(f)
    data['lava']['velocity_add'] = [0, 0.25, 0]  # Manual fix!
    json.dump(data, f)
"
```

**Correct approach** ✅:
```rust
// In particle_physics_extractor.rs - detect velocity override pattern:
// Pattern: this.yd = this.random.nextFloat() * 0.4f + 0.05f
let direct_random_pat = format!(
    r"this\.{}\s*=\s*(?:this\.random\.|\$+\d+\.)next(?:Float|Double)\(\)\s*\*\s*([-+]?[\d.]+).*\+\s*([-+]?[\d.]+)",
    regex::escape(field)
);
// Extract midpoint and range, set velocity_add and velocity_jitter
```

### When You're Tempted to Manual Edit

Ask yourself:
1. **Will this work when Minecraft updates?** (If no → fix the extractor)
2. **Will this work for modded Minecraft?** (If no → fix the extractor)
3. **Will this handle new blocks/particles?** (If no → fix the extractor)

If the answer to any question is "no", the extractor needs enhancement, not the data.

### Validation

Before committing code, verify:
```bash
# Delete all caches
rm -rf ~/Library/Caches/weaverbird/{particle_physics,block_emissions}/*

# Regenerate everything from scratch
cargo run --bin extract_particle_physics
cargo run --bin extract_block_emissions
npm run generate:particles

# Test the results
npm run vite-build
```

If tests fail after regeneration, the extractor needs fixes, not the data.

---

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

---

## ⚠️ CRITICAL: Always Parse Obfuscated Code

**Rust extractors must parse obfuscated Minecraft bytecode, not deobfuscated source.**

### The Core Principle

**ALWAYS parse obfuscated code.** Only deobfuscate manually when you need to understand what pattern to look for.

### Why This Matters

1. **Performance**: Deobfuscating on the fly is **extremely expensive**
   - CFR decompilation: ~30-60 seconds per JAR
   - Applying Mojang mappings: Additional processing overhead
   - Our extractors run on every Minecraft version - this cost multiplies

2. **Simplicity**: Obfuscated code is what CFR outputs by default
   - No need to download Mojang mappings
   - No need to pass mapping files to CFR
   - Faster, simpler extraction pipeline

3. **Reliability**: Field mappings provide the translation layer
   - We already parse field mappings from Mojang's official data
   - Extractors use `field_mappings.yd` → `"r"` to build patterns
   - One mapping file works for all extractors

### The Workflow

**✅ Correct approach:**

1. **Manually deobfuscate** a reference copy to understand the code:
   ```bash
   # One-time: understand what LavaParticle does
   java -jar cfr.jar --obfmappingfile mappings.txt LavaParticle.class
   # See: this.yd = this.random.nextFloat() * 0.4f + 0.05f
   ```

2. **Write patterns** that work with obfuscated code:
   ```rust
   // Extractor parses: this.r = this.y.i() * 0.4f + 0.05f
   // Where: r = yd (velocity), y = random, i() = nextFloat()
   let field = field_mappings.yd.unwrap(); // "r"
   let pattern = format!(
       r"this\.{}\s*=\s*this\.\w+\.\w+\(\)\s*\*\s*{}",
       regex::escape(field)  // Uses "r", not "yd"
   );
   ```

3. **Extractor runs fast** on obfuscated CFR output (no mappings needed)

**❌ Wrong approach:**

```rust
// DON'T: Try to deobfuscate during extraction
let deobfuscated = apply_mappings(&source, &mojang_mappings); // EXPENSIVE!
let pattern = r"this\.yd\s*="; // Won't work on obfuscated code
```

### Obfuscated vs Deobfuscated Examples

**Deobfuscated** (for human understanding):
```java
class LavaParticle extends SingleQuadParticle {
    LavaParticle(ClientLevel level, double x, double y, double z) {
        this.gravity = 0.75f;
        this.friction = 0.999f;
        this.xd *= 0.8f;  // X velocity
        this.yd *= 0.8f;  // Y velocity
        this.yd = this.random.nextFloat() * 0.4f + 0.05f;
    }
}
```

**Obfuscated** (what extractors actually parse):
```java
class gab extends gcz {
    gab(gcm $$0, double $$1, double $$2, double $$3) {
        this.B = 0.75f;     // gravity
        this.C = 0.999f;    // friction
        this.q *= 0.8f;     // xd
        this.r *= 0.8f;     // yd
        this.r = this.y.i() * 0.4f + 0.05f;  // yd = random.nextFloat()
    }
}
```

### Field Mappings Bridge the Gap

Our extractors use Mojang's official field mappings:
```rust
// From Mojang mappings file:
field_mappings.xd = Some("q");
field_mappings.yd = Some("r");
field_mappings.zd = Some("s");
field_mappings.gravity = Some("B");
field_mappings.friction = Some("C");

// Build patterns using obfuscated names:
let gravity_pattern = format!(r"this\.{}\s*=\s*([\d.]+)",
    regex::escape(field_mappings.gravity.unwrap())); // "this.B = ..."
```

### When You Need to Understand Minecraft Code

**For reference/debugging only:**
1. Deobfuscate a single class manually
2. Read the human-friendly code
3. Identify the pattern you need to detect
4. Write obfuscated-compatible regex using field mappings
5. Test against obfuscated CFR output

**Never:**
- ❌ Deobfuscate during extraction runs
- ❌ Write patterns that expect deobfuscated field names
- ❌ Apply mappings in the extraction pipeline

### Real Example: Velocity Override Detection

```rust
// GOOD: Parse obfuscated code with field mappings
let field = field_mappings.yd.as_ref().unwrap(); // "r"
let direct_random_pat = format!(
    r"this\.{}\s*=\s*this\.\w+\.\w+\(\)\s*\*\s*([\d.]+).*\+\s*([\d.]+)",
    regex::escape(field)
);
// Matches: this.r = this.y.i() * 0.4f + 0.05f

// BAD: Expect deobfuscated names
let pattern = r"this\.yd\s*=\s*this\.random\.nextFloat\(\)"; // Won't match!
```

### Key Patterns in Obfuscated Code

- **Random source**: `this.y` (not `this.random`)
- **nextFloat()**: `i()` (or other single-letter methods)
- **Velocity fields**: `this.q`, `this.r`, `this.s` (not `this.xd/yd/zd`)
- **Constructor params**: `$$0`, `$$1`, `$$2` (CFR naming)

**Use `\w+` to match obfuscated names**, then rely on field mappings for semantic meaning.

---

## Decompiling Minecraft JAR for Source Code Verification

When implementing particle systems or other Minecraft behaviors, you may need to verify the actual implementation in Minecraft's source code. Here's how to decompile and examine the Minecraft JAR:

### Prerequisites

- **CFR Decompiler**: Located at `/Users/nicholaswillette/Library/Caches/weaverbird/tools/cfr.jar`
  - Auto-downloaded by the particle physics extractor if not present
- **Minecraft JAR**: Located via launcher directories (e.g., ModrinthApp, vanilla launcher, etc.)
- **Mojang Mappings**: Downloaded from Mojang's version manifest

### Step-by-Step Process

#### 1. Locate the Minecraft JAR

Find the JAR for your target version:

```bash
# Search for Minecraft JAR files (replace version as needed)
find ~ -name "1.21.10*.jar" 2>/dev/null | grep -v "/\.m2/"

# Common locations:
# - ModrinthApp: ~/Library/Application Support/ModrinthApp/meta/versions/VERSION/VERSION.jar
# - Vanilla: ~/Library/Application Support/minecraft/versions/VERSION/VERSION.jar
# - Prism: ~/Library/Application Support/PrismLauncher/instances/*/minecraft/versions/VERSION/VERSION.jar
```

**Example result:**
```
/Users/nicholaswillette/Library/Application Support/ModrinthApp/meta/versions/1.21.10-0.18.1/1.21.10-0.18.1.jar
```

#### 2. Get Obfuscated Class Name from Mappings

Minecraft classes are obfuscated. Use the cached mappings to find the obfuscated name:

```bash
# Mappings are downloaded by particle physics extractor
MAPPINGS="/Users/nicholaswillette/Library/Caches/weaverbird/particle_physics/1.21.10-0.18.1-mappings.txt"

# Find class mapping (e.g., TorchBlock)
grep "net.minecraft.world.level.block.TorchBlock" $MAPPINGS

# Output: net.minecraft.world.level.block.TorchBlock -> edy:
# This means TorchBlock is obfuscated to "edy"
```

#### 3. Decompile the Class

Use CFR to decompile the obfuscated class:

```bash
# Set up paths
JAR_PATH="/Users/nicholaswillette/Library/Application Support/ModrinthApp/meta/versions/1.21.10-0.18.1/1.21.10-0.18.1.jar"
CFR_JAR="/Users/nicholaswillette/Library/Caches/weaverbird/tools/cfr.jar"
OUTPUT_DIR="/Users/nicholaswillette/Library/Caches/weaverbird/particle_physics/torch_decompile"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Decompile the class (using obfuscated name "edy")
java -jar "$CFR_JAR" "$JAR_PATH" --outputdir "$OUTPUT_DIR" "net.minecraft.world.level.block.TorchBlock"

# This creates: $OUTPUT_DIR/edy.java
```

#### 4. Read the Decompiled Code

```bash
# Read the decompiled class
cat "$OUTPUT_DIR/edy.java"
```

**Example output:**
```java
public class edy extends dul {
    @Override
    public void a(ejm $$0, drq $$1, ja $$2, bfq $$3) {
        double $$4 = (double)$$2.u() + 0.5;  // x position
        double $$5 = (double)$$2.v() + 0.7;  // y position
        double $$6 = (double)$$2.w() + 0.5;  // z position
        $$1.a(me.ai, $$4, $$5, $$6, 0.0, 0.0, 0.0);  // spawn smoke
        $$1.a(this.c, $$4, $$5, $$6, 0.0, 0.0, 0.0);  // spawn flame
    }
}
```

#### 5. Identify Methods and Fields

Use mappings to identify what methods/fields do:

```bash
# Find ParticleTypes class (me.ai is smoke particle)
grep "net.minecraft.core.particles.ParticleTypes" $MAPPINGS | head -1
# Output: net.minecraft.core.particles.ParticleTypes -> me:

# Read the decompiled ParticleTypes to find field mappings
grep "ai =" "$OUTPUT_DIR/me.java"
# Output: public static final mj ai = me.a("smoke", false);
```

### Common Method Mappings

Based on context and patterns:
- `a(ejm, drq, ja, bfq)` → `animateTick(BlockState, Level, BlockPos, RandomSource)`
- `$$2.u()` → `BlockPos.getX()`
- `$$2.v()` → `BlockPos.getY()`
- `$$2.w()` → `BlockPos.getZ()`
- `$$1.a(particle, x, y, z, vx, vy, vz)` → `Level.addParticle(ParticleOptions, x, y, z, vx, vy, vz)`

### Deobfuscating Method Names

To understand what a method does:
1. Check parameter types (e.g., `ejm` = BlockState, `drq` = Level)
2. Look at what it calls (e.g., `addParticle`, `getX/Y/Z`)
3. Cross-reference with Minecraft wiki or known patterns
4. Check mappings for method signatures:

```bash
# Find method mappings in a class
grep -A 10 "net.minecraft.world.level.block.TorchBlock" $MAPPINGS | grep "animateTick"
```

### Tips

- **Decompile entire JAR** for faster access to multiple classes:
  ```bash
  java -jar "$CFR_JAR" "$JAR_PATH" --outputdir "$OUTPUT_DIR" --silent true
  ```
- **Parent classes**: If behavior isn't in the target class, check parent classes (e.g., `dul` = BaseTorchBlock)
- **Inner classes**: Provider classes like `SmokeParticle$Provider` contain particle initialization logic
- **Cache results**: Decompilation is slow; reuse decompiled files when possible

### Example: Verifying Torch Particle Behavior

From the decompiled TorchBlock, we verified:
- ✅ Spawns from fixed position: `(blockX + 0.5, blockY + 0.7, blockZ + 0.5)`
- ✅ Zero initial velocity: `(0.0, 0.0, 0.0)` for both particles
- ✅ Always spawns exactly 2 particles: 1 smoke (`me.ai`) + 1 flame (`this.c`)
- ✅ No randomization in spawn call - all randomness comes from particle physics

This process helps ensure our implementation matches Minecraft exactly.
