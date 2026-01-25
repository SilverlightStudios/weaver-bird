/**
 * Self-Read Analysis for CEM Animation Expressions
 *
 * Analyzes animation expressions to determine which bone properties are
 * read vs written, enabling correct normalization and seeding of values.
 */

import type * as THREE from "three";
import type { AnimationLayer, ASTNode } from "./types";
import { compileExpression, isConstantExpression } from "./expressionParser";
import { parseBoneProperty } from "./boneController";

export interface SelfReadAnalysisResult {
  /** Translation channels that are read by expressions */
  reads: Map<string, Set<"tx" | "ty" | "tz">>;
  /** Translation channels that should be seeded with pivot values */
  pivotSeeds: Map<string, Set<"tx" | "ty" | "tz">>;
  /** Rotation channels that are read as inputs */
  rotationInputs: Map<string, Set<"rx" | "ry" | "rz">>;
  /** Tracks whether rotation reads are used in bone vs var targets */
  rotationInputUsage: Map<string, { bone: boolean; var: boolean }>;
  /** Rotation channels that are self-referenced (bone reads its own rotation) */
  selfRotationReads: Map<string, Set<"rx" | "ry" | "rz">>;
}

/**
 * Analyze animation layers to determine which bone properties are read vs written.
 * This information is used to correctly seed bone values and normalize transforms.
 */
