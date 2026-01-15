/**
 * CEM Animation Expression Engine - Type Definitions
 *
 * Types for parsing and evaluating OptiFine CEM animation expressions.
 * Based on: https://github.com/sp614x/optifine/blob/master/OptiFineDoc/doc/cem_animation.txt
 */

// ============================================================================
// Animation Constants
// ============================================================================

/** Minimum animation playback speed */
export const MIN_ANIMATION_SPEED = 0.1;

/** Maximum animation playback speed */
export const MAX_ANIMATION_SPEED = 3.0;

/** Default animation playback speed */
export const DEFAULT_ANIMATION_SPEED = 1.0;

/**
 * Clamp animation speed to valid range.
 */
export function clampAnimationSpeed(speed: number): number {
  return Math.max(MIN_ANIMATION_SPEED, Math.min(MAX_ANIMATION_SPEED, speed));
}

// ============================================================================
// Token Types
// ============================================================================

export type TokenType =
  | "NUMBER"
  | "IDENTIFIER"
  | "OPERATOR"
  | "FUNCTION"
  | "LPAREN"
  | "RPAREN"
  | "COMMA"
  | "EOF";

export interface Token {
  type: TokenType;
  value: string | number;
  position: number;
}

// ============================================================================
// AST Node Types
// ============================================================================

export type ASTNode =
  | LiteralNode
  | VariableNode
  | BinaryOpNode
  | UnaryOpNode
  | FunctionCallNode
  | TernaryNode;

export interface LiteralNode {
  type: "Literal";
  value: number;
}

export interface VariableNode {
  type: "Variable";
  name: string; // e.g., "limb_swing", "head.rx", "var.hy"
}

export interface BinaryOpNode {
  type: "BinaryOp";
  operator: string;
  left: ASTNode;
  right: ASTNode;
}

export interface UnaryOpNode {
  type: "UnaryOp";
  operator: string; // "-" or "!"
  operand: ASTNode;
}

export interface FunctionCallNode {
  type: "FunctionCall";
  name: string;
  args: ASTNode[];
}

export interface TernaryNode {
  type: "Ternary";
  condition: ASTNode;
  consequent: ASTNode;
  alternate: ASTNode;
}

// ============================================================================
// Compiled Expression
// ============================================================================

export interface CompiledExpression {
  source: string;
  ast: ASTNode;
}

export interface ConstantExpression {
  type: "constant";
  value: number;
}

export type ParsedExpression = CompiledExpression | ConstantExpression;

// ============================================================================
// Entity State Variables
// ============================================================================

/**
 * Entity state variables available in CEM animations.
 * These simulate the entity's current state for animation evaluation.
 */
export interface EntityState {
  // Movement & Animation
  limb_swing: number; // Animation counter in ticks when entity moves
  limb_speed: number; // Movement speed (0-1 range; 0=still, 1=sprinting)

  // Head Movement
  head_yaw: number; // Head Y rotation (degrees)
  head_pitch: number; // Head X rotation (degrees)

  // Timing
  age: number; // Entity age in ticks
  time: number; // Total game time (0-27720 ticks, wraps)
  day_time: number; // Current day time (0-24000 ticks)
  day_count: number; // Day counter
  frame_time: number; // Seconds since last frame
  frame_counter: number; // Total frame count since animation started

  // Combat & Damage
  swing_progress: number; // Attack progress 0-1
  hurt_time: number; // Damage animation ticks (0-10)
  death_time: number; // Death animation ticks (0-20)

  // Block entity animation direction
  // For bell: determines which axis swings (0=NORTH, 1=SOUTH, 2=EAST, 3=WEST)
  // NORTH/SOUTH use X rotation, EAST/WEST use Z rotation
  swing_direction: number;
  health: number; // Current health
  max_health: number; // Maximum health
  anger_time: number; // Anger duration
  anger_time_start: number; // Initial anger duration

  // Block Entity Interactions
  ticks: number; // Interaction animation ticks (for bells, chests, etc.)

  // Position
  pos_x: number; // Entity world X position
  pos_y: number; // Entity world Y position
  pos_z: number; // Entity world Z position

  // Rotation
  rot_x: number; // Entity X rotation
  rot_y: number; // Entity Y rotation (North = 0)

  // Player position (for eye tracking, etc.)
  player_pos_x: number;
  player_pos_y: number;
  player_pos_z: number;
  player_rot_x: number;
  player_rot_y: number;

  // State Booleans
  is_aggressive: boolean;
  is_alive: boolean;
  is_burning: boolean;
  is_child: boolean;
  is_glowing: boolean;
  is_hurt: boolean;
  is_in_hand: boolean;
  is_in_item_frame: boolean;
  is_in_ground: boolean;
  is_in_gui: boolean;
  is_in_lava: boolean;
  is_in_water: boolean;
  is_invisible: boolean;
  is_on_ground: boolean;
  is_on_head: boolean;
  is_on_shoulder: boolean;
  is_ridden: boolean;
  is_riding: boolean;
  is_sitting: boolean;
  is_sneaking: boolean;
  is_sprinting: boolean;
  is_tamed: boolean;
  is_wet: boolean;

