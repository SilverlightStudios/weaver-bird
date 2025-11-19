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
import pigModel from './vanilla/pig.jem.json';
import sheepModel from './vanilla/sheep.jem.json';
import zombieModel from './vanilla/zombie.jem.json';
import skeletonModel from './vanilla/skeleton.jem.json';
import creeperModel from './vanilla/creeper.jem.json';
import spiderModel from './vanilla/spider.jem.json';
import villagerModel from './vanilla/villager.jem.json';
import endermanModel from './vanilla/enderman.jem.json';
import wolfModel from './vanilla/wolf.jem.json';
import catModel from './vanilla/cat.jem.json';
import ironGolemModel from './vanilla/iron_golem.jem.json';
import slimeModel from './vanilla/slime.jem.json';
import playerModel from './vanilla/player.jem.json';
import bedModel from './vanilla/bed.jem.json';
import ghastModel from './vanilla/ghast.jem.json';

/**
 * Registry of embedded vanilla entity models
 */
const VANILLA_MODELS: Record<string, JEMFile> = {
  // Entity blocks
  'chest': chestModel as JEMFile,
  'trapped_chest': chestModel as JEMFile,
  'ender_chest': chestModel as JEMFile,
  'shulker': shulkerModel as JEMFile,
  'shulker_box': shulkerModel as JEMFile,
  'bed': bedModel as JEMFile,

  // Passive mobs
  'cow': cowModel as JEMFile,
  'chicken': chickenModel as JEMFile,
  'pig': pigModel as JEMFile,
  'sheep': sheepModel as JEMFile,
  'wolf': wolfModel as JEMFile,
  'cat': catModel as JEMFile,
  'ocelot': catModel as JEMFile,
  'villager': villagerModel as JEMFile,
  'iron_golem': ironGolemModel as JEMFile,

  // Hostile mobs
  'zombie': zombieModel as JEMFile,
  'skeleton': skeletonModel as JEMFile,
  'creeper': creeperModel as JEMFile,
  'spider': spiderModel as JEMFile,
  'enderman': endermanModel as JEMFile,
  'slime': slimeModel as JEMFile,
  'ghast': ghastModel as JEMFile,

  // Player
  'player': playerModel as JEMFile,

  // Variants that use same model
  'husk': zombieModel as JEMFile,
  'drowned': zombieModel as JEMFile,
  'stray': skeletonModel as JEMFile,
  'wither_skeleton': skeletonModel as JEMFile,
  'cave_spider': spiderModel as JEMFile,
  'magma_cube': slimeModel as JEMFile,
  'zombie_villager': zombieModel as JEMFile,
};

/**
 * Map texture paths to entity types
 */
const TEXTURE_TO_ENTITY: Record<string, string> = {
  // Chests
  'entity/chest/normal': 'chest',
  'entity/chest/trapped': 'trapped_chest',
  'entity/chest/ender': 'ender_chest',
  'entity/chest/christmas': 'chest',

  // Passive mobs
  'entity/cow/cow': 'cow',
  'entity/cow/red_mooshroom': 'cow',
  'entity/cow/brown_mooshroom': 'cow',
  'entity/chicken': 'chicken',
  'entity/pig/pig': 'pig',
  'entity/pig/pig_saddle': 'pig',
  'entity/sheep/sheep': 'sheep',
  'entity/wolf/wolf': 'wolf',
  'entity/wolf/wolf_tame': 'wolf',
  'entity/wolf/wolf_angry': 'wolf',
  'entity/cat/black': 'cat',
  'entity/cat/british_shorthair': 'cat',
  'entity/cat/calico': 'cat',
  'entity/cat/jellie': 'cat',
  'entity/cat/ocelot': 'ocelot',
  'entity/cat/persian': 'cat',
  'entity/cat/ragdoll': 'cat',
  'entity/cat/red': 'cat',
  'entity/cat/siamese': 'cat',
  'entity/cat/tabby': 'cat',
  'entity/cat/white': 'cat',
  'entity/villager/villager': 'villager',
  'entity/iron_golem/iron_golem': 'iron_golem',

  // Hostile mobs
  'entity/zombie/zombie': 'zombie',
  'entity/zombie/husk': 'husk',
  'entity/zombie/drowned': 'drowned',
  'entity/skeleton/skeleton': 'skeleton',
  'entity/skeleton/stray': 'stray',
  'entity/skeleton/wither_skeleton': 'wither_skeleton',
  'entity/creeper/creeper': 'creeper',
  'entity/spider/spider': 'spider',
  'entity/spider/cave_spider': 'cave_spider',
  'entity/enderman/enderman': 'enderman',
  'entity/slime/slime': 'slime',
  'entity/slime/magmacube': 'magma_cube',
  'entity/ghast/ghast': 'ghast',
  'entity/ghast/ghast_shooting': 'ghast',

  // Player
  'entity/player/wide/steve': 'player',
  'entity/player/wide/alex': 'player',
  'entity/player/slim/steve': 'player',
  'entity/player/slim/alex': 'player',

  // Shulker
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

// Add bed color variants
const BED_COLORS = [
  'white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime',
  'pink', 'gray', 'light_gray', 'cyan', 'purple', 'blue',
  'brown', 'green', 'red', 'black'
];

for (const color of BED_COLORS) {
  TEXTURE_TO_ENTITY[`entity/bed/${color}`] = 'bed';
}

// Add villager profession variants
const VILLAGER_PROFESSIONS = [
  'armorer', 'butcher', 'cartographer', 'cleric', 'farmer',
  'fisherman', 'fletcher', 'leatherworker', 'librarian', 'mason',
  'nitwit', 'shepherd', 'toolsmith', 'weaponsmith'
];

for (const profession of VILLAGER_PROFESSIONS) {
  TEXTURE_TO_ENTITY[`entity/villager/profession/${profession}`] = 'villager';
}

/**
 * Get entity type from asset ID
 */
export function getEntityTypeFromAssetId(assetId: string): string | null {
  const texturePath = assetId.replace(/^minecraft:/, '');
  return TEXTURE_TO_ENTITY[texturePath] || null;
}

/**
 * Check if an asset ID is a supported entity (has a model definition)
 */
export function isSupportedEntity(assetId: string): boolean {
  return getEntityTypeFromAssetId(assetId) !== null;
}

/**
 * Check if an asset ID is ANY entity texture (even if we don't have a model)
 * This prevents entity textures from being sent to BlockModel
 */
export function isEntityTexture(assetId: string): boolean {
  const texturePath = assetId.replace(/^minecraft:/, '');
  return texturePath.startsWith('entity/');
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
