/**
 * Tests for CEM Animation Expression Parser
 */

import { describe, it, expect } from "vitest";
import {
  tokenize,
  parseExpression,
  compileExpression,
  isConstantExpression,
  astToString,
} from "./expressionParser";
import { evaluate, evaluateAST } from "./expressionEvaluator";
import { createAnimationContext, DEFAULT_ENTITY_STATE } from "./types";
import type { AnimationContext } from "./types";

// Helper to create a test context with custom entity state
function createTestContext(
  overrides?: Partial<typeof DEFAULT_ENTITY_STATE>
): AnimationContext {
  const context = createAnimationContext();
  if (overrides) {
    Object.assign(context.entityState, overrides);
  }
  return context;
}

describe("Expression Tokenizer", () => {
  it("should tokenize numbers", () => {
    const tokens = tokenize("123");
    expect(tokens[0]).toEqual({ type: "NUMBER", value: 123, position: 0 });
  });

  it("should tokenize decimal numbers", () => {
    const tokens = tokenize("3.14159");
    expect(tokens[0]).toEqual({ type: "NUMBER", value: 3.14159, position: 0 });
  });

  it("should tokenize scientific notation", () => {
    const tokens = tokenize("1e-5");
    expect(tokens[0].type).toBe("NUMBER");
    expect(tokens[0].value).toBeCloseTo(0.00001);
  });

  it("should tokenize identifiers", () => {
    const tokens = tokenize("limb_swing");
    expect(tokens[0]).toEqual({
      type: "IDENTIFIER",
      value: "limb_swing",
      position: 0,
    });
  });

  it("should tokenize dotted identifiers", () => {
    const tokens = tokenize("head.rx");
    expect(tokens[0]).toEqual({
      type: "IDENTIFIER",
      value: "head.rx",
      position: 0,
    });
  });

  it("should tokenize functions", () => {
    const tokens = tokenize("sin(x)");
    expect(tokens[0]).toEqual({ type: "FUNCTION", value: "sin", position: 0 });
    expect(tokens[1]).toEqual({ type: "LPAREN", value: "(", position: 3 });
  });

  it("should tokenize operators", () => {
    const tokens = tokenize("a + b * c");
    expect(tokens[1]).toEqual({ type: "OPERATOR", value: "+", position: 2 });
    expect(tokens[3]).toEqual({ type: "OPERATOR", value: "*", position: 6 });
  });

  it("should tokenize comparison operators", () => {
    const tokens = tokenize("a >= b && c != d");
    expect(tokens[1].value).toBe(">=");
    expect(tokens[3].value).toBe("&&");
    expect(tokens[5].value).toBe("!=");
  });

  it("should tokenize constants (pi)", () => {
    const tokens = tokenize("pi");
    expect(tokens[0].type).toBe("NUMBER");
    expect(tokens[0].value).toBeCloseTo(Math.PI);
  });

  it("should tokenize complex expressions", () => {
    const tokens = tokenize("sin(limb_swing * 0.5) + cos(age / 20)");
    // sin ( limb_swing * 0.5 ) + cos ( age / 20 ) EOF = 14 tokens
    expect(tokens.length).toBe(14);
  });
});

