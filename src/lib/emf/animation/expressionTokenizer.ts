/**
 * CEM Animation Expression Tokenizer
 *
 * Tokenizes OptiFine CEM animation expressions.
 */

import type { Token } from "./types";

// ============================================================================
// Constants
// ============================================================================

/** Known CEM functions */
export const FUNCTIONS = new Set([
  // Trigonometric
  "sin",
  "cos",
  "tan",
  "asin",
  "acos",
  "atan",
  "atan2",
  "torad",
  "todeg",

  // Numeric
  "min",
  "max",
  "clamp",
  "abs",
  "floor",
  "ceil",
  "round",
  "sqrt",
  "pow",
  "exp",
  "log",
  "frac",
  "fmod",
  "signum",

  // Interpolation
  "lerp",

  // Conditionals
  "if",
  "ifb",
  "between",
  "equals",
  "in",

  // Random
  "random",

  // Debug (no-op in our implementation)
  "print",
  "printb",
]);

/** Known constants */
export const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  true: 1,
  false: 0,
};

/** Operator precedence (higher = binds tighter) */
export const PRECEDENCE: Record<string, number> = {
  "||": 1,
  "&&": 2,
  "==": 3,
  "!=": 3,
  "<": 4,
  ">": 4,
  "<=": 4,
  ">=": 4,
  "+": 5,
  "-": 5,
  "*": 6,
  "/": 6,
  "%": 6,
};

/** Right-associative operators */
export const RIGHT_ASSOCIATIVE = new Set<string>([]);

// ============================================================================
// Tokenizer
// ============================================================================

interface TokenizeResult {
  token: Token | null;
  newPos: number;
}

function tokenizeNumber(input: string, pos: number): TokenizeResult {
  const start = pos;
  let numStr = "";

  while (pos < input.length && /[0-9]/.test(input[pos])) {
    numStr += input[pos++];
  }

  if (pos < input.length && input[pos] === ".") {
    numStr += input[pos++];
    while (pos < input.length && /[0-9]/.test(input[pos])) {
      numStr += input[pos++];
    }
  }

  if (pos < input.length && /[eE]/.test(input[pos])) {
    numStr += input[pos++];
    if (pos < input.length && /[+-]/.test(input[pos])) {
      numStr += input[pos++];
    }
    while (pos < input.length && /[0-9]/.test(input[pos])) {
      numStr += input[pos++];
    }
  }

  return {
    token: { type: "NUMBER", value: parseFloat(numStr), position: start },
    newPos: pos,
  };
}

function tokenizeIdentifier(input: string, pos: number): TokenizeResult {
  const start = pos;
  let ident = "";

  while (pos < input.length && /[a-zA-Z0-9_.]/.test(input[pos])) {
    ident += input[pos++];
  }

  let lookAhead = pos;
  while (lookAhead < input.length && /\s/.test(input[lookAhead])) {
    lookAhead++;
  }

  const isFunction =
    lookAhead < input.length && input[lookAhead] === "(" && FUNCTIONS.has(ident);

  let token: Token;
  if (isFunction) {
    token = { type: "FUNCTION", value: ident, position: start };
  } else if (ident in CONSTANTS) {
    token = { type: "NUMBER", value: CONSTANTS[ident], position: start };
  } else {
    token = { type: "IDENTIFIER", value: ident, position: start };
  }

  return { token, newPos: pos };
}

function tokenizeOperator(input: string, pos: number): TokenizeResult {
  const twoChar = input.slice(pos, pos + 2);
  if (["==", "!=", "<=", ">=", "&&", "||"].includes(twoChar)) {
    return {
      token: { type: "OPERATOR", value: twoChar, position: pos },
      newPos: pos + 2,
    };
  }

  const char = input[pos];
  if (["+", "-", "*", "/", "%", "<", ">", "!"].includes(char)) {
    return {
      token: { type: "OPERATOR", value: char, position: pos },
      newPos: pos + 1,
    };
  }

  return { token: null, newPos: pos };
}

function tokenizeDelimiter(char: string, pos: number): TokenizeResult {
  const delimiterMap: Record<string, Token["type"]> = {
    "(": "LPAREN",
    ")": "RPAREN",
    ",": "COMMA",
  };

  const type = delimiterMap[char];
  if (type) {
    return {
      token: { type, value: char, position: pos },
      newPos: pos + 1,
    };
  }

  return { token: null, newPos: pos };
}

/**
 * Tokenize a CEM expression string into tokens.
 */
export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  while (pos < input.length) {
    const char = input[pos];

    if (/\s/.test(char)) {
      pos++;
      continue;
    }

    if (/[0-9]/.test(char) || (char === "." && /[0-9]/.test(input[pos + 1]))) {
      const result = tokenizeNumber(input, pos);
      if (result.token) tokens.push(result.token);
      pos = result.newPos;
      continue;
    }

    if (/[a-zA-Z_]/.test(char)) {
      const result = tokenizeIdentifier(input, pos);
      if (result.token) tokens.push(result.token);
      pos = result.newPos;
      continue;
    }

    const opResult = tokenizeOperator(input, pos);
    if (opResult.token) {
      tokens.push(opResult.token);
      pos = opResult.newPos;
      continue;
    }

    const delimResult = tokenizeDelimiter(char, pos);
    if (delimResult.token) {
      tokens.push(delimResult.token);
      pos = delimResult.newPos;
      continue;
    }

    console.warn(`[ExpressionParser] Unknown character '${char}' at position ${pos}`);
    pos++;
  }

  tokens.push({ type: "EOF", value: "", position: pos });
  return tokens;
}
