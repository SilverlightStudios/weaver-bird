# Campfire Block Particle Emissions

## Expected Extraction from CampfireBlock.java and CampfireBlockEntity.java

### From CampfireBlock.animateTick() (line 154)

**Emission Source:** `animateTick` (~2.3% call rate due to random block sampling)

**Lava Particles** (when lit):
```json
{
  "particleId": "lava",
  "emissionSource": "animateTick",
  "probabilityExpr": "$3.nextInt(5) == 0",  // 20% chance when animateTick is called
  "countExpr": "$3.nextInt(1) + 1",         // 1-2 particles
  "positionExpr": [
    "(double)$1.getX() + $3.nextDouble()",
    "(double)$1.getY() + 1.0",
    "(double)$1.getZ() + $3.nextDouble()"
  ],
  "velocityExpr": ["0.0", "0.0", "0.0"]
}
```

### From CampfireBlockEntity.particleTick() (line 99)

**Emission Source:** `particleTick` (100% call rate - called every tick)

**Signal/Cosy Smoke** (when lit):
```json
{
  "particleId": "campfire_signal_smoke",  // OR "campfire_cosy_smoke" based on block state
  "emissionSource": "particleTick",
  "probabilityExpr": "$4.nextFloat() < 0.11f",  // 11% chance each tick
  "countExpr": "$4.nextInt(2) + 2",             // 2-3 particles when rolled
  "positionExpr": [
    // Complex expression from CampfireBlock.makeParticles()
    "(double)$1.getX() + 0.5 + $4.nextDouble() / 3.0 * (double)($4.nextBoolean() ? 1 : -1)",
    "(double)$1.getY() + $4.nextDouble() + $4.nextDouble()",
    "(double)$1.getZ() + 0.5 + $4.nextDouble() / 3.0 * (double)($4.nextBoolean() ? 1 : -1)"
  ],
  "velocityExpr": ["0.0", "0.07", "0.0"],
  "condition": "lit=true,signal_fire=true"  // For signal smoke
}
```

**Regular Smoke** (when cooking food):
```json
{
  "particleId": "smoke",
  "emissionSource": "particleTick",
  "probabilityExpr": "$4.nextFloat() < 0.2f",  // 20% chance
  "countExpr": "1",  // Always 1
  "positionExpr": [
    "(double)$1.getX() + 0.5 + (double)((float)$8.getStepX() * -0.3125f) + (double)((float)$8.getClockWise().getStepX() * 0.3125f)",
    "(double)$1.getY() + 0.5",
    "(double)$1.getZ() + 0.5 + (double)((float)$8.getStepZ() * -0.3125f) + (double)((float)$8.getClockWise().getStepZ() * 0.3125f)"
  ],
  "velocityExpr": ["0.0", "5.0E-4", "0.0"]
}
```

---

## Actual Extraction Results

Check what's actually in the cache:
```bash
cat ~/Library/Caches/weaverbird/block_emissions/1.21.10-0.18.1.json | \
  python3 -m json.tool | \
  grep -A 50 '"campfire"'
```

---

## Key Details

### Emission Call Rates

1. **animateTick**:
   - Called on ~2.3% of ticks for this specific block
   - Due to random block sampling (667 blocks out of ~32,768 in 16-block radius)
   - So lava has ~2.3% × 20% = 0.46% chance to spawn per tick

2. **particleTick**:
   - Called EVERY tick (100%)
   - Via BlockEntityTicker system
   - So smoke has 11% chance to spawn per tick (spawning 2-3 particles when it does)

### Position Expressions

The smoke position is complex:
```java
(double)$$1.getX() + 0.5 + $$4.nextDouble() / 3.0 * (double)($$4.nextBoolean() ? 1 : -1)
```

Breakdown:
- `$$1.getX()` = block X position (0 in centered preview)
- `+ 0.5` = center of block
- `+ $$4.nextDouble() / 3.0` = random offset 0 to 0.333
- `* (double)($$4.nextBoolean() ? 1 : -1)` = randomly negate (±)

Result: Random position within ±0.333 blocks of center on X/Z, random 0-2 blocks up on Y.

### Velocity

- Lava: No initial velocity
- Signal/Cosy Smoke: Initial upward velocity of 0.07 blocks/tick
- Regular Smoke: Minimal upward velocity of 0.0005 blocks/tick

---

## Why This Matters

The emission data tells us:
1. **When** particles spawn (animateTick vs particleTick)
2. **How often** they spawn (probability expression)
3. **How many** spawn (count expression)
4. **Where** they spawn (position expression)
5. **Initial velocity** (velocity expression)

But it does NOT tell us:
- Particle physics (gravity, friction, lifetime) ← comes from particle physics extraction
- Texture behavior ← comes from particle physics extraction
- Color, scale, alpha ← comes from particle physics extraction

**Both extractions must succeed for particles to render correctly.**
