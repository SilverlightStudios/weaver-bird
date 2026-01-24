/**
 * ParticleEngine - Sprite-based particle system for Minecraft-accurate rendering
 *
 * Uses THREE.Sprite for each particle to enable:
 * - Per-particle textures (for animation frames)
 * - Per-particle color tinting
 * - Proper billboarding (always faces camera)
 * - Accurate Minecraft particle behavior
 */

import * as THREE from "three";
import { getParticlePhysics } from "@constants/particles";
import {
  initializeParticleAnimation,
  applyPositionJitter,
  calculateParticleLifetime,
  initializeParticleVelocity,
  calculateParticleQuadSize,
  setupParticleMaterial,
} from "./ParticleInitializers";
import { applyBehaviorTick as applyBehaviorTickImpl } from "./ParticleBehaviors";
import { getSpawnRuntimes, evaluateChildSpawns, type SpawnRuntime } from "./ParticleSpawning";
import {
  getFullSizeForRender as getFullSizeForRenderImpl,
  calculateParticleOpacity,
} from "./ParticleRendering";
import type {
  Particle,
  ParticleQuality,
  EmitConfig,
  SpawnTextureConfig,
} from "./types";
import {
  SECONDS_PER_TICK,
  QUALITY_MAX_PARTICLES,
} from "./types";

export type { EmitConfig, SpawnTextureConfig, ParticleQuality } from "./types";

/**
 * Sprite-based particle engine for Minecraft-accurate rendering
 */
export class ParticleEngine {
  private particles: Particle[] = [];
  private container: THREE.Group;
  private maxParticles: number;
  private activeCount = 0;
  private tickRemainderSeconds = 0;
  private spawnTextureMap: Record<string, SpawnTextureConfig> = {};
  private spawnRuntimeCache: Map<string, SpawnRuntime[]> = new Map();

  constructor(quality: ParticleQuality = "medium") {
    this.maxParticles = QUALITY_MAX_PARTICLES[quality];
    this.container = new THREE.Group();

    // Pre-allocate particle pool with sprites
    for (let i = 0; i < this.maxParticles; i++) {
      const material = new THREE.SpriteMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
      });
      const sprite = new THREE.Sprite(material);
      sprite.visible = false;
      sprite.scale.set(0.1, 0.1, 1);
      this.container.add(sprite);

