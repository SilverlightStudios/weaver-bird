# Campfire Particle System Documentation

This directory contains all source files involved in generating campfire particles in Weaverbird, compared to Minecraft's implementation.

## Directory Structure

### `java_deobfuscated/`
Decompiled Minecraft Java source files (using CFR with Mojang mappings) from version 1.21.10-0.18.1.
These show exactly how Minecraft generates campfire particles.

### `java_obfuscated/`
Original obfuscated Minecraft bytecode (if available).

### `ts/`
TypeScript/Rust files from Weaverbird that attempt to replicate Minecraft's particle behavior.

---

## Minecraft Java Files (Deobfuscated)

### Core Particle Classes

#### `CampfireSmokeParticle.java`
**Location:** `net/minecraft/client/particle/CampfireSmokeParticle.java`

**Purpose:** The actual particle class for campfire smoke.

**Key Details:**
- Extends `SingleQuadParticle`
- Contains two inner provider classes: `SignalProvider` and `CosyProvider`
- **Constructor:** Sets lifetime, gravity, scale, and receives a single `TextureAtlasSprite`
- **tick() method:** Overrides parent tick(), adds velocity jitter, applies gravity, NO FRICTION
- **Lifetime:**
  - Signal smoke: `random.nextInt(50) + 280` ticks (280-329 ticks = 14-16.5 seconds)
  - Cosy smoke: `random.nextInt(50) + 80` ticks (80-129 ticks = 4-6.5 seconds)
- **Gravity:** `3.0E-6f` (very slight upward buoyancy)
- **Scale:** `3.0f`
- **Alpha fade:** Starts fading in last 60 ticks (`alpha -= 0.015f`)

**Critical Implementation Details:**
1. **Static Random Texture:** Providers pass `this.sprites.get(randomSource)` - picks ONE random texture at spawn
2. **No Friction:** `tick()` method doesn't call `super.tick()`, so no friction is applied
3. **Velocity Jitter:** Adds `±(random/5000)` to X and Z velocity each tick

#### `Particle.java`
**Location:** `net/minecraft/client/particle/Particle.java`

**Purpose:** Base particle class.

**Default Physics:**
- Gravity: Applied via `yd -= 0.04 * gravity`
- Friction: `xd *= friction; yd *= friction; zd *= friction` (default 0.98)
- Movement: `move(xd, yd, zd)`

#### `SingleQuadParticle.java`
**Location:** `net/minecraft/client/particle/SingleQuadParticle.java`

**Purpose:** Base class for billboard particles with a single quad.

**Key Methods:**
- `scale(float)` - Multiplies `quadSize` by scale factor
- `setSize(float, float)` - Sets bounding box size
- `getQuadSize(float partialTick)` - Returns current size

#### `SpriteSet.java`
**Location:** `net/minecraft/client/particle/SpriteSet.java`

**Purpose:** Manages particle texture frames.

**Key Methods:**
- `get(RandomSource)` - Returns a **single random sprite** from the set
- `get(int age, int lifetime)` - Returns sprite based on lifetime progression

#### `ParticleProvider.java`
**Location:** `net/minecraft/client/particle/ParticleProvider.java`

**Purpose:** Interface for creating particles.

**Method:**
- `createParticle(type, level, x, y, z, xSpeed, ySpeed, zSpeed, randomSource)`

---

### Block & Emission Files

#### `CampfireBlock.java`
**Location:** `net/minecraft/world/level/block/CampfireBlock.java`

**Purpose:** Campfire block definition.

**Particle Method:**
- `makeParticles(Level, BlockPos, boolean signalFire, boolean spawnExtraSmoke)`
  - Creates particles via `level.addAlwaysVisibleParticle(...)`
  - Spawns either `CAMPFIRE_SIGNAL_SMOKE` or `CAMPFIRE_COSY_SMOKE` based on `signalFire` flag
  - Calls `animateTick()` randomly (~2.3% of ticks for this specific block)

#### `CampfireBlockEntity.java`
**Location:** `net/minecraft/world/level/block/entity/CampfireBlockEntity.java`

**Purpose:** Block entity for campfire logic.