  // Environment
  dimension: number; // Overworld: 0, Nether: -1, End: 1

  // Identity
  id: number; // Unique entity ID for deterministic random
  rule_index: number; // Random model rule index
}

// ============================================================================
// Animation Context
// ============================================================================

/**
 * Full context for animation expression evaluation.
 * Includes entity state, custom variables, and bone values.
 */
export interface AnimationContext {
  /** Current entity state variables */
  entityState: EntityState;

  /** Custom var.* variables defined in animation expressions */
  variables: Record<string, number>;

  /** Bone property values (bone.property -> value) */
  boneValues: Record<string, Record<string, number>>;

  /** Random seed cache for deterministic random() calls */
  randomCache: Map<number, number>;
}

// ============================================================================
// Bone Transform Types
// ============================================================================

export interface BoneTransform {
  tx?: number; // Translation X (pixels)
  ty?: number; // Translation Y (pixels)
  tz?: number; // Translation Z (pixels)
  rx?: number; // Rotation X (radians)
  ry?: number; // Rotation Y (radians)
  rz?: number; // Rotation Z (radians)
  sx?: number; // Scale X
  sy?: number; // Scale Y
  sz?: number; // Scale Z
  visible?: boolean; // Visibility
  visible_boxes?: boolean; // Show boxes only (not submodels)
}

// ============================================================================
// Animation Definition Types
// ============================================================================

/**
 * A single animation layer from a JEM file.
 * Maps property names to expressions.
 */
export interface AnimationLayer {
  [property: string]: string | number;
}

/**
 * Parsed animation ready for evaluation.
 */
export interface ParsedAnimation {
  /** Original property path (e.g., "head.rx", "var.hy") */
  property: string;

  /** Parsed target (bone name, "var", or "render") */
  target: string;

  /** Parsed property name (e.g., "rx", "hy") */
  propertyName: string;

  /** Compiled expression or constant value */
  expression: ParsedExpression;
}

// ============================================================================
// Default Entity State
// ============================================================================

export const DEFAULT_ENTITY_STATE: EntityState = {
  // Movement
  limb_swing: 0,
  limb_speed: 0,

  // Head
  head_yaw: 0,
  head_pitch: 0,

  // Timing
  // Start above OptiFine/Fresh Animations "boot" thresholds (many packs use
  // `age<9` / `age<=10` for initialization branches; starting at 0 causes
  // visible pose drift during the first half-second in previews).
  age: 100,
  time: 0,
  day_time: 6000, // Noon
  day_count: 0,
  frame_time: 0.05, // ~20 FPS
  frame_counter: 0,

  // Combat
  swing_progress: 0,
  hurt_time: 0,
  death_time: 0,
  health: 20,
  max_health: 20,
  anger_time: 0,
  anger_time_start: 0,

  // Block Entity Interactions
  ticks: 0,
  swing_direction: 3, // Default WEST (3) - swings on Z axis

  // Position
  pos_x: 0,
  pos_y: 0,
  pos_z: 0,

  // Rotation
  rot_x: 0,
  rot_y: 0,

  // Player position
  player_pos_x: 0,
  player_pos_y: 0,
  player_pos_z: 0,
  player_rot_x: 0,
  player_rot_y: 0,

  // State booleans
  is_aggressive: false,
  is_alive: true,
  is_burning: false,
  is_child: false,
  is_glowing: false,
  is_hurt: false,
  is_in_hand: false,
  is_in_item_frame: false,
  is_in_ground: false,
  is_in_gui: false,
  is_in_lava: false,
  is_in_water: false,
  is_invisible: false,
  is_on_ground: true,
  is_on_head: false,
  is_on_shoulder: false,
  is_ridden: false,
  is_riding: false,
  is_sitting: false,
  is_sneaking: false,
  is_sprinting: false,
  is_tamed: false,
  is_wet: false,

  // Environment
  dimension: 0,

  // Identity
  id: 1,
  rule_index: 0,
};

/**
 * Create a fresh animation context with default state.
 */
export function createAnimationContext(): AnimationContext {
  return {
    entityState: { ...DEFAULT_ENTITY_STATE },
    variables: {},
    boneValues: {},
    randomCache: new Map(),
  };
}

/**
 * Type-safe lookup of entity state values by name.
 * Returns the value as a number (booleans are converted to 0/1).
 * Returns undefined if the property doesn't exist.
 */
export function getEntityStateValue(
  state: EntityState,
  name: string,
): number | undefined {
  // Use keyof to ensure type safety
  if (!(name in state)) {
    return undefined;
  }

  const value = state[name as keyof EntityState];

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  if (typeof value === "number") {
    return value;
  }

  return undefined;
}
