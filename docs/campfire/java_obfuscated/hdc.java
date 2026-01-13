// Location: hdc.class (obfuscated)
// This is a synthetic obfuscated version showing what the code looks like before Mojang mappings
// ParticleProvider → hdc

/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.annotation.Nullable
 */
package net.minecraft.client.particle;

import javax.annotation.Nullable;
import ghz;
import hcy;
import hdo;
import ParticleOptions;
import bcu;

public interface hdc<T extends ParticleOptions> {
    @Nullable
    public hcy createParticle(T var1, ghz var2, double var3, double var5, double var7, double var9, double var11, double var13, bcu var15);

    public static interface Sprite<T extends ParticleOptions> {
        @Nullable
        public hdo createParticle(T var1, ghz var2, double var3, double var5, double var7, double var9, double var11, double var13, bcu var15);
    }
}


