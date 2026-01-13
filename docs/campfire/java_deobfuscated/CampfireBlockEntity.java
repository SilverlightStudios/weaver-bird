// Location: net/minecraft/world/level/block/entity/CampfireBlockEntity.java
// Decompiled from Minecraft JAR version 1.21.10-0.18.1 using CFR decompiler with Mojang mappings

/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.mojang.logging.LogUtils
 *  javax.annotation.Nullable
 *  org.slf4j.Logger
 */
package net.minecraft.world.level.block.entity;

import com.mojang.logging.LogUtils;
import java.util.Arrays;
import java.util.Optional;
import javax.annotation.Nullable;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.core.HolderLookup;
import net.minecraft.core.NonNullList;
import net.minecraft.core.component.DataComponentGetter;
import net.minecraft.core.component.DataComponentMap;
import net.minecraft.core.component.DataComponents;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.network.protocol.Packet;
import net.minecraft.network.protocol.game.ClientboundBlockEntityDataPacket;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.util.Mth;
import net.minecraft.util.ProblemReporter;
import net.minecraft.util.RandomSource;
import net.minecraft.world.Clearable;
import net.minecraft.world.ContainerHelper;
import net.minecraft.world.Containers;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.component.ItemContainerContents;
import net.minecraft.world.item.crafting.CampfireCookingRecipe;
import net.minecraft.world.item.crafting.RecipeHolder;
import net.minecraft.world.item.crafting.RecipeManager;
import net.minecraft.world.item.crafting.RecipeType;
import net.minecraft.world.item.crafting.SingleRecipeInput;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.CampfireBlock;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.entity.BlockEntityType;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.gameevent.GameEvent;
import net.minecraft.world.level.storage.TagValueOutput;
import net.minecraft.world.level.storage.ValueInput;
import net.minecraft.world.level.storage.ValueOutput;
import org.slf4j.Logger;

