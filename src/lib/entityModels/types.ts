/**
 * Type definitions for entity models
 */

/**
 * Supported entity types
 */
export type EntityType = 'chest' | 'trapped_chest' | 'ender_chest' | 'shulker_box';

/**
 * A single cuboid (box) in an entity model
 */
export interface EntityCuboid {
  /** Origin point of the cuboid (bottom-left-back corner) in Minecraft pixels (1/16 of a block) */
  origin: [number, number, number];
  /** Size of the cuboid in Minecraft pixels */
  size: [number, number, number];
  /** UV coordinates for each face [u, v] - top-left corner in texture pixels */
  uv: {
    north?: [number, number];
    south?: [number, number];
    east?: [number, number];
    west?: [number, number];
    up?: [number, number];
    down?: [number, number];
  };
  /** Optional inflation (like Minecraft's inflate parameter) */
  inflate?: number;
}

/**
 * A face on a cuboid with its UV mapping
 */
export interface EntityFace {
  /** UV coordinates [u1, v1, u2, v2] in texture pixels */
  uv: [number, number, number, number];
}

/**
 * A bone (group of cuboids with shared transformation)
 */
export interface EntityBone {
  /** Unique name for this bone */
  name: string;
  /** Pivot point for rotations (in Minecraft pixels from model origin) */
  pivot: [number, number, number];
  /** Default rotation in degrees [x, y, z] */
  rotation?: [number, number, number];
  /** Cuboids that make up this bone */
  cuboids: EntityCuboid[];
  /** Child bones */
  children?: EntityBone[];
}

/**
 * Complete entity model definition
 */
export interface EntityModel {
  /** Entity type identifier */
  type: EntityType;
  /** Display name */
  name: string;
  /** Texture path pattern (e.g., "entity/chest/normal") */
  texturePath: string;
  /** Texture dimensions in pixels */
  textureSize: [number, number];
  /** Root bones of the model */
  bones: EntityBone[];
}
