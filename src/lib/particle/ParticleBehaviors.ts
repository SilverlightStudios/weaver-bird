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
    case "enchant":
      applyEnchantBehavior(particle);
      break;

    default:
      break;
  }
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
