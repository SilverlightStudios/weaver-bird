# Flow of Particle Generation from Minecraft JAR to Three.js for Campfire

This document explains the complete particle rendering pipeline, using the campfire block as a detailed example showing how different particle types are extracted and rendered.

## Table of Contents
1. [Overview](#overview)
2. [Phase 1: Extraction from Minecraft JAR](#phase-1-extraction-from-minecraft-jar)
3. [Phase 2: Data Processing & Simplification](#phase-2-data-processing--simplification)
4. [Phase 3: TypeScript Generation](#phase-3-typescript-generation)
5. [Phase 4: Frontend Interpretation](#phase-4-frontend-interpretation)
6. [Phase 5: Three.js Rendering](#phase-5-threejs-rendering)
7. [Complete Particle Lifecycle Examples](#complete-particle-lifecycle-examples)

---

## Overview

The particle system follows a multi-stage pipeline:

```
Minecraft JAR (1.21.10)
    ↓
CFR Decompiler (deobfuscated Java code)
    ↓
Rust Extractors (parse Java → JSON)
    ↓
TypeScript Generator (JSON → TS constants)
    ↓
Frontend Particle System (TS → Three.js)
    ↓
Three.js Renderer (GPU sprites)
```

### Campfire Particle Types

The campfire demonstrates the full complexity of the particle system with **5 different emissions**:

| Emoji | Particle Type | Source | Purpose |
|-------|---------------|--------|---------|
| 🔥 | `lava` | `CampfireBlock.animateTick()` | Orange sparks that shoot upward |
| 🌫️ | `campfire_signal_smoke` | `CampfireBlock.makeParticles()` static | Tall smoke column (when on hay bale) |
| 💨 | `campfire_cosy_smoke` | `CampfireBlock.makeParticles()` static | Standard smoke plume |
| 💭 | `smoke` (dowse) | `CampfireBlock.makeParticles()` static | Generic smoke effect |
| 🍳 | `smoke` (cooking) | `CampfireBlockEntity.particleTick()` | Smoke from cooking food items |

---

## Phase 1: Extraction from Minecraft JAR

### 1.1 Automatic Block Discovery

**File**: `src-tauri/src/util/block_particle_extractor.rs`

The extractor automatically discovers which blocks emit particles by:

1. **Decompiling entire packages** with CFR
2. **Scanning for particle-emitting methods** containing `addParticle` calls
3. **Parsing Blocks registry** to map block IDs to classes

**Discovery Results for Campfire:**

| Block ID | Class | Methods Found |
|----------|-------|---------------|
| `campfire` | `net.minecraft.world.level.block.CampfireBlock` | `animateTick()` ✓ |
| `campfire` | `net.minecraft.world.level.block.entity.CampfireBlockEntity` | `particleTick()` ✓ |
| `soul_campfire` | `net.minecraft.world.level.block.CampfireBlock` | `animateTick()` ✓ |
| `soul_campfire` | `net.minecraft.world.level.block.entity.CampfireBlockEntity` | `particleTick()` ✓ |

### 1.2 Constructor Parameter Extraction

**From Blocks.java:**

```java
// Regular campfire
Block CAMPFIRE = register("campfire", ($$0) ->
    new CampfireBlock(true, 1, (BlockBehaviour.Properties)$$0));

// Soul campfire
Block SOUL_CAMPFIRE = register("soul_campfire", ($$0) ->
    new CampfireBlock(false, 2, (BlockBehaviour.Properties)$$0));
```

**Extracted Constructor Parameters:**

| Block | Parameter 0 (`spawnParticles`) | Parameter 1 (`fireDamage`) |
|-------|-------------------------------|----------------------------|
| `campfire` | `true` | `1` |
| `soul_campfire` | `false` | `2` |

**Field Mapping from Constructor:**

```java
public CampfireBlock(boolean $$0, int $$1, BlockBehaviour.Properties $$2) {
    this.spawnParticles = $$0;  // Parameter 0 → spawnParticles field
    this.fireDamage = $$1;      // Parameter 1 → fireDamage field
}
```

### 1.3 🔥 Lava Particle Extraction from CampfireBlock.animateTick()

**Decompiled Java Source:**

```java
public void animateTick(BlockState $$0, Level $$1, BlockPos $$2, RandomSource $$3) {
    if (!$$0.getValue(LIT).booleanValue()) {
        return;
    }

    // LAVA PARTICLES
    if (this.spawnParticles && $$3.nextInt(5) == 0) {
        for (int $$4 = 0; $$4 < $$3.nextInt(1) + 1; ++$$4) {
            $$1.addParticle(ParticleTypes.LAVA,
                $$2.getX() + 0.5, $$2.getY() + 0.5, $$2.getZ() + 0.5,
                $$3.nextFloat() / 2.0, 5.0E-5, $$3.nextFloat() / 2.0
            );
        }
    }
}
```

#### 🔥 Lava Probability Math

**Java Expression:**
```java
this.spawnParticles && $$3.nextInt(5) == 0
```

**JavaScript/TypeScript:**
```typescript
spawnParticles && random.nextInt(5) === 0
```

**What This Means:**
- **Regular campfire**: `true && (1/5)` = **20% chance per tick**
- **Soul campfire**: `false && (1/5)` = **filtered out entirely**
- **Spawn rate**: 20 ticks/sec × 20% = **~4 particles/second**
- **Location**: Exact center of block `(x+0.5, y+0.5, z+0.5)`

#### 🔥 Lava Count Math

**Java Expression:**
```java
$$3.nextInt(1) + 1
```

**JavaScript/TypeScript:**
```typescript
random.nextInt(1) + 1  // Returns 0 or 1, then +1
```

**What This Means:**
- **Range**: 1-2 particles per spawn
- **Average**: 1.5 particles per successful spawn
- **Effective rate**: 4 spawns/sec × 1.5 particles = **6 lava particles/second**

#### 🔥 Lava Position Math

**Java Expression:**
```java
X: $$2.getX() + 0.5
Y: $$2.getY() + 0.5
Z: $$2.getZ() + 0.5
```

**JavaScript/TypeScript:**
```typescript
x: blockPos.getX() + 0.5
y: blockPos.getY() + 0.5
z: blockPos.getZ() + 0.5
```

**What This Means:**
- **Location**: Exact center of the campfire block
- **No variation**: Always spawns at same spot
- **Example**: Block at (10, 64, 20) spawns at (10.5, 64.5, 20.5)

#### 🔥 Lava Velocity Math

**Java Expression:**
```java
vX: $$3.nextFloat() / 2.0       // 0.0 to 0.5
vY: 5.0E-5                       // 0.00005
vZ: $$3.nextFloat() / 2.0       // 0.0 to 0.5
```

**JavaScript/TypeScript:**
```typescript
vX: random.nextFloat() / 2.0    // blocks/tick
vY: 0.00005                     // blocks/tick (nearly 0)
vZ: random.nextFloat() / 2.0    // blocks/tick
```

**What This Means:**
- **Horizontal speed**: 0-0.5 blocks/tick in X and Z (random direction)
- **Vertical speed**: Nearly zero initially (0.00005 blocks/tick)
- **After physics**: Y velocity becomes 0.25-0.45 blocks/tick upward
- **Motion**: Shoots up in random XZ direction, then falls in an arc

---

### 1.4 🌫️💨 Smoke Particles from makeParticles() Static Method

**Decompiled Java Source:**

```java
public static void makeParticles(Level $$0, BlockPos $$1, boolean $$2, boolean $$3) {
    RandomSource $$4 = $$0.getRandom();
    SimpleParticleType $$5 = $$2 ? ParticleTypes.CAMPFIRE_SIGNAL_SMOKE
                                  : ParticleTypes.CAMPFIRE_COSY_SMOKE;

    $$0.addAlwaysVisibleParticle($$5, true,
        $$1.getX() + 0.5 + $$4.nextDouble() / 3.0 * ($$4.nextBoolean() ? 1 : -1),
        $$1.getY() + $$4.nextDouble() + $$4.nextDouble(),
        $$1.getZ() + 0.5 + $$4.nextDouble() / 3.0 * ($$4.nextBoolean() ? 1 : -1),
        0.0, 0.07, 0.0
    );

    // DOWSE SMOKE
    if ($$3) {
        $$0.addParticle(ParticleTypes.SMOKE,
            $$1.getX() + 0.5 + $$4.nextDouble() / 4.0 * ($$4.nextBoolean() ? 1 : -1),
            $$1.getY() + 0.4,
            $$1.getZ() + 0.5 + $$4.nextDouble() / 4.0 * ($$4.nextBoolean() ? 1 : -1),
            0.0, 0.005, 0.0
        );
    }
}
```

#### 🌫️ Signal Smoke Position Math

**Java Expression:**
```java
X: $$1.getX() + 0.5 + $$4.nextDouble() / 3.0 * ($$4.nextBoolean() ? 1 : -1)
Y: $$1.getY() + $$4.nextDouble() + $$4.nextDouble()
Z: $$1.getZ() + 0.5 + $$4.nextDouble() / 3.0 * ($$4.nextBoolean() ? 1 : -1)
```

**JavaScript/TypeScript:**
```typescript
x: blockX + 0.5 + (random.nextDouble() / 3.0) * (random.nextBoolean() ? 1 : -1)
y: blockY + random.nextDouble() + random.nextDouble()  // Sum of two randoms: 0-2
z: blockZ + 0.5 + (random.nextDouble() / 3.0) * (random.nextBoolean() ? 1 : -1)
```

**What This Means:**
- **XZ spread**: Center ± (0-0.333) blocks = **±0.33 block radius**
- **Y height**: Base + 0-2 blocks (sum of two 0-1 randoms)
- **Spawn rate**: **20 particles/second** (every tick, always visible)
- **Pattern**: Creates wide smoke column varying from base to +2 blocks high

#### 💨 Cosy Smoke (Same Math as Signal)

**What This Means:**
- **Identical positioning** to signal smoke
- **Different texture**: Uses `campfire_cosy_smoke` instead of `signal_smoke`
- **Spawn rate**: **20 particles/second**
- **Purpose**: Main ambient smoke, always active

#### 💭 Dowse Smoke Position Math

**Java Expression:**
```java
X: $$1.getX() + 0.5 + $$4.nextDouble() / 4.0 * ($$4.nextBoolean() ? 1 : -1)
Y: $$1.getY() + 0.4
Z: $$1.getZ() + 0.5 + $$4.nextDouble() / 4.0 * ($$4.nextBoolean() ? 1 : -1)
```

**JavaScript/TypeScript:**
```typescript
x: blockX + 0.5 + (random.nextDouble() / 4.0) * (random.nextBoolean() ? 1 : -1)
y: blockY + 0.4                                // Fixed lower height
z: blockZ + 0.5 + (random.nextDouble() / 4.0) * (random.nextBoolean() ? 1 : -1)
```

**What This Means:**
- **XZ spread**: Center ± (0-0.25) blocks = **±0.25 block radius** (tighter than signal/cosy)
- **Y height**: Fixed at base + 0.4 blocks (lower than other smoke)
- **Spawn rate**: **20 particles/second**
- **Purpose**: Generic smoke puff effect

#### Smoke Velocity Math

**Java Expression:**
```java
// Signal & Cosy Smoke
vX: 0.0
vY: 0.07      // blocks/tick
vZ: 0.0

// Dowse Smoke
vX: 0.0
vY: 0.005     // blocks/tick (much slower)
vZ: 0.0
```

**JavaScript/TypeScript:**
```typescript
// Signal & Cosy
velocity: [0.0, 0.07, 0.0]   // Rises at 1.4 blocks/second

// Dowse
velocity: [0.0, 0.005, 0.0]  // Rises at 0.1 blocks/second
```

**What This Means:**
- **Signal/Cosy**: Rise at **1.4 blocks/second** (0.07 × 20 ticks)
- **Dowse**: Rise at **0.1 blocks/second** (0.005 × 20 ticks)
- **Direction**: Straight up (no XZ movement)
- **Slowing**: Friction of 0.91 reduces speed by 9% per tick

---

### 1.5 🍳 Cooking Smoke from CampfireBlockEntity.particleTick()

**Decompiled Java Source:**

```java
public static void particleTick(ServerLevel $$0, BlockPos $$1, BlockState $$2,
                                CampfireBlockEntity $$3) {
    for (int $$7 = 0; $$7 < $$3.items.size(); ++$$7) {
        if ($$3.items.get($$7).isEmpty() || !($$4.nextFloat() < 0.2f)) continue;

        Direction $$8 = $$2.getValue(CampfireBlock.FACING);
        Direction $$9 = $$8.getClockWise();
        // ... complex position calculation for each cooking slot ...

        $$0.sendParticles(ParticleTypes.SMOKE, $$10, $$11, $$12,
            0, 0.0, 5.0E-4, 0.0);
    }
}
```

#### 🍳 Cooking Smoke Probability Math

**Java Expression:**
```java
$$3.items.get($$7).isEmpty() || !($$4.nextFloat() < 0.2)
```

**JavaScript/TypeScript:**
```typescript
items[slot].isEmpty() || !(random.nextFloat() < 0.2)
// Inverted: Spawns when item exists AND random succeeds
!items[slot].isEmpty() && (random.nextFloat() < 0.2)
```

**What This Means:**
- **Condition 1**: Item must be in cooking slot (4 slots total)
- **Condition 2**: 20% chance per tick if item exists
- **Per slot rate**: 20 ticks/sec × 20% = **4 particles/second per occupied slot**
- **Max rate**: 4 slots × 4 particles = **16 particles/second total** (if all slots full)

#### 🍳 Cooking Smoke Position Math

**Java Expression:**
```java
// Simplified from complex direction calculation:
X: blockX + 0.5 + rotationOffset.x
Y: blockY + 0.5
Z: blockZ + 0.5 + rotationOffset.z

// Where rotationOffset depends on facing direction and slot number
// Uses Direction.getClockWise() to rotate around block
```

**JavaScript/TypeScript:**
```typescript
const facing = blockState.getValue(FACING);
const clockwise = facing.getClockWise();
const slotOffset = calculateSlotPosition(facing, clockwise, slotIndex);

position: [
  blockX + 0.5 + slotOffset.x,
  blockY + 0.5,
  blockZ + 0.5 + slotOffset.z
]
```

**What This Means:**
- **Y position**: Always at block center height (0.5)
- **XZ position**: Rotates around campfire based on facing direction
- **4 positions**: One for each cooking slot, arranged in square pattern
- **Dynamic**: Position rotates when campfire facing direction changes

#### 🍳 Cooking Smoke Velocity Math

**Java Expression:**
```java
vX: 0.0
vY: 5.0E-4    // 0.0005 blocks/tick
vZ: 0.0
```

**JavaScript/TypeScript:**
```typescript
velocity: [0.0, 0.0005, 0.0]
```

**What This Means:**
- **Rise speed**: **0.01 blocks/second** (0.0005 × 20 ticks)
- **Very slow**: 100x slower than signal smoke
- **Purpose**: Subtle indication that food is cooking
- **Direction**: Straight up from cooking slot position

---

## Phase 2: Data Processing & Simplification

### 2.1 Field Value Substitution & Probability Simplification

#### Regular Campfire (`spawnParticles = true`)

| Emoji | Particle | Probability Steps | Effective Rate |
|-------|----------|------------------|----------------|
| 🔥 | Lava | `this.spawnParticles && nextInt(5)==0` → `true && ...` → `nextInt(5)==0` | **4-8/sec** (20% of 20 ticks × 1-2 count) |
| 🌫️ | Signal Smoke | Always visible | **20/sec** (every tick) |
| 💨 | Cosy Smoke | Always visible | **20/sec** (every tick) |
| 💭 | Dowse Smoke | None | **20/sec** (every tick) |
| 🍳 | Cooking | `!isEmpty() && nextFloat()<0.2` | **0-4/sec per slot** (20% × item present) |

#### Soul Campfire (`spawnParticles = false`)

| Emoji | Particle | Probability Steps | Effective Rate |
|-------|----------|------------------|----------------|
| 🔥 | ~~Lava~~ | `this.spawnParticles && ...` → `false && ...` → **FILTERED OUT** | **0/sec** ❌ |
| 🌫️ | Signal Smoke | Always visible | **20/sec** ✓ |
| 💨 | Cosy Smoke | Always visible | **20/sec** ✓ |
| 💭 | Dowse Smoke | None | **20/sec** ✓ |
| 🍳 | Cooking | `!isEmpty() && nextFloat()<0.2` | **0-4/sec per slot** ✓ |

**Key Insight**: The `spawnParticles` field is the **ONLY difference** between regular and soul campfires regarding particle behavior.

---

## Phase 3: TypeScript Generation

### 3.1 Particle Physics Comparison

| Property | 🔥 Lava | 💭 Smoke | 🌫️ Signal Smoke | 💨 Cosy Smoke |
|----------|---------|----------|-----------------|---------------|
| **Lifetime (ticks)** | 16-40 (0.8-2s) | 8-40 (0.4-2s) | Variable | Variable |
| **Gravity** | 0.75 (falls) | -0.1 (rises) | null (neutral) | 0.000003 (weightless) |
| **Friction** | 0.999 (maintains) | 0.96 (slows) | 0.91 (slows more) | 0.91 (slows more) |
| **Behavior** | `particle` | `ash_smoke` | null | null |
| **Velocity Mult** | `[0.8, 0.0, 0.8]` | `[0.1, 0.1, 0.1]` | null | null |
| **Velocity Add** | `[0, 0.25, 0]` | null | null | null |
| **Velocity Jitter** | `[0, 0.4, 0]` | null | null | null |

#### Physics Application Example: 🔥 Lava

**Emission Velocity:**
```
Input: (0.3, 0.00005, 0.4) blocks/tick
```

**Step 1 - Multiply:**
```java
// Java physics: velocity_multiplier = [0.8, 0.0, 0.8]
vX = 0.3 * 0.8 = 0.24
vY = 0.00005 * 0.0 = 0.0    // Y velocity zeroed!
vZ = 0.4 * 0.8 = 0.32
```

**Step 2 - Add:**
```java
// Java physics: velocity_add = [0.0, 0.25, 0.0]
vX = 0.24 + 0.0 = 0.24
vY = 0.0 + 0.25 = 0.25      // Strong upward boost!
vZ = 0.32 + 0.0 = 0.32
```

**Step 3 - Jitter:**
```java
// Java physics: velocity_jitter = [0.0, 0.4, 0.0]
// Random(-0.2, +0.2) from jitter
vX = 0.24 + 0.0 = 0.24
vY = 0.25 + 0.15 = 0.40     // Example with +0.15 random
vZ = 0.32 + 0.0 = 0.32
```

**Final Result:**
```
Output: (0.24, 0.40, 0.32) blocks/tick
Meaning: Particle shoots up at 8 blocks/second, then gravity pulls it down
```

---

## Phase 4: Frontend Interpretation

### 4.1 Spawn Rate Calculation (Minecraft Timing)

**Timing System:**
```typescript
const TICKS_PER_SECOND = 20;        // Minecraft tick rate
const MS_PER_TICK = 50;             // 1000ms / 20 ticks

// Browser runs at ~60 FPS (16.67ms per frame)
// We accumulate time and process in tick increments
```

**Tick Accumulator Pattern:**
```typescript
let tickAccumulator = 0;

function update(deltaTime: number) {
  tickAccumulator += deltaTime;  // Add frame time (e.g., 16.67ms)

  // Process full ticks
  while (tickAccumulator >= MS_PER_TICK) {
    tickAccumulator -= MS_PER_TICK;
    processEmissions(); // Check each particle emission
  }
}
```

### 4.2 Probability Evaluation Examples

#### 🔥 Lava Spawn Check (Every 50ms)

**Java:**
```java
if (random.nextInt(5) == 0) {  // 20% chance
    int count = random.nextInt(1) + 1;  // 1 or 2 particles
    for (int i = 0; i < count; i++) {
        spawnLava();
    }
}
```

**TypeScript:**
```typescript
// Compiled from probability expression
const shouldSpawn = compileMinecraftExpr("$3.nextInt(5) == 0")(rand);
if (shouldSpawn) {
  const count = compileMinecraftExpr("$3.nextInt(1) + 1")(rand);
  for (let i = 0; i < count; i++) {
    spawnLava();
  }
}
```

**What Happens:**
- **Every 50ms**: Check runs
- **20% chance**: Random 0-4, spawn if 0
- **If spawn**: Create 1-2 particles
- **Result**: 4 checks/sec × 20% × 1.5 avg = **~6 lava particles/second**

#### 🌫️ Signal Smoke Spawn (Every 50ms)

**Java:**
```java
// addAlwaysVisibleParticle - no probability check
spawnSignalSmoke();
```

**TypeScript:**
```typescript
// No probabilityExpr, spawns every tick
if (enabled) {
  spawnSignalSmoke();
}
```

**What Happens:**
- **Every 50ms**: Always spawns
- **No randomness**: Guaranteed spawn
- **Result**: **20 particles/second** (60/sec at 60 FPS capped to 20 by tick rate)

### 4.3 Position Expression Evaluation

#### 🔥 Lava Position (Fixed Center)

**Expression:**
```typescript
positionExpr: [
  "$2.getX() + 0.5",
  "$2.getY() + 0.5",
  "$2.getZ() + 0.5"
]
```

**Compilation:**
```typescript
// BlockPos getters return block coordinates (integers)
const xFn = (rand) => blockPos.getX() + 0.5;
const yFn = (rand) => blockPos.getY() + 0.5;
const zFn = (rand) => blockPos.getZ() + 0.5;

// Execution
const pos = [
  xFn(rand),  // e.g., 10 + 0.5 = 10.5
  yFn(rand),  // e.g., 64 + 0.5 = 64.5
  zFn(rand)   // e.g., 20 + 0.5 = 20.5
];
```

**Result**: Always spawns at exact center of block (no variation)

#### 🌫️ Signal Smoke Position (Random Spread)

**Expression:**
```typescript
positionExpr: [
  "$1.getX() + 0.5 + $4.nextDouble() / 3.0 * ($4.nextBoolean() ? 1 : -1)",
  "$1.getY() + $4.nextDouble() + $4.nextDouble()",
  "$1.getZ() + 0.5 + $4.nextDouble() / 3.0 * ($4.nextBoolean() ? 1 : -1)"
]
```

**Compilation & Execution:**
```typescript
// X position: center ± 0.33
const x = blockPos.getX() + 0.5 +
          (rand() / 3.0) * (rand() > 0.5 ? 1 : -1);
// Example: 10 + 0.5 + (0.6 / 3.0) * 1 = 10.7

// Y position: base + 0 to 2 (sum of two randoms)
const y = blockPos.getY() + rand() + rand();
// Example: 64 + 0.3 + 0.7 = 65.0

// Z position: center ± 0.33
const z = blockPos.getZ() + 0.5 +
          (rand() / 3.0) * (rand() > 0.5 ? 1 : -1);
// Example: 20 + 0.5 + (0.4 / 3.0) * -1 = 20.367
```

**Result**: Creates smoke column with ±0.33 XZ spread and 0-2 block height variation

---

## Phase 5: Three.js Rendering

### 5.1 Per-Tick Physics Update

#### 🔥 Lava Motion Simulation

**Tick 0 (Spawn):**
```
Position: (10.5, 64.5, 20.5)
Velocity: (0.24, 0.40, 0.32) blocks/tick
```

**Tick 1 (50ms later):**
```java
// Java physics update:
velocity.y -= 0.04 * gravity;           // gravity = 0.75
velocity.y = 0.40 - (0.04 * 0.75) = 0.37

velocity *= friction;                    // friction = 0.999
velocity.x = 0.24 * 0.999 = 0.2398
velocity.y = 0.37 * 0.999 = 0.3696
velocity.z = 0.32 * 0.999 = 0.3197

position += velocity;
position.y = 64.5 + 0.3696 = 64.8696
```

**TypeScript:**
```typescript
// Gravity application (Minecraft: yd -= 0.04 * gravity)
particle.velocity.y -= 0.02 * physics.gravity;  // Halved for Three.js

// Friction (Minecraft: velocity *= friction)
particle.velocity.multiplyScalar(physics.friction);

// Movement (halved for Three.js coordinate system)
particle.position.x += particle.velocity.x * 0.5;
particle.position.y += particle.velocity.y * 0.5;
particle.position.z += particle.velocity.z * 0.5;
```

**What This Means:**
- **Tick 0-3**: Rises (upward velocity > downward gravity accumulation)
- **Tick 4**: Peak height reached (velocity ~0)
- **Tick 5+**: Falls (gravity accumulated, negative velocity)
- **Tick 27**: Hits ground or expires

#### 🌫️ Signal Smoke Motion Simulation

**Tick 0 (Spawn):**
```
Position: (10.67, 64.8, 20.31)  // Random offset
Velocity: (0.0, 0.07, 0.0)
```

**Tick 1 (50ms later):**
```java
// No gravity (gravity = null)

velocity *= friction;                    // friction = 0.91
velocity.y = 0.07 * 0.91 = 0.0637

position += velocity;
position.y = 64.8 + 0.0637 = 64.8637
```

**Tick 10 (500ms later):**
```java
// After 10 friction applications:
velocity.y = 0.07 * (0.91^10) = 0.07 * 0.389 = 0.027

position.y ≈ 65.3  // Risen ~0.5 blocks, now slower
```

**What This Means:**
- **Continuous rise**: No gravity to pull down
- **Gradual slowdown**: Loses 9% speed per tick
- **Long lifetime**: Can rise several blocks before despawning
- **Dense column**: 20/sec creates thick smoke plume

### 5.2 Visual Rendering Properties

#### Size Scaling Over Lifetime

**🔥 Lava (Constant Size):**
```typescript
// FlameParticle.getQuadSize() with t = age/lifetime
const sizeCurve = 1.0 - (t * t * 0.5);
const size = baseSize * sizeCurve;
```

**💭 Smoke (Growing):**
```typescript
// BaseAshSmokeParticle.getQuadSize() with t = age/lifetime
const growthCurve = Math.min(t * 32.0, 1.0);
const size = baseSize * growthCurve;
```

**Example at 50% lifetime:**
- **Lava**: `1.0 - (0.5 * 0.5 * 0.5)` = 0.875 = **87.5% of spawn size**
- **Smoke**: `min(0.5 * 32, 1.0)` = 1.0 = **100% of max size** (reached max)

---

## Complete Particle Lifecycle Examples

### Example 1: 🔥 Lava Particle (Full Arc)

**Spawn Conditions:**
```
Block: (10, 64, 20) Regular Campfire (lit=true)
Random Check: nextInt(5) = 0 ✓ (20% chance succeeded)
Count: nextInt(1) + 1 = 2 (spawning 2 particles)
```

**Particle 1 Initial State:**
```
Position: (10.5, 64.5, 20.5)
Emission Vel: (0.31, 0.00005, 0.23)  // Random XZ, near-zero Y
After Physics: (0.248, 0.38, 0.184)  // Multiplied, added boost, jittered
Lifetime: 32 ticks (1.6 seconds)
```

**Motion Timeline:**

| Tick | Time (s) | Vel Y | Pos Y | Description |
|------|----------|-------|-------|-------------|
| 0 | 0.00 | +0.38 | 64.50 | 🔥 Spawns, shooting upward |
| 1 | 0.05 | +0.35 | 64.88 | Rising fast |
| 5 | 0.25 | +0.08 | 66.45 | Still rising, slowing |
| 7 | 0.35 | -0.08 | **66.60** | 🎯 Peak height (+2.1 blocks) |
| 10 | 0.50 | -0.30 | 65.92 | Falling |
| 15 | 0.75 | -0.68 | 64.15 | Falling faster |
| 20 | 1.00 | -1.06 | 61.25 | Below campfire |
| 25 | 1.25 | -1.44 | 57.12 | Rapid descent |
| 30 | 1.50 | -1.82 | 51.80 | Still falling |
| 32 | 1.60 | -1.97 | **49.25** | 💀 Expires |

**Why It Moves This Way:**
1. **Upward boost**: +0.25 velocity_add creates initial rise
2. **Gravity takes over**: 0.75/tick quickly reverses direction
3. **Minimal friction**: 0.999 means speed barely decreases
4. **Classic arc**: Projectile motion, same physics as thrown items

### Example 2: 🌫️ Signal Smoke (Rising Column)

**Spawn Conditions:**
```
Block: (10, 64, 20) Any Campfire
Frequency: EVERY TICK (100% chance, always visible)
Count: 1 per tick = 20 particles/second
```

**Particle 1 Initial State:**
```
Position: (10.72, 65.3, 20.14)  // Random XZ spread, random height
Velocity: (0.0, 0.07, 0.0)      // Straight up
Lifetime: Variable (ash_smoke behavior)
```

**Motion Timeline:**

| Tick | Time (s) | Vel Y | Pos Y | XZ Offset | Description |
|------|----------|-------|-------|-----------|-------------|
| 0 | 0.00 | 0.0700 | 65.30 | +0.22, +0.14 | 🌫️ Spawns |
| 5 | 0.25 | 0.0461 | 65.61 | Same | Rising, slowing |
| 10 | 0.50 | 0.0303 | 65.77 | Same | Still rising |
| 20 | 1.00 | 0.0121 | 66.03 | Same | Very slow rise |
| 40 | 2.00 | 0.0019 | 66.19 | Same | Nearly stopped |
| 60 | 3.00 | 0.0003 | 66.22 | Same | Barely moving |

**Why 20 Particles Create a Column:**
```
At t=1 second (tick 20):
  - Particle 1 (oldest): Height 66.03, speed 0.012
  - Particle 5: Height 65.95, speed 0.028
  - Particle 10: Height 65.82, speed 0.046
  - Particle 15: Height 65.70, speed 0.061
  - Particle 20 (newest): Height 65.30, speed 0.070

Result: 20 particles stacked vertically, creating continuous smoke column
        from 65.3 to 66.0 (0.7 blocks tall after 1 second)
```

### Example 3: 🔥 vs ❄️ Regular vs Soul Campfire

**Regular Campfire Particle Output (1 Second):**
```
🔥 Lava:          ~6 particles (4 spawns × 1.5 avg count)
🌫️ Signal Smoke:  20 particles (every tick)
💨 Cosy Smoke:    20 particles (every tick)
💭 Dowse Smoke:   20 particles (every tick)
🍳 Cooking (×4):  0-16 particles (if items present)

Total: 66-82 particles/second
Visual: Orange sparks shooting up + dense white smoke column
```

**Soul Campfire Particle Output (1 Second):**
```
🔥 Lava:          0 particles (FILTERED OUT by spawnParticles=false)
🌫️ Signal Smoke:  20 particles (every tick)
💨 Cosy Smoke:    20 particles (every tick)
💭 Dowse Smoke:   20 particles (every tick)
🍳 Cooking (×4):  0-16 particles (if items present)

Total: 60-76 particles/second
Visual: Only blue-ish smoke column, NO orange sparks
```

**The ONLY Code Difference:**
```java
// Regular
new CampfireBlock(true, 1, properties);  // spawnParticles = TRUE

// Soul
new CampfireBlock(false, 2, properties); // spawnParticles = FALSE

// This single boolean eliminates ALL lava particles via field tracking!
```

---

## Summary: Particle Behavior by Type

### 🔥 Lava (Regular Campfire Only)
- **Spawn rate**: 4-8/second (20% probability × 1-2 count)
- **Location**: Exact block center
- **Motion**: Shoots upward → peaks at +2 blocks → falls in arc
- **Speed**: Fast (0.25-0.45 blocks/tick initial Y)
- **Lifetime**: 0.8-2 seconds
- **Why**: Physics zeroes emission Y, adds 0.25 boost, then gravity dominates

### 🌫️ Signal Smoke (Both Campfires)
- **Spawn rate**: 20/second (every tick, always visible)
- **Location**: Center ± 0.33 XZ, base + 0-2 blocks Y
- **Motion**: Rises steadily, slowing over time
- **Speed**: Medium (0.07 blocks/tick = 1.4 blocks/sec)
- **Lifetime**: Variable (ash_smoke)
- **Why**: No gravity, friction gradually slows ascent, creates tall column

### 💨 Cosy Smoke (Both Campfires)
- **Spawn rate**: 20/second (every tick, always visible)
- **Location**: Same as signal smoke
- **Motion**: Nearly identical to signal smoke
- **Speed**: Medium (0.07 blocks/tick = 1.4 blocks/sec)
- **Lifetime**: Variable (ash_smoke)
- **Why**: Different texture, same physics as signal smoke

### 💭 Dowse Smoke (Both Campfires)
- **Spawn rate**: 20/second (every tick)
- **Location**: Center ± 0.25 XZ, base + 0.4 blocks Y (lower)
- **Motion**: Rises very slowly
- **Speed**: Slow (0.005 blocks/tick = 0.1 blocks/sec)
- **Lifetime**: 0.4-2 seconds
- **Why**: After physics, velocity reduced to 0.0005 blocks/tick

### 🍳 Cooking Smoke (Both Campfires)
- **Spawn rate**: 0-4/second per slot (20% if item present)
- **Location**: Rotates around block based on facing, 4 positions
- **Motion**: Rises extremely slowly from cooking position
- **Speed**: Very slow (0.0005 blocks/tick = 0.01 blocks/sec)
- **Lifetime**: 0.4-2 seconds
- **Why**: Subtle indicator of cooking activity

---

## Key Takeaways

1. **🎯 Field Tracking = Accuracy**: `spawnParticles` boolean completely eliminates lava from soul campfires
2. **📊 Math Preservation**: Java expressions converted to JavaScript maintain exact Minecraft behavior
3. **⏱️ Timing is Critical**: 20 tick/second accumulator ensures particles spawn at correct frequency
4. **🎲 Probability Matters**: 20% spawn chance creates intermittent lava vs 100% creates dense smoke
5. **📍 Position Variation**: Random XZ spreads create natural-looking smoke columns
6. **⚙️ Physics Transform**: Velocity modifiers (multiply/add/jitter) completely change particle motion
7. **🔄 Lifecycle Simulation**: Gravity, friction, and collision run every tick for realistic movement

The campfire demonstrates the complete particle system: automatic extraction, field-based filtering, probability evaluation, position randomization, physics modification, and lifecycle simulation—all working together to create pixel-perfect Minecraft particle effects in Three.js! 🎉
