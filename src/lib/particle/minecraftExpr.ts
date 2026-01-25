import {
  direction2DValue,
  normalizeDirectionPropertyKey,
  replaceDirectionSteps,
} from "./minecraftExprDirections";
import {
  escapeRegExp,
  replaceIntCasts,
  replaceDirectionFrom2D,
} from "./minecraftExprTransforms";
import { createRuntimeHelpers } from "./minecraftExprRuntime";

export interface MinecraftExprContext {
  age?: number;
  lifetime?: number;
  position?: { x: number; y: number; z: number };
  dimensions?: { width: number; height: number; depth: number };
}

export type CompiledMinecraftExpr = (
  rand: () => number,
  loopIndex?: number,
  context?: MinecraftExprContext,
) => number;

/**
 * Comprehensive Java expression compiler for Minecraft particle expressions.
 *
 * Handles all Java syntax patterns found in Minecraft's particle emission code:
 * - BlockPos method calls: $1.getX(), $2.getY(), $2.getZ()
 * - Direction method calls: $4.getStepX(), $4.getStepY(), $4.getStepZ()
 * - Direction.Axis enum comparisons: $6 == Direction.Axis.X/Y/Z
 * - Math methods: Math.random(), Math.floor(), Math.floorMod()
 * - Ternary operators: condition ? true_val : false_val
 * - Arithmetic, comparisons, and all standard Java operators
 */
