export {
  loadJEM,
  parseJEM,
  addDebugVisualization,
  logHierarchy,
  mergeVariantTextures,
  applyVariantPartMask,
} from "./jemLoader";
export { jemToThreeJS } from "./jemThreeJSConverter";
export type {
  JEMFile,
  JEMModelPart,
  JEMBox,
  ParsedEntityModel,
  ParsedPart,
  ParsedBox,
  AnimationLayer,
} from "./jemLoader";

// Re-export entity info helpers
export {
  getEntityTextureAssetId,
  isEntityTexture,
  getEntityInfoFromAssetId,
  getEntityTypeFromAssetId,
  getEntityVariants,
} from "./entityInfo";

// Re-export cache utilities
export { clearEntityModelCache } from "./cache";

// Re-export entity loader
export { loadEntityModel } from "./entityLoader";
