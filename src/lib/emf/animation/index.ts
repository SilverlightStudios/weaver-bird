/**
 * CEM Animation Engine
 *
 * Provides support for parsing and evaluating OptiFine CEM animation expressions.
 * Enables animated entity models from resource packs like Fresh Animations.
 *
 * @module emf/animation
 */

// Type exports
export type {
  Token,
  TokenType,
  ASTNode,
  LiteralNode,
  VariableNode,
  BinaryOpNode,
  UnaryOpNode,
  FunctionCallNode,
  TernaryNode,
  CompiledExpression,
  ConstantExpression,
  ParsedExpression,
  EntityState,
  AnimationContext,
  BoneTransform,
  AnimationLayer,
  ParsedAnimation,
} from "./types";

// Type utilities
export {
  DEFAULT_ENTITY_STATE,
  createAnimationContext,
} from "./types";

// Parser exports
export {
  tokenize,
  parseExpression,
  compileExpression,
  isConstantExpression,
  astToString,
} from "./expressionParser";

// Evaluator exports
export {
  evaluate,
  evaluateAST,
  createEvaluator,
  safeEvaluate,
} from "./expressionEvaluator";

// Entity state exports
export type { AnimationPreset } from "./entityState";
export {
  createEntityState,
  updateEntityState,
  resetEntityState,
  ANIMATION_PRESETS,
  getPresetById,
  getDefaultPreset,
  AnimationStateController,
} from "./entityState";

// Preset discovery exports
export {
  getUsedEntityStateKeysFromAnimationLayers,
  getAvailableAnimationPresetIdsForAnimationLayers,
} from "./presetDiscovery";

// Trigger discovery exports
export {
  getAvailableAnimationTriggerIdsForAnimationLayers,
  type AnimationTriggerId,
} from "./triggerDiscovery";

export {
  getAvailablePoseToggleIdsForAnimationLayers,
} from "./poseDiscovery";

export {
  ANIMATION_TRIGGERS,
  getTriggerDefinition,
  type AnimationTriggerDefinition,
} from "./triggers";

export {
  POSE_TOGGLES,
  getPoseToggleDefinition,
  type PoseToggleDefinition,
  type PoseToggleId,
} from "./poses";

// Bone controller exports
export type { BoneMap, BaseTransforms, BaseTransformMap } from "./boneController";
export {
  buildBoneMap,
  storeBaseTransforms,
  resetBone,
  resetAllBones,
  applyBoneTransform,
  parseBoneProperty,
  isBoneTransformProperty,
  createBoneTransform,
  mergeBoneTransforms,
  BoneTransformAccumulator,
} from "./boneController";

// Animation engine exports
export { AnimationEngine, createAnimationEngine } from "./AnimationEngine";
