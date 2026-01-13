// Location: net/minecraft/client/particle/ParticleProvider.java
// Decompiled from Minecraft JAR version 1.21.10-0.18.1 using CFR decompiler with Mojang mappings

/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.annotation.Nullable
 */
package net.minecraft.client.particle;

import javax.annotation.Nullable;
import net.minecraft.client.multiplayer.ClientLevel;
import net.minecraft.client.particle.Particle;
import net.minecraft.client.particle.SingleQuadParticle;
import net.minecraft.core.particles.ParticleOptions;
import net.minecraft.util.RandomSource;

public interface ParticleProvider<T extends ParticleOptions> {
    @Nullable
    public Particle createParticle(T var1, ClientLevel var2, double var3, double var5, double var7, double var9, double var11, double var13, RandomSource var15);

    public static interface Sprite<T extends ParticleOptions> {
        @Nullable
        public SingleQuadParticle createParticle(T var1, ClientLevel var2, double var3, double var5, double var7, double var9, double var11, double var13, RandomSource var15);
    }
}

