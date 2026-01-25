/**
 * Utility functions for creating block face materials
 */

import * as THREE from "three";
import type { ElementFace } from "@lib/tauri/blockModels";
import {
  getBlockLightLevel,
  shouldHaveVisualEmissive,
} from "@/constants/blockLightEmission";

/**
 * Face mapping from Minecraft names to Three.js box face indices
 */
export const FACE_MAPPING: Record<string, number> = {
  east: 0, // right (+X)
  west: 1, // left (-X)
  up: 2, // top (+Y)
  down: 3, // bottom (-Y)
  south: 4, // front (+Z)
  north: 5, // back (-Z)
};

/**
 * Create default transparent material for undefined faces
 */
export function createDefaultMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
    colorWrite: false,
    roughness: 0.8,
    metalness: 0.2,
    side: THREE.FrontSide,
  });
}

/**
 * Resolve texture variable (e.g., "#all" -> "minecraft:block/dirt")
 */
export function resolveTextureVariable(
  textureRef: string,
  textureVariables: Record<string, string>,
): string | null {
  let textureId = textureRef;

  if (textureId.startsWith("#")) {
    const varName = textureId.substring(1);
    console.log(`[modelConverter] Resolving variable: #${varName}`);
    textureId = textureVariables[varName] ?? textureId;
    console.log(`[modelConverter] Resolved to: ${textureId}`);
  }

  // Still unresolved variable
  if (textureId.startsWith("#")) {
    return null;
  }

  return textureId;
}

/**
 * Configure texture for Minecraft-style rendering
 */
export function configureTexture(texture: THREE.Texture): void {
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
}

/**
 * Apply biome color tint to material
 */
export function applyBiomeTint(
  faceData: ElementFace,
  biomeColor?: { r: number; g: number; b: number } | null,
): THREE.Color | undefined {
  if (
    faceData.tintindex === undefined ||
    faceData.tintindex === null ||
    !biomeColor
  ) {
    return undefined;
  }

  const materialColor = new THREE.Color();
  materialColor.setRGB(
    biomeColor.r / 255,
    biomeColor.g / 255,
    biomeColor.b / 255,
    THREE.SRGBColorSpace
  );

  console.log(
    `[modelConverter] Applying biome tint:`,
    materialColor,
    `(sRGB input: rgb(${biomeColor.r}, ${biomeColor.g}, ${biomeColor.b}))`
  );

  return materialColor;
}

/**
 * Determine emissive behavior for a block
 */
export function getEmissiveBehavior(
  blockId: string | undefined,
  blockProps: Record<string, string>,
): {
  hasVisualEmissive: boolean;
  emitsLight: boolean;
} {
  if (!blockId) {
    return { hasVisualEmissive: false, emitsLight: false };
  }

  const hasVisualEmissive = shouldHaveVisualEmissive(blockId, blockProps);
  const lightLevel = getBlockLightLevel(blockId, blockProps);
  const emitsLight = lightLevel !== null && lightLevel > 0;

  if (emitsLight) {
    console.log(
      `[modelConverter] Checking light for block=${blockId}, props=`,
      blockProps,
      `lightLevel=${lightLevel}`,
    );
    console.log(
      `[modelConverter] Block ${blockId} emits light level ${lightLevel}`,
    );
  }

  return { hasVisualEmissive, emitsLight };
}

/**
 * Try loading emissive overlay texture (_e suffix)
 */
export async function loadEmissiveMap(
  textureId: string,
  shouldTry: boolean,
  textureLoader: (id: string) => Promise<THREE.Texture | null>,
  blockId?: string,
): Promise<THREE.Texture | undefined> {
  if (!shouldTry) return undefined;

  try {
    const emissiveTextureId = textureId.replace(/\.png$/, "_e");
    const emissiveTexture = await textureLoader(emissiveTextureId);
    if (emissiveTexture) {
      emissiveTexture.magFilter = THREE.NearestFilter;
      emissiveTexture.minFilter = THREE.NearestFilter;
      console.log(`[modelConverter] ✓ Loaded emissive overlay: ${emissiveTextureId}`);
      return emissiveTexture;
    }
  } catch {
    console.log(`[modelConverter] No emissive overlay found for ${blockId} (will use fullbright fallback)`);
  }

  return undefined;
}

/**
 * Create material with emissive map
 */
export function createEmissiveMapMaterial(
  texture: THREE.Texture,
  emissiveMap: THREE.Texture,
  materialColor?: THREE.Color,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map: texture,
    color: materialColor ?? 0xffffff,
    transparent: true,
    alphaTest: 0.1,
    roughness: 0.8,
    metalness: 0.2,
    flatShading: false,
    side: THREE.FrontSide,
    emissiveMap: emissiveMap,
    emissive: 0xffffff,
    emissiveIntensity: 1.0,
  });
}

/**
 * Create fullbright material (MeshBasicMaterial)
 */
export function createFullbrightMaterial(
  texture: THREE.Texture,
  materialColor?: THREE.Color,
): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    map: texture,
    color: materialColor ?? 0xffffff,
    transparent: true,
    alphaTest: 0.1,
    side: THREE.FrontSide,
  });
}

/**
 * Create standard material with normal lighting
 */
export function createStandardMaterial(
  texture: THREE.Texture,
  materialColor?: THREE.Color,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map: texture,
    color: materialColor ?? 0xffffff,
    transparent: true,
    alphaTest: 0.1,
    roughness: 0.8,
    metalness: 0.2,
    flatShading: false,
    side: THREE.FrontSide,
  });
}
