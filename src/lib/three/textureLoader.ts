/**
 * Texture loading utilities for Minecraft resource packs
 */
import * as THREE from "three";
import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";

// Cache textures to avoid reloading
const textureCache = new Map<string, THREE.Texture>();

/**
 * Load a texture from a resource pack
 *
 * @param packPath - Path to the resource pack
 * @param textureId - Texture ID (e.g., "minecraft:block/dirt")
 * @param isZip - Whether the pack is a ZIP file
 * @returns Three.js Texture or null if not found
 */
export async function loadPackTexture(
  packPath: string,
  textureId: string,
  isZip: boolean,
): Promise<THREE.Texture | null> {
  console.log(`=== [textureLoader] Loading Pack Texture ===`);
  console.log(`[textureLoader] Texture ID: ${textureId}`);
  console.log(`[textureLoader] Pack path: ${packPath}`);
  console.log(`[textureLoader] Is ZIP: ${isZip}`);

  // Check cache first
  const cacheKey = `${packPath}:${textureId}`;
  if (textureCache.has(cacheKey)) {
    console.log(`[textureLoader] ✓ Texture found in cache: ${textureId}`);
    return textureCache.get(cacheKey)!;
  }

  try {
    // Get the file path from Tauri backend
    console.log(`[textureLoader] → Requesting texture path from backend...`);
    const texturePath = await invoke<string>("get_pack_texture_path", {
      packPath,
      assetId: textureId,
      isZip,
    });

    console.log(`[textureLoader] ✓ Backend returned path: ${texturePath}`);

    // Convert to a URL that can be loaded in the browser
    const textureUrl = convertFileSrc(texturePath);
    console.log(`[textureLoader] ✓ Converted to browser URL: ${textureUrl}`);

    // Load the texture
    console.log(`[textureLoader] → Loading texture from URL...`);
    const texture = await new Promise<THREE.Texture>((resolve, reject) => {
      const loader = new THREE.TextureLoader();
      loader.load(
        textureUrl,
        (tex) => {
          console.log(
            `[textureLoader] ✓ Texture loaded successfully: ${textureId}`,
          );
          // Configure texture for Minecraft-style rendering
          tex.magFilter = THREE.NearestFilter;
          tex.minFilter = THREE.NearestFilter;
          tex.wrapS = THREE.ClampToEdgeWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          tex.colorSpace = THREE.SRGBColorSpace; // Ensure correct color interpretation
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

    // Cache the texture
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
 *
 * @param textureId - Texture ID (e.g., "minecraft:block/dirt")
 * @returns Three.js Texture or null if not found
 */
export async function loadVanillaTexture(
  textureId: string,
): Promise<THREE.Texture | null> {
  const cacheKey = `vanilla:${textureId}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  try {
    // Get the vanilla texture path from Tauri backend
    const texturePath = await invoke<string>("get_vanilla_texture_path", {
      assetId: textureId,
    });

    // Convert to a URL that can be loaded in the browser
    const textureUrl = convertFileSrc(texturePath);

    // Load the texture
    const texture = await new Promise<THREE.Texture>((resolve, reject) => {
      const loader = new THREE.TextureLoader();
      loader.load(
        textureUrl,
        (tex) => {
          // Configure texture for Minecraft-style rendering
          tex.magFilter = THREE.NearestFilter;
          tex.minFilter = THREE.NearestFilter;
          tex.wrapS = THREE.ClampToEdgeWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          tex.colorSpace = THREE.SRGBColorSpace; // Ensure correct color interpretation
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

    // Cache the texture
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
 *
 * @param packPath - Path to the resource pack
 * @param isZip - Whether the pack is a ZIP file
 * @param variantNumber - Optional variant number to append to texture paths (for ETF-style variants)
 * @returns Function that loads textures from this pack with vanilla fallback
 */
export function createTextureLoader(
  packPath: string,
  isZip: boolean,
  variantNumber?: string | null,
): (textureId: string) => Promise<THREE.Texture | null> {
  return async (textureId: string) => {
    console.log(`[textureLoader] createTextureLoader called for: ${textureId}`);

    // Apply variant number to texture path if provided (ETF-style variants)
    // BUT only if the texture path doesn't already have a variant number
    let actualTextureId = textureId;
    if (variantNumber) {
      // Check if texture already ends with a number (indicating it's already a variant)
      const hasVariantNumber = /\d+$/.test(textureId);

      if (!hasVariantNumber) {
        // Append variant number to the texture path
        // E.g., "block/allium" + "3" -> "block/allium3"
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

    // Try loading from the pack first
    console.log(`[textureLoader] Attempting pack texture load...`);
    let texture = await loadPackTexture(packPath, actualTextureId, isZip);

    // Fall back to vanilla if not found
    if (!texture) {
      console.log(
        `[textureLoader] Pack texture failed, trying vanilla fallback...`,
      );
      texture = await loadVanillaTexture(actualTextureId);
      if (texture) {
        console.log(`[textureLoader] ✓ Vanilla texture loaded successfully`);
      } else {
        console.error(
          `[textureLoader] ✗ Both pack and vanilla texture loads failed for ${actualTextureId}`,
        );
      }
    }

    return texture;
  };
}

/**
 * Clear the texture cache
 */
export function clearTextureCache(): void {
  // Dispose all textures
  for (const texture of textureCache.values()) {
    texture.dispose();
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
    textureCache.delete(cacheKey);
  }
}
