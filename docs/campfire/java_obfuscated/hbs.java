// Location: hbs.class (obfuscated)
// This is a synthetic obfuscated version showing what the code looks like before Mojang mappings
// CampfireSmokeParticle → hbs

/*
 * Decompiled with CFR 0.152.
 */
package net.minecraft.client.particle;

import ghz;
import hcy;
import hdc;
import hdo;
import hdw;
import net.minecraft.client.renderer.texture.akj;
import mj;
import bcu;

public class hbs
extends hdo {
    hbs(ghz $$0, double $$1, double $$2, double $$3, double $$4, double $$5, double $$6, boolean $$7, akj $$8) {
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
    public hdo.Layer getLayer() {
        return hdo.Layer.TRANSLUCENT;
    }

    public static class b
    implements hdc<mj> {
        private final hdw sprites;

        public b(hdw $$0) {
            this.sprites = $$0;
        }

        @Override
        public hcy createParticle(mj $$0, ghz $$1, double $$2, double $$3, double $$4, double $$5, double $$6, double $$7, bcu $$8) {
            hbs $$9 = new hbs($$1, $$2, $$3, $$4, $$5, $$6, $$7, true, this.sprites.get($$8));
            $$9.setAlpha(0.95f);
            return $$9;
        }
    }

    public static class a
    implements hdc<mj> {
        private final hdw sprites;

        public a(hdw $$0) {
            this.sprites = $$0;
        }

        @Override
        public hcy createParticle(mj $$0, ghz $$1, double $$2, double $$3, double $$4, double $$5, double $$6, double $$7, bcu $$8) {
            hbs $$9 = new hbs($$1, $$2, $$3, $$4, $$5, $$6, $$7, false, this.sprites.get($$8));
            $$9.setAlpha(0.9f);
            return $$9;
        }
    }
}


