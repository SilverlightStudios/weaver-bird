/**
 * Texture loading utilities for Minecraft resource packs
 */
import * as THREE from "three";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getPackTexturePath, getVanillaTexturePath } from "@lib/tauri";
import {
  type AnimatedTextureInfo,
  type AnimMaterial,
  setupAnimatedTexture,
} from "./animatedTextureMaterial";

// Cache textures to avoid reloading
const textureCache = new Map<string, THREE.Texture>();

// Track animated textures for animation updates
const animatedTextures = new Map<THREE.Texture, AnimatedTextureInfo>();

/**
 * Update all animated textures
 * Should be called in the render loop
 */
export function updateAnimatedTextures(currentTime: number): void {
  animatedTextures.forEach((info) => {
    if (info.frames.length === 0) {
      return;
    }

    let { sequenceIndex } = info;
    let frameStartTime = info.lastUpdateTime;
    let elapsedMs = currentTime - frameStartTime;
    let frameTimeMs = info.frameTimesMs[sequenceIndex] ?? 50;
    let advanced = false;

    while (elapsedMs >= frameTimeMs && info.frames.length > 0) {
      elapsedMs -= frameTimeMs;
      sequenceIndex = (sequenceIndex + 1) % info.frames.length;
      frameTimeMs = info.frameTimesMs[sequenceIndex] ?? 50;
      frameStartTime = currentTime - elapsedMs;
      advanced = true;
    }

    if (advanced) {
      info.sequenceIndex = sequenceIndex;
      info.lastUpdateTime = frameStartTime;
    }

    const currentFrame = info.frames[sequenceIndex] ?? 0;
    const nextSequenceIndex =
      info.frames.length > 0
        ? (sequenceIndex + 1) % info.frames.length
        : sequenceIndex;
    const nextFrame = info.frames[nextSequenceIndex] ?? currentFrame;

    if (info.interpolate && info.material) {
      const progress = Math.min(elapsedMs / frameTimeMs, 1.0);

      const animUniforms = (info.material as AnimMaterial).userData?.animUniforms;
      if (animUniforms) {
        animUniforms.currentFrame.value = currentFrame;
        animUniforms.nextFrame.value = nextFrame;
        animUniforms.blendFactor.value = progress;
      }
    } else if (advanced) {
      const offset =
        (info.frameCount - 1 - currentFrame) / info.frameCount;
      info.texture.offset.set(0, offset);
      info.texture.needsUpdate = true;
    }
  });
}

/**
 * Load a texture from a resource pack
 */
export async function loadPackTexture(
  packPath: string,
  textureId: string,
  isZip: boolean,
  versionFolders?: string[] | null,
): Promise<THREE.Texture | null> {
  console.log(`=== [textureLoader] Loading Pack Texture ===`);
  console.log(`[textureLoader] Texture ID: ${textureId}`);
  console.log(`[textureLoader] Pack path: ${packPath}`);
  console.log(`[textureLoader] Is ZIP: ${isZip}`);

  const cacheKey = `${packPath}:${textureId}`;
  if (textureCache.has(cacheKey)) {
    console.log(`[textureLoader] ✓ Texture found in cache: ${textureId}`);
    return textureCache.get(cacheKey)!;
  }

  try {
    console.log(`[textureLoader] → Requesting texture path from backend...`);
    const texturePath = await getPackTexturePath(
      packPath,
      textureId,
      isZip,
      versionFolders ?? undefined,
    );

    console.log(`[textureLoader] ✓ Backend returned path: ${texturePath}`);

    const textureUrl = convertFileSrc(texturePath);
    console.log(`[textureLoader] ✓ Converted to browser URL: ${textureUrl}`);

    console.log(`[textureLoader] → Loading texture from URL...`);
    const texture = await new Promise<THREE.Texture>((resolve, reject) => {
      const loader = new THREE.TextureLoader();
      loader.load(
        textureUrl,
        async (tex) => {
          console.log(
            `[textureLoader] ✓ Texture loaded successfully: ${textureId}`,
          );
          tex.magFilter = THREE.NearestFilter;
          tex.minFilter = THREE.NearestFilter;
          tex.wrapS = THREE.ClampToEdgeWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          tex.colorSpace = THREE.SRGBColorSpace;

          await setupAnimatedTexture(tex, textureUrl, textureId, animatedTextures);

          resolve(tex);
        },
        (progress) => {
          console.log(`[textureLoader] Loading progress:`, progress);
        },
        (error) => {
          console.error(
            `[textureLoader] ✗ THREE.TextureLoader error for ${textureId}:`,
            error,
          );
          reject(error);
        },
      );
    });

    textureCache.set(cacheKey, texture);
    console.log(`[textureLoader] ✓ Texture cached`);
    console.log(`===========================================`);
    return texture;
  } catch (error) {
    console.error(`=== [textureLoader] Texture Load FAILED ===`);
    console.error(`[textureLoader] Texture ID: ${textureId}`);
    console.error(`[textureLoader] Error:`, error);
    console.error(`===========================================`);
    return null;
  }
}

