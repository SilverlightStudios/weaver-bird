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
import {
  getParticlePhysics,
  type ParticlePhysics,
} from "@constants/particles";
import { compileMinecraftExpr, type CompiledMinecraftExpr } from "./minecraftExpr";

const TICKS_PER_SECOND = 20;
const SECONDS_PER_TICK = 1 / TICKS_PER_SECOND;

/**
 * Internal particle state
 */
interface Particle {
  active: boolean;
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  position: THREE.Vector3;
  prevPosition: THREE.Vector3;
  velocity: THREE.Vector3; // blocks/tick
  age: number; // ticks
  lifetime: number; // ticks
  quadSize: number; // Minecraft `quadSize` (half-size, world units)
  physics: ParticlePhysics | null;
  particleType: string;
  textures: THREE.Texture[];
  frameIndex: number; // for cycling animations
  frameTimeTicks: number;
  frameCount: number;
  frameDurationTicks: number;
  lifetimeAnimation: boolean; // SpriteSet.get(age,lifetime) style
  staticRandomTexture: boolean; // Pick one random texture and keep it (like campfire smoke)
}

interface SpawnRuntime {
  particleType: string;
  probabilityFn: CompiledMinecraftExpr | null;
  countFn: CompiledMinecraftExpr | null;
}

/**
 * Configuration for particle emission
 */
export interface EmitConfig {
  /** Position to emit from */
  position: THREE.Vector3;
  /** Particle type ID (e.g., "flame", "smoke") */
  particleType: string;
  /** Number of particles to emit */
  count: number;
  /** Array of textures for animation frames */
  textures: THREE.Texture[];
  /** Optional color tint [r, g, b] 0-255 */
  tint?: [number, number, number];
  /** Frame duration in ticks (20 ticks = 1 second) */
  frameDuration?: number;
  /** Initial velocity (blocks/tick) [vx, vy, vz] */
  velocity?: [number, number, number];
  /** Optional per-emission size scale multiplier */
  scale?: number;
}

export interface SpawnTextureConfig {
  textures: THREE.Texture[];
  frameDuration?: number;
  tint?: [number, number, number];
}

/**
 * Quality presets
 */
export type ParticleQuality = "low" | "medium" | "high";

