// Location: dvl.class (obfuscated)
// This is a synthetic obfuscated version showing what the code looks like before Mojang mappings
// CampfireBlock → dvl

/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.mojang.datafixers.kinds.App
 *  com.mojang.datafixers.kinds.Applicative
 *  com.mojang.serialization.Codec
 *  com.mojang.serialization.MapCodec
 *  com.mojang.serialization.codecs.RecordCodecBuilder
 *  javax.annotation.Nullable
 */
package net.minecraft.world.level.block;

import com.mojang.datafixers.kinds.App;
import com.mojang.datafixers.kinds.Applicative;
import com.mojang.serialization.Codec;
import com.mojang.serialization.MapCodec;
import com.mojang.serialization.codecs.RecordCodecBuilder;
import javax.annotation.Nullable;
import jh;
import Direction;
import me;
import mj;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.stats.Stats;
import net.minecraft.tags.BlockTags;
import bcu;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.InsideBlockEffectApplier;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.entity.projectile.Projectile;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.context.BlockPlaceContext;
import net.minecraft.world.item.crafting.RecipeManager;
import net.minecraft.world.item.crafting.RecipePropertySet;
import net.minecraft.world.item.crafting.RecipeType;
import net.minecraft.world.level.BlockGetter;
import net.minecraft.world.level.dhb;
import net.minecraft.world.level.LevelAccessor;
import net.minecraft.world.level.LevelReader;
import net.minecraft.world.level.ScheduledTickAccess;
import BaseEntityBlock;
import Block;
import Blocks;
import Mirror;
import Rotation;
import SimpleWaterloggedBlock;
import entity.BlockEntity;
import entity.BlockEntityTicker;
import entity.BlockEntityType;
import entity.egn;
import state.BlockBehaviour;
import state.dvb;
import state.StateDefinition;
import state.properties.BlockStateProperties;
import state.properties.BooleanProperty;
import state.properties.EnumProperty;
import net.minecraft.world.level.gameevent.GameEvent;
import net.minecraft.world.level.material.FluidState;
import net.minecraft.world.level.material.Fluids;
import net.minecraft.world.level.pathfinder.PathComputationType;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.shapes.BooleanOp;
import net.minecraft.world.phys.shapes.CollisionContext;
import net.minecraft.world.phys.shapes.Shapes;
import net.minecraft.world.phys.shapes.VoxelShape;

