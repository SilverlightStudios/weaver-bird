/**
 * Animation Compiler
 *
 * Handles compilation of animation layers into executable animation data.
 * Extracts axis tracking information for transform normalization.
 */

import type { AnimationLayer } from "./types";
import { compileExpression } from "./expressionParser";
import { parseBoneProperty } from "./boneController";

/**
 * Compiled animation instruction
 */
export interface CompiledAnimation {
  /** Original property string (e.g. "leftArm.rx") */
  property: string;
  /** Target type */
  targetType: "bone" | "var" | "render";
  /** Target bone/var/render name */
  targetName: string;
  /** Property name (rx, ry, hy, shadow_size, etc.) */
  propertyName: string;
  /** Compiled expression */
  expression: ReturnType<typeof compileExpression>;
}

/**
 * Result of animation compilation
 */
export interface AnimationCompilationResult {
  /** Compiled animation layers */
  layers: CompiledAnimation[][];
  /** Tracks which bones animate translation axes (tx/ty/tz) */
  translationAxesByBone: Map<string, Set<"x" | "y" | "z">>;
  /** Tracks which bones animate rotation axes (rx/ry/rz) */
  rotationAxesByBone: Map<string, Set<"x" | "y" | "z">>;
}

/**
 * Compile a single animation property
 */
function compileProperty(
  property: string,
  expression: string | number,
): CompiledAnimation | null {
  const parsed = parseBoneProperty(property);
  if (!parsed) {
    console.warn(`[AnimationCompiler] Invalid property format: ${property}`);
    return null;
  }

  const { target, property: propName } = parsed;

  let targetType: "bone" | "var" | "render";
  if (target === "var") {
    targetType = "var";
  } else if (target === "render") {
    targetType = "render";
  } else {
    targetType = "bone";
  }

  const compiledExpr = compileExpression(expression);

  return {
    property,
    targetType,
    targetName: target,
    propertyName: propName,
    expression: compiledExpr,
  };
}

/**
 * Track which axes a compiled animation uses
 */
function trackBoneAxis(
  compiled: CompiledAnimation,
  translationAxesByBone: Map<string, Set<"x" | "y" | "z">>,
  rotationAxesByBone: Map<string, Set<"x" | "y" | "z">>,
): void {
  if (compiled.targetType !== "bone") return;

  const property = compiled.propertyName;
  if (property === "tx" || property === "ty" || property === "tz") {
    const axis = property[1] as "x" | "y" | "z";
    const set = translationAxesByBone.get(compiled.targetName) ?? new Set<"x" | "y" | "z">();
    set.add(axis);
    translationAxesByBone.set(compiled.targetName, set);
  } else if (property === "rx" || property === "ry" || property === "rz") {
    const axis = property[1] as "x" | "y" | "z";
    const set = rotationAxesByBone.get(compiled.targetName) ?? new Set<"x" | "y" | "z">();
    set.add(axis);
    rotationAxesByBone.set(compiled.targetName, set);
  }
}

/**
 * Compile animation layers into executable instructions
 */
export function compileAnimations(layers: AnimationLayer[]): AnimationCompilationResult {
  const compiledLayers: CompiledAnimation[][] = [];
  const translationAxesByBone = new Map<string, Set<"x" | "y" | "z">>();
  const rotationAxesByBone = new Map<string, Set<"x" | "y" | "z">>();

  for (const layer of layers) {
    const compiledLayer: CompiledAnimation[] = [];

    for (const [property, expression] of Object.entries(layer)) {
      try {
        const compiled = compileProperty(property, expression);
        if (compiled) {
          compiledLayer.push(compiled);
          trackBoneAxis(compiled, translationAxesByBone, rotationAxesByBone);
        }
      } catch (error) {
        console.warn(
          `[AnimationCompiler] Failed to compile: ${property} = ${expression}`,
          error,
        );
      }
    }

    if (compiledLayer.length > 0) {
      compiledLayers.push(compiledLayer);
    }
  }

  console.log(
    `[AnimationCompiler] Compiled ${compiledLayers.length} animation layers with ${compiledLayers.reduce((sum, l) => sum + l.length, 0)} expressions`,
  );

  return {
    layers: compiledLayers,
    translationAxesByBone,
    rotationAxesByBone,
  };
}