const QUALITY_MAX_PARTICLES: Record<ParticleQuality, number> = {
  low: 50,
  medium: 150,
  high: 300,
};

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

    // Debug: Track burst particles
    const burstParticles: Array<{lifetime: number, age: number}> = [];
    const shouldLogBurst = config.particleType === 'smoke' && config.count > 1 && Math.random() < 0.2;

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

      // Set up animation
      // Use extracted usesStaticTexture flag to determine if particle picks one random texture
      // Check both snake_case (from generated data) and camelCase (for compatibility)
      const usesStaticRandomTexture = physics.usesStaticTexture ?? physics.uses_static_texture ?? false;

      // Debug campfire particles
      if (config.particleType.includes('campfire') || config.particleType.includes('smoke')) {
        console.log(`[ParticleEngine] ${config.particleType}: usesStaticTexture=${physics.usesStaticTexture}, uses_static_texture=${physics.uses_static_texture}, frameCount=${config.textures.length}`);
      }

      particle.staticRandomTexture = usesStaticRandomTexture;
      particle.frameIndex = usesStaticRandomTexture
        ? Math.floor(Math.random() * config.textures.length) // Pick random texture and keep it
        : 0; // Start at first frame for cycling/lifetime animations
      particle.frameTimeTicks = 0;
      particle.frameCount = config.textures.length;
      particle.frameDurationTicks = config.frameDuration ?? 2;
      // Lifetime animation: maps frames to particle age (generic_7 → generic_0)
      // Only enabled if explicitly set in physics data (e.g., ash_smoke particles)
      // Default to false (cycling animation) for particles without this flag
      const hasLifetimeAnim = physics.lifetimeAnimation ?? physics.lifetime_animation ?? false;
      particle.lifetimeAnimation = hasLifetimeAnim;

      // Spawn position
      particle.position.set(config.position.x, config.position.y, config.position.z);
      particle.prevPosition.copy(particle.position);

      // RisingParticle constructor jitter: (randFloat - randFloat) * 0.05 on each axis.
      if (physics.behavior === "rising") {
        particle.position.x += (Math.random() - Math.random()) * 0.05;
        particle.position.y += (Math.random() - Math.random()) * 0.05;
        particle.position.z += (Math.random() - Math.random()) * 0.05;
        particle.prevPosition.copy(particle.position);
      }

      // Lifetime (ticks)
      particle.age = 0;
      const scale = (physics.scale ?? 1.0) * (config.scale ?? 1.0);
      if (physics.behavior === "ash_smoke" && typeof physics.lifetimeBase === "number") {
        const divisor = Math.random() * 0.8 + 0.2;
        particle.lifetime = Math.max(Math.floor((physics.lifetimeBase / divisor) * scale), 1);
      } else if (physics.behavior === "rising") {
        particle.lifetime = Math.floor(8.0 / (Math.random() * 0.8 + 0.2)) + 4;
      } else {
        // Use lifetimeTicks (schema v3+) or lifetime (schema v2)
        const lifetimeRange = physics.lifetimeTicks ?? (Array.isArray(physics.lifetime) ? physics.lifetime : [physics.lifetime ?? 20, physics.lifetime ?? 20]);
        const [minTicks, maxTicks] = lifetimeRange;
        const t = minTicks + Math.random() * (maxTicks - minTicks);
        particle.lifetime = Math.max(1, Math.floor(t));
      }

      // Velocity (blocks/tick)
      const inVel = config.velocity ?? [0, 0, 0];
      if (
        config.particleType === "campfire_signal_smoke" ||
        config.particleType === "campfire_cosy_smoke"
      ) {
        // Campfire smoke sets its own velocity; avoid base randomization.
        particle.velocity.set(inVel[0], inVel[1], inVel[2]);
      } else if (physics.behavior === "ash_smoke") {
        // BaseAshSmokeParticle calls super(..., 0,0,0, sprite) and then:
        // xd *= xMul; yd *= yMul; zd *= zMul;  then adds incoming speed.
        const v = this.initBaseVelocity([0, 0, 0]);
        const vm = physics.velocityMultiplier ?? [1, 1, 1];
        v.set(v.x * vm[0] + inVel[0], v.y * vm[1] + inVel[1], v.z * vm[2] + inVel[2]);
        particle.velocity.copy(v);
      } else if (physics.behavior === "rising") {
        // RisingParticle: super(..., xSpeed,ySpeed,zSpeed, sprite), then:
        // xd = xd*0.01 + xSpeed (same for y/z)
        const v = this.initBaseVelocity(inVel);
        v.set(v.x * 0.01 + inVel[0], v.y * 0.01 + inVel[1], v.z * 0.01 + inVel[2]);
        particle.velocity.copy(v);
      } else {
        // Generic: base ctor randomization, then extracted constructor modifiers.
        const v = this.initBaseVelocity(inVel);
        const vm = physics.velocityMultiplier ?? [1, 1, 1];
        v.set(v.x * vm[0], v.y * vm[1], v.z * vm[2]);
        const va = physics.velocityAdd ?? [0, 0, 0];
        v.add(new THREE.Vector3(va[0], va[1], va[2]));
        const vj = physics.velocityJitter ?? [0, 0, 0];
        v.add(new THREE.Vector3(
          (Math.random() - 0.5) * vj[0],
          (Math.random() - 0.5) * vj[1],
          (Math.random() - 0.5) * vj[2],
        ));
        particle.velocity.copy(v);
      }

      // Initial quad size (half-size)
      if (typeof physics.quadSize === "number" && Number.isFinite(physics.quadSize) && physics.quadSize > 0) {
        particle.quadSize = physics.quadSize;
      } else {
        // SingleQuadParticle: 0.1f * (rand*0.5f + 0.5f) * 2.0f  (range 0.1..0.2)
        particle.quadSize = 0.1 * (Math.random() * 0.5 + 0.5) * 2.0;
      }

      // Apply per-particle scale.
      if (physics.behavior === "ash_smoke") {
        particle.quadSize *= 0.75 * scale;
      } else {
        particle.quadSize *= scale;
      }

      // Initial material state (per-particle material; do not share between particles)
      particle.material.map = particle.textures[particle.frameIndex] ?? particle.textures[0];
      particle.material.needsUpdate = true;
      particle.material.opacity = THREE.MathUtils.clamp(physics.baseAlpha ?? physics.alpha ?? 1, 0, 1);

      // Color/tint
      const colorScale = physics.colorScale ?? physics.color_scale;
      if (physics.behavior === "ash_smoke" && typeof colorScale === "number") {
        const gray = Math.random() * colorScale;
        particle.material.color.setRGB(gray, gray, gray);
      } else if (config.tint) {
        particle.material.color.setRGB(
          config.tint[0] / 255,
          config.tint[1] / 255,
          config.tint[2] / 255,
        );
      } else if (physics.color) {
        particle.material.color.setRGB(physics.color[0], physics.color[1], physics.color[2]);
      } else {
        particle.material.color.setRGB(1, 1, 1);
      }

      // Apply initial interpolated position/size immediately.
      particle.sprite.position.copy(particle.position);
      const initialFullSize = this.getFullSizeForRender(particle, 0);
      particle.sprite.scale.set(initialFullSize, initialFullSize, 1);

      this.activeCount++;

      // Track for burst logging
      if (shouldLogBurst) {
        burstParticles.push({
          lifetime: particle.lifetime,
          age: particle.age,
        });
      }
    }

    // Debug: Log burst if multiple smoke particles were created
    if (shouldLogBurst && burstParticles.length > 1) {
      const lifetimes = burstParticles.map(p => p.lifetime);
      const uniqueLifetimes = new Set(lifetimes);
        console.log('[ParticleEngine] BURST CREATED:', {
          particleType: config.particleType,
          count: burstParticles.length,
          lifetimes,
          uniqueCount: uniqueLifetimes.size,
          allSame: uniqueLifetimes.size === 1,
          behavior: physics.behavior,
          lifetimeBase: physics.lifetimeBase,
          lifetimeAnimation: physics.lifetimeAnimation ?? physics.lifetime_animation,
        });
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
      const fullSize = this.getFullSizeForRender(particle, partialTick);
      particle.sprite.scale.set(fullSize, fullSize, 1);

      // Opacity/alpha (base multiplier).
      let alpha = particle.physics.baseAlpha ?? particle.physics.alpha ?? 1;

      // CampfireSmokeParticle.tick() fades out in the last 60 ticks
      if (
        (particle.particleType === "campfire_signal_smoke" || particle.particleType === "campfire_cosy_smoke") &&
        particle.age >= particle.lifetime - 60
      ) {
        // Fade: alpha -= 0.015f per tick (approximated over partialTick)
        const ticksRemaining = particle.lifetime - particle.age;
        alpha = Math.max(0.01, 1.0 - (60 - ticksRemaining) * 0.015);
      }

      particle.material.opacity = THREE.MathUtils.clamp(alpha, 0, 1);

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

      const physics = particle.physics;

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
      this.applyBehaviorTick(particle, physics);

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

  private getSpawnRuntimes(particleType: string, physics: ParticlePhysics): SpawnRuntime[] {
    const cached = this.spawnRuntimeCache.get(particleType);
    if (cached) return cached;

    const spawns = physics.spawnsParticles ?? physics.spawns_particles;
    if (!spawns || spawns.length === 0) {
      this.spawnRuntimeCache.set(particleType, []);
      return [];
    }

    const runtimes: SpawnRuntime[] = [];
    for (const spawn of spawns) {
      const spawnType = spawn.particleId ?? spawn.particle_id;
      if (!spawnType) continue;

      const rawProbabilityExpr = spawn.probabilityExpr ?? spawn.probability_expr;
      const probabilityExpr =
        particleType === "lava" && rawProbabilityExpr?.includes("$$0")
          ? rawProbabilityExpr.replace(/\$\$0/g, "this.age / this.lifetime")
          : rawProbabilityExpr;
      const countExpr = spawn.countExpr ?? spawn.count_expr;
      const probabilityFn = probabilityExpr ? compileMinecraftExpr(probabilityExpr) : null;
      const countFn = countExpr ? compileMinecraftExpr(countExpr) : null;

      if (probabilityExpr && !probabilityFn) continue;
      if (countExpr && !countFn) continue;

      runtimes.push({
        particleType: spawnType,
        probabilityFn,
        countFn,
      });
    }

    this.spawnRuntimeCache.set(particleType, runtimes);
    return runtimes;
  }

  private spawnChildParticles(particle: Particle): void {
    if (!particle.physics) return;

    const runtimes = this.getSpawnRuntimes(particle.particleType, particle.physics);
    if (runtimes.length === 0) return;

    const context = {
      age: particle.age,
      lifetime: particle.lifetime,
    };

    for (const spawn of runtimes) {
      if (spawn.probabilityFn) {
        const shouldSpawn = spawn.probabilityFn(Math.random, 0, context);
        if (!shouldSpawn) continue;
      }

      let count = 1;
      if (spawn.countFn) {
        const rawCount = spawn.countFn(Math.random, 0, context);
        count = Number.isFinite(rawCount) ? Math.max(0, Math.trunc(rawCount)) : 0;
      }

      if (count <= 0) continue;

      const spawnConfig = this.spawnTextureMap[spawn.particleType];
      if (!spawnConfig || spawnConfig.textures.length === 0) continue;

      for (let i = 0; i < count; i++) {
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
   * Apply behavior-specific tick modifications
   *
   * Different particle types have unique tick() behaviors that affect movement.
   * This method handles special cases like portal particle rising.
   */
  private applyBehaviorTick(particle: Particle, physics: ParticlePhysics): void {
    // Check for tickVelocityDelta from extracted physics
    const tickDelta = physics.tickVelocityDelta ?? physics.tick_velocity_delta;
    if (tickDelta) {
      particle.velocity.x += tickDelta[0];
      particle.velocity.y += tickDelta[1];
      particle.velocity.z += tickDelta[2];
      return;
    }

    // Behavior-specific handling
    switch (particle.particleType) {
      case "campfire_signal_smoke":
      case "campfire_cosy_smoke":
        // CampfireSmokeParticle.tick() adds random velocity jitter
        // xd += (double)(this.random.nextFloat() / 5000.0f * (float)(this.random.nextBoolean() ? 1 : -1));
        // zd += (double)(this.random.nextFloat() / 5000.0f * (float)(this.random.nextBoolean() ? 1 : -1));
        particle.velocity.x += (Math.random() / 5000.0) * (Math.random() > 0.5 ? 1 : -1);
        particle.velocity.z += (Math.random() / 5000.0) * (Math.random() > 0.5 ? 1 : -1);
        break;

      case "portal":
      case "reverse_portal":
        // Portal particles rise and spiral toward center
        // In Minecraft, they move toward a target point (0.5, 1, 0.5) from block center
        this.applyPortalBehavior(particle);
        break;

      case "enchant":
        // Enchanting table particles spiral upward toward the book
        this.applyEnchantBehavior(particle);
        break;

      default:
        // No special behavior
        break;
    }
  }

  /**
   * Portal particle rising/spiraling behavior
   *
   * Minecraft PortalParticle moves toward a target point with damped velocity.
   */
  private applyPortalBehavior(particle: Particle): void {
    // Portal particles rise gently while drifting toward center
    // The original Minecraft code moves toward (xTarget, yTarget, zTarget)
    // For preview, simulate gentle upward drift with slight centering

    const centerX = 0.5;
    const centerZ = 0.5;
    const targetY = 1.0;

    // Gently attract toward center
    const dx = centerX - particle.position.x;
    const dy = targetY - particle.position.y;
    const dz = centerZ - particle.position.z;

    // Apply small velocity adjustments (damped attraction)
    const attraction = 0.01;
    particle.velocity.x += dx * attraction;
    particle.velocity.y += dy * attraction + 0.005; // Extra upward boost
    particle.velocity.z += dz * attraction;
  }

  /**
   * Enchanting table particle spiral behavior
   */
  private applyEnchantBehavior(particle: Particle): void {
    // Enchant particles spiral upward toward a target (book position)
    const targetY = 1.5;
    const dy = targetY - particle.position.y;

    // Gentle upward attraction
    particle.velocity.y += dy * 0.015 + 0.003;

    // Slight spiral effect
    const angle = particle.age * 0.1;
    particle.velocity.x += Math.sin(angle) * 0.002;
    particle.velocity.z += Math.cos(angle) * 0.002;
  }

  private getFullSizeForRender(particle: Particle, partialTick: number): number {
    const quadSize = this.getQuadSizeForRender(particle, partialTick);
    return quadSize * 2.0;
  }

  private getQuadSizeForRender(particle: Particle, partialTick: number): number {
    const physics = particle.physics;
    if (!physics) return particle.quadSize;

    const t = (particle.age + partialTick) / particle.lifetime;

    if (physics.behavior === "ash_smoke") {
      // BaseAshSmokeParticle.getQuadSize: quadSize * clamp(((age+pt)/lifetime)*32, 0, 1)
      const ramp = THREE.MathUtils.clamp(t * 32.0, 0, 1);
      return particle.quadSize * ramp;
    }

    // FlameParticle.getQuadSize curve (torch flame / small flame).
    if (particle.particleType === "flame" || particle.particleType === "small_flame") {
      return particle.quadSize * (1.0 - t * t * 0.5);
    }

    return particle.quadSize;
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