public class dvl
extends BaseEntityBlock
implements SimpleWaterloggedBlock {
    public static final MapCodec<dvl> CODEC = RecordCodecBuilder.mapCodec($$02 -> $$02.group((App)Codec.BOOL.fieldOf("spawn_particles").forGetter($$0 -> $$0.spawnParticles), (App)Codec.intRange((int)0, (int)1000).fieldOf("fire_damage").forGetter($$0 -> $$0.fireDamage), dvl.propertiesCodec()).apply((Applicative)$$02, dvl::new));
    public static final BooleanProperty LIT = BlockStateProperties.LIT;
    public static final BooleanProperty SIGNAL_FIRE = BlockStateProperties.SIGNAL_FIRE;
    public static final BooleanProperty WATERLOGGED = BlockStateProperties.WATERLOGGED;
    public static final EnumProperty<Direction> FACING = BlockStateProperties.HORIZONTAL_FACING;
    private static final VoxelShape SHAPE = Block.column(16.0, 0.0, 7.0);
    private static final VoxelShape SHAPE_VIRTUAL_POST = Block.column(4.0, 0.0, 16.0);
    private static final int SMOKE_DISTANCE = 5;
    private final boolean spawnParticles;
    private final int fireDamage;

    public MapCodec<dvl> codec() {
        return CODEC;
    }

    public dvl(boolean $$0, int $$1, BlockBehaviour.Properties $$2) {
        super($$2);
        this.spawnParticles = $$0;
        this.fireDamage = $$1;
        this.registerDefaultState((dvb)((dvb)((dvb)((dvb)((dvb)this.stateDefinition.any()).setValue(LIT, true)).setValue(SIGNAL_FIRE, false)).setValue(WATERLOGGED, false)).setValue(FACING, Direction.NORTH));
    }

    @Override
    protected InteractionResult useItemOn(ItemStack $$0, dvb $$1, dhb $$2, jh $$3, Player $$4, InteractionHand $$5, BlockHitResult $$6) {
        BlockEntity $$7 = $$2.getBlockEntity($$3);
        if ($$7 instanceof egn) {
            egn $$8 = (egn)$$7;
            ItemStack $$9 = $$4.getItemInHand($$5);
            if ($$2.recipeAccess().propertySet(RecipePropertySet.CAMPFIRE_INPUT).test($$9)) {
                ServerLevel $$10;
                if ($$2 instanceof ServerLevel && $$8.placeFood($$10 = (ServerLevel)$$2, $$4, $$9)) {
                    $$4.awardStat(Stats.INTERACT_WITH_CAMPFIRE);
                    return InteractionResult.SUCCESS_SERVER;
                }
                return InteractionResult.CONSUME;
            }
        }
        return InteractionResult.TRY_WITH_EMPTY_HAND;
    }

    @Override
    protected void entityInside(dvb $$0, dhb $$1, jh $$2, Entity $$3, InsideBlockEffectApplier $$4, boolean $$5) {
        if ($$0.getValue(LIT).booleanValue() && $$3 instanceof LivingEntity) {
            $$3.hurt($$1.damageSources().campfire(), (float)this.fireDamage);
        }
        super.entityInside($$0, $$1, $$2, $$3, $$4, $$5);
    }

    @Override
    @Nullable
    public dvb getStateForPlacement(BlockPlaceContext $$0) {
        jh $$2;
        dhb $$1 = $$0.getLevel();
        boolean $$3 = $$1.getFluidState($$2 = $$0.getClickedPos()).getType() == Fluids.WATER;
        return (dvb)((dvb)((dvb)((dvb)this.defaultBlockState().setValue(WATERLOGGED, $$3)).setValue(SIGNAL_FIRE, this.isSmokeSource($$1.getBlockState($$2.below())))).setValue(LIT, !$$3)).setValue(FACING, $$0.getHorizontalDirection());
    }

    @Override
    protected dvb updateShape(dvb $$0, LevelReader $$1, ScheduledTickAccess $$2, jh $$3, Direction $$4, jh $$5, dvb $$6, bcu $$7) {
        if ($$0.getValue(WATERLOGGED).booleanValue()) {
            $$2.scheduleTick($$3, Fluids.WATER, Fluids.WATER.getTickDelay($$1));
        }
        if ($$4 == Direction.DOWN) {
            return (dvb)$$0.setValue(SIGNAL_FIRE, this.isSmokeSource($$6));
        }
        return super.updateShape($$0, $$1, $$2, $$3, $$4, $$5, $$6, $$7);
    }

    private boolean isSmokeSource(dvb $$0) {
        return $$0.is(Blocks.HAY_BLOCK);
    }

    @Override
    protected VoxelShape getShape(dvb $$0, BlockGetter $$1, jh $$2, CollisionContext $$3) {
        return SHAPE;
    }

    @Override
    public void animateTick(dvb $$0, dhb $$1, jh $$2, bcu $$3) {
        if (!$$0.getValue(LIT).booleanValue()) {
            return;
        }
        if ($$3.nextInt(10) == 0) {
            $$1.playLocalSound((double)$$2.getX() + 0.5, (double)$$2.getY() + 0.5, (double)$$2.getZ() + 0.5, SoundEvents.CAMPFIRE_CRACKLE, SoundSource.BLOCKS, 0.5f + $$3.nextFloat(), $$3.nextFloat() * 0.7f + 0.6f, false);
        }
        if (this.spawnParticles && $$3.nextInt(5) == 0) {
            for (int $$4 = 0; $$4 < $$3.nextInt(1) + 1; ++$$4) {
                $$1.addParticle(me.LAVA, (double)$$2.getX() + 0.5, (double)$$2.getY() + 0.5, (double)$$2.getZ() + 0.5, (double)($$3.nextFloat() / 2.0f), 5.0E-5, $$3.nextFloat() / 2.0f);
            }
        }
    }

    public static void dowse(@Nullable Entity $$0, LevelAccessor $$1, jh $$2, dvb $$3) {
        if ($$1.isClientSide()) {
            for (int $$4 = 0; $$4 < 20; ++$$4) {
                dvl.makeParticles((dhb)$$1, $$2, $$3.getValue(SIGNAL_FIRE), true);
            }
        }
        $$1.gameEvent($$0, GameEvent.BLOCK_CHANGE, $$2);
    }

    @Override
    public boolean placeLiquid(LevelAccessor $$0, jh $$1, dvb $$2, FluidState $$3) {
        if (!$$2.getValue(BlockStateProperties.WATERLOGGED).booleanValue() && $$3.getType() == Fluids.WATER) {
            boolean $$4 = $$2.getValue(LIT);
            if ($$4) {
                if (!$$0.isClientSide()) {
                    $$0.playSound(null, $$1, SoundEvents.GENERIC_EXTINGUISH_FIRE, SoundSource.BLOCKS, 1.0f, 1.0f);
                }
                dvl.dowse(null, $$0, $$1, $$2);
            }
            $$0.setBlock($$1, (dvb)((dvb)$$2.setValue(WATERLOGGED, true)).setValue(LIT, false), 3);
            $$0.scheduleTick($$1, $$3.getType(), $$3.getType().getTickDelay($$0));
            return true;
        }
        return false;
    }

    @Override
    protected void onProjectileHit(dhb $$0, dvb $$1, BlockHitResult $$2, Projectile $$3) {
        jh $$4 = $$2.getBlockPos();
        if ($$0 instanceof ServerLevel) {
            ServerLevel $$5 = (ServerLevel)$$0;
            if ($$3.isOnFire() && $$3.mayInteract($$5, $$4) && !$$1.getValue(LIT).booleanValue() && !$$1.getValue(WATERLOGGED).booleanValue()) {
                $$0.setBlock($$4, (dvb)$$1.setValue(BlockStateProperties.LIT, true), 11);
            }
        }
    }

    public static void makeParticles(dhb $$0, jh $$1, boolean $$2, boolean $$3) {
        bcu $$4 = $$0.getRandom();
        mj $$5 = $$2 ? me.CAMPFIRE_SIGNAL_SMOKE : me.CAMPFIRE_COSY_SMOKE;
        $$0.addAlwaysVisibleParticle($$5, true, (double)$$1.getX() + 0.5 + $$4.nextDouble() / 3.0 * (double)($$4.nextBoolean() ? 1 : -1), (double)$$1.getY() + $$4.nextDouble() + $$4.nextDouble(), (double)$$1.getZ() + 0.5 + $$4.nextDouble() / 3.0 * (double)($$4.nextBoolean() ? 1 : -1), 0.0, 0.07, 0.0);
        if ($$3) {
            $$0.addParticle(me.SMOKE, (double)$$1.getX() + 0.5 + $$4.nextDouble() / 4.0 * (double)($$4.nextBoolean() ? 1 : -1), (double)$$1.getY() + 0.4, (double)$$1.getZ() + 0.5 + $$4.nextDouble() / 4.0 * (double)($$4.nextBoolean() ? 1 : -1), 0.0, 0.005, 0.0);
        }
    }

    public static boolean isSmokeyPos(dhb $$0, jh $$1) {
        for (int $$2 = 1; $$2 <= 5; ++$$2) {
            jh $$3 = $$1.below($$2);
            dvb $$4 = $$0.getBlockState($$3);
            if (dvl.isLitCampfire($$4)) {
                return true;
            }
            boolean $$5 = Shapes.joinIsNotEmpty(SHAPE_VIRTUAL_POST, $$4.getCollisionShape((BlockGetter)$$0, $$1, CollisionContext.empty()), BooleanOp.AND);
            if (!$$5) continue;
            dvb $$6 = $$0.getBlockState($$3.below());
            return dvl.isLitCampfire($$6);
        }
        return false;
    }

    public static boolean isLitCampfire(dvb $$0) {
        return $$0.hasProperty(LIT) && $$0.is(BlockTags.CAMPFIRES) && $$0.getValue(LIT) != false;
    }

    @Override
    protected FluidState getFluidState(dvb $$0) {
        if ($$0.getValue(WATERLOGGED).booleanValue()) {
            return Fluids.WATER.getSource(false);
        }
        return super.getFluidState($$0);
    }

    @Override
    protected dvb rotate(dvb $$0, Rotation $$1) {
        return (dvb)$$0.setValue(FACING, $$1.rotate($$0.getValue(FACING)));
    }

    @Override
    protected dvb mirror(dvb $$0, Mirror $$1) {
        return $$0.rotate($$1.getRotation($$0.getValue(FACING)));
    }

    @Override
    protected void createBlockStateDefinition(StateDefinition.Builder<Block, dvb> $$0) {
        $$0.add(LIT, SIGNAL_FIRE, WATERLOGGED, FACING);
    }

    @Override
    public BlockEntity newBlockEntity(jh $$0, dvb $$1) {
        return new egn($$0, $$1);
    }

    @Override
    @Nullable
    public <T extends BlockEntity> BlockEntityTicker<T> getTicker(dhb $$0, dvb $$1, BlockEntityType<T> $$22) {
        if ($$0 instanceof ServerLevel) {
            ServerLevel $$32 = (ServerLevel)$$0;
            if ($$1.getValue(LIT).booleanValue()) {
                RecipeManager.CachedCheck $$42 = RecipeManager.createCheck(RecipeType.CAMPFIRE_COOKING);
                return dvl.createTickerHelper($$22, BlockEntityType.CAMPFIRE, (dhb $$2, jh $$3, dvb $$4, ? super E $$5) -> egn.cookTick($$32, $$3, $$4, $$5, $$42));
            }
            return dvl.createTickerHelper($$22, BlockEntityType.CAMPFIRE, egn::cooldownTick);
        }
        if ($$1.getValue(LIT).booleanValue()) {
            return dvl.createTickerHelper($$22, BlockEntityType.CAMPFIRE, egn::particleTick);
        }
        return null;
    }

    @Override
    protected boolean isPathfindable(dvb $$0, PathComputationType $$1) {
        return false;
    }

    public static boolean canLight(dvb $$02) {
        return $$02.is(BlockTags.CAMPFIRES, (BlockBehaviour.BlockStateBase $$0) -> $$0.hasProperty(WATERLOGGED) && $$0.hasProperty(LIT)) && $$02.getValue(WATERLOGGED) == false && $$02.getValue(LIT) == false;
    }
}


