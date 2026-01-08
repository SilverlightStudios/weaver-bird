// Location: net/minecraft/client/particle/Particle.java
// Decompiled from Minecraft JAR version 1.21.10-0.18.1 using CFR decompiler with Mojang mappings

/*
 * Decompiled with CFR 0.152.
 */
package net.minecraft.client.particle;

import java.lang.invoke.MethodHandle;
import java.lang.runtime.ObjectMethods;
import java.util.List;
import java.util.Optional;
import net.minecraft.client.multiplayer.ClientLevel;
import net.minecraft.client.particle.ParticleRenderType;
import net.minecraft.client.renderer.LevelRenderer;
import net.minecraft.core.BlockPos;
import net.minecraft.core.particles.ParticleLimit;
import net.minecraft.util.Mth;
import net.minecraft.util.RandomSource;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;

public abstract class Particle {
    private static final AABB INITIAL_AABB = new AABB(0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
    private static final double MAXIMUM_COLLISION_VELOCITY_SQUARED = Mth.square(100.0);
    protected final ClientLevel level;
    protected double xo;
    protected double yo;
    protected double zo;
    protected double x;
    protected double y;
    protected double z;
    protected double xd;
    protected double yd;
    protected double zd;
    private AABB bb = INITIAL_AABB;
    protected boolean onGround;
    protected boolean hasPhysics = true;
    private boolean stoppedByCollision;
    protected boolean removed;
    protected float bbWidth = 0.6f;
    protected float bbHeight = 1.8f;
    protected final RandomSource random = RandomSource.create();
    protected int age;
    protected int lifetime;
    protected float gravity;
    protected float friction = 0.98f;
    protected boolean speedUpWhenYMotionIsBlocked = false;

    protected Particle(ClientLevel $$0, double $$1, double $$2, double $$3) {
        this.level = $$0;
        this.setSize(0.2f, 0.2f);
        this.setPos($$1, $$2, $$3);
        this.xo = $$1;
        this.yo = $$2;
        this.zo = $$3;
        this.lifetime = (int)(4.0f / (this.random.nextFloat() * 0.9f + 0.1f));
    }

    public Particle(ClientLevel $$0, double $$1, double $$2, double $$3, double $$4, double $$5, double $$6) {
        this($$0, $$1, $$2, $$3);
        this.xd = $$4 + (Math.random() * 2.0 - 1.0) * (double)0.4f;
        this.yd = $$5 + (Math.random() * 2.0 - 1.0) * (double)0.4f;
        this.zd = $$6 + (Math.random() * 2.0 - 1.0) * (double)0.4f;
        double $$7 = (Math.random() + Math.random() + 1.0) * (double)0.15f;
        double $$8 = Math.sqrt(this.xd * this.xd + this.yd * this.yd + this.zd * this.zd);
        this.xd = this.xd / $$8 * $$7 * (double)0.4f;
        this.yd = this.yd / $$8 * $$7 * (double)0.4f + (double)0.1f;
        this.zd = this.zd / $$8 * $$7 * (double)0.4f;
    }

    public Particle setPower(float $$0) {
        this.xd *= (double)$$0;
        this.yd = (this.yd - (double)0.1f) * (double)$$0 + (double)0.1f;
        this.zd *= (double)$$0;
        return this;
    }

    public void setParticleSpeed(double $$0, double $$1, double $$2) {
        this.xd = $$0;
        this.yd = $$1;
        this.zd = $$2;
    }

    public Particle scale(float $$0) {
        this.setSize(0.2f * $$0, 0.2f * $$0);
        return this;
    }

    public void setLifetime(int $$0) {
        this.lifetime = $$0;
    }

    public int getLifetime() {
        return this.lifetime;
    }

    public void tick() {
        this.xo = this.x;
        this.yo = this.y;
        this.zo = this.z;
        if (this.age++ >= this.lifetime) {
            this.remove();
            return;
        }
        this.yd -= 0.04 * (double)this.gravity;
        this.move(this.xd, this.yd, this.zd);
        if (this.speedUpWhenYMotionIsBlocked && this.y == this.yo) {
            this.xd *= 1.1;
            this.zd *= 1.1;
        }
        this.xd *= (double)this.friction;
        this.yd *= (double)this.friction;
        this.zd *= (double)this.friction;
        if (this.onGround) {
            this.xd *= (double)0.7f;
            this.zd *= (double)0.7f;
        }
    }

    public abstract ParticleRenderType getGroup();

    public String toString() {
        return this.getClass().getSimpleName() + ", Pos (" + this.x + "," + this.y + "," + this.z + "), Age " + this.age;
    }

    public void remove() {
        this.removed = true;
    }

    protected void setSize(float $$0, float $$1) {
        if ($$0 != this.bbWidth || $$1 != this.bbHeight) {
            this.bbWidth = $$0;
            this.bbHeight = $$1;
            AABB $$2 = this.getBoundingBox();
            double $$3 = ($$2.minX + $$2.maxX - (double)$$0) / 2.0;
            double $$4 = ($$2.minZ + $$2.maxZ - (double)$$0) / 2.0;
            this.setBoundingBox(new AABB($$3, $$2.minY, $$4, $$3 + (double)this.bbWidth, $$2.minY + (double)this.bbHeight, $$4 + (double)this.bbWidth));
        }
    }

    public void setPos(double $$0, double $$1, double $$2) {
        this.x = $$0;
        this.y = $$1;
        this.z = $$2;
        float $$3 = this.bbWidth / 2.0f;
        float $$4 = this.bbHeight;
        this.setBoundingBox(new AABB($$0 - (double)$$3, $$1, $$2 - (double)$$3, $$0 + (double)$$3, $$1 + (double)$$4, $$2 + (double)$$3));
    }

    public void move(double $$0, double $$1, double $$2) {
        if (this.stoppedByCollision) {
            return;
        }
        double $$3 = $$0;
        double $$4 = $$1;
        double $$5 = $$2;
        if (this.hasPhysics && ($$0 != 0.0 || $$1 != 0.0 || $$2 != 0.0) && $$0 * $$0 + $$1 * $$1 + $$2 * $$2 < MAXIMUM_COLLISION_VELOCITY_SQUARED) {
            Vec3 $$6 = Entity.collideBoundingBox(null, new Vec3($$0, $$1, $$2), this.getBoundingBox(), this.level, List.of());
            $$0 = $$6.x;
            $$1 = $$6.y;
            $$2 = $$6.z;
        }
        if ($$0 != 0.0 || $$1 != 0.0 || $$2 != 0.0) {
            this.setBoundingBox(this.getBoundingBox().move($$0, $$1, $$2));
            this.setLocationFromBoundingbox();
        }
        if (Math.abs($$4) >= (double)1.0E-5f && Math.abs($$1) < (double)1.0E-5f) {
            this.stoppedByCollision = true;
        }
        boolean bl2 = this.onGround = $$4 != $$1 && $$4 < 0.0;
        if ($$3 != $$0) {
            this.xd = 0.0;
        }
        if ($$5 != $$2) {
            this.zd = 0.0;
        }
    }

    protected void setLocationFromBoundingbox() {
        AABB $$0 = this.getBoundingBox();
        this.x = ($$0.minX + $$0.maxX) / 2.0;
        this.y = $$0.minY;
        this.z = ($$0.minZ + $$0.maxZ) / 2.0;
    }

    protected int getLightColor(float $$0) {
        BlockPos $$1 = BlockPos.containing(this.x, this.y, this.z);
        if (this.level.hasChunkAt($$1)) {
            return LevelRenderer.getLightColor(this.level, $$1);
        }
        return 0;
    }

    public boolean isAlive() {
        return !this.removed;
    }

    public AABB getBoundingBox() {
        return this.bb;
    }

    public void setBoundingBox(AABB $$0) {
        this.bb = $$0;
    }

    public Optional<ParticleLimit> getParticleLimit() {
        return Optional.empty();
    }

    public record LifetimeAlpha(float startAlpha, float endAlpha, float startAtNormalizedAge, float endAtNormalizedAge) {
        public static final LifetimeAlpha ALWAYS_OPAQUE = new LifetimeAlpha(1.0f, 1.0f, 0.0f, 1.0f);

        public boolean isOpaque() {
            return this.b >= 1.0f && this.c >= 1.0f;
        }

        public float currentAlphaForAge(int $$0, int $$1, float $$2) {
            if (Mth.equal(this.b, this.c)) {
                return this.b;
            }
            float $$3 = Mth.inverseLerp(((float)$$0 + $$2) / (float)$$1, this.d, this.e);
            return Mth.clampedLerp(this.b, this.c, $$3);
        }

        @Override
        public final String toString() {
            return ObjectMethods.bootstrap("toString", new MethodHandle[]{LifetimeAlpha.class, "startAlpha;endAlpha;startAtNormalizedAge;endAtNormalizedAge", "b", "c", "d", "e"}, this);
        }

        @Override
        public final int hashCode() {
            return (int)ObjectMethods.bootstrap("hashCode", new MethodHandle[]{LifetimeAlpha.class, "startAlpha;endAlpha;startAtNormalizedAge;endAtNormalizedAge", "b", "c", "d", "e"}, this);
        }

        @Override
        public final boolean equals(Object $$0) {
            return (boolean)ObjectMethods.bootstrap("equals", new MethodHandle[]{LifetimeAlpha.class, "startAlpha;endAlpha;startAtNormalizedAge;endAtNormalizedAge", "b", "c", "d", "e"}, this, $$0);
        }
    }
}