describe("Expression Parser", () => {
  it("should parse number literals", () => {
    const ast = parseExpression("42");
    expect(ast.type).toBe("Literal");
    if (ast.type === "Literal") {
      expect(ast.value).toBe(42);
    }
  });

  it("should parse variable references", () => {
    const ast = parseExpression("limb_swing");
    expect(ast.type).toBe("Variable");
    if (ast.type === "Variable") {
      expect(ast.name).toBe("limb_swing");
    }
  });

  it("should parse dotted variable references", () => {
    const ast = parseExpression("head.rx");
    expect(ast.type).toBe("Variable");
    if (ast.type === "Variable") {
      expect(ast.name).toBe("head.rx");
    }
  });

  it("should parse binary operations", () => {
    const ast = parseExpression("1 + 2");
    expect(ast.type).toBe("BinaryOp");
    if (ast.type === "BinaryOp") {
      expect(ast.operator).toBe("+");
      expect(ast.left.type).toBe("Literal");
      expect(ast.right.type).toBe("Literal");
    }
  });

  it("should respect operator precedence", () => {
    const ast = parseExpression("1 + 2 * 3");
    expect(ast.type).toBe("BinaryOp");
    if (ast.type === "BinaryOp") {
      expect(ast.operator).toBe("+");
      // Right side should be the multiplication
      expect(ast.right.type).toBe("BinaryOp");
      if (ast.right.type === "BinaryOp") {
        expect(ast.right.operator).toBe("*");
      }
    }
  });

  it("should parse parenthesized expressions", () => {
    const ast = parseExpression("(1 + 2) * 3");
    expect(ast.type).toBe("BinaryOp");
    if (ast.type === "BinaryOp") {
      expect(ast.operator).toBe("*");
      // Left side should be the addition
      expect(ast.left.type).toBe("BinaryOp");
    }
  });

  it("should parse unary negation", () => {
    const ast = parseExpression("-5");
    expect(ast.type).toBe("UnaryOp");
    if (ast.type === "UnaryOp") {
      expect(ast.operator).toBe("-");
    }
  });

  it("should parse unary plus", () => {
    const ast = parseExpression("+5");
    expect(ast.type).toBe("UnaryOp");
    if (ast.type === "UnaryOp") {
      expect(ast.operator).toBe("+");
    }
  });

  it("should parse logical not", () => {
    const ast = parseExpression("!is_hurt");
    expect(ast.type).toBe("UnaryOp");
    if (ast.type === "UnaryOp") {
      expect(ast.operator).toBe("!");
    }
  });

  it("should parse function calls with no arguments", () => {
    const ast = parseExpression("random()");
    expect(ast.type).toBe("FunctionCall");
    if (ast.type === "FunctionCall") {
      expect(ast.name).toBe("random");
      expect(ast.args.length).toBe(0);
    }
  });

  it("should parse function calls with one argument", () => {
    const ast = parseExpression("sin(3.14)");
    expect(ast.type).toBe("FunctionCall");
    if (ast.type === "FunctionCall") {
      expect(ast.name).toBe("sin");
      expect(ast.args.length).toBe(1);
    }
  });

  it("should parse function calls with multiple arguments", () => {
    const ast = parseExpression("clamp(x, 0, 1)");
    expect(ast.type).toBe("FunctionCall");
    if (ast.type === "FunctionCall") {
      expect(ast.name).toBe("clamp");
      expect(ast.args.length).toBe(3);
    }
  });

  it("should parse nested function calls", () => {
    const ast = parseExpression("sin(torad(45))");
    expect(ast.type).toBe("FunctionCall");
    if (ast.type === "FunctionCall") {
      expect(ast.name).toBe("sin");
      expect(ast.args[0].type).toBe("FunctionCall");
    }
  });

  it("should parse complex CEM expressions", () => {
    // Real expression from Fresh Animations
    const expr = "sin(limb_swing) * limb_speed";
    const ast = parseExpression(expr);
    expect(ast.type).toBe("BinaryOp");
  });

  it("should parse if() ternary function", () => {
    const ast = parseExpression("if(is_hurt, 0, 1)");
    expect(ast.type).toBe("FunctionCall");
    if (ast.type === "FunctionCall") {
      expect(ast.name).toBe("if");
      expect(ast.args.length).toBe(3);
    }
  });

  it("should parse comparison expressions", () => {
    const ast = parseExpression("health <= 5");
    expect(ast.type).toBe("BinaryOp");
    if (ast.type === "BinaryOp") {
      expect(ast.operator).toBe("<=");
    }
  });

  it("should parse logical expressions", () => {
    const ast = parseExpression("is_hurt && is_on_ground");
    expect(ast.type).toBe("BinaryOp");
    if (ast.type === "BinaryOp") {
      expect(ast.operator).toBe("&&");
    }
  });
});

