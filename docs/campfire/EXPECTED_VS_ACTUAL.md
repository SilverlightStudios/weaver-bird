# Expected vs Actual Extraction

## What SHOULD Be Extracted (from CampfireSmokeParticle.java)

### campfire_signal_smoke

```json
{
  "lifetime": [280, 329],  // random.nextInt(50) + 280
  "gravity": 0.000003,      // 3.0E-6f
  "size": null,
  "scale": 3.0,             // scale(3.0f)
  "has_physics": false,
  "alpha": 0.95,            // setAlpha(0.95f) in SignalProvider
  "friction": null,         // NOT USED - particle overrides tick()
  "velocity_multiplier": null,
  "velocity_add": null,
  "velocity_jitter": [0.0002, 0, 0.0002],  // ±random/5000 on X,Z each tick
  "color": null,
  "color_scale": null,
  "lifetime_base": null,
  "lifetime_animation": false,  // Does NOT use SpriteSet.get(age, lifetime)
  "behavior": "campfire_smoke",
  "tick_velocity_delta": null,
  "skips_friction": true,        // ⚠️ CRITICAL - overrides tick() without super.tick()
  "uses_static_texture": true     // ⚠️ CRITICAL - sprites.get(randomSource)
}
```

### campfire_cosy_smoke

```json
{
  "lifetime": [80, 129],    // random.nextInt(50) + 80
  "gravity": 0.000003,      // 3.0E-6f
  "size": null,
  "scale": 3.0,             // scale(3.0f)
  "has_physics": false,
  "alpha": 0.9,             // setAlpha(0.9f) in CosyProvider
  "friction": null,
  "velocity_multiplier": null,
  "velocity_add": null,
  "velocity_jitter": [0.0002, 0, 0.0002],
  "color": null,
  "color_scale": null,
  "lifetime_base": null,
  "lifetime_animation": false,
  "behavior": "campfire_smoke",
  "tick_velocity_delta": null,
  "skips_friction": true,        // ⚠️ CRITICAL
  "uses_static_texture": true     // ⚠️ CRITICAL
}
```

---

## What IS ACTUALLY Being Extracted

Run this to see:
```bash
cat ~/Library/Caches/weaverbird/particle_physics/1.21.10-0.18.1.json | \
  python3 -m json.tool | \
  grep -A 25 '"campfire_signal_smoke"'
```

### Likely Issues

Based on the symptoms ("all particles floating up", "signal smoke not static", "smoke lost color"):

1. **Missing/Wrong Lifetime** - Probably using default [4, 40] instead of correct values
2. **Missing/Wrong Gravity** - Probably 0.0 instead of 0.000003
3. **skips_friction = false** - Should be true!
4. **uses_static_texture missing** - Not extracted from provider
5. **alpha missing** - Should be 0.95/0.9
6. **scale missing** - Should be 3.0

---

## Why Extraction is Failing

### Issue 1: Constructor-Calculated Lifetime

The lifetime is calculated in the constructor:
```java
this.lifetime = $$7 ? this.random.nextInt(50) + 280 : this.random.nextInt(50) + 80;
```

**Problem:** The extractor looks for field assignments like `this.lifetime = 280`, not constructor calculations.

**Solution:** Parse constructor code for patterns like `random.nextInt(X) + Y`.

### Issue 2: Provider Data Being Filtered Out

Providers only set `uses_static_texture` but don't set lifetime/gravity/etc, so they get filtered out by:
```rust
if physics.lifetime.is_some()
    || physics.gravity.is_some()
    || physics.size.is_some()
    || physics.has_physics.is_some()
    || physics.friction.is_some()
{
    // Include particle
}
```

**Problem:** Provider data doesn't pass this filter.

**Solution:** ✅ FIXED - Added `skips_friction` and `uses_static_texture` to filter.

### Issue 3: tick() Override Detection

The particle has:
```java
@Override
public void tick() {
    // ... custom logic ...
    // NO super.tick() call!
}
```

**Problem:** `detect_skips_friction()` regex might not be matching correctly.

**Solution:** Debug the regex, print what it's finding.

### Issue 4: Provider Constructor Analysis

The provider does:
```java
new CampfireSmokeParticle($$1, $$2, $$3, $$4, $$5, $$6, $$7, true, this.sprites.get($$8))
```

**Problem:** The extractor needs to:
1. Detect `this.sprites.get(...)` pattern → set `uses_static_texture: true`
2. Extract the `true` parameter → this is the signal smoke flag
3. Look at CampfireSmokeParticle constructor to understand what that boolean does

**Solution:** Enhance provider extraction to parse constructor calls more thoroughly.

---

## Debugging Steps

1. **Check actual extracted data:**
   ```bash
   cat ~/Library/Caches/weaverbird/particle_physics/1.21.10-0.18.1.json | \
     python3 -m json.tool | \
     grep -A 25 '"campfire_signal_smoke"'
   ```

2. **Verify provider data exists:**
   ```bash
   grep -i "provider.*campfire\|signal.*smoke\|cosy.*smoke" \
     ~/Library/Caches/weaverbird/particle_physics/1.21.10-0.18.1.json
   ```

3. **Check decompiled source:**
   ```bash
   cat ~/Library/Caches/weaverbird/block_emissions/decompiled/*/net/minecraft/client/particle/CampfireSmokeParticle.java
   ```

4. **Test detection functions:**
   - Does `detect_skips_friction()` return `true` for CampfireSmokeParticle?
   - Does `extract_physics_from_provider()` set `uses_static_texture: true`?
   - Does provider data make it through the filter?

---

## The Root Problem

**We're getting default base Particle physics instead of CampfireSmokeParticle-specific physics.**

This means:
- Either the particle class isn't being analyzed at all
- Or the analysis is failing to extract any meaningful data
- Or the provider data is being discarded

The solution is to trace through the extractor step-by-step and find exactly where it's failing.