export function compileMinecraftExpr(
  expr: string,
  blockProps?: Record<string, string>,
  loopIndexVar?: string,
): CompiledMinecraftExpr | null {
  let js = expr;

  // Remove Java type casts
  js = js.replace(/\((?:double|float)\)/g, "");
  js = replaceIntCasts(js);

  // Entity random position methods (must be before .get[XYZ]() replacement)
  // getRandomX(width) = getX() + (2*random - 1) * width * getBbWidth()
  // getRandomY() = getY() + random * getBbHeight()
  // getRandomZ(width) = getZ() + (2*random - 1) * width * getBbWidth()
  js = js.replace(
    /[A-Za-z_$][A-Za-z0-9_$]*\.getRandomX\s*\(([^)]+)\)/g,
    "(entityX + (rand() * 2 - 1) * $1 * entityWidth)",
  );
  js = js.replace(
    /[A-Za-z_$][A-Za-z0-9_$]*\.getRandomZ\s*\(([^)]+)\)/g,
    "(entityZ + (rand() * 2 - 1) * $1 * entityDepth)",
  );
  js = js.replace(
    /[A-Za-z_$][A-Za-z0-9_$]*\.getRandomY\s*\(\)/g,
    "(entityY + rand() * entityHeight)",
  );

  // Entity bounds helpers
  js = js.replace(
    /[A-Za-z_$][A-Za-z0-9_$]*\.getBbWidth\s*\(\)/g,
    "entityWidth",
  );
  js = js.replace(
    /[A-Za-z_$][A-Za-z0-9_$]*\.getBbHeight\s*\(\)/g,
    "entityHeight",
  );
  js = js.replace(
    /[A-Za-z_$][A-Za-z0-9_$]*\.dimensions\.width\s*\(\)/g,
    "entityWidth",
  );
  js = js.replace(
    /[A-Za-z_$][A-Za-z0-9_$]*\.dimensions\.height\s*\(\)/g,
    "entityHeight",
  );

  // CRITICAL: Handle Direction.Axis enum comparisons BEFORE replacing $\d+ tokens
  // Pattern: $6 == Direction.Axis.X -> axisX($6)
  // The axisX/Y/Z functions will check if the parameter equals the axis enum value
  js = js.replace(/(\$\d+)\s*==\s*Direction\.Axis\.X/g, "axisX($1)");
  js = js.replace(/(\$\d+)\s*==\s*Direction\.Axis\.Y/g, "axisY($1)");
  js = js.replace(/(\$\d+)\s*==\s*Direction\.Axis\.Z/g, "axisZ($1)");
  js = js.replace(/Direction\.Axis\.X\s*==\s*(\$\d+)/g, "axisX($1)");
  js = js.replace(/Direction\.Axis\.Y\s*==\s*(\$\d+)/g, "axisY($1)");
  js = js.replace(/Direction\.Axis\.Z\s*==\s*(\$\d+)/g, "axisZ($1)");

  // CRITICAL: Handle Direction.getStepX/Y/Z() BEFORE replacing position accessors
  // Pattern: $4.getStepX() -> dirStepX($4)
  js = js.replace(/(\$\d+)\.getStepX\s*\(\s*\)/g, "dirStepX($1)");
  js = js.replace(/(\$\d+)\.getStepY\s*\(\s*\)/g, "dirStepY($1)");
  js = js.replace(/(\$\d+)\.getStepZ\s*\(\s*\)/g, "dirStepZ($1)");

  // CRITICAL: Handle BlockPos.getX/Y/Z() BEFORE the general replacement
  // Pattern: $1.getX() -> blockPosX($1)
  // These need special handling because they return the block's world position
  js = js.replace(/(\$\d+)\.getX\s*\(\s*\)/g, "blockPosX($1)");
  js = js.replace(/(\$\d+)\.getY\s*\(\s*\)/g, "blockPosY($1)");
  js = js.replace(/(\$\d+)\.getZ\s*\(\s*\)/g, "blockPosZ($1)");

  // Now handle general entity/block position accessors (for non-parameter objects)
  js = js.replace(/[A-Za-z_$][A-Za-z0-9_$]*\.getX\s*\(\)/g, "entityX");
  js = js.replace(/[A-Za-z_$][A-Za-z0-9_$]*\.getY\s*\(\)/g, "entityY");
  js = js.replace(/[A-Za-z_$][A-Za-z0-9_$]*\.getZ\s*\(\)/g, "entityZ");
  js = js.replace(/[A-Za-z_$][A-Za-z0-9_$]*\.[xyz](?:\(\))?/g, "0");

  // Random functions
  js = js.replace(/(?:[A-Za-z_$][A-Za-z0-9_$]*\.)*nextBoolean\(\)/g, "(rand() > 0.5)");
  js = js.replace(/(?:[A-Za-z_$][A-Za-z0-9_$]*\.)*nextFloat\(\)/g, "rand()");
  js = js.replace(/(?:[A-Za-z_$][A-Za-z0-9_$]*\.)*nextDouble\(\)/g, "rand()");
  js = js.replace(/(?:[A-Za-z_$][A-Za-z0-9_$]*\.)*nextInt\s*\(/g, "randInt(");

  // Math methods
  js = js.replace(/Math\.random\s*\(\s*\)/g, "rand()");
  js = js.replace(/Math\.floor\s*\(/g, "Math.floor(");
  js = js.replace(/Math\.floorMod\s*\(/g, "floormod(");

  // Particle age/lifetime
  js = js.replace(/\bthis\.age\b/g, "age");
  js = js.replace(/\bthis\.lifetime\b/g, "lifetime");

  // Handle blockstate getValue().get2DDataValue() pattern
  let failed = false;
  js = js.replace(
    /[A-Za-z_$][A-Za-z0-9_$]*\.getValue\s*\(\s*([A-Za-z0-9_$.]+)\s*\)\s*\.get2DDataValue\s*\(\s*\)/g,
    (_m, propName: string) => {
      if (!blockProps) {
        failed = true;
        return "0";
      }
      const key = normalizeDirectionPropertyKey(propName, blockProps);
      const raw = blockProps[key]?.toLowerCase();
      if (!raw) {
        failed = true;
        return "0";
      }
      const value = direction2DValue(raw);
      if (value === null) {
        failed = true;
        return "0";
      }
      return String(value);
    },
  );
  if (failed) return null;

  // Handle item list size lookups (e.g., "$3.items.size()") by defaulting to 0.
  js = js.replace(/\$\d+\s*\.items\s*\.size\s*\(\s*\)/g, "0");

  // Replace loop index variable
  if (loopIndexVar) {
    const escaped = escapeRegExp(loopIndexVar);
    js = js.replace(new RegExp(escaped, "g"), "loopindex");
  }

  // CRITICAL: Handle blockstate Direction steps BEFORE replacing $\d+ tokens
  // This must happen before $\d+ replacement so patterns like $0.getValue(FACING) are still intact
  // (e.g., getValue(FACING).getStepX())
  const processed = replaceDirectionSteps(js, blockProps);
  if (!processed) return null;
  js = processed;

  // Replace remaining $\d+ parameter tokens with 0 (unknown parameters default to 0)
  js = js.replace(/\$\d+/g, "0");

  // Remove Java numeric suffixes (1.0f -> 1.0, 5d -> 5)
  js = js.replace(/(\d(?:[\d.]*)(?:[eE][+-]?\d+)?)[dDfF]\b/g, "$1");
  js = js.trim();

  // Handle Direction.from2DDataValue patterns
  const withDirection = replaceDirectionFrom2D(js);
  if (!withDirection) return null;

  // Validate that expression contains only safe characters
  // Allow all alphanumeric characters plus operators and special characters
  if (!/^[0-9A-Za-z+\-*/().,\sEe><=!?:&|]+$/.test(withDirection)) {
    console.warn("[compileMinecraftExpr] Expression contains invalid characters:", withDirection);
    return null;
  }

  try {

     
    const fn = new Function(
      "rand",
      "randInt",
      "trunc",
      "floormod",
      "dirstepx",
      "dirstepy",
      "dirstepz",
      "dircwstepx",
      "dircwstepy",
      "dircwstepz",
      "loopindex",
      "age",
      "lifetime",
      "Math",
      // New functions for comprehensive parameter handling
      "axisX",
      "axisY",
      "axisZ",
      "dirStepX",
      "dirStepY",
      "dirStepZ",
      "blockPosX",
      "blockPosY",
      "blockPosZ",
      "entityX",
      "entityY",
      "entityZ",
      "entityWidth",
      "entityHeight",
      "entityDepth",
      `"use strict"; return (${withDirection});`,
    ) as (
      rand: () => number,
      randInt: (n?: number) => number,
      trunc: (n: number) => number,
      floormod: (a: number, b: number) => number,
      dirstepx: (value: number) => number,
      dirstepy: (value: number) => number,
      dirstepz: (value: number) => number,
      dircwstepx: (value: number) => number,
      dircwstepy: (value: number) => number,
      dircwstepz: (value: number) => number,
      loopindex: number,
      age: number,
      lifetime: number,
      math: typeof Math,
      axisX: (param: number) => boolean,
      axisY: (param: number) => boolean,
      axisZ: (param: number) => boolean,
      dirStepX: (param: number) => number,
      dirStepY: (param: number) => number,
      dirStepZ: (param: number) => number,
      blockPosX: (param: number) => number,
      blockPosY: (param: number) => number,
      blockPosZ: (param: number) => number,
      entityX: number,
      entityY: number,
      entityZ: number,
      entityWidth: number,
      entityHeight: number,
      entityDepth: number,
    ) => number;

    return (rand, loopIndex = 0, context) => {
      const helpers = createRuntimeHelpers(rand, context);
      return Number(
        fn(
          rand,
          helpers.randInt,
          Math.trunc,
          helpers.floormod,
          helpers.dirstepx,
          helpers.dirstepy,
          helpers.dirstepz,
          helpers.dircwstepx,
          helpers.dircwstepy,
          helpers.dircwstepz,
          loopIndex,
          helpers.age,
          helpers.lifetime,
          Math,
          helpers.axisX,
          helpers.axisY,
          helpers.axisZ,
          helpers.dirStepX,
          helpers.dirStepY,
          helpers.dirStepZ,
          helpers.blockPosX,
          helpers.blockPosY,
          helpers.blockPosZ,
          helpers.entityX,
          helpers.entityY,
          helpers.entityZ,
          helpers.entityWidth,
          helpers.entityHeight,
          helpers.entityDepth,
        ),
      );
    };
  } catch (error) {
    console.warn("[compileMinecraftExpr] Function compilation failed for:", expr, error);
    return null;
  }
}