describe("Expression Evaluator", () => {
  it("should evaluate number literals", () => {
    const context = createTestContext();
    const ast = parseExpression("42");
    expect(evaluateAST(ast, context)).toBe(42);
  });

  it("should evaluate entity state variables", () => {
    const context = createTestContext({ limb_swing: 10 });
    const ast = parseExpression("limb_swing");
    expect(evaluateAST(ast, context)).toBe(10);
  });

  it("should evaluate boolean entity state as 0/1", () => {
    const context = createTestContext({ is_hurt: true });
    const ast = parseExpression("is_hurt");
    expect(evaluateAST(ast, context)).toBe(1);

    context.entityState.is_hurt = false;
    expect(evaluateAST(ast, context)).toBe(0);
  });

  it("should evaluate arithmetic operations", () => {
    const context = createTestContext();
    expect(evaluateAST(parseExpression("2 + 3"), context)).toBe(5);
    expect(evaluateAST(parseExpression("10 - 4"), context)).toBe(6);
    expect(evaluateAST(parseExpression("3 * 4"), context)).toBe(12);
    expect(evaluateAST(parseExpression("15 / 3"), context)).toBe(5);
    expect(evaluateAST(parseExpression("17 % 5"), context)).toBe(2);
  });

  it("should evaluate comparison operations", () => {
    const context = createTestContext();
    expect(evaluateAST(parseExpression("5 > 3"), context)).toBe(1);
    expect(evaluateAST(parseExpression("3 > 5"), context)).toBe(0);
    expect(evaluateAST(parseExpression("5 >= 5"), context)).toBe(1);
    expect(evaluateAST(parseExpression("3 == 3"), context)).toBe(1);
    expect(evaluateAST(parseExpression("3 != 4"), context)).toBe(1);
  });

  it("should evaluate logical operations", () => {
    const context = createTestContext({ is_hurt: true, is_on_ground: false });
    expect(evaluateAST(parseExpression("is_hurt && is_on_ground"), context)).toBe(0);
    expect(evaluateAST(parseExpression("is_hurt || is_on_ground"), context)).toBe(1);
    expect(evaluateAST(parseExpression("!is_hurt"), context)).toBe(0);
    expect(evaluateAST(parseExpression("!is_on_ground"), context)).toBe(1);
  });

  it("should evaluate unary negation", () => {
    const context = createTestContext();
    expect(evaluateAST(parseExpression("-5"), context)).toBe(-5);
    expect(evaluateAST(parseExpression("-(3 + 2)"), context)).toBe(-5);
  });

  it("should evaluate unary plus", () => {
    const context = createTestContext();
    expect(evaluateAST(parseExpression("+5"), context)).toBe(5);
    expect(evaluateAST(parseExpression("+(3 + 2)"), context)).toBe(5);
  });

  it("should evaluate sin function", () => {
    const context = createTestContext();
    const result = evaluateAST(parseExpression("sin(0)"), context);
    expect(result).toBeCloseTo(0);

    const result2 = evaluateAST(parseExpression("sin(pi / 2)"), context);
    expect(result2).toBeCloseTo(1);
  });

  it("should evaluate cos function", () => {
    const context = createTestContext();
    const result = evaluateAST(parseExpression("cos(0)"), context);
    expect(result).toBeCloseTo(1);
  });

  it("should evaluate torad function", () => {
    const context = createTestContext();
    const result = evaluateAST(parseExpression("torad(180)"), context);
    expect(result).toBeCloseTo(Math.PI);
  });

  it("should evaluate todeg function", () => {
    const context = createTestContext();
    const result = evaluateAST(parseExpression("todeg(pi)"), context);
    expect(result).toBeCloseTo(180);
  });

  it("should evaluate clamp function", () => {
    const context = createTestContext();
    expect(evaluateAST(parseExpression("clamp(5, 0, 10)"), context)).toBe(5);
    expect(evaluateAST(parseExpression("clamp(-5, 0, 10)"), context)).toBe(0);
    expect(evaluateAST(parseExpression("clamp(15, 0, 10)"), context)).toBe(10);
  });

  it("should evaluate min/max functions", () => {
    const context = createTestContext();
    expect(evaluateAST(parseExpression("min(3, 5, 1)"), context)).toBe(1);
    expect(evaluateAST(parseExpression("max(3, 5, 1)"), context)).toBe(5);
  });

  it("should evaluate abs function", () => {
    const context = createTestContext();
    expect(evaluateAST(parseExpression("abs(-5)"), context)).toBe(5);
    expect(evaluateAST(parseExpression("abs(5)"), context)).toBe(5);
  });

  it("should evaluate floor/ceil/round functions", () => {
    const context = createTestContext();
    expect(evaluateAST(parseExpression("floor(3.7)"), context)).toBe(3);
    expect(evaluateAST(parseExpression("ceil(3.2)"), context)).toBe(4);
    expect(evaluateAST(parseExpression("round(3.5)"), context)).toBe(4);
  });

  it("should evaluate sqrt function", () => {
    const context = createTestContext();
    expect(evaluateAST(parseExpression("sqrt(16)"), context)).toBe(4);
  });

  it("should evaluate pow function", () => {
    const context = createTestContext();
    expect(evaluateAST(parseExpression("pow(2, 3)"), context)).toBe(8);
  });

  it("should evaluate if function", () => {
    const context = createTestContext({ health: 10 });
    expect(evaluateAST(parseExpression("if(health > 5, 1, 0)"), context)).toBe(1);
    expect(evaluateAST(parseExpression("if(health > 15, 1, 0)"), context)).toBe(0);
  });

  it("should evaluate multi-branch if/ifb functions", () => {
    const context = createTestContext({ health: 10 });
    // First condition true
    expect(
      evaluateAST(
        parseExpression("if(health > 5, 1, health > 15, 2, 3)"),
        context,
      ),
    ).toBe(1);
    // First false, second true
    expect(
      evaluateAST(
        parseExpression("if(health > 15, 1, health > 5, 2, 3)"),
        context,
      ),
    ).toBe(2);
    // None true => default
    expect(
      evaluateAST(
        parseExpression("if(health > 15, 1, health > 20, 2, 3)"),
        context,
      ),
    ).toBe(3);
    // Even number of args, no default => 0
    expect(
      evaluateAST(
        parseExpression("if(health > 15, 1, health > 20, 2)"),
        context,
      ),
    ).toBe(0);

    expect(
      evaluateAST(
        parseExpression("ifb(health > 15, 1, health > 5, 2, 3)"),
        context,
      ),
    ).toBe(2);
  });

  it("should evaluate between function", () => {
    const context = createTestContext();
    expect(evaluateAST(parseExpression("between(5, 0, 10)"), context)).toBe(1);
    expect(evaluateAST(parseExpression("between(15, 0, 10)"), context)).toBe(0);
  });

  it("should evaluate lerp function", () => {
    const context = createTestContext();
    expect(evaluateAST(parseExpression("lerp(0, 10, 0.5)"), context)).toBe(5);
    expect(evaluateAST(parseExpression("lerp(0, 10, 0)"), context)).toBe(0);
    expect(evaluateAST(parseExpression("lerp(0, 10, 1)"), context)).toBe(10);
  });

  it("should evaluate frac function", () => {
    const context = createTestContext();
    expect(evaluateAST(parseExpression("frac(3.7)"), context)).toBeCloseTo(0.7);
  });

  it("should evaluate random function with seed", () => {
    const context = createTestContext({ id: 42 });
    const result1 = evaluateAST(parseExpression("random(42)"), context);
    const result2 = evaluateAST(parseExpression("random(42)"), context);
    // Same seed should give same result
    expect(result1).toBe(result2);

    // Different seed should give different result
    const result3 = evaluateAST(parseExpression("random(43)"), context);
    expect(result3).not.toBe(result1);
  });

  it("should evaluate custom variables (var.*)", () => {
    const context = createTestContext();
    context.variables["hy"] = 45;
    const ast = parseExpression("var.hy");
    expect(evaluateAST(ast, context)).toBe(45);
  });

  it("should evaluate bone properties (bone.property)", () => {
    const context = createTestContext();
    context.boneValues["head"] = { rx: 0.5, ry: 0.3 };
    expect(evaluateAST(parseExpression("head.rx"), context)).toBe(0.5);
    expect(evaluateAST(parseExpression("head.ry"), context)).toBe(0.3);
  });

  it("should return 0 for unknown variables", () => {
    const context = createTestContext();
    expect(evaluateAST(parseExpression("unknown_var"), context)).toBe(0);
  });

  it("should handle division by zero", () => {
    const context = createTestContext();
    expect(evaluateAST(parseExpression("5 / 0"), context)).toBe(0);
  });
});

