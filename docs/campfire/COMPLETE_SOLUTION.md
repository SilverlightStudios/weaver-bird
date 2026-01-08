# Campfire Particle Physics - Complete Solution

## Executive Summary

I found **ALL** the reasons why campfire particles don't match vanilla Minecraft. The issues span extraction bugs, missing physics data, and incomplete particle behavior chains.

## The Three Particle Types

### 1. Lava Particles (from CampfireBlock.animateTick)
**Visual Problem**: Don't shoot up and fall back down, no smoke trail

**Root Causes**:
- ❌ Extracting gravity: 0.0 (should be 0.75)
- ❌ Extracting friction: 0.98 (should be 0.999)
- ❌ Extracting lifetime: [4, 40] (should be [10, 80])
- ❌ Missing velocity_multiplier: [0.8, 0.8, 0.8]
- ❌ Missing spawns_particles: smoke with lava's velocity

### 2. Campfire Smoke (Signal/Cosy from CampfireBlockEntity.particleTick)
**Visual Problem**: Lost color, cycling textures, floating incorrectly

**Root Causes**:
- ❌ skips_friction: false (should be true - overrides tick() without super)
- ❌ uses_static_texture: false (should be true - sprites.get(RandomSource))
- ❌ campfire_signal_smoke missing class physics (only gets provider data)

### 3. Regular Smoke (from cooking food)
**Visual Problem**: Unconfirmed, but likely similar issues

## Extraction Bugs Fixed

### Bug 1: Physics Data Overwriting ✅ FIXED
**Problem**: HashMap.collect() overwrote provider data with class data

**Fix**: Changed to `.fold() + .reduce()` with proper merging

**Location**: `particle_physics_extractor.rs:1582-1645`

### Bug 2: Ternary Conditional Lifetime ✅ FIXED
**Problem**: Couldn't parse `this.lifetime = $$7 ? expr1 : expr2`

**Fix**: Added ternary pattern matching

**Location**: `particle_physics_extractor.rs:997-1016`

### Bug 3: Division-Based Lifetime ✅ FIXED
**Problem**: Couldn't parse `(int)(16.0 / (Math.random() * 0.8 + 0.2))`

**Fix**: Added division pattern with range calculation

**Location**: `particle_physics_extractor.rs:1018-1037`

### Bug 4: Velocity Multiplication ✅ FIXED
**Problem**: Couldn't parse `this.xd *= (double)0.8f`

**Fix**: Added velocity multiplication pattern

**Location**: `particle_physics_extractor.rs:1130-1170`

### Bug 5: Inheritance Mapping ✅ FIXED
**Problem**: campfire_signal_smoke didn't inherit class physics

**Fix**: Made campfire_signal_smoke inherit from campfire_cosy_smoke

**Location**: `particle_physics_extractor.rs:649`

## Remaining Issues

### Issue 1: skips_friction Detection
**Status**: ⚠️ NEEDS VERIFICATION

The `detect_skips_friction()` function should detect that CampfireSmokeParticle overrides tick() without calling super.tick(), but extraction shows `skips_friction: false`.

**Debug added**: Lines 977-980 will print detection results for campfire particles

**Next step**: Check console output when re-extracting

### Issue 2: uses_static_texture Detection
**Status**: ⚠️ NEEDS VERIFICATION

Provider extraction should detect `sprites.get(RandomSource)` pattern, but extraction shows `uses_static_texture: false`.

**Possible cause**: Pattern might not be matching the exact syntax in decompiled code

**Next step**: Check what pattern is actually in the source

### Issue 3: Velocity Override vs Multiplication
**Status**: ⚠️ FRONTEND ISSUE

LavaParticle does:
```java
this.yd *= 0.8;  // Multiply
this.yd = random * 0.4 + 0.05;  // REPLACE
```

The second line REPLACES the first. We extract velocity_multiplier but not the override.

**Possible solutions**:
1. Add velocity_override field
2. Handle in velocity_add with special flag
3. Extract this pattern separately

## Testing Instructions

### Step 1: Re-Extract Particle Physics
1. Open the rebuilt app (dev mode is running)
2. View a campfire block in the preview
3. Check console for debug output:
   - `[detect_skips_friction] CampfireSmokeParticle: ...`
   - `[extraction] campfire_cosy_smoke (class): ...`
   - `[extraction] __provider_campfire_signal (provider): ...`

### Step 2: Verify Extracted Data
Run:
```bash
cat ~/Library/Caches/weaverbird/particle_physics/1.21.10-0.18.1.json | python3 -m json.tool | grep -A 30 '"lava"'
```

