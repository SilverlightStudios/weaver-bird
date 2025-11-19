/**
 * Entity model definitions and utilities
 *
 * Unlike block models which are distributed in resource packs,
 * entity models are hardcoded in Minecraft. This module provides
 * embedded entity geometry definitions for rendering.
 */

export { ENTITY_MODELS, getEntityModel, isEntityAsset, getEntityType } from './definitions';
export type { EntityModel, EntityBone, EntityCuboid, EntityFace, EntityType } from './types';
