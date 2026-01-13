// Location: mj.class (obfuscated)
// This is a synthetic obfuscated version showing what the code looks like before Mojang mappings
// SimpleParticleType → mj

/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.mojang.serialization.MapCodec
 */
package particles;

import com.mojang.serialization.MapCodec;
import ParticleOptions;
import ParticleType;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;

public class mj
extends ParticleType<mj>
implements ParticleOptions {
    private final MapCodec<mj> codec = MapCodec.unit(this::getType);
    private final StreamCodec<RegistryFriendlyByteBuf, mj> streamCodec = StreamCodec.unit(this);

    protected mj(boolean $$0) {
        super($$0);
    }

    public mj getType() {
        return this;
    }

    @Override
    public MapCodec<mj> codec() {
        return this.codec;
    }

    @Override
    public StreamCodec<RegistryFriendlyByteBuf, mj> streamCodec() {
        return this.streamCodec;
    }

    public /* synthetic */ ParticleType getType() {
        return this.getType();
    }
}