describe("Compile Expression", () => {
  it("should detect constant expressions", () => {
    const expr = compileExpression(42);
    expect(isConstantExpression(expr)).toBe(true);
    if (isConstantExpression(expr)) {
      expect(expr.value).toBe(42);
    }
  });

  it("should detect simple numeric strings as constants", () => {
    const expr = compileExpression("3.14");
    expect(isConstantExpression(expr)).toBe(true);
  });

  it("should compile variable expressions", () => {
    const expr = compileExpression("limb_swing");
    expect(isConstantExpression(expr)).toBe(false);
  });

  it("should evaluate compiled expressions", () => {
    const context = createTestContext({ limb_swing: 5 });
    const expr = compileExpression("limb_swing * 2");
    expect(evaluate(expr, context)).toBe(10);
  });
});

describe("Real CEM Expressions", () => {
  // Test expressions from Fresh Animations allay.jem
  it("should evaluate clamp(head_yaw,-90,90)", () => {
    const context = createTestContext({ head_yaw: 120 });
    const ast = parseExpression("clamp(head_yaw,-90,90)");
    expect(evaluateAST(ast, context)).toBe(90);
  });

  it("should evaluate random(id)*pi*4", () => {
    const context = createTestContext({ id: 1 });
    const ast = parseExpression("random(id)*pi*4");
    const result = evaluateAST(ast, context);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(Math.PI * 4);
  });

  it("should evaluate torad(head_pitch)/2", () => {
    const context = createTestContext({ head_pitch: 90 });
    const ast = parseExpression("torad(head_pitch)/2");
    expect(evaluateAST(ast, context)).toBeCloseTo(Math.PI / 4);
  });

  it("should evaluate sin(var.b)/20", () => {
    const context = createTestContext();
    context.variables["b"] = Math.PI / 2;
    const ast = parseExpression("sin(var.b)/20");
    expect(evaluateAST(ast, context)).toBeCloseTo(1 / 20);
  });

  it("should evaluate walking animation: sin(limb_swing)*limb_speed", () => {
    const context = createTestContext({
      limb_swing: Math.PI / 2,
      limb_speed: 0.5,
    });
    const ast = parseExpression("sin(limb_swing)*limb_speed");
    expect(evaluateAST(ast, context)).toBeCloseTo(0.5);
  });

  it("should evaluate hurt animation: -sin(hurt_time/2)*hurt_time/10", () => {
    const context = createTestContext({ hurt_time: 10 });
    const ast = parseExpression("-sin(hurt_time/2)*hurt_time/10");
    const result = evaluateAST(ast, context);
    expect(result).toBeCloseTo(-Math.sin(5));
  });

  it("should evaluate complex nested expression", () => {
    const context = createTestContext({
      is_aggressive: true,
      limb_speed: 0.5,
    });
    context.variables["aggroB"] = 0.5;

    const ast = parseExpression(
      "if(is_aggressive, min(20, var.aggroB + 0.1), max(0, var.aggroB - 0.1))"
    );
    const result = evaluateAST(ast, context);
    expect(result).toBeCloseTo(0.6);
  });
});

describe("AST to String", () => {
  it("should format simple expressions", () => {
    const ast = parseExpression("1 + 2");
    const str = astToString(ast);
    expect(str).toContain("BinaryOp(+)");
    expect(str).toContain("Literal(1)");
    expect(str).toContain("Literal(2)");
  });

  it("should format function calls", () => {
    const ast = parseExpression("sin(x)");
    const str = astToString(ast);
    expect(str).toContain("FunctionCall(sin)");
    expect(str).toContain("Variable(x)");
  });
});
