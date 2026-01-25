import type { ParticlePhysics } from "@constants/particles";
import * as THREE from "three";

export interface ParticleRenderState {
  quadSize: number;
  age: number;
  lifetime: number;
  physics: ParticlePhysics | null;
}

export function getQuadSizeForRender(particle: ParticleRenderState, partialTick: number): number {
  const curve = particle.physics?.quadSizeCurve ?? particle.physics?.quad_size_curve;

  if (!curve || curve.type === "constant") {
    return particle.quadSize;
  }

  const age = particle.age + partialTick;
  const ageRatio = age / particle.lifetime;

  switch (curve.type) {
    case "linear_grow_clamped": {
      const growth = Math.min(1.0, Math.max(0.0, ageRatio * curve.multiplier));
      return particle.quadSize * growth;
    }

    case "quadratic_shrink": {
      return particle.quadSize * (1.0 - ageRatio * ageRatio * curve.factor);
    }

    case "linear_shrink": {
      const shrink = 1.0 - age / (particle.lifetime * curve.lifetime_multiplier);
      return particle.quadSize * Math.max(0.0, shrink);
    }

    case "ease_in_quad": {
      let t = 1.0 - ageRatio;
      t = t * t;
      t = 1.0 - t;
      return particle.quadSize * t;
    }

    case "sine_wave": {
      return curve.amplitude * Math.sin((age + curve.phase) * curve.frequency * Math.PI);
    }

    case "absolute": {
      return curve.size;
    }

    default:
      return particle.quadSize;
  }
}

export function getFullSizeForRender(particle: ParticleRenderState, partialTick: number): number {
  const quadSize = getQuadSizeForRender(particle, partialTick);
  return quadSize * 2.0;
}

export function calculateParticleOpacity(
  particleType: string,
  age: number,
  lifetime: number,
  physics: ParticlePhysics
): number {
  let alpha = physics.baseAlpha ?? physics.alpha ?? 1;

  if (
    (particleType === "campfire_signal_smoke" || particleType === "campfire_cosy_smoke") &&
    age >= lifetime - 60
  ) {
    const ticksRemaining = lifetime - age;
    alpha = Math.max(0.01, 1.0 - (60 - ticksRemaining) * 0.015);
  }

  return THREE.MathUtils.clamp(alpha, 0, 1);
}