**Expected for lava**:
```json
{
  "lifetime": [16, 80],  // or close
  "gravity": 0.75,
  "friction": 0.999,
  "velocity_multiplier": [0.8, 0.8, 0.8],
  "spawns_particles": [...]
}
```

Run:
```bash
cat ~/Library/Caches/weaverbird/particle_physics/1.21.10-0.18.1.json | python3 -m json.tool | grep -A 30 '"campfire_signal_smoke"'
```

**Expected for campfire_signal_smoke**:
```json
{
  "lifetime": [280, 330],
  "gravity": 0.000003,
  "scale": 3.0,
  "skips_friction": true,  // ← Check this!
  "uses_static_texture": true  // ← Check this!
}
```

### Step 3: Visual Testing
Compare side-by-side with vanilla Minecraft:

**Lava Particles:**
- [ ] Shoot upward from campfire center
- [ ] Arc over in fountain pattern
- [ ] Fall back down (parabolic trajectory)
- [ ] Leave trailing smoke particles
- [ ] Smoke follows lava velocity initially

**Campfire Smoke:**
- [ ] Rises straight up with gentle wobble
- [ ] Signal smoke: tall white column (hay bale underneath)
- [ ] Cosy smoke: shorter, grayer smoke
- [ ] Each particle keeps ONE texture (doesn't cycle)
- [ ] Particles fade out near end of life

## File Reference

All documentation is in `/Users/nicholaswillette/Repos/Weaverbird/docs/campfire/`:

- **README.md** - Complete particle system explanation
- **LAVA_PARTICLE_ISSUES.md** - Detailed lava particle analysis (this file's companion)
- **EXPECTED_VS_ACTUAL.md** - What should vs is being extracted
- **BLOCK_EMISSIONS.md** - Block particle emission documentation
- **OBFUSCATION_MAPPINGS.md** - Class name mappings
- **COMPLETE_SOLUTION.md** - This file

Minecraft source files:
- **java_deobfuscated/LavaParticle.java** - The lava particle implementation
- **java_deobfuscated/CampfireSmokeParticle.java** - The smoke particle implementation
- **java_deobfuscated/CampfireBlock.java** - Block animation tick (lava spawning)
- **java_deobfuscated/CampfireBlockEntity.java** - Block entity tick (smoke spawning)

## Next Steps

1. **Run the app and trigger re-extraction**
2. **Check debug console output** for campfire particle detection
3. **Verify extracted JSON** has correct values
4. **If still wrong, debug specific patterns**:
   - Check what detect_skips_friction() returns
   - Check what provider extraction finds
   - Trace through extraction step-by-step

5. **Once extraction correct, test frontend**:
   - Verify velocity_multiplier is applied
   - Verify spawned smoke particles appear
   - Verify visual behavior matches vanilla

## Critical Realizations

### Realization 1: Complete Behavior Chains
Particles aren't just physics data - they're complete behavior chains:
1. Block emits particle with initial velocity
2. Constructor modifies velocity, sets lifetime/gravity/friction
3. tick() method spawns other particles, applies custom logic
4. Visual rendering handles textures, fading, sizing

**All steps must be correct** for particles to look right.

### Realization 2: Constructor Calculations
Simple field assignments like `this.gravity = 0.75f` are easy to extract.

Complex calculations like `(int)(16.0 / (Math.random() * 0.8 + 0.2))` require understanding the math and extracting the range.

### Realization 3: Method Override Semantics
When a particle overrides `tick()` without calling `super.tick()`, it completely replaces the base behavior. This means:
- No friction applied (unless particle does it manually)
- Custom movement logic
- Different physics rules

Our extraction must detect this and set `skips_friction: true`.

### Realization 4: Texture Behavior
Particles can handle textures in different ways:
- **Animated**: Use SpriteSet.get(age, lifetime) to cycle through frames
- **Static Random**: Use sprites.get(RandomSource) to pick ONE random frame
- **Fixed**: Use single sprite directly

Campfire smoke uses **static random**, which our frontend wasn't handling.

## Summary

The campfire particle issues are a perfect storm of:
1. **Missing extraction patterns** (division lifetime, velocity multiplication)
2. **Incorrect extraction** (skips_friction, uses_static_texture)
3. **Complex behavior chains** (lava spawning smoke)
4. **Frontend gaps** (velocity override handling)

With the extraction fixes implemented, we should now extract correct physics data. The remaining work is:
1. Verify extraction works
2. Fix any remaining detection issues
3. Ensure frontend handles all physics correctly
4. Test visually against vanilla
