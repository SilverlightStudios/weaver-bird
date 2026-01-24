import * as THREE from "three";
import type { ParticlePhysics } from "./types";

export function initializeParticleAnimation(
  physics: ParticlePhysics,
  textureCount: number,
): {
  staticRandomTexture: boolean;
  frameIndex: number;
  frameCount: number;
  lifetimeAnimation: boolean;
} {
  const usesStaticRandomTexture =
    physics.usesStaticTexture ?? physics.uses_static_texture ?? false;

  const frameIndex = usesStaticRandomTexture
    ? Math.floor(Math.random() * textureCount)
    : 0;

  const hasLifetimeAnim =
    physics.lifetimeAnimation ?? physics.lifetime_animation ?? false;

  return {
    staticRandomTexture: usesStaticRandomTexture,
    frameIndex,
    frameCount: textureCount,
    lifetimeAnimation: hasLifetimeAnim,
  };
}

export function applyPositionJitter(
  position: THREE.Vector3,
  physics: ParticlePhysics,
): void {
  if (!physics.position_jitter) return;

  position.x +=
    (Math.random() - Math.random()) * physics.position_jitter[0];
  position.y +=
    (Math.random() - Math.random()) * physics.position_jitter[1];
  position.z +=
    (Math.random() - Math.random()) * physics.position_jitter[2];
}

export function calculateParticleLifetime(
  physics: ParticlePhysics,
): number {
  const lifetimeRange =
    physics.lifetimeTicks ??
    (Array.isArray(physics.lifetime)
      ? physics.lifetime
      : [physics.lifetime ?? 20, physics.lifetime ?? 20]);

  const [minTicks, maxTicks] = lifetimeRange;
  const t = minTicks + Math.random() * (maxTicks - minTicks);
  return Math.max(1, Math.floor(t));
}

export function initializeParticleVelocity(
  particleType: string,
  baseVelocity: [number, number, number],
  physics: ParticlePhysics,
  initBaseVelocityFn: (inVel: [number, number, number]) => THREE.Vector3,
): THREE.Vector3 {
  const isCampfireSmoke =
    particleType === "campfire_signal_smoke" ||
    particleType === "campfire_cosy_smoke";

  if (isCampfireSmoke) {
    return new THREE.Vector3(baseVelocity[0], baseVelocity[1], baseVelocity[2]);
  }

  const v = initBaseVelocityFn(baseVelocity);
  const vm = physics.velocityMultiplier ?? [1, 1, 1];
  v.set(v.x * vm[0], v.y * vm[1], v.z * vm[2]);

  const va = physics.velocityAdd ?? [0, 0, 0];
  v.add(new THREE.Vector3(va[0], va[1], va[2]));

  const vj = physics.velocityJitter ?? [0, 0, 0];
  v.add(
    new THREE.Vector3(
      (Math.random() - 0.5) * vj[0],
      (Math.random() - 0.5) * vj[1],
      (Math.random() - 0.5) * vj[2],
    ),
  );

  return v;
}

export function calculateParticleQuadSize(
  physics: ParticlePhysics,
  scale: number,
): number {
  const extractedQuadSize = physics.quadSize ?? physics.size;
  const hasScaleMultiplier =
    typeof physics.scale === "number" && physics.scale !== 1.0;
  const isDefaultSizeWithScale =
    extractedQuadSize === 0.1 && hasScaleMultiplier;

  let quadSize: number;

  if (
    typeof extractedQuadSize === "number" &&
    Number.isFinite(extractedQuadSize) &&
    extractedQuadSize > 0 &&
    !isDefaultSizeWithScale
  ) {
    quadSize = extractedQuadSize;
  } else {
    quadSize = 0.1 * (Math.random() * 0.5 + 0.5) * 2.0;
  }

  return quadSize * scale;
}

export function setupParticleMaterial(
  material: THREE.SpriteMaterial,
  physics: ParticlePhysics,
  tint: [number, number, number] | undefined,
  particleType: string,
): void {
  material.opacity = THREE.MathUtils.clamp(
    physics.baseAlpha ?? physics.alpha ?? 1,
    0,
    1,
  );

  const colorScale = physics.colorScale ?? physics.color_scale;
  const hasRandomizedColor =
    physics.color &&
    physics.color[0] === -1.0 &&
    physics.color[1] === -1.0 &&
    physics.color[2] === -1.0;

  if (hasRandomizedColor && typeof colorScale === "number") {
    const gray = Math.random() * colorScale;
    material.color.setRGB(gray, gray, gray, THREE.SRGBColorSpace);
  } else if (tint) {
    let r = tint[0] / 255;
    let g = tint[1] / 255;
    let b = tint[2] / 255;

    if (
      particleType === "dust" ||
      particleType === "minecraft:dust"
    ) {
      const brightnessMult = 0.75 + Math.random() * 0.25;
      r *= brightnessMult;
      g *= brightnessMult;
      b *= brightnessMult;
    }

    material.color.setRGB(r, g, b, THREE.SRGBColorSpace);
  } else if (physics.color) {
    material.color.setRGB(
      physics.color[0],
      physics.color[1],
      physics.color[2],
      THREE.SRGBColorSpace,
    );
  } else {
    material.color.setRGB(1, 1, 1, THREE.SRGBColorSpace);
  }
}
