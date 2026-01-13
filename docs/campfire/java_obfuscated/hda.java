// Location: hda.class (obfuscated)
// This is a synthetic obfuscated version showing what the code looks like before Mojang mappings
// ParticleEngine → hda

/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.google.common.collect.Lists
 *  com.google.common.collect.Maps
 *  com.google.common.collect.Queues
 *  it.unimi.dsi.fastutil.objects.Object2IntOpenHashMap
 *  javax.annotation.Nullable
 */
package net.minecraft.client.particle;

import com.google.common.collect.Lists;
import com.google.common.collect.Maps;
import com.google.common.collect.Queues;
import it.unimi.dsi.fastutil.objects.Object2IntOpenHashMap;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Queue;
import javax.annotation.Nullable;
import net.minecraft.client.Camera;
import ghz;
import ElderGuardianParticleGroup;
import ItemPickupParticleGroup;
import NoRenderParticleGroup;
import hcy;
import ParticleGroup;
import hdc;
import ParticleRenderType;
import ParticleResources;
import QuadParticleGroup;
import TrackingEmitter;
import net.minecraft.client.renderer.culling.Frustum;
import net.minecraft.client.renderer.state.ParticlesRenderState;
import ParticleLimit;
import ParticleOptions;
import registries.BuiltInRegistries;
import bcu;
import profiling.Profiler;
import net.minecraft.world.entity.Entity;

public class hda {
    private static final List<ParticleRenderType> RENDER_ORDER = List.of(ParticleRenderType.SINGLE_QUADS, ParticleRenderType.ITEM_PICKUP, ParticleRenderType.ELDER_GUARDIANS);
    protected ghz level;
    private final Map<ParticleRenderType, ParticleGroup<?>> particles = Maps.newIdentityHashMap();
    private final Queue<TrackingEmitter> trackingEmitters = Queues.newArrayDeque();
    private final Queue<hcy> particlesToAdd = Queues.newArrayDeque();
    private final Object2IntOpenHashMap<ParticleLimit> trackedParticleCounts = new Object2IntOpenHashMap();
    private final ParticleResources resourceManager;
    private final bcu random = bcu.create();

    public hda(ghz $$0, ParticleResources $$1) {
        this.level = $$0;
        this.resourceManager = $$1;
    }

    public void createTrackingEmitter(Entity $$0, ParticleOptions $$1) {
        this.trackingEmitters.add(new TrackingEmitter(this.level, $$0, $$1));
    }

    public void createTrackingEmitter(Entity $$0, ParticleOptions $$1, int $$2) {
        this.trackingEmitters.add(new TrackingEmitter(this.level, $$0, $$1, $$2));
    }

    @Nullable
    public hcy createParticle(ParticleOptions $$0, double $$1, double $$2, double $$3, double $$4, double $$5, double $$6) {
        hcy $$7 = this.makeParticle($$0, $$1, $$2, $$3, $$4, $$5, $$6);
        if ($$7 != null) {
            this.add($$7);
            return $$7;
        }
        return null;
    }

    @Nullable
    private <T extends ParticleOptions> hcy makeParticle(T $$0, double $$1, double $$2, double $$3, double $$4, double $$5, double $$6) {
        hdc $$7 = (hdc)this.resourceManager.getProviders().get(BuiltInRegistries.PARTICLE_TYPE.getId($$0.getType()));
        if ($$7 == null) {
            return null;
        }
        return $$7.createParticle($$0, this.level, $$1, $$2, $$3, $$4, $$5, $$6, this.random);
    }

    public void add(hcy $$0) {
        Optional<ParticleLimit> $$1 = $$0.getParticleLimit();
        if ($$1.isPresent()) {
            if (this.hasSpaceInParticleLimit($$1.get())) {
                this.particlesToAdd.add($$0);
                this.updateCount($$1.get(), 1);
            }
        } else {
            this.particlesToAdd.add($$0);
        }
    }

    public void tick() {
        this.particles.forEach(($$0, $$1) -> {
            Profiler.get().push($$0.name());
            $$1.tickParticles();
            Profiler.get().pop();
        });
        if (!this.trackingEmitters.isEmpty()) {
            ArrayList $$02 = Lists.newArrayList();
            for (TrackingEmitter $$12 : this.trackingEmitters) {
                $$12.tick();
                if ($$12.isAlive()) continue;
                $$02.add($$12);
            }
            this.trackingEmitters.removeAll($$02);
        }
        if (!this.particlesToAdd.isEmpty()) {
            hcy $$2;
            while (($$2 = this.particlesToAdd.poll()) != null) {
                this.particles.computeIfAbsent($$2.getGroup(), this::createParticleGroup).add($$2);
            }
        }
    }

    private ParticleGroup<?> createParticleGroup(ParticleRenderType $$0) {
        if ($$0 == ParticleRenderType.ITEM_PICKUP) {
            return new ItemPickupParticleGroup(this);
        }
        if ($$0 == ParticleRenderType.ELDER_GUARDIANS) {
            return new ElderGuardianParticleGroup(this);
        }
        if ($$0 == ParticleRenderType.NO_RENDER) {
            return new NoRenderParticleGroup(this);
        }
        return new QuadParticleGroup(this, $$0);
    }

    protected void updateCount(ParticleLimit $$0, int $$1) {
        this.trackedParticleCounts.addTo((Object)$$0, $$1);
    }

    public void extract(ParticlesRenderState $$0, Frustum $$1, Camera $$2, float $$3) {
        for (ParticleRenderType $$4 : RENDER_ORDER) {
            ParticleGroup<?> $$5 = this.particles.get($$4);
            if ($$5 == null || $$5.isEmpty()) continue;
            $$0.add($$5.extractRenderState($$1, $$2, $$3));
        }
    }

    public void setLevel(@Nullable ghz $$0) {
        this.level = $$0;
        this.clearParticles();
        this.trackingEmitters.clear();
    }

    public String countParticles() {
        return String.valueOf(this.particles.values().stream().mapToInt(ParticleGroup::size).sum());
    }

    private boolean hasSpaceInParticleLimit(ParticleLimit $$0) {
        return this.trackedParticleCounts.getInt((Object)$$0) < $$0.limit();
    }

    public void clearParticles() {
        this.particles.clear();
        this.particlesToAdd.clear();
        this.trackingEmitters.clear();
        this.trackedParticleCounts.clear();
    }
}


