// Location: me.class (obfuscated)
// This is a synthetic obfuscated version showing what the code looks like before Mojang mappings
// ParticleTypes → me

/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.mojang.serialization.Codec
 *  com.mojang.serialization.MapCodec
 */
package particles;

import com.mojang.serialization.Codec;
import com.mojang.serialization.MapCodec;
import java.util.function.Function;
import Registry;
import BlockParticleOption;
import ColorParticleOption;
import DustColorTransitionOptions;
import DustParticleOptions;
import ItemParticleOption;
import ParticleOptions;
import ParticleType;
import PowerParticleOption;
import SculkChargeParticleOptions;
import ShriekParticleOption;
import mj;
import SpellParticleOption;
import TrailParticleOption;
import VibrationParticleOption;
import registries.BuiltInRegistries;
import registries.Registries;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;

public class me {
    public static final mj ANGRY_VILLAGER = me.register("angry_villager", false);
    public static final ParticleType<BlockParticleOption> BLOCK = me.register("block", false, BlockParticleOption::codec, BlockParticleOption::streamCodec);
    public static final ParticleType<BlockParticleOption> BLOCK_MARKER = me.register("block_marker", true, BlockParticleOption::codec, BlockParticleOption::streamCodec);
    public static final mj BUBBLE = me.register("bubble", false);
    public static final mj CLOUD = me.register("cloud", false);
    public static final mj COPPER_FIRE_FLAME = me.register("copper_fire_flame", false);
    public static final mj CRIT = me.register("crit", false);
    public static final mj DAMAGE_INDICATOR = me.register("damage_indicator", true);
    public static final ParticleType<PowerParticleOption> DRAGON_BREATH = me.register("dragon_breath", false, PowerParticleOption::codec, PowerParticleOption::streamCodec);
    public static final mj DRIPPING_LAVA = me.register("dripping_lava", false);
    public static final mj FALLING_LAVA = me.register("falling_lava", false);
    public static final mj LANDING_LAVA = me.register("landing_lava", false);
    public static final mj DRIPPING_WATER = me.register("dripping_water", false);
    public static final mj FALLING_WATER = me.register("falling_water", false);
    public static final ParticleType<DustParticleOptions> DUST = me.register("dust", false, $$0 -> DustParticleOptions.CODEC, $$0 -> DustParticleOptions.STREAM_CODEC);
    public static final ParticleType<DustColorTransitionOptions> DUST_COLOR_TRANSITION = me.register("dust_color_transition", false, $$0 -> DustColorTransitionOptions.CODEC, $$0 -> DustColorTransitionOptions.STREAM_CODEC);
    public static final ParticleType<SpellParticleOption> EFFECT = me.register("effect", false, SpellParticleOption::codec, SpellParticleOption::streamCodec);
    public static final mj ELDER_GUARDIAN = me.register("elder_guardian", true);
    public static final mj ENCHANTED_HIT = me.register("enchanted_hit", false);
    public static final mj ENCHANT = me.register("enchant", false);
    public static final mj END_ROD = me.register("end_rod", false);
    public static final ParticleType<ColorParticleOption> ENTITY_EFFECT = me.register("entity_effect", false, ColorParticleOption::codec, ColorParticleOption::streamCodec);
    public static final mj EXPLOSION_EMITTER = me.register("explosion_emitter", true);
    public static final mj EXPLOSION = me.register("explosion", true);
    public static final mj GUST = me.register("gust", true);
    public static final mj SMALL_GUST = me.register("small_gust", false);
    public static final mj GUST_EMITTER_LARGE = me.register("gust_emitter_large", true);
    public static final mj GUST_EMITTER_SMALL = me.register("gust_emitter_small", true);
    public static final mj SONIC_BOOM = me.register("sonic_boom", true);
    public static final ParticleType<BlockParticleOption> FALLING_DUST = me.register("falling_dust", false, BlockParticleOption::codec, BlockParticleOption::streamCodec);
    public static final mj FIREWORK = me.register("firework", false);
    public static final mj FISHING = me.register("fishing", false);
    public static final mj FLAME = me.register("flame", false);
    public static final mj INFESTED = me.register("infested", false);
    public static final mj CHERRY_LEAVES = me.register("cherry_leaves", false);
    public static final mj PALE_OAK_LEAVES = me.register("pale_oak_leaves", false);
    public static final ParticleType<ColorParticleOption> TINTED_LEAVES = me.register("tinted_leaves", false, ColorParticleOption::codec, ColorParticleOption::streamCodec);
    public static final mj SCULK_SOUL = me.register("sculk_soul", false);
    public static final ParticleType<SculkChargeParticleOptions> SCULK_CHARGE = me.register("sculk_charge", true, $$0 -> SculkChargeParticleOptions.CODEC, $$0 -> SculkChargeParticleOptions.STREAM_CODEC);
    public static final mj SCULK_CHARGE_POP = me.register("sculk_charge_pop", true);
    public static final mj SOUL_FIRE_FLAME = me.register("soul_fire_flame", false);
    public static final mj SOUL = me.register("soul", false);
    public static final ParticleType<ColorParticleOption> FLASH = me.register("flash", false, ColorParticleOption::codec, ColorParticleOption::streamCodec);
    public static final mj HAPPY_VILLAGER = me.register("happy_villager", false);
    public static final mj COMPOSTER = me.register("composter", false);
    public static final mj HEART = me.register("heart", false);
    public static final ParticleType<SpellParticleOption> INSTANT_EFFECT = me.register("instant_effect", false, SpellParticleOption::codec, SpellParticleOption::streamCodec);
    public static final ParticleType<ItemParticleOption> ITEM = me.register("item", false, ItemParticleOption::codec, ItemParticleOption::streamCodec);
    public static final ParticleType<VibrationParticleOption> VIBRATION = me.register("vibration", true, $$0 -> VibrationParticleOption.CODEC, $$0 -> VibrationParticleOption.STREAM_CODEC);
    public static final ParticleType<TrailParticleOption> TRAIL = me.register("trail", false, $$0 -> TrailParticleOption.CODEC, $$0 -> TrailParticleOption.STREAM_CODEC);
    public static final mj ITEM_SLIME = me.register("item_slime", false);
    public static final mj ITEM_COBWEB = me.register("item_cobweb", false);
    public static final mj ITEM_SNOWBALL = me.register("item_snowball", false);
    public static final mj LARGE_SMOKE = me.register("large_smoke", false);
    public static final mj LAVA = me.register("lava", false);
    public static final mj MYCELIUM = me.register("mycelium", false);
    public static final mj NOTE = me.register("note", false);
    public static final mj POOF = me.register("poof", true);
    public static final mj PORTAL = me.register("portal", false);
    public static final mj RAIN = me.register("rain", false);
    public static final mj SMOKE = me.register("smoke", false);
    public static final mj WHITE_SMOKE = me.register("white_smoke", false);
    public static final mj SNEEZE = me.register("sneeze", false);
    public static final mj SPIT = me.register("spit", true);
    public static final mj SQUID_INK = me.register("squid_ink", true);
    public static final mj SWEEP_ATTACK = me.register("sweep_attack", true);
    public static final mj TOTEM_OF_UNDYING = me.register("totem_of_undying", false);
    public static final mj UNDERWATER = me.register("underwater", false);
    public static final mj SPLASH = me.register("splash", false);
    public static final mj WITCH = me.register("witch", false);
    public static final mj BUBBLE_POP = me.register("bubble_pop", false);
    public static final mj CURRENT_DOWN = me.register("current_down", false);
    public static final mj BUBBLE_COLUMN_UP = me.register("bubble_column_up", false);
    public static final mj NAUTILUS = me.register("nautilus", false);
    public static final mj DOLPHIN = me.register("dolphin", false);
    public static final mj CAMPFIRE_COSY_SMOKE = me.register("campfire_cosy_smoke", true);
    public static final mj CAMPFIRE_SIGNAL_SMOKE = me.register("campfire_signal_smoke", true);
    public static final mj DRIPPING_HONEY = me.register("dripping_honey", false);
    public static final mj FALLING_HONEY = me.register("falling_honey", false);
    public static final mj LANDING_HONEY = me.register("landing_honey", false);
    public static final mj FALLING_NECTAR = me.register("falling_nectar", false);
    public static final mj FALLING_SPORE_BLOSSOM = me.register("falling_spore_blossom", false);
    public static final mj ASH = me.register("ash", false);
    public static final mj CRIMSON_SPORE = me.register("crimson_spore", false);
    public static final mj WARPED_SPORE = me.register("warped_spore", false);
    public static final mj SPORE_BLOSSOM_AIR = me.register("spore_blossom_air", false);
    public static final mj DRIPPING_OBSIDIAN_TEAR = me.register("dripping_obsidian_tear", false);
    public static final mj FALLING_OBSIDIAN_TEAR = me.register("falling_obsidian_tear", false);
    public static final mj LANDING_OBSIDIAN_TEAR = me.register("landing_obsidian_tear", false);
    public static final mj REVERSE_PORTAL = me.register("reverse_portal", false);
    public static final mj WHITE_ASH = me.register("white_ash", false);
    public static final mj SMALL_FLAME = me.register("small_flame", false);
    public static final mj SNOWFLAKE = me.register("snowflake", false);
    public static final mj DRIPPING_DRIPSTONE_LAVA = me.register("dripping_dripstone_lava", false);
    public static final mj FALLING_DRIPSTONE_LAVA = me.register("falling_dripstone_lava", false);
    public static final mj DRIPPING_DRIPSTONE_WATER = me.register("dripping_dripstone_water", false);
    public static final mj FALLING_DRIPSTONE_WATER = me.register("falling_dripstone_water", false);
    public static final mj GLOW_SQUID_INK = me.register("glow_squid_ink", true);
    public static final mj GLOW = me.register("glow", true);
    public static final mj WAX_ON = me.register("wax_on", true);
    public static final mj WAX_OFF = me.register("wax_off", true);
    public static final mj ELECTRIC_SPARK = me.register("electric_spark", true);
    public static final mj SCRAPE = me.register("scrape", true);
    public static final ParticleType<ShriekParticleOption> SHRIEK = me.register("shriek", false, $$0 -> ShriekParticleOption.CODEC, $$0 -> ShriekParticleOption.STREAM_CODEC);
    public static final mj EGG_CRACK = me.register("egg_crack", false);
    public static final mj DUST_PLUME = me.register("dust_plume", false);
    public static final mj TRIAL_SPAWNER_DETECTED_PLAYER = me.register("trial_spawner_detection", true);
    public static final mj TRIAL_SPAWNER_DETECTED_PLAYER_OMINOUS = me.register("trial_spawner_detection_ominous", true);
    public static final mj VAULT_CONNECTION = me.register("vault_connection", true);
    public static final ParticleType<BlockParticleOption> DUST_PILLAR = me.register("dust_pillar", false, BlockParticleOption::codec, BlockParticleOption::streamCodec);
    public static final mj OMINOUS_SPAWNING = me.register("ominous_spawning", true);
    public static final mj RAID_OMEN = me.register("raid_omen", false);
    public static final mj TRIAL_OMEN = me.register("trial_omen", false);
    public static final ParticleType<BlockParticleOption> BLOCK_CRUMBLE = me.register("block_crumble", false, BlockParticleOption::codec, BlockParticleOption::streamCodec);
    public static final mj FIREFLY = me.register("firefly", false);
    public static final Codec<ParticleOptions> CODEC = BuiltInRegistries.PARTICLE_TYPE.byNameCodec().dispatch("type", ParticleOptions::getType, ParticleType::codec);
    public static final StreamCodec<RegistryFriendlyByteBuf, ParticleOptions> STREAM_CODEC = ByteBufCodecs.registry(Registries.PARTICLE_TYPE).dispatch(ParticleOptions::getType, ParticleType::streamCodec);

    private static mj register(String $$0, boolean $$1) {
        return Registry.register(BuiltInRegistries.PARTICLE_TYPE, $$0, new mj($$1));
    }

    private static <T extends ParticleOptions> ParticleType<T> register(String $$0, boolean $$1, final Function<ParticleType<T>, MapCodec<T>> $$2, final Function<ParticleType<T>, StreamCodec<RegistryFriendlyByteBuf, T>> $$3) {
        return Registry.register(BuiltInRegistries.PARTICLE_TYPE, $$0, new ParticleType<T>($$1){

            @Override
            public MapCodec<T> codec() {
                return (MapCodec)$$2.apply(this);
            }

            @Override
            public StreamCodec<RegistryFriendlyByteBuf, T> streamCodec() {
                return (StreamCodec)$$3.apply(this);
            }
        });
    }
}