/**
 * Load vanilla Minecraft texture
 */
export async function loadVanillaTexture(
  textureId: string,
): Promise<THREE.Texture | null> {
  const cacheKey = `vanilla:${textureId}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  try {
    const texturePath = await getVanillaTexturePath(textureId);

    const textureUrl = convertFileSrc(texturePath);

    const texture = await new Promise<THREE.Texture>((resolve, reject) => {
      const loader = new THREE.TextureLoader();
      loader.load(
        textureUrl,
        async (tex) => {
          tex.magFilter = THREE.NearestFilter;
          tex.minFilter = THREE.NearestFilter;
          tex.wrapS = THREE.ClampToEdgeWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          tex.colorSpace = THREE.SRGBColorSpace;

          await setupAnimatedTexture(tex, textureUrl, textureId, animatedTextures);

          resolve(tex);
        },
        undefined,
        (error) => {
          console.error(
            `[textureLoader] Failed to load vanilla texture ${textureId}:`,
            error,
          );
          reject(error);
        },
      );
    });

    textureCache.set(cacheKey, texture);
    return texture;
  } catch (error) {
    console.error(
      `[textureLoader] Error loading vanilla texture ${textureId}:`,
      error,
    );
    return null;
  }
}

/**
 * Create a texture loader function for a specific pack
 */
export function createTextureLoader(
  packPath: string,
  isZip: boolean,
  variantNumber?: string | null,
): (textureId: string) => Promise<THREE.Texture | null> {
  return async (textureId: string) => {
    console.log(`[textureLoader] createTextureLoader called for: ${textureId}`);

    let actualTextureId = textureId;
    if (variantNumber) {
      const hasVariantNumber = /\d+$/.test(textureId);

      if (!hasVariantNumber) {
        actualTextureId = `${textureId}${variantNumber}`;
        console.log(
          `[textureLoader] Applying variant suffix: ${textureId} -> ${actualTextureId}`,
        );
      } else {
        console.log(
          `[textureLoader] Texture already has variant number, not applying suffix: ${textureId}`,
        );
      }
    }

    console.log(`[textureLoader] Attempting pack texture load...`);
    let texture = await loadPackTexture(packPath, actualTextureId, isZip);

    if (!texture && variantNumber && actualTextureId !== textureId) {
      console.log(
        `[textureLoader] Variant texture failed, trying base texture: ${textureId}`,
      );
      texture = await loadPackTexture(packPath, textureId, isZip);
    }

    if (!texture) {
      console.log(
        `[textureLoader] Pack texture failed, trying vanilla fallback...`,
      );
      texture = await loadVanillaTexture(actualTextureId);

      if (!texture && variantNumber && actualTextureId !== textureId) {
        texture = await loadVanillaTexture(textureId);
      }

      if (texture) {
        console.log(`[textureLoader] ✓ Vanilla texture loaded successfully`);
      } else {
        console.error(
          `[textureLoader] ✗ All texture load attempts failed for ${actualTextureId}`,
        );
      }
    }

    return texture;
  };
}

/**
 * Get animation info for a texture
 * Returns material if the texture uses interpolation
 */
export function getAnimationMaterial(
  texture: THREE.Texture,
): THREE.ShaderMaterial | null {
  const info = animatedTextures.get(texture);
  return info?.material ?? null;
}

/**
 * Check if a texture is animated
 */
export function isTextureAnimated(texture: THREE.Texture): boolean {
  return animatedTextures.has(texture);
}

/**
 * Clear the texture cache
 */
export function clearTextureCache(): void {
  for (const texture of textureCache.values()) {
    texture.dispose();
    animatedTextures.delete(texture);
  }
  textureCache.clear();
}

/**
 * Remove a specific texture from cache
 */
export function uncacheTexture(packPath: string, textureId: string): void {
  const cacheKey = `${packPath}:${textureId}`;
  const texture = textureCache.get(cacheKey);
  if (texture) {
    texture.dispose();
    animatedTextures.delete(texture);
    textureCache.delete(cacheKey);
  }
}
