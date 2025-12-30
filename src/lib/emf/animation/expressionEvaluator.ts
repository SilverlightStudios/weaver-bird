/**
 * CEM Animation Expression Evaluator
 *
 * Evaluates parsed AST nodes against an animation context.
 * Implements all CEM functions and operators.
 *
 * Based on: https://github.com/sp614x/optifine/blob/master/OptiFineDoc/doc/cem_animation.txt
 */

import type {
  ASTNode,
  AnimationContext,
  ParsedExpression,
} from "./types";
import { getEntityStateValue } from "./types";
import { isConstantExpression } from "./expressionParser";

// ============================================================================
// Seeded Random Number Generator
// ============================================================================

/**
 * Simple seeded PRNG using mulberry32.
 * Provides deterministic random values for entity IDs.
 */
function seededRandom(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// ============================================================================
// Built-in Functions
// ============================================================================

type BuiltinFunction = (args: number[], context: AnimationContext) => number;

const BUILTIN_FUNCTIONS: Record<string, BuiltinFunction> = {
  // Trigonometric functions
  sin: (args) => Math.sin(args[0]),
  cos: (args) => Math.cos(args[0]),
  tan: (args) => Math.tan(args[0]),
  asin: (args) => Math.asin(args[0]),
  acos: (args) => Math.acos(args[0]),
  atan: (args) => Math.atan(args[0]),
  atan2: (args) => Math.atan2(args[0], args[1]),
  torad: (args) => (args[0] * Math.PI) / 180,
  todeg: (args) => (args[0] * 180) / Math.PI,

  // Numeric functions
  min: (args) => Math.min(...args),
  max: (args) => Math.max(...args),
  clamp: (args) => Math.max(args[1], Math.min(args[2], args[0])),
  abs: (args) => Math.abs(args[0]),
  floor: (args) => Math.floor(args[0]),
  ceil: (args) => Math.ceil(args[0]),
  round: (args) => Math.round(args[0]),
  sqrt: (args) => Math.sqrt(args[0]),
  pow: (args) => Math.pow(args[0], args[1]),
  exp: (args) => Math.exp(args[0]),
  log: (args) => Math.log(args[0]),
  frac: (args) => args[0] - Math.floor(args[0]),
  fmod: (args) => args[0] % args[1],
  signum: (args) => Math.sign(args[0]),

  // Interpolation
  lerp: (args) => args[0] + (args[1] - args[0]) * args[2],

  // Conditionals
  // OptiFine CEM `if`/`ifb` support multiple condition/value pairs:
  // if(cond1, val1, cond2, val2, ..., default)
  // Returns the first matching valN, otherwise default (or 0 if none).
  if: (args) => {
    // Walk pairs (cond, value)
    for (let i = 0; i + 1 < args.length; i += 2) {
      if (args[i]) return args[i + 1];
    }
    // Odd-length arg list => last arg is default
    if (args.length % 2 === 1) return args[args.length - 1];
    return 0;
  },
  ifb: (args) => {
    for (let i = 0; i + 1 < args.length; i += 2) {
      if (args[i]) return args[i + 1];
    }
    if (args.length % 2 === 1) return args[args.length - 1];
    return 0;
  },
  between: (args) => (args[0] >= args[1] && args[0] <= args[2] ? 1 : 0),
  equals: (args) => {
    // equals(x, val1, val2, ...) - returns 1 if x equals any value
    const x = args[0];
    for (let i = 1; i < args.length; i++) {
      if (x === args[i]) return 1;
    }
    return 0;
  },
  in: (args) => {
    // in(x, val1, val2, ...) - same as equals
    const x = args[0];
    for (let i = 1; i < args.length; i++) {
      if (x === args[i]) return 1;
    }
    return 0;
  },

  // Random (deterministic by seed)
  random: (args, context) => {
    const seed = args.length > 0 ? args[0] : context.entityState.id;
    const cached = context.randomCache.get(seed);
    if (cached !== undefined) return cached;

    const value = seededRandom(seed);
    context.randomCache.set(seed, value);
    return value;
  },

  // Debug functions (no-op, return first arg or 0)
  print: (args) => args[0] ?? 0,
  printb: (args) => args[0] ?? 0,
};

// ============================================================================
// Variable Resolution
// ============================================================================

/**
 * Resolve a variable name to its value from the context.
 * Supports:
 * - Entity state variables: limb_swing, head_yaw, etc.
 * - Custom variables: var.name
 * - Bone properties: bone_name.property (rx, ry, rz, tx, ty, tz, etc.)
 */
function resolveVariable(name: string, context: AnimationContext): number {
  // Check for dot notation (var.name, bone.property)
  const dotIndex = name.indexOf(".");

  if (dotIndex !== -1) {
    const target = name.substring(0, dotIndex);
    const property = name.substring(dotIndex + 1);

    // Custom variable (var.name)
    if (target === "var") {
      return context.variables[property] ?? 0;
    }

    // Render variable (render.shadow_size, etc.)
    if (target === "render") {
      // Render variables are write-only in most cases
      // Return 0 as default
      return 0;
    }

    // Bone property (bone_name.rx, etc.)
    const boneValues = context.boneValues[target];
    if (boneValues) {
      return boneValues[property] ?? 0;
    }

    // Unknown bone, return 0
    return 0;
  }

  // Entity state variable
  const stateValue = getEntityStateValue(context.entityState, name);
  if (stateValue !== undefined) {
    return stateValue;
  }

  // Check if it's a constant we might have missed
  if (name === "pi") return Math.PI;
  if (name === "true") return 1;
  if (name === "false") return 0;

  // Unknown variable
  console.warn(`[ExpressionEvaluator] Unknown variable: ${name}`);
  return 0;
}

// ============================================================================
// AST Evaluation
// ============================================================================

/**
 * Evaluate an AST node to produce a numeric value.
 */
export function evaluateAST(node: ASTNode, context: AnimationContext): number {
  switch (node.type) {
    case "Literal":
      return node.value;

    case "Variable":
      return resolveVariable(node.name, context);

    case "UnaryOp": {
      const operand = evaluateAST(node.operand, context);
      switch (node.operator) {
        case "-":
          return -operand;
        case "+":
          return operand;
        case "!":
          return operand ? 0 : 1;
        default:
          throw new Error(`Unknown unary operator: ${node.operator}`);
      }
    }

    case "BinaryOp": {
      const left = evaluateAST(node.left, context);

      // Short-circuit evaluation for logical operators
      if (node.operator === "&&") {
        return left ? evaluateAST(node.right, context) : 0;
      }
      if (node.operator === "||") {
        return left ? left : evaluateAST(node.right, context);
      }

      const right = evaluateAST(node.right, context);

      switch (node.operator) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          return right !== 0 ? left / right : 0;
        case "%":
          return right !== 0 ? left % right : 0;
        case "==":
          return left === right ? 1 : 0;
        case "!=":
          return left !== right ? 1 : 0;
        case "<":
          return left < right ? 1 : 0;
        case ">":
          return left > right ? 1 : 0;
        case "<=":
          return left <= right ? 1 : 0;
        case ">=":
          return left >= right ? 1 : 0;
        default:
          throw new Error(`Unknown binary operator: ${node.operator}`);
      }
    }

    case "FunctionCall": {
      const func = BUILTIN_FUNCTIONS[node.name];
      if (!func) {
        console.warn(`[ExpressionEvaluator] Unknown function: ${node.name}`);
        return 0;
      }

      // Evaluate arguments
      const args = node.args.map((arg) => evaluateAST(arg, context));
      return func(args, context);
    }

    default:
      throw new Error(`Unknown AST node type: ${(node as ASTNode).type}`);
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Evaluate a parsed expression against an animation context.
 *
 * @param expression The compiled expression
 * @param context The animation context with entity state and variables
 * @returns The numeric result of the expression
 */
export function evaluate(
  expression: ParsedExpression,
  context: AnimationContext
): number {
  if (isConstantExpression(expression)) {
    return expression.value;
  }

  return evaluateAST(expression.ast, context);
}

/**
 * Create an evaluator function bound to a specific context.
 * Useful for evaluating many expressions with the same context.
 */
export function createEvaluator(
  context: AnimationContext
): (expression: ParsedExpression) => number {
  return (expression) => evaluate(expression, context);
}

/**
 * Safe evaluate that catches errors and returns a default value.
 */
export function safeEvaluate(
  expression: ParsedExpression,
  context: AnimationContext,
  defaultValue: number = 0
): number {
  try {
    const result = evaluate(expression, context);
    // Handle NaN and Infinity
    if (!Number.isFinite(result)) {
      return defaultValue;
    }
    return result;
  } catch (error) {
    console.warn("[ExpressionEvaluator] Evaluation error:", error);
    return defaultValue;
  }
}
