import type { ParticlePhysics } from "@constants/particles";

/**
 * Internal particle state for behavior methods
 */
export interface ParticleBehaviorState {
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  age: number;
  particleType: string;
}

/**
 * Apply behavior-specific tick modifications
 *
 * Different particle types have unique tick() behaviors that affect movement.
 */
export function applyBehaviorTick(
  particle: ParticleBehaviorState,
  physics: ParticlePhysics
): void {
  const tickDelta = physics.tickVelocityDelta ?? physics.tick_velocity_delta;
  if (tickDelta) {
    particle.velocity.x += tickDelta[0];
    particle.velocity.y += tickDelta[1];
    particle.velocity.z += tickDelta[2];
  }

  const tickJitter = physics.tickVelocityJitter ?? physics.tick_velocity_jitter;
  if (tickJitter) {
    particle.velocity.x += Math.random() * tickJitter[0] * (Math.random() > 0.5 ? 1 : -1);
    particle.velocity.y += Math.random() * tickJitter[1] * (Math.random() > 0.5 ? 1 : -1);
    particle.velocity.z += Math.random() * tickJitter[2] * (Math.random() > 0.5 ? 1 : -1);
  }

  switch (particle.particleType) {
    case "portal":
    case "reverse_portal":
      applyPortalBehavior(particle);
      break;

    case "enchant":
      applyEnchantBehavior(particle);
      break;

    default:
      break;
  }
}

/**
 * Portal particle rising/spiraling behavior
 *
 * Minecraft PortalParticle moves toward a target point with damped velocity.
 */
function applyPortalBehavior(particle: ParticleBehaviorState): void {
  const centerX = 0.5;
  const centerZ = 0.5;
  const targetY = 1.0;

  const dx = centerX - particle.position.x;
  const dy = targetY - particle.position.y;
  const dz = centerZ - particle.position.z;

  const attraction = 0.01;
  particle.velocity.x += dx * attraction;
  particle.velocity.y += dy * attraction + 0.005;
  particle.velocity.z += dz * attraction;
}

/**
 * Enchanting table particle spiral behavior
 */
function applyEnchantBehavior(particle: ParticleBehaviorState): void {
  const targetY = 1.5;
  const dy = targetY - particle.position.y;

  particle.velocity.y += dy * 0.015 + 0.003;

  const angle = particle.age * 0.1;
  particle.velocity.x += Math.sin(angle) * 0.002;
  particle.velocity.z += Math.cos(angle) * 0.002;
}
