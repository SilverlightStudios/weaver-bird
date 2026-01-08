export interface MinecraftExprContext {
  age?: number;
  lifetime?: number;
}

export type CompiledMinecraftExpr = (
  rand: () => number,
  loopIndex?: number,
  context?: MinecraftExprContext,
) => number;

type Axis = "X" | "Y" | "Z";

function oppositeDirection(dir: string): string | null {
  switch (dir) {
    case "north":
      return "south";
    case "south":
      return "north";
    case "west":
      return "east";
    case "east":
      return "west";
    case "up":
      return "down";
    case "down":
      return "up";
    default:
      return null;
  }
}

function directionStep(dir: string, axis: Axis): number | null {
  switch (dir) {
    case "north":
      return axis === "Z" ? -1 : 0;
    case "south":
      return axis === "Z" ? 1 : 0;
    case "west":
      return axis === "X" ? -1 : 0;
    case "east":
      return axis === "X" ? 1 : 0;
    case "up":
      return axis === "Y" ? 1 : 0;
    case "down":
      return axis === "Y" ? -1 : 0;
    default:
      return null;
  }
}

function direction2DValue(dir: string): number | null {
  switch (dir) {
    case "south":
      return 0;
    case "west":
      return 1;
    case "north":
      return 2;
    case "east":
      return 3;
    default:
      return null;
  }
}

function normalizeDirectionPropertyKey(propName: string, blockProps?: Record<string, string>): string {
  const base = propName.split(".").pop() ?? propName;
  const key = base.toLowerCase();
  if (!blockProps) return key;
  if (key in blockProps) return key;
  if (key.endsWith("_facing") && "facing" in blockProps) return "facing";
  if (key.endsWith("_direction") && "facing" in blockProps) return "facing";
  return key;
}

