/**
 * Embedded entity model definitions
 *
 * These are hardcoded because Minecraft doesn't distribute entity
 * model geometry in resource packs - only textures.
 */

import type { EntityModel, EntityType } from './types';

/**
 * Check if an asset ID represents an entity texture
 */
export function isEntityAsset(assetId: string): boolean {
  const normalized = assetId.replace(/^minecraft:/, '');
  return normalized.startsWith('entity/');
}

/**
 * Get the entity type from an asset ID
 * Returns undefined if not an entity or not a supported type
 */
export function getEntityType(assetId: string): EntityType | undefined {
  const normalized = assetId.replace(/^minecraft:/, '');

  if (!normalized.startsWith('entity/')) {
    return undefined;
  }

  // Extract the entity category
  const parts = normalized.split('/');
  if (parts.length < 2) {
    return undefined;
  }

  const category = parts[1];

  // Map texture paths to entity types
  if (category === 'chest') {
    // Determine chest type from texture name
    const textureName = parts[2] || 'normal';
    if (textureName.includes('ender')) {
      return 'ender_chest';
    }
    if (textureName.includes('trapped')) {
      return 'trapped_chest';
    }
    return 'chest';
  }

  if (category === 'shulker') {
    return 'shulker_box';
  }

  return undefined;
}

/**
 * Get the entity model definition for a type
 */
export function getEntityModel(type: EntityType): EntityModel | undefined {
  return ENTITY_MODELS[type];
}

/**
 * All embedded entity model definitions
 */
