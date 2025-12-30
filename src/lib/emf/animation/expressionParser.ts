/**
 * CEM Animation Expression Parser
 *
 * Tokenizes and parses OptiFine CEM animation expressions into an AST.
 * Supports the full CEM expression language including:
 * - Arithmetic operators: +, -, *, /, %
 * - Comparison operators: ==, !=, <, >, <=, >=
 * - Logical operators: !, &&, ||
 * - Functions: sin, cos, clamp, if, between, etc.
 * - Variables: limb_swing, head.rx, var.hy, etc.
 *
 * Based on: https://github.com/sp614x/optifine/blob/master/OptiFineDoc/doc/cem_animation.txt
 */

import type {
  Token,
  TokenType,
  ASTNode,
  LiteralNode,
  VariableNode,
  BinaryOpNode,
  UnaryOpNode,
  FunctionCallNode,
  ParsedExpression,
} from "./types";

// ============================================================================
// Constants
// ============================================================================

/** Known CEM functions */
const FUNCTIONS = new Set([
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
const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  true: 1,
  false: 0,
};

/** Operator precedence (higher = binds tighter) */
const PRECEDENCE: Record<string, number> = {
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
const RIGHT_ASSOCIATIVE = new Set<string>([]);

// ============================================================================
// Tokenizer
// ============================================================================

/**
 * Tokenize a CEM expression string into tokens.
 */
export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  while (pos < input.length) {
    const char = input[pos];

    // Skip whitespace
    if (/\s/.test(char)) {
      pos++;
      continue;
    }

    // Numbers (including decimals and negative exponents)
    if (/[0-9]/.test(char) || (char === "." && /[0-9]/.test(input[pos + 1]))) {
      const start = pos;
      let numStr = "";

      // Integer part
      while (pos < input.length && /[0-9]/.test(input[pos])) {
        numStr += input[pos++];
      }

      // Decimal part
      if (pos < input.length && input[pos] === ".") {
        numStr += input[pos++];
        while (pos < input.length && /[0-9]/.test(input[pos])) {
          numStr += input[pos++];
        }
      }

      // Exponent part (e.g., 1e-5)
      if (pos < input.length && /[eE]/.test(input[pos])) {
        numStr += input[pos++];
        if (pos < input.length && /[+-]/.test(input[pos])) {
          numStr += input[pos++];
        }
        while (pos < input.length && /[0-9]/.test(input[pos])) {
          numStr += input[pos++];
        }
      }

      tokens.push({ type: "NUMBER", value: parseFloat(numStr), position: start });
      continue;
    }

    // Identifiers (variable names, function names, constants)
    if (/[a-zA-Z_]/.test(char)) {
      const start = pos;
      let ident = "";

      while (pos < input.length && /[a-zA-Z0-9_.]/.test(input[pos])) {
        ident += input[pos++];
      }

      // Check if it's a function (followed by parenthesis)
      let isFunction = false;
      let lookAhead = pos;
      while (lookAhead < input.length && /\s/.test(input[lookAhead])) {
        lookAhead++;
      }
      if (lookAhead < input.length && input[lookAhead] === "(") {
        isFunction = FUNCTIONS.has(ident);
      }

      if (isFunction) {
        tokens.push({ type: "FUNCTION", value: ident, position: start });
      } else if (ident in CONSTANTS) {
        tokens.push({ type: "NUMBER", value: CONSTANTS[ident], position: start });
      } else {
        tokens.push({ type: "IDENTIFIER", value: ident, position: start });
      }
      continue;
    }

    // Multi-character operators
    const twoChar = input.slice(pos, pos + 2);
    if (["==", "!=", "<=", ">=", "&&", "||"].includes(twoChar)) {
      tokens.push({ type: "OPERATOR", value: twoChar, position: pos });
      pos += 2;
      continue;
    }

    // Single-character operators
    if (["+", "-", "*", "/", "%", "<", ">", "!"].includes(char)) {
      tokens.push({ type: "OPERATOR", value: char, position: pos });
      pos++;
      continue;
    }

    // Parentheses
    if (char === "(") {
      tokens.push({ type: "LPAREN", value: "(", position: pos });
      pos++;
      continue;
    }

    if (char === ")") {
      tokens.push({ type: "RPAREN", value: ")", position: pos });
      pos++;
      continue;
    }

    // Comma
    if (char === ",") {
      tokens.push({ type: "COMMA", value: ",", position: pos });
      pos++;
      continue;
    }

    // Unknown character - skip with warning
    console.warn(
      `[ExpressionParser] Unknown character '${char}' at position ${pos}`
    );
    pos++;
  }

  tokens.push({ type: "EOF", value: "", position: pos });
  return tokens;
}

// ============================================================================
// Parser
// ============================================================================

/**
 * Recursive descent parser for CEM expressions.
 */
class Parser {
  private tokens: Token[];
  private pos: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private current(): Token {
    return this.tokens[this.pos];
  }

  private advance(): Token {
    const token = this.current();
    if (token.type !== "EOF") {
      this.pos++;
    }
    return token;
  }

  private expect(type: TokenType, value?: string): Token {
    const token = this.current();
    if (token.type !== type || (value !== undefined && token.value !== value)) {
      throw new Error(
        `Expected ${type}${value ? ` '${value}'` : ""} but got ${token.type} '${token.value}' at position ${token.position}`
      );
    }
    return this.advance();
  }

  /**
   * Parse the full expression.
   */
  parse(): ASTNode {
    const ast = this.parseExpression(0);

    if (this.current().type !== "EOF") {
      throw new Error(
        `Unexpected token ${this.current().type} '${this.current().value}' at position ${this.current().position}`
      );
    }

    return ast;
  }

  /**
   * Parse expression with operator precedence (Pratt parser).
   */
  private parseExpression(minPrecedence: number): ASTNode {
    let left = this.parsePrimary();

    while (true) {
      const token = this.current();

      if (token.type !== "OPERATOR" || !(token.value as string in PRECEDENCE)) {
        break;
      }

      const op = token.value as string;
      const precedence = PRECEDENCE[op];

      if (precedence < minPrecedence) {
        break;
      }

      this.advance(); // consume operator

      const nextPrecedence = RIGHT_ASSOCIATIVE.has(op)
        ? precedence
        : precedence + 1;

      const right = this.parseExpression(nextPrecedence);

      left = {
        type: "BinaryOp",
        operator: op,
        left,
        right,
      } as BinaryOpNode;
    }

    return left;
  }

  /**
   * Parse primary expressions (literals, variables, function calls, unary ops).
   */
  private parsePrimary(): ASTNode {
    const token = this.current();

    // Unary operators
    if (
      token.type === "OPERATOR" &&
      (token.value === "-" || token.value === "+" || token.value === "!")
    ) {
      this.advance();
      const operand = this.parsePrimary();
      return {
        type: "UnaryOp",
        operator: token.value as string,
        operand,
      } as UnaryOpNode;
    }

    // Parenthesized expression
    if (token.type === "LPAREN") {
      this.advance();
      const expr = this.parseExpression(0);
      this.expect("RPAREN");
      return expr;
    }

    // Number literal
    if (token.type === "NUMBER") {
      this.advance();
      return {
        type: "Literal",
        value: token.value as number,
      } as LiteralNode;
    }

    // Function call
    if (token.type === "FUNCTION") {
      return this.parseFunctionCall();
    }

    // Variable reference
    if (token.type === "IDENTIFIER") {
      this.advance();
      return {
        type: "Variable",
        name: token.value as string,
      } as VariableNode;
    }

    throw new Error(
      `Unexpected token ${token.type} '${token.value}' at position ${token.position}`
    );
  }

  /**
   * Parse function call with arguments.
   */
  private parseFunctionCall(): FunctionCallNode {
    const nameToken = this.advance();
    const name = nameToken.value as string;

    this.expect("LPAREN");

    const args: ASTNode[] = [];

    // Handle empty argument list
    if (this.current().type !== "RPAREN") {
      args.push(this.parseExpression(0));

      while (this.current().type === "COMMA") {
        this.advance(); // consume comma
        args.push(this.parseExpression(0));
      }
    }

    this.expect("RPAREN");

    return {
      type: "FunctionCall",
      name,
      args,
    };
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Parse a CEM expression string into an AST.
 *
 * @param source The expression string to parse
 * @returns The parsed AST
 * @throws Error if the expression is invalid
 */
export function parseExpression(source: string): ASTNode {
  const tokens = tokenize(source);
  const parser = new Parser(tokens);
  return parser.parse();
}

/**
 * Compile a CEM expression for evaluation.
 *
 * @param source The expression string or number
 * @returns A compiled expression ready for evaluation
 */
export function compileExpression(
  source: string | number
): ParsedExpression {
  if (typeof source === "number") {
    return { type: "constant", value: source };
  }

  const trimmed = source.trim();

  // Check for simple numeric constant
  const num = parseFloat(trimmed);
  if (!isNaN(num) && /^-?[0-9]*\.?[0-9]+([eE][+-]?[0-9]+)?$/.test(trimmed)) {
    return { type: "constant", value: num };
  }

  // Parse as expression
  const ast = parseExpression(trimmed);
  return { source: trimmed, ast };
}

/**
 * Check if a parsed expression is a constant.
 */
export function isConstantExpression(
  expr: ParsedExpression
): expr is { type: "constant"; value: number } {
  return "type" in expr && expr.type === "constant";
}

/**
 * Pretty-print an AST node for debugging.
 */
export function astToString(node: ASTNode, indent: number = 0): string {
  const pad = "  ".repeat(indent);

  switch (node.type) {
    case "Literal":
      return `${pad}Literal(${node.value})`;

    case "Variable":
      return `${pad}Variable(${node.name})`;

    case "UnaryOp":
      return `${pad}UnaryOp(${node.operator})\n${astToString(node.operand, indent + 1)}`;

    case "BinaryOp":
      return `${pad}BinaryOp(${node.operator})\n${astToString(node.left, indent + 1)}\n${astToString(node.right, indent + 1)}`;

    case "FunctionCall": {
      const argsStr = node.args
        .map((a) => astToString(a, indent + 1))
        .join("\n");
      return `${pad}FunctionCall(${node.name})\n${argsStr}`;
    }

    default:
      return `${pad}Unknown`;
  }
}
