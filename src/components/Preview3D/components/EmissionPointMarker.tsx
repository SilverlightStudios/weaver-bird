import { useMemo } from "react";
import type { ParticleEmission } from "@constants/particles";

/**
 * Get direction offset for a facing direction
 * Returns the step value for the given axis
 */
function getDirectionStep(facing: string, axis: "x" | "y" | "z"): number {
  const steps: Record<string, { x: number; y: number; z: number }> = {
    north: { x: 0, y: 0, z: -1 },
    south: { x: 0, y: 0, z: 1 },
    west: { x: -1, y: 0, z: 0 },
    east: { x: 1, y: 0, z: 0 },
    up: { x: 0, y: 1, z: 0 },
    down: { x: 0, y: -1, z: 0 },
  };
  return steps[facing]?.[axis] ?? 0;
}

/**
 * Get opposite facing direction
 */
function getOppositeFacing(facing: string): string {
  const opposites: Record<string, string> = {
    north: "south",
    south: "north",
    west: "east",
    east: "west",
    up: "down",
    down: "up",
  };
  return opposites[facing] ?? facing;
}

/**
 * Evaluate a position expression to get a numeric value
 * Handles simple expressions like "0.5", "random()", "pos.getX() + 0.5"
 * Also handles Minecraft facing-based expressions for wall torches:
 *   "$0.getValue(FACING).getOpposite().getStepX()"
 */
function evaluatePositionExpr(
  expr: string | undefined,
  axis: "x" | "y" | "z",
  blockProps: Record<string, string>,
): number {
  if (!expr) {
    // Default positions: center of block
    return axis === "y" ? 0.5 : 0.5;
  }

  // Handle simple numeric values
  const numValue = parseFloat(expr);
  if (!isNaN(numValue) && isFinite(numValue)) {
    return numValue;
  }

  try {
    // Process the expression to make it evaluatable
    let processed = expr;

    // Handle FACING property references (e.g., wall torches)
    // Pattern: ($0.getValue(FACING)).getOpposite().getStepX()
    // or: ($0.getValue(FACING)).getStepZ()
    const facingPattern = /\(\$0\.getValue\(FACING\)\)(\.getOpposite\(\))?\.(getStep[XYZ])\(\)/g;
    processed = processed.replace(facingPattern, (_match, opposite, stepMethod) => {
      const facing = blockProps.facing || "north";
      const actualFacing = opposite ? getOppositeFacing(facing) : facing;
      const stepAxis = stepMethod.slice(7).toLowerCase() as "x" | "y" | "z"; // getStepX -> x
      const step = getDirectionStep(actualFacing, stepAxis);
      return step.toString();
    });

    // Now continue with the standard processing
    processed = processed
      // Remove type casts
      .replace(/\((?:double|float|int|long)\)\s*/g, "")
      // Replace BlockPos getters with 0 (block center in our coordinate system)
      .replace(/[A-Za-z_$][A-Za-z0-9_$]*\.get[XYZ]\(\)/g, "0")
      // Replace random calls with 0.5 (expected center)
      .replace(/[A-Za-z_$][A-Za-z0-9_$]*\.(?:nextFloat|nextDouble)\(\)/g, "0.5")
      .replace(/Math\.random\(\)/g, "0.5")
      // Remove float/double suffixes
      .replace(/(\d+(?:\.\d+)?)[dDfF]\b/g, "$1")
      .trim();

    // Validate that only numeric expressions remain
    if (!/^[0-9+\-*/().\s]+$/.test(processed)) {
      // Expression contains non-numeric characters, can't evaluate
      return 0.5;
    }

    // Evaluate the expression

    const result = new Function(`"use strict"; return (${processed});`)() as number;

    if (typeof result === "number" && isFinite(result)) {
      return result;
    }
  } catch {
    // Evaluation failed, fall through to default
  }

  // Default to block center
  return 0.5;
}

export interface EmissionPointMarkerProps {
  emission: ParticleEmission;
  blockProps: Record<string, string>;
  color: string;
}

/**
 * EmissionPointMarker - Visual marker for particle emission points
 */
export function EmissionPointMarker({
  emission,
  blockProps,
  color,
}: EmissionPointMarkerProps): JSX.Element {
  const position = useMemo(() => {
    const [xExpr, yExpr, zExpr] = emission.positionExpr ?? [
      undefined,
      undefined,
      undefined,
    ];
    return [
      evaluatePositionExpr(xExpr, "x", blockProps),
      evaluatePositionExpr(yExpr, "y", blockProps),
      evaluatePositionExpr(zExpr, "z", blockProps),
    ] as [number, number, number];
  }, [emission.positionExpr, blockProps]);

  return (
    <group position={position}>
      {/* Outer glow sphere */}
      <mesh>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </mesh>
      {/* Inner solid sphere */}
      <mesh>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}