export const ENTITY_MODELS: Record<EntityType, EntityModel> = {
  /**
   * Normal chest model
   *
   * Minecraft chest texture is 64x64 pixels with the following layout:
   * - Lid top: (14, 0) to (28, 14)
   * - Lid bottom: (28, 0) to (42, 14)
   * - Lid front: (14, 14) to (28, 19)
   * - Lid back: (28, 14) to (42, 19)
   * - Lid left: (0, 14) to (14, 19)
   * - Lid right: (42, 14) to (56, 19)
   *
   * Base follows similar pattern starting at y=19
   */
  chest: {
    type: 'chest',
    name: 'Chest',
    texturePath: 'entity/chest/normal',
    textureSize: [64, 64],
    bones: [
      // Base of the chest (bottom part)
      {
        name: 'base',
        pivot: [8, 0, 8], // Center-bottom of the model
        cuboids: [
          {
            // Base is 14x10x14 pixels, centered horizontally
            origin: [1, 0, 1],
            size: [14, 10, 14],
            uv: {
              // UV coordinates are [u, v] for top-left corner of face
              // Face size is determined by cuboid dimensions
              north: [14, 33], // Front face
              south: [42, 33], // Back face
              east: [0, 33],   // Right side
              west: [28, 33],  // Left side
              up: [14, 19],    // Top
              down: [28, 19],  // Bottom
            },
          },
        ],
      },
      // Lid of the chest (top part that opens)
      {
        name: 'lid',
        pivot: [8, 10, 1], // Pivot at back edge for opening animation
        rotation: [0, 0, 0], // Closed by default
        cuboids: [
          {
            // Lid is 14x5x14 pixels
            origin: [1, 10, 1],
            size: [14, 5, 14],
            uv: {
              north: [14, 14], // Front face
              south: [42, 14], // Back face
              east: [0, 14],   // Right side
              west: [28, 14],  // Left side
              up: [14, 0],     // Top
              down: [28, 0],   // Bottom
            },
          },
        ],
        children: [
          // Latch (small protrusion on front)
          {
            name: 'latch',
            pivot: [8, 9, 1],
            cuboids: [
              {
                origin: [7, 8, 0],
                size: [2, 4, 1],
                uv: {
                  north: [1, 1],
                  south: [3, 1],
                  east: [0, 1],
                  west: [4, 1],
                  up: [1, 0],
                  down: [3, 0],
                },
              },
            ],
          },
        ],
      },
    ],
  },

  /**
   * Trapped chest - same model as normal chest, different texture
   */
  trapped_chest: {
    type: 'trapped_chest',
    name: 'Trapped Chest',
    texturePath: 'entity/chest/trapped',
    textureSize: [64, 64],
    bones: [
      {
        name: 'base',
        pivot: [8, 0, 8],
        cuboids: [
          {
            origin: [1, 0, 1],
            size: [14, 10, 14],
            uv: {
              north: [14, 33],
              south: [42, 33],
              east: [0, 33],
              west: [28, 33],
              up: [14, 19],
              down: [28, 19],
            },
          },
        ],
      },
      {
        name: 'lid',
        pivot: [8, 10, 1],
        rotation: [0, 0, 0],
        cuboids: [
          {
            origin: [1, 10, 1],
            size: [14, 5, 14],
            uv: {
              north: [14, 14],
              south: [42, 14],
              east: [0, 14],
              west: [28, 14],
              up: [14, 0],
              down: [28, 0],
            },
          },
        ],
        children: [
          {
            name: 'latch',
            pivot: [8, 9, 1],
            cuboids: [
              {
                origin: [7, 8, 0],
                size: [2, 4, 1],
                uv: {
                  north: [1, 1],
                  south: [3, 1],
                  east: [0, 1],
                  west: [4, 1],
                  up: [1, 0],
                  down: [3, 0],
                },
              },
            ],
          },
        ],
      },
    ],
  },

  /**
   * Ender chest - same model, different texture
   */
  ender_chest: {
    type: 'ender_chest',
    name: 'Ender Chest',
    texturePath: 'entity/chest/ender',
    textureSize: [64, 64],
    bones: [
      {
        name: 'base',
        pivot: [8, 0, 8],
        cuboids: [
          {
            origin: [1, 0, 1],
            size: [14, 10, 14],
            uv: {
              north: [14, 33],
              south: [42, 33],
              east: [0, 33],
              west: [28, 33],
              up: [14, 19],
              down: [28, 19],
            },
          },
        ],
      },
      {
        name: 'lid',
        pivot: [8, 10, 1],
        rotation: [0, 0, 0],
        cuboids: [
          {
            origin: [1, 10, 1],
            size: [14, 5, 14],
            uv: {
              north: [14, 14],
              south: [42, 14],
              east: [0, 14],
              west: [28, 14],
              up: [14, 0],
              down: [28, 0],
            },
          },
        ],
        children: [
          {
            name: 'latch',
            pivot: [8, 9, 1],
            cuboids: [
              {
                origin: [7, 8, 0],
                size: [2, 4, 1],
                uv: {
                  north: [1, 1],
                  south: [3, 1],
                  east: [0, 1],
                  west: [4, 1],
                  up: [1, 0],
                  down: [3, 0],
                },
              },
            ],
          },
        ],
      },
    ],
  },

  /**
   * Shulker box model
   *
   * Shulker texture is 64x64 with different UV layout:
   * - Base (bottom shell)
   * - Lid (top shell that opens)
   * - Head (inside)
   */
  shulker_box: {
    type: 'shulker_box',
    name: 'Shulker Box',
    texturePath: 'entity/shulker/shulker',
    textureSize: [64, 64],
    bones: [
      // Base (bottom shell)
      {
        name: 'base',
        pivot: [8, 0, 8],
        cuboids: [
          {
            // Shulker base is 16x8x16 (full block width, half height)
            origin: [0, 0, 0],
            size: [16, 8, 16],
            uv: {
              // Shulker UV layout
              north: [16, 28],
              south: [32, 28],
              east: [0, 28],
              west: [48, 28],
              up: [16, 0],
              down: [32, 0],
            },
          },
        ],
      },
      // Lid (top shell)
      {
        name: 'lid',
        pivot: [8, 8, 8], // Pivot at connection point
        rotation: [0, 0, 0],
        cuboids: [
          {
            origin: [0, 4, 0],
            size: [16, 12, 16],
            uv: {
              north: [16, 60],
              south: [32, 60],
              east: [0, 60],
              west: [48, 60],
              up: [16, 36],
              down: [32, 36],
            },
          },
        ],
      },
    ],
  },
};