      this.particles.push({
        active: false,
        sprite,
        material,
        position: new THREE.Vector3(),
        prevPosition: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        age: 0,
        lifetime: 1,
        quadSize: 0.1,
        physics: null,
        particleType: "",
        textures: [],
        frameIndex: 0,
        frameTimeTicks: 0,
        frameCount: 1,
        frameDurationTicks: 2,
        lifetimeAnimation: false,
        staticRandomTexture: false,
      });
    }
  }

  setSpawnTextureMap(map: Record<string, SpawnTextureConfig> | null): void {
    this.spawnTextureMap = map ?? {};
  }

  /**
   * Minecraft `Particle(ClientLevel,x,y,z,xd,yd,zd)` constructor velocity initialization.
   *
   * Units: blocks/tick (scaled down for Three.js coordinate system).
   */
  private initBaseVelocity(inVel: [number, number, number]): THREE.Vector3 {
    // Minecraft particle constructor randomization
    let xd = inVel[0] + (Math.random() * 2.0 - 1.0) * 0.4;
    let yd = inVel[1] + (Math.random() * 2.0 - 1.0) * 0.4;
    let zd = inVel[2] + (Math.random() * 2.0 - 1.0) * 0.4;

    const d7 = (Math.random() + Math.random() + 1.0) * 0.15;
    const d8 = Math.sqrt(xd * xd + yd * yd + zd * zd) || 1.0;

    xd = (xd / d8) * d7 * 0.4;
    yd = (yd / d8) * d7 * 0.4 + 0.1;
    zd = (zd / d8) * d7 * 0.4;

    return new THREE.Vector3(xd, yd, zd);
  }

  /**
   * Emit particles
   */
  emit(config: EmitConfig): void {
    if (config.textures.length === 0) {
      console.warn(`[ParticleEngine] No textures for ${config.particleType}`);
      return;
    }

    const physics = getParticlePhysics(config.particleType);
    if (!physics) {
      // No extracted physics data - don't render particles
      console.warn(`[ParticleEngine] No physics data for ${config.particleType} - particle will not render`);
      return;
    }

    for (let i = 0; i < config.count; i++) {
      // Find an inactive particle
      const particle = this.findInactiveParticle();
      if (!particle) {
        console.warn(`[ParticleEngine] Pool exhausted for ${config.particleType}`);
        break; // Pool exhausted
      }

      // Initialize particle
      particle.active = true;
      particle.sprite.visible = true;
      particle.physics = physics;
      particle.particleType = config.particleType;
      particle.textures = config.textures;

      const animationState = initializeParticleAnimation(physics, config.textures.length);
      particle.staticRandomTexture = animationState.staticRandomTexture;
      particle.frameIndex = animationState.frameIndex;
      particle.frameTimeTicks = 0;
      particle.frameCount = animationState.frameCount;
      particle.frameDurationTicks = config.frameDuration ?? 2;
      particle.lifetimeAnimation = animationState.lifetimeAnimation;

      // Spawn position
      particle.position.set(config.position.x, config.position.y, config.position.z);
      particle.prevPosition.copy(particle.position);

      // Apply position jitter if present
      applyPositionJitter(particle.position, physics);
      particle.prevPosition.copy(particle.position);

      // Lifetime from extracted physics
      particle.age = 0;
      const scale = (physics.scale ?? 1.0) * (config.scale ?? 1.0);
      particle.lifetime = calculateParticleLifetime(physics);

      // Velocity initialization from extracted physics
      const inVel = config.velocity ?? [0, 0, 0];
      const velocity = initializeParticleVelocity(
        config.particleType,
        inVel,
        physics,
        this.initBaseVelocity.bind(this),
      );
      particle.velocity.copy(velocity);

      // Calculate quad size
      const baseQuadSize = calculateParticleQuadSize(physics, 1.0);
      particle.quadSize = baseQuadSize * scale;

      // Setup material and color
      particle.material.map = particle.textures[particle.frameIndex] ?? particle.textures[0];
      particle.material.needsUpdate = true;
      setupParticleMaterial(particle.material, physics, config.tint, config.particleType);

      // Apply initial interpolated position/size immediately.
      particle.sprite.position.copy(particle.position);
      const initialFullSize = getFullSizeForRenderImpl(particle, 0);
      particle.sprite.scale.set(initialFullSize, initialFullSize, 1);

      this.activeCount++;
    }
  }

  /**
   * Update particle simulation
   */
  update(deltaTime: number): void {
    this.tickRemainderSeconds += deltaTime;

    // Step simulation in whole ticks (Minecraft runs particles at 20Hz).
    while (this.tickRemainderSeconds >= SECONDS_PER_TICK) {
      this.tickRemainderSeconds -= SECONDS_PER_TICK;
      this.tick();
    }

    const partialTick = THREE.MathUtils.clamp(
      this.tickRemainderSeconds / SECONDS_PER_TICK,
      0,
      1,
    );

    // Render interpolation + per-frame state derived from (age,lifetime,partialTick).
    for (const particle of this.particles) {
      if (!particle.active || !particle.physics) continue;

      // Interpolate position (Minecraft uses Mth.lerp(partialTick, xo, x), etc).
      particle.sprite.position.lerpVectors(
        particle.prevPosition,
        particle.position,
        partialTick,
      );

      // Size (Minecraft `getQuadSize(partialTick)` returns half-size; sprites need full size).
      const fullSize = getFullSizeForRenderImpl(particle, partialTick);
      particle.sprite.scale.set(fullSize, fullSize, 1);

      // Opacity/alpha
      const alpha = calculateParticleOpacity(
        particle.particleType,
        particle.age,
        particle.lifetime,
        particle.physics
      );
      particle.material.opacity = alpha;

      // Texture animation.
      if (particle.frameCount > 1) {
        let nextFrame = particle.frameIndex;
        if (particle.lifetimeAnimation) {
          // Minecraft SpriteSet.get(age, lifetime): age*(N-1)/lifetime
          // Maps particle age to texture frame: 0 at birth → (frameCount-1) at death
          nextFrame = Math.floor((particle.age * (particle.frameCount - 1)) / particle.lifetime);
          nextFrame = THREE.MathUtils.clamp(nextFrame, 0, particle.frameCount - 1);
        }
        if (nextFrame !== particle.frameIndex) {
          particle.frameIndex = nextFrame;
          particle.material.map = particle.textures[particle.frameIndex] ?? particle.textures[0];
          particle.material.needsUpdate = true;
        }
      }
    }
  }

  private tick(): void {
    for (const particle of this.particles) {
      if (!particle.active || !particle.physics) continue;

      const {physics} = particle;

      // Save previous position for interpolation.
      particle.prevPosition.copy(particle.position);

      // Particle.tick(): if (age++ >= lifetime) remove;
      if (particle.age++ >= particle.lifetime) {
        particle.active = false;
        particle.sprite.visible = false;
        this.activeCount--;
        continue;
      }

      // Apply behavior-specific tick logic
      applyBehaviorTickImpl(particle, physics);

      // Gravity: yd -= 0.04 * gravity
      particle.velocity.y -= 0.04 * (physics.gravity ?? 0);

      // Move (no world collision in preview)
      particle.position.x += particle.velocity.x;
      particle.position.y += particle.velocity.y;
      particle.position.z += particle.velocity.z;

      // Friction: velocity *= friction
      // Particles that override tick() without calling super.tick() skip friction
      const skipsFriction = physics.skipsFriction ?? physics.skips_friction ?? false;
      if (!skipsFriction) {
        const friction = physics.friction ?? 0.98;
        particle.velocity.multiplyScalar(friction);
      }

      this.spawnChildParticles(particle);

      // Cycling animation: advance frame after N ticks.
      // Skip for particles with static random textures (they keep one texture for lifetime)
      if (!particle.lifetimeAnimation && !particle.staticRandomTexture && particle.frameCount > 1) {
        particle.frameTimeTicks += 1;
        if (particle.frameTimeTicks >= particle.frameDurationTicks) {
          particle.frameTimeTicks = 0;
          particle.frameIndex = (particle.frameIndex + 1) % particle.frameCount;
          particle.material.map = particle.textures[particle.frameIndex] ?? particle.textures[0];
          particle.material.needsUpdate = true;
        }
      }
    }
  }

  private spawnChildParticles(particle: Particle): void {
    if (!particle.physics) return;

    const runtimes = getSpawnRuntimes(particle.particleType, particle.physics, this.spawnRuntimeCache);
    if (runtimes.length === 0) return;

    const context = {
      age: particle.age,
      lifetime: particle.lifetime,
    };

    const spawns = evaluateChildSpawns(runtimes, context);

    for (const spawn of spawns) {
      const spawnConfig = this.spawnTextureMap[spawn.particleType];
      if (!spawnConfig || spawnConfig.textures.length === 0) continue;

      for (let i = 0; i < spawn.count; i++) {
        this.emit({
          position: particle.position,
          particleType: spawn.particleType,
          count: 1,
          textures: spawnConfig.textures,
          tint: spawnConfig.tint,
          frameDuration: spawnConfig.frameDuration,
          velocity: [
            particle.velocity.x,
            particle.velocity.y,
            particle.velocity.z,
          ],
        });
      }
    }
  }



  /**
   * Find an inactive particle in the pool
   */
  private findInactiveParticle(): Particle | null {
    for (const particle of this.particles) {
      if (!particle.active) {
        return particle;
      }
    }
    return null;
  }

  /**
   * Get the Three.js object for adding to scene
   */
  getObject3D(): THREE.Group {
    return this.container;
  }

  /**
   * Get current active particle count
   */
  getActiveCount(): number {
    return this.activeCount;
  }

  /**
   * Clear all particles
   */
  clear(): void {
    for (const particle of this.particles) {
      particle.active = false;
      particle.sprite.visible = false;
    }
    this.activeCount = 0;
    this.tickRemainderSeconds = 0;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    // Dispose particle sprite materials
    for (const particle of this.particles) {
      particle.material.dispose();
    }
  }
}
