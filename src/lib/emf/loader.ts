/**
 * EMF/JEM model loader
 *
 * Loads entity models from:
 * 1. Resource pack (assets/minecraft/optifine/cem/*.jem)
 * 2. Fallback to embedded vanilla models
 */

import { invoke } from '@tauri-apps/api/core';
import type { JEMFile, ParsedEntityModel } from './types';
import { parseJEM } from './parser';

// Import vanilla models
import chestModel from './vanilla/chest.jem.json';
import cowModel from './vanilla/cow.jem.json';
import chickenModel from './vanilla/chicken.jem.json';
import shulkerModel from './vanilla/shulker.jem.json';

/**
 * Registry of embedded vanilla entity models
 */
const VANILLA_MODELS: Record<string, JEMFile> = {
  'chest': chestModel as JEMFile,
  'cow': cowModel as JEMFile,
  'chicken': chickenModel as JEMFile,
  'shulker': shulkerModel as JEMFile,
  // Aliases
  'trapped_chest': chestModel as JEMFile,
  'ender_chest': chestModel as JEMFile,
  'shulker_box': shulkerModel as JEMFile,
};

/**
 * Map texture paths to entity types
 */
const TEXTURE_TO_ENTITY: Record<string, string> = {
  'entity/chest/normal': 'chest',
  'entity/chest/trapped': 'trapped_chest',
  'entity/chest/ender': 'ender_chest',
  'entity/chest/christmas': 'chest',
  'entity/cow/cow': 'cow',
  'entity/cow/red_mooshroom': 'cow',
  'entity/cow/brown_mooshroom': 'cow',
  'entity/chicken': 'chicken',
  'entity/shulker/shulker': 'shulker_box',
};

// Add shulker color variants
const SHULKER_COLORS = [
  'white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime',
  'pink', 'gray', 'light_gray', 'cyan', 'purple', 'blue',
  'brown', 'green', 'red', 'black'
];

for (const color of SHULKER_COLORS) {
  TEXTURE_TO_ENTITY[`entity/shulker/shulker_${color}`] = 'shulker_box';
}

/**
 * Get entity type from asset ID
 */
export function getEntityTypeFromAssetId(assetId: string): string | null {
  const texturePath = assetId.replace(/^minecraft:/, '');
  return TEXTURE_TO_ENTITY[texturePath] || null;
}

/**
 * Check if an asset ID is a supported entity
 */
export function isSupportedEntity(assetId: string): boolean {
  return getEntityTypeFromAssetId(assetId) !== null;
}

/**
 * Load an entity model from a resource pack or vanilla fallback
 *
 * @param entityType - Entity type (e.g., "chest", "cow")
 * @param packPath - Path to resource pack
 * @param isZip - Whether pack is a ZIP file
 * @returns Parsed entity model or null if not found
 */
export async function loadEntityModel(
  entityType: string,
  packPath?: string,
  isZip?: boolean,
): Promise<ParsedEntityModel | null> {
  console.log(`[EMF Loader] Loading entity model: ${entityType}`);

  // Try loading from pack first
  if (packPath) {
    try {
      const packModel = await loadJEMFromPack(entityType, packPath, isZip || false);
      if (packModel) {
        console.log(`[EMF Loader] Loaded ${entityType} from pack`);
        return parseJEM(packModel, entityType);
      }
    } catch (err) {
      console.log(`[EMF Loader] Pack model not found, using vanilla: ${err}`);
    }
  }

  // Fall back to vanilla model
  const vanillaModel = VANILLA_MODELS[entityType];
  if (vanillaModel) {
    console.log(`[EMF Loader] Using vanilla model for ${entityType}`);
    return parseJEM(vanillaModel, entityType);
  }

  console.warn(`[EMF Loader] No model found for entity: ${entityType}`);
  return null;
}

/**
 * Load JEM file from a resource pack
 */
async function loadJEMFromPack(
  entityType: string,
  packPath: string,
  isZip: boolean,
): Promise<JEMFile | null> {
  try {
    // Try to load from optifine/cem directory
    const jemPath = `assets/minecraft/optifine/cem/${entityType}.jem`;

    const content = await invoke<string>('read_pack_file', {
      packPath,
      filePath: jemPath,
      isZip,
    });

    if (content) {
      return JSON.parse(content) as JEMFile;
    }
  } catch {
    // File not found in pack
  }

  return null;
}

/**
 * Get list of all supported entity types
 */
export function getSupportedEntityTypes(): string[] {
  return Object.keys(VANILLA_MODELS);
}

/**
 * Get the texture path override for a specific entity variant
 */
export function getEntityTexturePath(assetId: string): string {
  // Extract texture path from asset ID
  // e.g., "minecraft:entity/chest/normal" -> "entity/chest/normal"
  return assetId.replace(/^minecraft:/, '');
}
