// Location: net/minecraft/client/particle/CampfireSmokeParticle.java
// Decompiled from Minecraft JAR version 1.21.10-0.18.1 using CFR decompiler with Mojang mappings

/*
 * Decompiled with CFR 0.152.
 */
package net.minecraft.client.particle;

import net.minecraft.client.multiplayer.ClientLevel;
import net.minecraft.client.particle.Particle;
import net.minecraft.client.particle.ParticleProvider;
import net.minecraft.client.particle.SingleQuadParticle;
import net.minecraft.client.particle.SpriteSet;
import net.minecraft.client.renderer.texture.TextureAtlasSprite;
import net.minecraft.core.particles.SimpleParticleType;
import net.minecraft.util.RandomSource;

public class CampfireSmokeParticle
extends SingleQuadParticle {
    CampfireSmokeParticle(ClientLevel $$0, double $$1, double $$2, double $$3, double $$4, double $$5, double $$6, boolean $$7, TextureAtlasSprite $$8) {
        super($$0, $$1, $$2, $$3, $$8);
        this.scale(3.0f);
        this.setSize(0.25f, 0.25f);
        this.lifetime = $$7 ? this.random.nextInt(50) + 280 : this.random.nextInt(50) + 80;
        this.gravity = 3.0E-6f;
        this.xd = $$4;
        this.yd = $$5 + (double)(this.random.nextFloat() / 500.0f);
        this.zd = $$6;
    }

    @Override
    public void tick() {
        this.xo = this.x;
        this.yo = this.y;
        this.zo = this.z;
        if (this.age++ >= this.lifetime || this.alpha <= 0.0f) {
            this.remove();
            return;
        }
        this.xd += (double)(this.random.nextFloat() / 5000.0f * (float)(this.random.nextBoolean() ? 1 : -1));
        this.zd += (double)(this.random.nextFloat() / 5000.0f * (float)(this.random.nextBoolean() ? 1 : -1));
        this.yd -= (double)this.gravity;
        this.move(this.xd, this.yd, this.zd);
        if (this.age >= this.lifetime - 60 && this.alpha > 0.01f) {
            this.alpha -= 0.015f;
        }
    }

    @Override
    public SingleQuadParticle.Layer getLayer() {
        return SingleQuadParticle.Layer.TRANSLUCENT;
    }

    public static class SignalProvider
    implements ParticleProvider<SimpleParticleType> {
        private final SpriteSet sprites;

        public SignalProvider(SpriteSet $$0) {
            this.sprites = $$0;
        }

        @Override
        public Particle createParticle(SimpleParticleType $$0, ClientLevel $$1, double $$2, double $$3, double $$4, double $$5, double $$6, double $$7, RandomSource $$8) {
            CampfireSmokeParticle $$9 = new CampfireSmokeParticle($$1, $$2, $$3, $$4, $$5, $$6, $$7, true, this.sprites.get($$8));
            $$9.setAlpha(0.95f);
            return $$9;
        }
    }

    public static class CosyProvider
    implements ParticleProvider<SimpleParticleType> {
        private final SpriteSet sprites;

        public CosyProvider(SpriteSet $$0) {
            this.sprites = $$0;
        }

        @Override
        public Particle createParticle(SimpleParticleType $$0, ClientLevel $$1, double $$2, double $$3, double $$4, double $$5, double $$6, double $$7, RandomSource $$8) {
            CampfireSmokeParticle $$9 = new CampfireSmokeParticle($$1, $$2, $$3, $$4, $$5, $$6, $$7, false, this.sprites.get($$8));
            $$9.setAlpha(0.9f);
            return $$9;
        }
    }
}

