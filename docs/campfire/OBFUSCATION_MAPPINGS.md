# Obfuscation Mappings for Minecraft 1.21.10-0.18.1

This document maps obfuscated class names to their deobfuscated equivalents using Mojang's official mappings.

## Class Name Mappings

### Particle System Classes

| Obfuscated | Deobfuscated | Description |
|-----------|--------------|-------------|
| `hbs` | `CampfireSmokeParticle` | Campfire smoke particle implementation |
| `hbs$a` | `CampfireSmokeParticle$CosyProvider` | Provider for cosy smoke |
| `hbs$b` | `CampfireSmokeParticle$SignalProvider` | Provider for signal smoke |
| `hcy` | `Particle` | Base particle class |
| `hcy$a` | `Particle$LifetimeAlpha` | Lifetime alpha helper |
| `hdo` | `SingleQuadParticle` | Single quad billboard particle base |
| `hdo$a` | `SingleQuadParticle$FacingCameraMode` | Camera facing mode enum |
| `hdo$b` | `SingleQuadParticle$Layer` | Render layer enum |
| `hdw` | `SpriteSet` | Texture sprite set interface |
| `hdc` | `ParticleProvider` | Particle creation interface |
| `hdc$a` | `ParticleProvider$Sprite` | Sprite provider type |
| `hda` | `ParticleEngine` | Client particle manager |

### Particle Type Classes

| Obfuscated | Deobfuscated | Description |
|-----------|--------------|-------------|
| `me` | `ParticleTypes` | Registry of all particle types |
| `me$1` | `ParticleTypes$1` | Anonymous inner class |
| `mj` | `SimpleParticleType` | Simple particle type definition |

### Block Classes

| Obfuscated | Deobfuscated | Description |
|-----------|--------------|-------------|
| `dvl` | `CampfireBlock` | Campfire block implementation |
| `egn` | `CampfireBlockEntity` | Campfire block entity |

## Common Type Mappings

### Minecraft Types

| Obfuscated | Deobfuscated |
|-----------|--------------|
| `akj` | `TextureAtlasSprite` |
| `bcu` | `RandomSource` |
| `ghz` | `ClientLevel` |
| `jh` | `BlockPos` |
| `dvb` | `BlockState` |
| `dhb` | `Level` |

### Variable Name Patterns

In obfuscated code, variables are typically named:
- `$$0`, `$$1`, `$$2`, etc. - Method parameters
- `$0`, `$1`, `$2`, etc. - Local variables

## How to Read Obfuscated Code

### Example: Provider Creation

**Deobfuscated:**
```java
public Particle createParticle(
    SimpleParticleType type,
    ClientLevel level,
    double x, double y, double z,
    double xSpeed, double ySpeed, double zSpeed,
    RandomSource randomSource
) {
    CampfireSmokeParticle particle = new CampfireSmokeParticle(
        level, x, y, z, xSpeed, ySpeed, zSpeed,
        true,
        this.sprites.get(randomSource)
    );
    particle.setAlpha(0.95f);
    return particle;
}
```

**Obfuscated:**
```java
public hcy createParticle(
    mj $$0,
    ghz $$1,
    double $$2, double $$3, double $$4,
    double $$5, double $$6, double $$7,
    bcu $$8
) {
    hbs $$9 = new hbs(
        $$1, $$2, $$3, $$4, $$5, $$6, $$7,
        true,
        this.b.get($$8)
    );
    $$9.setAlpha(0.95f);
    return $$9;
}
```

## Why Both Versions Matter

### Deobfuscated Code
- **Readable** - Uses meaningful names
- **Understandable** - Shows intent clearly
- **Used for**: Understanding Minecraft's implementation
- **Found in**: `java_deobfuscated/` directory

### Obfuscated Code
- **What CFR sees** - The actual bytecode names
- **What extractors parse** - Must handle obfuscated names
- **Used for**: Debugging extraction issues
- **Found in**: `java_obfuscated/` directory

## Extraction Implications

When the Rust extractor parses decompiled code:

1. **Without Mappings**: Sees obfuscated names (`hbs`, `$$0`, `$$1`)
   - Must use mappings to identify classes
   - Variable names are meaningless
   - Harder to parse patterns

2. **With Mappings**: Sees deobfuscated names (`CampfireSmokeParticle`, `level`, `randomSource`)
   - Classes are identifiable
   - Variable names help understanding
   - Easier to parse patterns

**Current Approach**: Weaverbird decompiles WITH mappings, so extractors see deobfuscated code. This makes pattern matching much easier.

## Mappings File Location

```
~/Library/Caches/weaverbird/particle_physics/1.21.10-0.18.1-mappings.txt
```

Format:
```
net.minecraft.client.particle.CampfireSmokeParticle -> hbs:
    3:3:void <init>(ClientLevel,double,double,double,double,double,double,boolean,TextureAtlasSprite) -> <init>
    17:17:void <init>(ClientLevel,double,double,double,double,double,double,boolean,TextureAtlasSprite) -> <init>
    ...
```

## See Also

- `java_deobfuscated/` - Human-readable Minecraft source
- `java_obfuscated/` - Synthetic obfuscated versions (for comparison)
- `README.md` - Full particle system documentation
