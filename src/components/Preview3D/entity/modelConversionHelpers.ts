/**
 * Helper functions for entity model texture loading and conversion
 */
import type * as THREE from "three";
import { jemToThreeJS, type ParsedEntityModel } from "@lib/emf";
import type { AnimationLayer } from "@lib/emf/jemLoader";
import type { PackInfo } from "./types";

interface ConversionResult {
  group: THREE.Group;
  packAnimationLayers: AnimationLayer[] | undefined;
}

/**
 * Load textures and convert model to Three.js
 */
export async function loadTexturesAndConvert(
  modelForConversion: ParsedEntityModel,
  texturePath: string,
  cemEntityType: string,
  modelPack: PackInfo | null,
  resolvedPack: { path: string; is_zip: boolean } | undefined,
  packsDir: string | undefined,
  versionFolders: string[],
  loadTextureFromPacks: (
    path: string,
    resolved: { path: string; is_zip: boolean } | undefined,
    model: PackInfo | null,
    packs: string | undefined,
    folders: string[],
  ) => Promise<THREE.Texture | null>,
  loadVanillaTexture: (path: string) => Promise<THREE.Texture | null>,
  loadExtraTextures: (
    model: ParsedEntityModel,
    modelPack: PackInfo | null,
    resolved: { path: string; is_zip: boolean } | undefined,
    packs: string | undefined,
    folders: string[],
  ) => Promise<Record<string, THREE.Texture>>,
): Promise<ConversionResult> {
  let texture = await loadTextureFromPacks(
    texturePath,
    resolvedPack,
    modelPack,
    packsDir,
    versionFolders,
  );

  texture ??= await loadVanillaTexture(`minecraft:${texturePath}`);

  const textureMap = await loadExtraTextures(
    modelForConversion,
    modelPack,
    resolvedPack,
    packsDir,
    versionFolders,
  );

  const group = jemToThreeJS(modelForConversion, texture, textureMap, cemEntityType);
  group.position.y = 0;

  return {
    group,
    packAnimationLayers: modelForConversion.animations?.length
      ? modelForConversion.animations
      : undefined,
  };
}