**Particle Method:**
- `particleTick(...)` - Called **every tick** (100% rate) via BlockEntityTicker
  - Probability: `random.nextFloat() < 0.11f` (11%)
  - Count: `random.nextInt(2) + 2` (2-3 particles per successful roll)
  - Also spawns regular SMOKE particles when cooking food

#### `ParticleTypes.java`
**Location:** `net/minecraft/core/particles/ParticleTypes.java`

**Purpose:** Registry of all particle types.

**Campfire Entries:**
```java
public static final SimpleParticleType CAMPFIRE_COSY_SMOKE = register("campfire_cosy_smoke", true);
public static final SimpleParticleType CAMPFIRE_SIGNAL_SMOKE = register("campfire_signal_smoke", true);
```

#### `ParticleEngine.java`
**Location:** `net/minecraft/client/particle/ParticleEngine.java`

**Purpose:** Client-side particle manager.

**Registers providers for particle types during initialization.**

---

## TypeScript/Rust Files (Weaverbird)

### Extraction (Rust)

#### `particle_physics_extractor.rs`
**Purpose:** Extracts particle physics from decompiled Minecraft source.

**What It Should Extract:**
- Lifetime range
- Gravity
- Friction (or lack thereof via `skips_friction`)
- Scale
- Alpha
- Velocity modifiers
- Texture behavior (`uses_static_texture`)

**Current Issues:**
1. ❌ Not detecting `skips_friction` correctly for CampfireSmokeParticle
2. ❌ Provider data being filtered out (missing `uses_static_texture`)
3. ❌ Not extracting calculated lifetime values from constructor

#### `block_particle_extractor.rs`
**Purpose:** Extracts particle emissions from block source code.

**What It Should Extract:**
- Emission source (`animateTick` vs `particleTick`)
- Position/velocity expressions
- Probability expressions
- Count expressions
- Block state conditions

---

### Frontend (TypeScript)

#### `ParticleEngine.ts`
**Purpose:** Three.js particle system that simulates Minecraft physics.

**Current Issues:**
1. ❌ Applying friction to ALL particles (should skip for campfire smoke)
2. ❌ Using hardcoded checks instead of extracted flags
3. ❌ May not be implementing gravity correctly

#### `ParticleEmitter3D.tsx`
**Purpose:** React component that spawns particles based on emission data.

**Current Issues:**
1. ❌ AnimateTick sampling may not be working
2. ❌ Need to verify emissionSource is being passed correctly

#### `BlockParticles.tsx`
**Purpose:** Wrapper that queries block emissions and creates emitters.

**Should:**
- Query extracted emission data
- Create ParticleEmitter3D for each emission
- Pass correct props to emitters

#### `particlePhysics.ts`
**Purpose:** Loads and converts extracted physics data.

**Should:**
- Convert extracted data to usable format
- Handle missing data gracefully
- Not render particles if physics data is incomplete

#### `blockParticleEmissions.ts`
**Purpose:** Loads and queries block emission data.

**Should:**
- Initialize extracted emissions
- Query emissions by block ID
- Filter by block state conditions

---

## The Problem

### What's Wrong

1. **All particles floating up** - Gravity is not being applied correctly
2. **Signal smoke not using static texture** - `uses_static_texture` flag not being extracted/used
3. **Smoke lost color** - May be applying wrong base color or missing color from extraction

### Why It's Wrong

Based on the Java source:
- CampfireSmokeParticle overrides `tick()` without calling `super.tick()`
- This means it skips the default friction application
- Providers pass `sprites.get(randomSource)` which picks ONE texture
- Lifetime is calculated in constructor, not a static field

### What Needs to Happen

1. **Fix `detect_skips_friction()`** - Actually detect that CampfireSmokeParticle overrides tick()
2. **Fix `uses_static_texture` extraction** - Provider analysis must not be filtered out
3. **Extract constructor-calculated values** - Handle lifetime from `random.nextInt(X) + Y` patterns
4. **Remove all hardcoded defaults** - If we can't extract it, don't render it

---

## Next Steps

1. Examine the extracted JSON to see what data is actually there
2. Compare against the Java source to see what's missing
3. Fix the extractor to properly capture all necessary data
4. Update frontend to use extracted data correctly
5. Test campfire particles match vanilla exactly
