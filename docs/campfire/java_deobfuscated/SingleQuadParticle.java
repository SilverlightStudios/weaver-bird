// Location: net/minecraft/client/particle/SingleQuadParticle.java
// Decompiled from Minecraft JAR version 1.21.10-0.18.1 using CFR decompiler with Mojang mappings

/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.joml.Quaternionf
 *  org.joml.Quaternionfc
 */
package net.minecraft.client.particle;

import com.mojang.blaze3d.pipeline.RenderPipeline;
import java.lang.invoke.MethodHandle;
import java.lang.runtime.ObjectMethods;
import net.minecraft.client.Camera;
import net.minecraft.client.multiplayer.ClientLevel;
import net.minecraft.client.particle.Particle;
import net.minecraft.client.particle.ParticleRenderType;
import net.minecraft.client.particle.SpriteSet;
import net.minecraft.client.renderer.RenderPipelines;
import net.minecraft.client.renderer.state.QuadParticleRenderState;
import net.minecraft.client.renderer.texture.TextureAtlas;
import net.minecraft.client.renderer.texture.TextureAtlasSprite;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.util.ARGB;
import net.minecraft.util.Mth;
import net.minecraft.world.phys.Vec3;
import org.joml.Quaternionf;
import org.joml.Quaternionfc;

public abstract class SingleQuadParticle
extends Particle {
    protected float quadSize;
    protected float rCol = 1.0f;
    protected float gCol = 1.0f;
    protected float bCol = 1.0f;
    protected float alpha = 1.0f;
    protected float roll;
    protected float oRoll;
    protected TextureAtlasSprite sprite;

    protected SingleQuadParticle(ClientLevel $$0, double $$1, double $$2, double $$3, TextureAtlasSprite $$4) {
        super($$0, $$1, $$2, $$3);
        this.sprite = $$4;
        this.quadSize = 0.1f * (this.random.nextFloat() * 0.5f + 0.5f) * 2.0f;
    }

    protected SingleQuadParticle(ClientLevel $$0, double $$1, double $$2, double $$3, double $$4, double $$5, double $$6, TextureAtlasSprite $$7) {
        super($$0, $$1, $$2, $$3, $$4, $$5, $$6);
        this.sprite = $$7;
        this.quadSize = 0.1f * (this.random.nextFloat() * 0.5f + 0.5f) * 2.0f;
    }

    public FacingCameraMode getFacingCameraMode() {
        return FacingCameraMode.LOOKAT_XYZ;
    }

    public void extract(QuadParticleRenderState $$0, Camera $$1, float $$2) {
        Quaternionf $$3 = new Quaternionf();
        this.getFacingCameraMode().setRotation($$3, $$1, $$2);
        if (this.roll != 0.0f) {
            $$3.rotateZ(Mth.lerp($$2, this.oRoll, this.roll));
        }
        this.extractRotatedQuad($$0, $$1, $$3, $$2);
    }

    protected void extractRotatedQuad(QuadParticleRenderState $$0, Camera $$1, Quaternionf $$2, float $$3) {
        Vec3 $$4 = $$1.getPosition();
        float $$5 = (float)(Mth.lerp((double)$$3, this.xo, this.x) - $$4.x());
        float $$6 = (float)(Mth.lerp((double)$$3, this.yo, this.y) - $$4.y());
        float $$7 = (float)(Mth.lerp((double)$$3, this.zo, this.z) - $$4.z());
        this.extractRotatedQuad($$0, $$2, $$5, $$6, $$7, $$3);
    }

    protected void extractRotatedQuad(QuadParticleRenderState $$0, Quaternionf $$1, float $$2, float $$3, float $$4, float $$5) {
        $$0.add(this.getLayer(), $$2, $$3, $$4, $$1.x, $$1.y, $$1.z, $$1.w, this.getQuadSize($$5), this.getU0(), this.getU1(), this.getV0(), this.getV1(), ARGB.colorFromFloat(this.alpha, this.rCol, this.gCol, this.bCol), this.getLightColor($$5));
    }

    public float getQuadSize(float $$0) {
        return this.quadSize;
    }

    @Override
    public Particle scale(float $$0) {
        this.quadSize *= $$0;
        return super.scale($$0);
    }

    @Override
    public ParticleRenderType getGroup() {
        return ParticleRenderType.SINGLE_QUADS;
    }

    public void setSpriteFromAge(SpriteSet $$0) {
        if (!this.removed) {
            this.setSprite($$0.get(this.age, this.lifetime));
        }
    }

    protected void setSprite(TextureAtlasSprite $$0) {
        this.sprite = $$0;
    }

    protected float getU0() {
        return this.sprite.getU0();
    }

    protected float getU1() {
        return this.sprite.getU1();
    }

    protected float getV0() {
        return this.sprite.getV0();
    }

    protected float getV1() {
        return this.sprite.getV1();
    }

    protected abstract Layer getLayer();

    public void setColor(float $$0, float $$1, float $$2) {
        this.rCol = $$0;
        this.gCol = $$1;
        this.bCol = $$2;
    }

    protected void setAlpha(float $$0) {
        this.alpha = $$0;
    }

    @Override
    public String toString() {
        return this.getClass().getSimpleName() + ", Pos (" + this.x + "," + this.y + "," + this.z + "), RGBA (" + this.rCol + "," + this.gCol + "," + this.bCol + "," + this.alpha + "), Age " + this.age;
    }

    public static interface FacingCameraMode {
        public static final FacingCameraMode LOOKAT_XYZ = ($$0, $$1, $$2) -> $$0.set((Quaternionfc)$$1.rotation());
        public static final FacingCameraMode LOOKAT_Y = ($$0, $$1, $$2) -> $$0.set(0.0f, $$1.rotation().y, 0.0f, $$1.rotation().w);

        public void setRotation(Quaternionf var1, Camera var2, float var3);
    }

    public static final class Layer
    extends Record {
        private final boolean translucent;
        private final ResourceLocation textureAtlasLocation;
        private final RenderPipeline pipeline;
        public static final Layer TERRAIN = new Layer(true, TextureAtlas.LOCATION_BLOCKS, RenderPipelines.TRANSLUCENT_PARTICLE);
        public static final Layer OPAQUE = new Layer(false, TextureAtlas.LOCATION_PARTICLES, RenderPipelines.OPAQUE_PARTICLE);
        public static final Layer TRANSLUCENT = new Layer(true, TextureAtlas.LOCATION_PARTICLES, RenderPipelines.TRANSLUCENT_PARTICLE);

        public Layer(boolean $$0, ResourceLocation $$1, RenderPipeline $$2) {
            this.translucent = $$0;
            this.textureAtlasLocation = $$1;
            this.pipeline = $$2;
        }

        @Override
        public final String toString() {
            return ObjectMethods.bootstrap("toString", new MethodHandle[]{Layer.class, "translucent;textureAtlasLocation;pipeline", "d", "e", "f"}, this);
        }

        @Override
        public final int hashCode() {
            return (int)ObjectMethods.bootstrap("hashCode", new MethodHandle[]{Layer.class, "translucent;textureAtlasLocation;pipeline", "d", "e", "f"}, this);
        }

        @Override
        public final boolean equals(Object $$0) {
            return (boolean)ObjectMethods.bootstrap("equals", new MethodHandle[]{Layer.class, "translucent;textureAtlasLocation;pipeline", "d", "e", "f"}, this, $$0);
        }

        public boolean translucent() {
            return this.translucent;
        }

        public ResourceLocation textureAtlasLocation() {
            return this.textureAtlasLocation;
        }

        public RenderPipeline pipeline() {
            return this.pipeline;
        }
    }
}

