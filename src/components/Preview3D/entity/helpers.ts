/**
 * Pure helper functions for EntityModel
 * Re-exports from organized helper modules for backward compatibility
 */

// Animation helpers
export {
  interpolateKeyframes,
  applyVanillaKeyframeAnimation,
  areAnimationLayersStatic,
  collectAnimatedBones,
} from "./helpers/animation";

// Bone helpers
export {
  applyBoneVisibilityOverrides,
  buildBoneMap,
  resolveBaseBone,
} from "./helpers/bones";

// Resource helpers
export {
  buildVersionFolderCandidates,
  disposeGroupMaterials,
  disposeGroupAll,
  normalizeJemTextureId,
  cleanupLayerGroups,
} from "./helpers/resources";

// Layer helpers
export {
  syncOverlayLayers,
  type SyncOverlayLayersContext,
} from "./helpers/layers";