function replaceDirectionSteps(js: string, blockProps?: Record<string, string>): string | null {
  if (!/getStep[XYZ]\s*\(/.test(js)) return js;
  if (!blockProps) return null;

  let failed = false;

  const replaceStateSteps = (pattern: RegExp): void => {
    js = js.replace(pattern, (_m, propName: string, oppositeFlag: string | undefined, axis: Axis) => {
      const key = normalizeDirectionPropertyKey(propName, blockProps);
      const raw = blockProps[key]?.toLowerCase();
      if (!raw) {
        failed = true;
        return "0";
      }
      const dir = oppositeFlag ? oppositeDirection(raw) : raw;
      const step = dir ? directionStep(dir, axis) : null;
      if (step === null) {
        failed = true;
        return "0";
      }
      return String(step);
    });
  };

  replaceStateSteps(
    /\(\s*[A-Za-z_$][A-Za-z0-9_$]*\.getValue\s*\(\s*([A-Za-z0-9_$.]+)\s*\)\s*(\.getOpposite\s*\(\s*\))?\s*\)\s*\.getStep([XYZ])\s*\(\s*\)/g,
  );
  replaceStateSteps(
    /[A-Za-z_$][A-Za-z0-9_$]*\.getValue\s*\(\s*([A-Za-z0-9_$.]+)\s*\)\s*(\.getOpposite\s*\(\s*\))?\s*\.getStep([XYZ])\s*\(\s*\)/g,
  );

  js = js.replace(
    /Direction\s*\.\s*(\w+)\s*(\.getOpposite\s*\(\s*\))?\s*\.getStep([XYZ])\s*\(\s*\)/g,
    (_m, dirName: string, oppositeFlag: string | undefined, axis: Axis) => {
      const raw = dirName.toLowerCase();
      const dir = oppositeFlag ? oppositeDirection(raw) : raw;
      const step = dir ? directionStep(dir, axis) : null;
      if (step === null) {
        failed = true;
        return "0";
      }
      return String(step);
    },
  );

  if (failed) return null;
  if (/getStep[XYZ]\s*\(/.test(js)) return null;

  return js;
}

function isIdentStart(char: string): boolean {
  return /[A-Za-z_$]/.test(char);
}

function isIdentChar(char: string): boolean {
  return /[A-Za-z0-9_$]/.test(char);
}

function extractBalanced(expr: string, start: number): { value: string; end: number } {
  let depth = 0;
  let i = start;
  for (; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (depth === 0) {
      return { value: expr.slice(start, i + 1), end: i + 1 };
    }
  }
  return { value: expr.slice(start), end: expr.length };
}

function replaceDirectionFrom2D(expr: string): string | null {
  const marker = "Direction.from2DDataValue";
  let out = "";
  let i = 0;

  while (i < expr.length) {
    const idx = expr.indexOf(marker, i);
    if (idx === -1) {
      out += expr.slice(i);
      break;
    }

    out += expr.slice(i, idx);
    let start = idx + marker.length;
    while (start < expr.length && /\s/.test(expr[start])) start += 1;
    if (expr[start] !== "(") return null;

    const balanced = extractBalanced(expr, start);
    const arg = balanced.value.slice(1, -1).trim();
    let rest = expr.slice(balanced.end);

    const clockwiseMatch = rest.match(
      /^\s*\.getClockWise\s*\(\s*\)\s*\.getStep([XYZ])\s*\(\s*\)/,
    );
    if (clockwiseMatch) {
      const axis = clockwiseMatch[1].toLowerCase();
      out += `dircwstep${axis}(${arg})`;
      i = balanced.end + clockwiseMatch[0].length;
      continue;
    }

    const stepMatch = rest.match(/^\s*\.getStep([XYZ])\s*\(\s*\)/);
    if (stepMatch) {
      const axis = stepMatch[1].toLowerCase();
      out += `dirstep${axis}(${arg})`;
      i = balanced.end + stepMatch[0].length;
      continue;
    }

    return null;
  }

  return out;
}

function replaceIntCasts(expr: string): string {
  let out = "";
  let i = 0;

  while (i < expr.length) {
    if (expr.startsWith("(int)", i)) {
      i += 5;
      while (i < expr.length && /\s/.test(expr[i])) i += 1;

      if (i >= expr.length) {
        out += "trunc(0)";
        break;
      }

      if (expr[i] === "(") {
        const balanced = extractBalanced(expr, i);
        const inner = balanced.value.slice(1, -1);
        out += `trunc(${inner})`;
        i = balanced.end;
        continue;
      }

      const tokenStart = i;
      if (expr[i] === "-" || expr[i] === "+") i += 1;

      if (i < expr.length && /[0-9.]/.test(expr[i])) {
        while (i < expr.length && /[0-9.]/.test(expr[i])) i += 1;
        const token = expr.slice(tokenStart, i);
        out += `trunc(${token})`;
        continue;
      }

      if (i < expr.length && isIdentStart(expr[i])) {
        while (i < expr.length && (isIdentChar(expr[i]) || expr[i] === ".")) i += 1;
        const token = expr.slice(tokenStart, i);
        if (i < expr.length && expr[i] === "(") {
          const call = extractBalanced(expr, i);
          out += `trunc(${token}${call.value})`;
          i = call.end;
          continue;
        }
        out += `trunc(${token})`;
        continue;
      }

      out += "trunc(0)";
      continue;
    }

    out += expr[i];
    i += 1;
  }

  return out;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function compileMinecraftExpr(
  expr: string,
  blockProps?: Record<string, string>,
  loopIndexVar?: string,
): CompiledMinecraftExpr | null {
  let js = expr;

  js = js.replace(/\((?:double|float)\)/g, "");
  js = replaceIntCasts(js);
  js = js.replace(/[A-Za-z_$][A-Za-z0-9_$]*\.get[XYZ]\(\)/g, "0");
  js = js.replace(/[A-Za-z_$][A-Za-z0-9_$]*\.[xyz](?:\(\))?/g, "0");
  js = js.replace(/[A-Za-z_$][A-Za-z0-9_$]*\.getRandom[XYZ]\s*\([^)]*\)/g, "rand()");
  js = js.replace(/(?:[A-Za-z_$][A-Za-z0-9_$]*\.)*nextBoolean\(\)/g, "(rand() > 0.5)");
  js = js.replace(/(?:[A-Za-z_$][A-Za-z0-9_$]*\.)*nextFloat\(\)/g, "rand()");
  js = js.replace(/(?:[A-Za-z_$][A-Za-z0-9_$]*\.)*nextDouble\(\)/g, "rand()");
  js = js.replace(/(?:[A-Za-z_$][A-Za-z0-9_$]*\.)*nextInt\s*\(/g, "randInt(");
  js = js.replace(/(?:this\.)?Math\.random\(\)/g, "rand()");
  js = js.replace(/Math\.floorMod\s*\(/g, "floormod(");
  js = js.replace(/\bthis\.age\b/g, "age");
  js = js.replace(/\bthis\.lifetime\b/g, "lifetime");

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

  if (loopIndexVar) {
    const escaped = escapeRegExp(loopIndexVar);
    js = js.replace(new RegExp(escaped, "g"), "loopindex");
  }
  js = js.replace(/\$\d+/g, "0");
  js = js.replace(/(\d(?:[\d.]*)(?:[eE][+-]?\d+)?)[dDfF]\b/g, "$1");
  js = js.trim();

  const processed = replaceDirectionSteps(js, blockProps);
  if (!processed) return null;

  const withDirection = replaceDirectionFrom2D(processed);
  if (!withDirection) return null;

  if (!/^[0-9+\-*/().,\sEe><=!?:&|acdefgilmnoprstuwxyzI]+$/.test(withDirection)) return null;

  try {
    // eslint-disable-next-line no-new-func
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
    ) => number;

    return (rand, loopIndex = 0, context) => {
      const randInt = (n?: number) => {
        if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) return 0;
        return Math.floor(rand() * n);
      };

      const floormod = (a: number, b: number) => {
        if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return 0;
        const ai = Math.trunc(a);
        const bi = Math.trunc(b);
        return ((ai % bi) + bi) % bi;
      };

      const dirIndex = (value: number) => floormod(value, 4);
      const dirSteps = [
        { x: 0, z: 1 }, // south
        { x: -1, z: 0 }, // west
        { x: 0, z: -1 }, // north
        { x: 1, z: 0 }, // east
      ];

      const dirstepx = (value: number) => dirSteps[dirIndex(value)].x;
      const dirstepy = (_value: number) => 0;
      const dirstepz = (value: number) => dirSteps[dirIndex(value)].z;
      const dircwstepx = (value: number) => dirstepx(value + 1);
      const dircwstepy = (_value: number) => 0;
      const dircwstepz = (value: number) => dirstepz(value + 1);
      const age = typeof context?.age === "number" && Number.isFinite(context.age)
        ? context.age
        : 0;
      const lifetime = typeof context?.lifetime === "number" && Number.isFinite(context.lifetime)
        ? context.lifetime
        : 1;
      const safeLifetime = lifetime <= 0 ? 1 : lifetime;

      return Number(
        fn(
          rand,
          randInt,
          Math.trunc,
          floormod,
          dirstepx,
          dirstepy,
          dirstepz,
          dircwstepx,
          dircwstepy,
          dircwstepz,
          loopIndex,
          age,
          safeLifetime,
        ),
      );
    };
  } catch {
    return null;
  }
}