public class CampfireBlockEntity
extends BlockEntity
implements Clearable {
    private static final Logger LOGGER = LogUtils.getLogger();
    private static final int BURN_COOL_SPEED = 2;
    private static final int NUM_SLOTS = 4;
    private final NonNullList<ItemStack> items = NonNullList.withSize(4, ItemStack.EMPTY);
    private final int[] cookingProgress = new int[4];
    private final int[] cookingTime = new int[4];

    public CampfireBlockEntity(BlockPos $$0, BlockState $$1) {
        super(BlockEntityType.CAMPFIRE, $$0, $$1);
    }

    public static void cookTick(ServerLevel $$0, BlockPos $$1, BlockState $$22, CampfireBlockEntity $$3, RecipeManager.CachedCheck<SingleRecipeInput, CampfireCookingRecipe> $$4) {
        boolean $$5 = false;
        for (int $$6 = 0; $$6 < $$3.items.size(); ++$$6) {
            SingleRecipeInput $$8;
            ItemStack $$9;
            ItemStack $$7 = $$3.items.get($$6);
            if ($$7.isEmpty()) continue;
            $$5 = true;
            int n2 = $$6;
            $$3.cookingProgress[n2] = $$3.cookingProgress[n2] + 1;
            if ($$3.cookingProgress[$$6] < $$3.cookingTime[$$6] || !($$9 = $$4.getRecipeFor($$8 = new SingleRecipeInput($$7), $$0).map($$2 -> ((CampfireCookingRecipe)$$2.value()).assemble($$8, (HolderLookup.Provider)$$0.registryAccess())).orElse($$7)).isItemEnabled($$0.enabledFeatures())) continue;
            Containers.dropItemStack((Level)$$0, (double)$$1.getX(), (double)$$1.getY(), (double)$$1.getZ(), $$9);
            $$3.items.set($$6, ItemStack.EMPTY);
            $$0.sendBlockUpdated($$1, $$22, $$22, 3);
            $$0.gameEvent(GameEvent.BLOCK_CHANGE, $$1, GameEvent.Context.of($$22));
        }
        if ($$5) {
            CampfireBlockEntity.setChanged($$0, $$1, $$22);
        }
    }

    public static void cooldownTick(Level $$0, BlockPos $$1, BlockState $$2, CampfireBlockEntity $$3) {
        boolean $$4 = false;
        for (int $$5 = 0; $$5 < $$3.items.size(); ++$$5) {
            if ($$3.cookingProgress[$$5] <= 0) continue;
            $$4 = true;
            $$3.cookingProgress[$$5] = Mth.clamp($$3.cookingProgress[$$5] - 2, 0, $$3.cookingTime[$$5]);
        }
        if ($$4) {
            CampfireBlockEntity.setChanged($$0, $$1, $$2);
        }
    }

    public static void particleTick(Level $$0, BlockPos $$1, BlockState $$2, CampfireBlockEntity $$3) {
        RandomSource $$4 = $$0.random;
        if ($$4.nextFloat() < 0.11f) {
            for (int $$5 = 0; $$5 < $$4.nextInt(2) + 2; ++$$5) {
                CampfireBlock.makeParticles($$0, $$1, $$2.getValue(CampfireBlock.SIGNAL_FIRE), false);
            }
        }
        int $$6 = $$2.getValue(CampfireBlock.FACING).get2DDataValue();
        for (int $$7 = 0; $$7 < $$3.items.size(); ++$$7) {
            if ($$3.items.get($$7).isEmpty() || !($$4.nextFloat() < 0.2f)) continue;
            Direction $$8 = Direction.from2DDataValue(Math.floorMod($$7 + $$6, 4));
            float $$9 = 0.3125f;
            double $$10 = (double)$$1.getX() + 0.5 - (double)((float)$$8.getStepX() * 0.3125f) + (double)((float)$$8.getClockWise().getStepX() * 0.3125f);
            double $$11 = (double)$$1.getY() + 0.5;
            double $$12 = (double)$$1.getZ() + 0.5 - (double)((float)$$8.getStepZ() * 0.3125f) + (double)((float)$$8.getClockWise().getStepZ() * 0.3125f);
            for (int $$13 = 0; $$13 < 4; ++$$13) {
                $$0.addParticle(ParticleTypes.SMOKE, $$10, $$11, $$12, 0.0, 5.0E-4, 0.0);
            }
        }
    }

    public NonNullList<ItemStack> getItems() {
        return this.items;
    }

    @Override
    protected void loadAdditional(ValueInput $$02) {
        super.loadAdditional($$02);
        this.items.clear();
        ContainerHelper.loadAllItems($$02, this.items);
        $$02.getIntArray("CookingTimes").ifPresentOrElse($$0 -> System.arraycopy($$0, 0, this.cookingProgress, 0, Math.min(this.cookingTime.length, ((int[])$$0).length)), () -> Arrays.fill(this.cookingProgress, 0));
        $$02.getIntArray("CookingTotalTimes").ifPresentOrElse($$0 -> System.arraycopy($$0, 0, this.cookingTime, 0, Math.min(this.cookingTime.length, ((int[])$$0).length)), () -> Arrays.fill(this.cookingTime, 0));
    }

    @Override
    protected void saveAdditional(ValueOutput $$0) {
        super.saveAdditional($$0);
        ContainerHelper.saveAllItems($$0, this.items, true);
        $$0.putIntArray("CookingTimes", this.cookingProgress);
        $$0.putIntArray("CookingTotalTimes", this.cookingTime);
    }

    public ClientboundBlockEntityDataPacket getUpdatePacket() {
        return ClientboundBlockEntityDataPacket.create(this);
    }

    @Override
    public CompoundTag getUpdateTag(HolderLookup.Provider $$0) {
        try (ProblemReporter.ScopedCollector $$1 = new ProblemReporter.ScopedCollector(this.problemPath(), LOGGER);){
            TagValueOutput $$2 = TagValueOutput.createWithContext($$1, $$0);
            ContainerHelper.saveAllItems($$2, this.items, true);
            CompoundTag up2 = $$2.buildResult();
            return up2;
        }
    }

    public boolean placeFood(ServerLevel $$0, @Nullable LivingEntity $$1, ItemStack $$2) {
        for (int $$3 = 0; $$3 < this.items.size(); ++$$3) {
            ItemStack $$4 = this.items.get($$3);
            if (!$$4.isEmpty()) continue;
            Optional<RecipeHolder<CampfireCookingRecipe>> $$5 = $$0.recipeAccess().getRecipeFor(RecipeType.CAMPFIRE_COOKING, new SingleRecipeInput($$2), $$0);
            if ($$5.isEmpty()) {
                return false;
            }
            this.cookingTime[$$3] = $$5.get().value().cookingTime();
            this.cookingProgress[$$3] = 0;
            this.items.set($$3, $$2.consumeAndReturn(1, $$1));
            $$0.gameEvent(GameEvent.BLOCK_CHANGE, this.getBlockPos(), GameEvent.Context.of($$1, this.getBlockState()));
            this.markUpdated();
            return true;
        }
        return false;
    }

    private void markUpdated() {
        this.setChanged();
        this.getLevel().sendBlockUpdated(this.getBlockPos(), this.getBlockState(), this.getBlockState(), 3);
    }

    @Override
    public void clearContent() {
        this.items.clear();
    }

    @Override
    public void preRemoveSideEffects(BlockPos $$0, BlockState $$1) {
        if (this.level != null) {
            Containers.dropContents(this.level, $$0, this.getItems());
        }
    }

    @Override
    protected void applyImplicitComponents(DataComponentGetter $$0) {
        super.applyImplicitComponents($$0);
        $$0.getOrDefault(DataComponents.CONTAINER, ItemContainerContents.EMPTY).copyInto(this.getItems());
    }

    @Override
    protected void collectImplicitComponents(DataComponentMap.Builder $$0) {
        super.collectImplicitComponents($$0);
        $$0.set(DataComponents.CONTAINER, ItemContainerContents.fromItems(this.getItems()));
    }

    @Override
    public void removeComponentsFromTag(ValueOutput $$0) {
        $$0.discard("Items");
    }

    public /* synthetic */ Packet getUpdatePacket() {
        return this.getUpdatePacket();
    }
}

