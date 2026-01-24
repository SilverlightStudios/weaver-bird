/**
 * Direction utilities for Minecraft expression compilation
 *
 * Handles direction-related operations like opposite directions,
 * step values, and direction property normalization.
 */

type Axis = "X" | "Y" | "Z";

export function oppositeDirection(dir: string): string | null {
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

export function directionStep(dir: string, axis: Axis): number | null {
  switch (dir) {
    case "north":
      return axis === "Z" ? 1 : 0;
    case "south":
      return axis === "Z" ? -1 : 0;
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

export function direction2DValue(dir: string): number | null {
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

export function normalizeDirectionPropertyKey(
  propName: string,
  blockProps?: Record<string, string>,
): string {
  const base = propName.split(".").pop() ?? propName;
  const key = base.toLowerCase();
  if (!blockProps) return key;
  if (key in blockProps) return key;
  if (key.endsWith("_facing") && "facing" in blockProps) return "facing";
  if (key.endsWith("_direction") && "facing" in blockProps) return "facing";
  return key;
}

export function replaceDirectionSteps(
  js: string,
  blockProps?: Record<string, string>,
): string | null {
  if (!/getStep[XYZ]\s*\(/.test(js)) return js;
  if (!blockProps) return null;

  let failed = false;

  const replaceStateSteps = (pattern: RegExp): void => {
    js = js.replace(
      pattern,
      (_m, propName: string, oppositeFlag: string | undefined, axis: Axis) => {
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
      },
    );
  };

  // Pattern 1: Extra nested parentheses (wall torches)
  // (($0.getValue(FACING)).getOpposite()).getStepX()
  replaceStateSteps(
    /\(\s*\(\s*[A-Za-z_$][A-Za-z0-9_$]*\.getValue\s*\(\s*([A-Za-z0-9_$.]+)\s*\)\s*\)\s*(\.getOpposite\s*\(\s*\))?\s*\)\s*\.getStep([XYZ])\s*\(\s*\)/g,
  );
  // Pattern 2: Single parentheses
  // ($0.getValue(FACING).getOpposite()).getStepX()
  replaceStateSteps(
    /\(\s*[A-Za-z_$][A-Za-z0-9_$]*\.getValue\s*\(\s*([A-Za-z0-9_$.]+)\s*\)\s*(\.getOpposite\s*\(\s*\))?\s*\)\s*\.getStep([XYZ])\s*\(\s*\)/g,
  );
  // Pattern 3: No parentheses
  // $0.getValue(FACING).getOpposite().getStepX()
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
