# Campfire Particle Documentation - File Index

## Overview
This directory contains comprehensive documentation for debugging campfire particle generation in Weaverbird.

---

## Documentation Files

### `README.md`
Master documentation explaining the entire particle system, comparing Minecraft's implementation to Weaverbird's.

### `EXPECTED_VS_ACTUAL.md`
Detailed comparison showing:
- What SHOULD be extracted from Minecraft source
- What IS ACTUALLY being extracted
- Why the extraction is failing
- Debugging steps

### `BLOCK_EMISSIONS.md`
Documentation of block particle emissions:
- When particles spawn (animateTick vs particleTick)
- Spawn probabilities and counts
- Position/velocity expressions
- Expected vs actual emission data

### `FILE_INDEX.md` (this file)
Complete listing of all files in this directory.

### `OBFUSCATION_MAPPINGS.md`
Mapping reference showing obfuscated class names → deobfuscated names.
Explains how to read obfuscated code and why both versions exist.

---

## Java Source Files (Minecraft 1.21.10-0.18.1)

### Particle Classes (java_deobfuscated/)

#### Core Particle Implementation
- `CampfireSmokeParticle.java` - The campfire smoke particle class with SignalProvider and CosyProvider
- `Particle.java` - Base particle class (gravity, friction, movement)
- `SingleQuadParticle.java` - Base class for billboard particles
- `SpriteSet.java` - Texture frame management
- `ParticleProvider.java` - Interface for particle creation

#### Block & Emission
- `CampfireBlock.java` - Block logic, animateTick particle spawning
- `CampfireBlockEntity.java` - Block entity logic, particleTick particle spawning

#### Registration & Types
- `ParticleTypes.java` - Registry of all particle types
- `SimpleParticleType.java` - Type definition for simple particles
- `ParticleEngine.java` - Client-side particle manager

---

## TypeScript/Rust Implementation Files (ts/)

### Rust Extractors
- `particle_physics_extractor.rs` - Extracts particle physics from decompiled Minecraft source
- `block_particle_extractor.rs` - Extracts block particle emissions from decompiled source

### Frontend Particle System
- `ParticleEngine.ts` - Three.js particle engine (simulates Minecraft physics)
- `particleTextureLoader.ts` - Loads particle textures
- `index.ts` - Particle library exports

### React Components
- `ParticleEmitter3D.tsx` - Component that spawns particles for a single emission
- `BlockParticles.tsx` - Wrapper that queries emissions and creates emitters

### Constants & Data
- `particlePhysics.ts` - Loads and converts extracted physics data
- `blockParticleEmissions.ts` - Loads and queries extracted emission data

---

## How to Use This Documentation

### 1. Understand How Minecraft Does It
Read the Java files in `java_deobfuscated/` to see exactly how Minecraft:
- Creates campfire smoke particles (CampfireSmokeParticle.java)
- Spawns them from blocks (CampfireBlock.java, CampfireBlockEntity.java)
- Manages textures (SpriteSet.java)
- Applies physics (Particle.java, SingleQuadParticle.java)

### 2. Check What We're Extracting
Compare `EXPECTED_VS_ACTUAL.md` against the actual cached extraction:
```bash
cat ~/Library/Caches/weaverbird/particle_physics/1.21.10-0.18.1.json | \
  python3 -m json.tool | \
  grep -A 25 '"campfire_signal_smoke"'
```

### 3. Trace Through the Extractor
Read `particle_physics_extractor.rs` and `block_particle_extractor.rs` to understand:
- How they parse decompiled Java
- What patterns they're looking for
- Where they might be failing

### 4. Fix the Frontend
Once extraction is correct, verify `ParticleEngine.ts` implements:
- Correct gravity application
- Skipping friction for particles that override tick()
- Static random texture selection
- All other physics from extracted data

### 5. Test
Compare visually against vanilla Minecraft:
- Campfire with signal smoke (hay bale underneath)
- Campfire with cosy smoke (no hay bale)
- Check particle count, movement, texture, lifetime

---

## Quick Reference: Critical Differences

### CampfireSmokeParticle vs Base Particle

| Property | Base Particle | CampfireSmokeParticle |
|----------|---------------|----------------------|
| **Friction** | 0.98 (applied in tick()) | NONE (overrides tick()) |
| **Texture** | Cycles through frames | ONE random frame, static |
| **Lifetime** | [4, 40] ticks | Signal: [280, 329], Cosy: [80, 129] |
| **Gravity** | 0 by default | 0.000003 (slight upward) |
| **Scale** | Random 0.1-0.2 | 3.0 |
| **Alpha** | 1.0 | Signal: 0.95, Cosy: 0.9 |
| **Velocity Jitter** | None | ±(random/5000) on X,Z per tick |

---

## Problem Summary

**Symptoms:**
1. All particles floating up (no gravity)
2. Signal smoke not using static texture (cycling through frames)
3. Smoke lost color

**Root Causes:**
1. Extraction failing for campfire smoke particles
2. Using default base Particle physics instead of CampfireSmokeParticle-specific
3. Provider data being filtered out or not extracted
4. Frontend not using extracted flags correctly

**Solution:**
Fix the extraction chain end-to-end, then verify frontend implementation.