export function collectSelfTranslationReadUsage(
  layers: ReadonlyArray<AnimationLayer>,
  modelGroup: THREE.Group,
  bones: Map<string, THREE.Object3D>,
  baseTransforms: Map<string, { position: THREE.Vector3; rotation: THREE.Euler; scale: THREE.Vector3 }>,
): SelfReadAnalysisResult {
  const reads = new Map<string, Set<"tx" | "ty" | "tz">>();
  const pivotSeeds = new Map<string, Set<"tx" | "ty" | "tz">>();
  const rotationInputs = new Map<string, Set<"rx" | "ry" | "rz">>();
  const rotationInputUsage = new Map<string, { bone: boolean; var: boolean }>();
  const selfRotationReads = new Map<string, Set<"rx" | "ry" | "rz">>();

  for (const layer of layers) {
    for (const [propertyPath, exprSource] of Object.entries(layer)) {
      const parsedProp = parseBoneProperty(propertyPath);
      if (!parsedProp) continue;
      const targetBone = parsedProp.target;
      const targetIsBone =
        targetBone !== "var" &&
        targetBone !== "render" &&
        targetBone !== "varb";

      try {
        const parsed = compileExpression(exprSource);
        if (isConstantExpression(parsed)) continue;

        const getTranslationVar = (
          node: ASTNode,
        ): { bone: string; prop: "tx" | "ty" | "tz" } | null => {
          if (node.type !== "Variable") return null;
          const { name } = node;
          const dot = name.indexOf(".");
          if (dot === -1) return null;
          const bone = name.slice(0, dot);
          if (bone === "var" || bone === "render" || bone === "varb") return null;
          const prop = name.slice(dot + 1) as "tx" | "ty" | "tz";
          if (prop !== "tx" && prop !== "ty" && prop !== "tz") return null;
          return { bone, prop };
        };

        const getRotationVar = (
          node: ASTNode,
        ): { bone: string; prop: "rx" | "ry" | "rz" } | null => {
          if (node.type !== "Variable") return null;
          const { name } = node;
          const dot = name.indexOf(".");
          if (dot === -1) return null;
          const bone = name.slice(0, dot);
          const prop = name.slice(dot + 1) as "rx" | "ry" | "rz";
          if (bone === "var" || bone === "render" || bone === "varb") return null;
          return prop === "rx" || prop === "ry" || prop === "rz" ? { bone, prop } : null;
        };

        const markRead = (boneName: string, prop: "tx" | "ty" | "tz") => {
          const set = reads.get(boneName) ?? new Set<"tx" | "ty" | "tz">();
          set.add(prop);
          reads.set(boneName, set);
        };

        const markPivot = (boneName: string, prop: "tx" | "ty" | "tz") => {
          const set = pivotSeeds.get(boneName) ?? new Set<"tx" | "ty" | "tz">();
          set.add(prop);
          pivotSeeds.set(boneName, set);
        };

        const markRotationInput = (bone: string, prop: "rx" | "ry" | "rz") => {
          const set = rotationInputs.get(bone) ?? new Set<"rx" | "ry" | "rz">();
          set.add(prop);
          rotationInputs.set(bone, set);
        };

        const markRotationInputUsage = (bone: string, isBoneTarget: boolean) => {
          const usage = rotationInputUsage.get(bone) ?? { bone: false, var: false };
          if (isBoneTarget) {
            usage.bone = true;
          } else {
            usage.var = true;
          }
          rotationInputUsage.set(bone, usage);
        };

        const markSelfRotationRead = (prop: "rx" | "ry" | "rz") => {
          const set = selfRotationReads.get(targetBone) ?? new Set<"rx" | "ry" | "rz">();
          set.add(prop);
          selfRotationReads.set(targetBone, set);
        };

        const containsTranslationVar = (
          node: ASTNode,
          boneName: string,
          prop: "tx" | "ty" | "tz",
        ): boolean => {
          let found = false;
          const visit = (n: ASTNode): void => {
            if (found) return;
            switch (n.type) {
              case "Variable":
                found = n.name === `${boneName}.${prop}`;
                return;
              case "UnaryOp":
                visit(n.operand);
                return;
              case "BinaryOp":
                visit(n.left);
                visit(n.right);
                return;
              case "FunctionCall":
                for (const arg of n.args) visit(arg);
                return;
              case "Ternary":
                visit(n.condition);
                visit(n.consequent);
                visit(n.alternate);
                return;
              default:
                return;
            }
          };
          visit(node);
          return found;
        };

        const handleVariableNode = (node: ASTNode) => {
          const tv = getTranslationVar(node);
          if (tv) markRead(tv.bone, tv.prop);

          const rot = getRotationVar(node);
          if (rot) {
            markRotationInput(rot.bone, rot.prop);
            markRotationInputUsage(rot.bone, targetIsBone);
            if (targetIsBone && rot.bone === targetBone) {
              markSelfRotationRead(rot.prop);
            }
          }
        };

        const handleBinaryOpNode = (node: ASTNode, visit: (n: ASTNode) => void) => {
          if (node.type !== "BinaryOp") return;

          if (node.operator === "+" || node.operator === "-") {
            const leftVar = getTranslationVar(node.left);
            const rightVar = getTranslationVar(node.right);

            const literalValue =
              node.left.type === "Literal"
                ? node.left.value
                : node.right.type === "Literal"
                  ? node.right.value
                  : null;
            const tv = leftVar ?? rightVar;

            if (tv && typeof literalValue === "number" && Math.abs(literalValue) >= 3) {
              markPivot(tv.bone, tv.prop);
            }
          }

          visit(node.left);
          visit(node.right);
        };

        const shouldTreatAsPivotLiteral = (
          literalValue: number,
          prop: "tx" | "ty" | "tz",
        ): boolean => {
          if (Math.abs(literalValue) >= 10) return true;

          if (prop === "ty") {
            const isRootBone = bones.get(targetBone)?.parent === modelGroup;
            const userData = (bones.get(targetBone) as { userData?: Record<string, unknown> } | undefined)?.userData ?? {};
            const invertAxis =
              typeof userData.invertAxis === "string" ? userData.invertAxis : "";
            const basePos = baseTransforms.get(targetBone)?.position;
            const localPxY = (basePos?.y ?? 0) * 16;
            const expectedRotationPointY = invertAxis.includes("y") ? 24 - localPxY : localPxY + 24;
            const isExpectedRotationPointY = isRootBone && Math.abs(expectedRotationPointY) >= 3;

            if (isExpectedRotationPointY) {
              return Math.abs(literalValue - expectedRotationPointY) <= 2;
            }
          }

          return false;
        };

        const handleIfFunctionCall = (args: ASTNode[]) => {
          if (args.length < 3) return;

          const consequent = args[1];
          const alternate = args[2];

          for (const prop of ["tx", "ty", "tz"] as const) {
            const consequentLiteral = consequent.type === "Literal" ? consequent.value : null;
            const alternateLiteral = alternate.type === "Literal" ? alternate.value : null;

            if (
              typeof consequentLiteral === "number" &&
              shouldTreatAsPivotLiteral(consequentLiteral, prop) &&
              containsTranslationVar(alternate, targetBone, prop)
            ) {
              markPivot(targetBone, prop);
            }

            if (
              typeof alternateLiteral === "number" &&
              shouldTreatAsPivotLiteral(alternateLiteral, prop) &&
              containsTranslationVar(consequent, targetBone, prop)
            ) {
              markPivot(targetBone, prop);
            }
          }
        };

        const visitWithTarget = (node: ASTNode): void => {
          switch (node.type) {
            case "Literal":
              return;

            case "Variable":
              handleVariableNode(node);
              return;

            case "UnaryOp":
              visitWithTarget(node.operand);
              return;

            case "BinaryOp":
              handleBinaryOpNode(node, visitWithTarget);
              return;

            case "FunctionCall":
              if (node.name === "if") {
                handleIfFunctionCall(node.args);
              }
              for (const arg of node.args) visitWithTarget(arg);
              return;

            case "Ternary":
              visitWithTarget(node.condition);
              visitWithTarget(node.consequent);
              visitWithTarget(node.alternate);
              return;

            default:
              return;
          }
        };

        visitWithTarget(parsed.ast);
      } catch {
        // Ignore parse errors; compilation will surface them later.
      }
    }
  }

  return {
    reads,
    pivotSeeds,
    rotationInputs,
    rotationInputUsage,
    selfRotationReads,
  };
}
