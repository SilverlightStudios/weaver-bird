// Location: net/minecraft/client/particle/SpriteSet.java
// Decompiled from Minecraft JAR version 1.21.10-0.18.1 using CFR decompiler with Mojang mappings

/*
 * Decompiled with CFR 0.152.
 */
package net.minecraft.client.particle;

import net.minecraft.client.renderer.texture.TextureAtlasSprite;
import net.minecraft.util.RandomSource;

public interface SpriteSet {
    public TextureAtlasSprite get(int var1, int var2);

    public TextureAtlasSprite get(RandomSource var1);

    public TextureAtlasSprite first();
}

