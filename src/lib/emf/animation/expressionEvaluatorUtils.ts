/**
 * Utility functions for expression evaluation
 */

/**
 * Evaluate arithmetic binary operations (+, -, *, /, %)
 */
export function evaluateArithmeticOp(
  operator: string,
  left: number,
  right: number,
): number | null {
  switch (operator) {
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
    default:
      return null;
  }
}

/**
 * Evaluate comparison binary operations (==, !=, <, >, <=, >=)
 */
export function evaluateComparisonOp(
  operator: string,
  left: number,
  right: number,
): number | null {
  switch (operator) {
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
      return null;
  }
}
