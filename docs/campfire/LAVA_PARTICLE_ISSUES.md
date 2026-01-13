# Lava Particle Issues - Complete Analysis

## What SHOULD Happen (from LavaParticle.java)

### LavaParticle Constructor
```java
LavaParticle(ClientLevel $$0, double $$1, double $$2, double $$3, TextureAtlasSprite $$4) {
    super($$0, $$1, $$2, $$3, 0.0, 0.0, 0.0, $$4);

    // LINE 17: GRAVITY
    this.gravity = 0.75f;  // ← Particles fall back down!

    // LINE 18: CUSTOM FRICTION
    this.friction = 0.999f;  // ← Almost no slowdown

    // LINES 19-21: VELOCITY MULTIPLICATION
    this.xd *= (double)0.8f;  // Reduce horizontal velocity
    this.yd *= (double)0.8f;  // Reduce vertical velocity
    this.zd *= (double)0.8f;  // Reduce horizontal velocity

    // LINE 22: VELOCITY OVERRIDE
    this.yd = this.random.nextFloat() * 0.4f + 0.05f;  // Y = 0.05 to 0.45 (upward!)

    // LINE 23: RANDOM SIZE
    this.quadSize *= this.random.nextFloat() * 2.0f + 0.2f;

    // LINE 24: CUSTOM LIFETIME
    this.lifetime = (int)(16.0 / (Math.random() * 0.8 + 0.2));  // = 10 to 80 ticks
}
```

### LavaParticle.tick() Method
```java
@Override
public void tick() {
    super.tick();  // Applies friction and gravity!
    if (!this.removed) {
        float $$0 = (float)this.age / (float)this.lifetime;
        // SPAWNS SMOKE PARTICLES!
        // Probability = 1 - (age/lifetime), so decreases as particle ages
        if (this.random.nextFloat() > $$0) {
            this.level.addParticle(ParticleTypes.SMOKE,
                this.x, this.y, this.z,  // At lava position
                this.xd, this.yd, this.zd);  // With lava velocity!
        }
    }
}
```

## What We're Currently Extracting

```json
{
  "lava": {
    "lifetime": [4, 40],              // ❌ Should be [10, 80]
    "gravity": 0.0,                   // ❌ Should be 0.75
    "friction": 0.98,                 // ❌ Should be 0.999
    "velocity_multiplier": null,      // ❌ Should be [0.8, 0.8, 0.8]
    "spawns_particles": null          // ❌ Should spawn "smoke"
  }
}
```

## Block Emission Data (CORRECT!)

From CampfireBlock.animateTick() line 166:
```java
$$1.addParticle(ParticleTypes.LAVA,
    (double)$$2.getX() + 0.5, (double)$$2.getY() + 0.5, (double)$$2.getZ() + 0.5,  // position
    (double)($$3.nextFloat() / 2.0f),  // velocity X: 0 to 0.5
    5.0E-5,                              // velocity Y: 0.00005 (tiny upward)
    $$3.nextFloat() / 2.0f);            // velocity Z: 0 to 0.5
```

✅ This IS being extracted correctly:
```json
{
  "particleId": "lava",
  "velocityExpr": ["($3.nextFloat() / 2.0)", "5.0E-5", "$3.nextFloat() / 2.0"]
}
```

## Why Lava Particles Are Broken

### Problem 1: No Gravity
- **Actual**: `this.gravity = 0.75f`
- **Extracted**: `gravity: 0.0`
- **Result**: Particles float instead of arcing up and falling back down

### Problem 2: Wrong Lifetime
- **Actual**: `(int)(16.0 / (Math.random() * 0.8 + 0.2))` = 10 to 80 ticks
- **Extracted**: `[4, 40]`
- **Result**: Particles disappear too quickly

### Problem 3: Wrong Friction
- **Actual**: `this.friction = 0.999f` (almost no slowdown)
- **Extracted**: `friction: 0.98` (default)
- **Result**: Particles slow down too much

### Problem 4: No Velocity Multiplication
- **Actual**: Multiply X/Y/Z by 0.8, THEN set Y to 0.05-0.45
- **Extracted**: Nothing
- **Result**: Initial velocity from block emission isn't modified correctly

### Problem 5: No Trailing Smoke
- **Actual**: Spawns smoke particles with decreasing probability
- **Extracted**: Nothing
- **Result**: No smoke trail following lava particles

## The Complete Lava Particle Behavior Chain

1. **Block emits lava particle** (CampfireBlock.animateTick):
   - Position: center of campfire block
   - Velocity: Random horizontal (0-0.5), tiny upward (0.00005)

2. **LavaParticle constructor modifies velocity**:
   - Multiply all velocities by 0.8
   - REPLACE Y velocity with 0.05-0.45 (strong upward)

3. **Each tick, LavaParticle**:
   - Applies gravity (0.75) → pulls particle down
   - Applies friction (0.999) → barely slows down
   - Spawns smoke particles with probability based on age

4. **Result**: Lava particles shoot upward, arc over, fall back down, leaving smoke trail

## Fixes Implemented

### 1. Division-Based Lifetime Extraction ✅
Added pattern to handle `(int)(X / (Math.random() * Y + Z))`:
```rust
let division_pattern = format!(
    r"this\.{}\s*=\s*\(int\)\s*\(\s*([\d.]+)\s*/\s*\([\w.]+\s*\*\s*([\d.]+)\s*\+\s*([\d.]+)\s*\)\s*\)",
    regex::escape(lifetime_field)
);
```

### 2. Velocity Multiplication Extraction ✅
Added pattern to handle `this.xd *= (double)0.8f`:
```rust
let xd_mult_pattern = format!(
    r"this\.{}\s*\*=\s*\(double\)\s*([\d.]+)[fF]?",
    regex::escape(xd_field)
);
```

### 3. Already Existing: Particle Spawning Detection
The `parse_tick_spawned_particles()` function should detect the smoke spawning in tick() method.

## Still Needed

### Frontend: Handle Velocity Reassignment
LavaParticle does `this.yd *= 0.8; this.yd = random * 0.4 + 0.05;`

The second assignment REPLACES the first. The frontend needs to handle this:
1. Apply velocity_multiplier from block emission
2. Apply velocity from particle constructor (if provided)

This might require a new field like `velocity_override` or special handling in velocity_add.

### Test Extraction
After rebuilding, verify that lava particle has:
- ✅ lifetime: [16, 80] (or close)
- ✅ gravity: 0.75
- ✅ friction: 0.999
- ✅ velocity_multiplier: [0.8, 0.8, 0.8]
- ✅ spawns_particles: [{"particle": "smoke", ...}]

## Expected Visual Behavior

**Vanilla Minecraft Campfire Lava Particles:**
1. Shoot upward from center of campfire
2. Arc over in a fountain pattern
3. Fall back down due to gravity
4. Leave trailing smoke particles
5. Smoke follows lava velocity initially, then rises slowly

**Current Weaverbird Behavior:**
1. ❌ Float slowly upward (no gravity)
2. ❌ Move horizontally at constant speed (no arc)
3. ❌ Disappear too quickly (wrong lifetime)
4. ❌ No smoke trail

**After Fixes:**
1. ✅ Shoot upward from center
2. ✅ Arc over due to gravity
3. ✅ Fall back down realistically
4. ✅ Smoke trail follows
5. ✅ Correct lifetime
