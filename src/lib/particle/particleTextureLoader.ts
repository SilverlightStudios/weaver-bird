/**
 * Particle Texture Loader
 *
 * Handles loading particle textures from resource packs with
 * fallback to vanilla textures.
 *
 * Uses dynamic texture mappings extracted from Minecraft JAR.
 * Returns null if extraction hasn't run.
 */

import * as THREE from "three";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
  getVanillaTexturePath,
  getPackTexturePath,
  getParticleData,
  type ParticleData,
} from "@lib/tauri";

interface ParticleTextureMapping {
  textures: string[];
  tint?: [number, number, number];
  frameDuration?: number;
}

// Texture cache to avoid reloading
const textureCache = new Map<string, THREE.Texture>();

// Dynamic particle data cache (extracted from Minecraft JAR)
let dynamicParticleData: ParticleData | null = null;
let dynamicDataLoading: Promise<ParticleData | null> | null = null;

/**
 * Loaded particle texture data
 */
export interface LoadedParticleTexture {
  /** Array of textures for this particle (multiple = animated) */
  textures: THREE.Texture[];
  /** Color tint to apply [r, g, b] 0-255 */
  tint?: [number, number, number];
  /** Frame duration in ticks (20 ticks = 1 second) */
  frameDuration?: number;
}

function splitParticleFrames(texture: THREE.Texture): THREE.Texture[] {
  const image = texture.image as {
    width?: number;
    height?: number;
    naturalWidth?: number;
    naturalHeight?: number;
  } | undefined;
  const width = image?.width ?? image?.naturalWidth ?? 0;
  const height = image?.height ?? image?.naturalHeight ?? 0;

  if (!width || !height || height <= width || height % width !== 0) {
    return [texture];
  }

  const frameCount = height / width;
  const frames: THREE.Texture[] = [];
  for (let i = 0; i < frameCount; i++) {
    const frame = texture.clone();
    frame.needsUpdate = true;
    frame.repeat.set(1, 1 / frameCount);
    frame.offset.set(0, (frameCount - 1 - i) / frameCount);
    frame.magFilter = texture.magFilter;
    frame.minFilter = texture.minFilter;
    frame.wrapS = texture.wrapS;
    frame.wrapT = texture.wrapT;
    frame.colorSpace = texture.colorSpace;
    frame.flipY = texture.flipY;
    frames.push(frame);
  }

  return frames;
}

/**
 * Initialize dynamic particle data from Minecraft JAR
 * This is called lazily on first particle load
 */
async function ensureDynamicDataLoaded(): Promise<ParticleData | null> {
  if (dynamicParticleData !== null) {
    return dynamicParticleData;
  }

  // Avoid concurrent loading
  if (dynamicDataLoading !== null) {
    return dynamicDataLoading;
  }

  dynamicDataLoading = (async () => {
    try {
      const data = await getParticleData();
      dynamicParticleData = data;
      return data;
    } catch {
      return null;
    } finally {
      dynamicDataLoading = null;
    }
  })();

  return dynamicDataLoading;
}

/**
 * Get texture mapping for a particle type
 *
 * Uses texture mappings extracted from Minecraft JAR.
 * Falls back to assuming particle name = texture name if extraction hasn't run.
 */
function getEffectiveTextureMapping(
  particleType: string,
  dynamicData: ParticleData | null,
): ParticleTextureMapping | null {
  // Use extracted texture mapping if available
  if (dynamicData?.particles?.[particleType]) {
    console.log(`[getEffectiveTextureMapping] Found mapping for ${particleType}:`, dynamicData.particles[particleType]);
    return dynamicData.particles[particleType];
  }

  // Fallback: assume particle name matches texture name
  console.log(`[getEffectiveTextureMapping] No mapping found for ${particleType}, using fallback`);
  return {
    textures: [particleType],
  };
}

/**
 * Load all textures for a particle type
 *
 * @param particleType - The particle type ID (e.g., "flame", "smoke")
 * @param packPath - Optional resource pack path
 * @param isZip - Whether the pack is a ZIP file
 * @returns The loaded textures and metadata, or null if extraction hasn't run
 */
export async function loadParticleTextures(
  particleType: string,
  packPath?: string,
  isZip?: boolean,
): Promise<LoadedParticleTexture | null> {
  console.log(`[loadParticleTextures] Starting load for ${particleType}, packPath=${packPath}`);

  const dynamicData = await ensureDynamicDataLoaded();
  console.log(`[loadParticleTextures] Dynamic data loaded:`, dynamicData);

  const mapping = getEffectiveTextureMapping(particleType, dynamicData);
  console.log(`[loadParticleTextures] Texture mapping for ${particleType}:`, mapping);

  if (!mapping) {
    console.log(`[loadParticleTextures] No mapping found for ${particleType}`);
    return null;
  }

  const loadedTextures: THREE.Texture[] = [];
  for (const textureName of mapping.textures) {
    console.log(`[loadParticleTextures] Loading texture: ${textureName}`);
    const texture = await loadSingleParticleTexture(textureName, packPath, isZip);
    console.log(`[loadParticleTextures] Texture loaded:`, !!texture);
    if (texture) {
      const frames = splitParticleFrames(texture);
      loadedTextures.push(...frames);
    }
  }

  if (loadedTextures.length === 0) {
    console.log(`[loadParticleTextures] No textures loaded for ${particleType}`);
    return null;
  }

  console.log(`[loadParticleTextures] Successfully loaded ${loadedTextures.length} textures for ${particleType}`);
  return {
    textures: loadedTextures,
    tint: mapping.tint,
    frameDuration: mapping.frameDuration,
  };
}

/**
 * Load a single particle texture by name
 *
 * @param textureName - Texture name (e.g., "flame", "generic_0")
 * @param packPath - Optional resource pack path
 * @param isZip - Whether the pack is a ZIP file
 */
async function loadSingleParticleTexture(
  textureName: string,
  packPath?: string,
  isZip?: boolean,
): Promise<THREE.Texture | null> {
  const cacheKey = `${packPath || "vanilla"}:particle/${textureName}`;

  // Check cache first
  const cached = textureCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // The asset ID format for particle textures
  const assetId = `minecraft:particle/${textureName}`;

  try {
    let texturePath: string;

    // Try pack first, then vanilla
    if (packPath) {
      try {
        texturePath = await getPackTexturePath(packPath, assetId, isZip ?? false);
      } catch {
        // Fall back to vanilla
        texturePath = await getVanillaTexturePath(assetId);
      }
    } else {
      texturePath = await getVanillaTexturePath(assetId);
    }

    const textureUrl = convertFileSrc(texturePath);

    return new Promise((resolve) => {
      const loader = new THREE.TextureLoader();
      loader.load(
        textureUrl,
        (texture) => {
          // Configure for pixel-perfect rendering
          texture.magFilter = THREE.NearestFilter;
          texture.minFilter = THREE.NearestFilter;
          texture.colorSpace = THREE.SRGBColorSpace;

          // Cache the texture
          textureCache.set(cacheKey, texture);

          resolve(texture);
        },
        undefined,
        () => {
          resolve(null);
        },
      );
    });
  } catch {
    return null;
  }
}
