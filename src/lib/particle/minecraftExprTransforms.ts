/**
 * Transformation and parsing utilities for Minecraft expression compilation
 *
 * Handles parsing of Java syntax patterns and transforming them into JavaScript.
 */

export function isIdentStart(char: string): boolean {
  return /[A-Za-z_$]/.test(char);
}

export function isIdentChar(char: string): boolean {
  return /[A-Za-z0-9_$]/.test(char);
}

export function extractBalanced(
  expr: string,
  start: number,
): { value: string; end: number } {
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

export function replaceDirectionFrom2D(expr: string): string | null {
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
    const rest = expr.slice(balanced.end);

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

function handleIntCastParentheses(
  expr: string,
  i: number,
): { result: string; newIndex: number } {
  const balanced = extractBalanced(expr, i);
  const inner = balanced.value.slice(1, -1);
  return { result: `trunc(${inner})`, newIndex: balanced.end };
}

function handleIntCastNumber(
  expr: string,
  tokenStart: number,
  i: number,
): { result: string; newIndex: number } {
  let idx = i;
  while (idx < expr.length && /[0-9.]/.test(expr[idx])) idx += 1;
  const token = expr.slice(tokenStart, idx);
  return { result: `trunc(${token})`, newIndex: idx };
}

function handleIntCastIdentifier(
  expr: string,
  tokenStart: number,
  i: number,
): { result: string; newIndex: number } {
  let idx = i;
  while (idx < expr.length && (isIdentChar(expr[idx]) || expr[idx] === "."))
    idx += 1;
  const token = expr.slice(tokenStart, idx);

  if (idx < expr.length && expr[idx] === "(") {
    const call = extractBalanced(expr, idx);
    return { result: `trunc(${token}${call.value})`, newIndex: call.end };
  }

  return { result: `trunc(${token})`, newIndex: idx };
}

export function replaceIntCasts(expr: string): string {
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
        const { result, newIndex } = handleIntCastParentheses(expr, i);
        out += result;
        i = newIndex;
        continue;
      }

      const tokenStart = i;
      if (expr[i] === "-" || expr[i] === "+") i += 1;

      if (i < expr.length && /[0-9.]/.test(expr[i])) {
        const { result, newIndex } = handleIntCastNumber(
          expr,
          tokenStart,
          i,
        );
        out += result;
        i = newIndex;
        continue;
      }

      if (i < expr.length && isIdentStart(expr[i])) {
        const { result, newIndex } = handleIntCastIdentifier(
          expr,
          tokenStart,
          i,
        );
        out += result;
        i = newIndex;
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

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
