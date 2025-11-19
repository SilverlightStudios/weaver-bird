/**
 * EMF (Entity Model Features) module
 *
 * Provides JEM/JPM file parsing and entity model loading
 * with support for both resource pack models and vanilla fallbacks.
 */

export * from './types';
export * from './parser';
export {
  loadEntityModel,
  getEntityTypeFromAssetId,
  isSupportedEntity,
  isEntityTexture,
  getSupportedEntityTypes,
  getEntityTexturePath,
} from './loader';
