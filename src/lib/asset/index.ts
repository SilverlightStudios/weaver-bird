/**
 * Asset utilities - barrel export
 *
 * This module provides utilities for working with Minecraft asset IDs and names.
 * Re-exports all functionality from focused sub-modules.
 */

// Core parsing and normalization
export {
  type ParsedAssetId,
  parseAssetId,
  normalizeAssetId,
  computeBaseName,
  computeVariantGroupKey,
  getBaseName,
  getVariantGroupKey,
  normalizeBlockNameForBlockstate,
  getBlockStateIdFromAssetId,
  assetIdToTexturePath,
  isNumberedVariant,
  getVariantNumber,
} from "./parsing";

// Type predicates
export {
  isBlockTexture,
  isItemTexture,
  isBiomeColormapAsset,
  is2DOnlyTexture,
  shouldUseItemTextureForCard,
  isEntityTexture,
  isEntityDecoratedPot,
  isMinecraftItem,
  isSignTexture,
  isHangingSign,
  getTextureCategory,
  isParticleTexture,
  isPottedPlant,
  isInventoryVariant,
} from "./predicates";

// Display formatting
export {
  beautifyAssetName,
  getShortAssetName,
  getParticleDisplayName,
} from "./display";

// Colormap utilities
export {
  getColormapTypeFromAssetId,
  getColormapVariantLabel,
  getColormapAssetId,
  guessColormapTypeForAsset,
} from "./colormap";

// Particle utilities
export { getParticleTypeFromAssetId, getParticleAssetId } from "./particle";

// Potted plant utilities
export { getPottedAssetId, getPlantNameFromPotted } from "./potted";

// Variant grouping
export {
  type AssetGroup,
  categorizeVariants,
  groupAssetsByVariant,
  getBlockItemPair,
} from "./variants";

// Blockstate utilities
export {
  extractBlockStateProperties,
  removeBlockStateSuffixes,
  applyNaturalBlockStateDefaults,
} from "./blockstate";

// Asset exclusion
export { shouldExcludeAsset } from "./exclusion";
