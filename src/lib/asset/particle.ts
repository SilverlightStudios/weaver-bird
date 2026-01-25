/**
 * Particle texture utilities
 */

import { isParticleTexture } from "./predicates";

/**
 * Extract particle type from asset ID
 * Example: "minecraft:particle/flame" -> "flame"
 */
export function getParticleTypeFromAssetId(assetId: string): string | null {
  if (!isParticleTexture(assetId)) return null;
  const path = assetId.includes(":") ? assetId.split(":")[1] : assetId;
  return path.replace("particle/", "");
}

/**
 * Get the asset ID for a particle type
 * Example: "flame" -> "minecraft:particle/flame"
 */
export function getParticleAssetId(particleType: string): string {
  return `minecraft:particle/${particleType}`;
}
