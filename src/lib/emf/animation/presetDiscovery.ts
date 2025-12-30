import type { ASTNode, EntityState } from "./types";
import { DEFAULT_ENTITY_STATE, type AnimationLayer } from "./types";
import { compileExpression, isConstantExpression } from "./expressionParser";
import { ANIMATION_PRESETS } from "./entityState";

const ENTITY_STATE_KEYS = new Set(Object.keys(DEFAULT_ENTITY_STATE));

function collectEntityStateKeysFromAst(
  node: ASTNode,
  out: Set<keyof EntityState>,
): void {
  switch (node.type) {
    case "Literal":
      return;

    case "Variable": {
      if (!node.name.includes(".") && ENTITY_STATE_KEYS.has(node.name)) {
        out.add(node.name as keyof EntityState);
      }
      return;
    }

    case "UnaryOp":
      collectEntityStateKeysFromAst(node.operand, out);
      return;

    case "BinaryOp":
      collectEntityStateKeysFromAst(node.left, out);
      collectEntityStateKeysFromAst(node.right, out);
      return;

    case "FunctionCall":
      for (const arg of node.args) {
        collectEntityStateKeysFromAst(arg, out);
      }
      return;

    case "Ternary":
      collectEntityStateKeysFromAst(node.condition, out);
      collectEntityStateKeysFromAst(node.consequent, out);
      collectEntityStateKeysFromAst(node.alternate, out);
      return;

    default:
      return;
  }
}

export function getUsedEntityStateKeysFromAnimationLayers(
  layers: ReadonlyArray<AnimationLayer>,
): Set<keyof EntityState> {
  const used = new Set<keyof EntityState>();

  for (const layer of layers) {
    for (const exprSource of Object.values(layer)) {
      try {
        const parsed = compileExpression(exprSource);
        if (isConstantExpression(parsed)) continue;
        collectEntityStateKeysFromAst(parsed.ast, used);
      } catch {
        // Ignore parse errors; they will be surfaced by the engine compiler.
      }
    }
  }

  return used;
}

/**
 * Returns a list of preset IDs that are likely relevant for the current model's
 * CEM animation expressions. Returns null when no CEM animations are present.
 */
export function getAvailableAnimationPresetIdsForAnimationLayers(
  layers: ReadonlyArray<AnimationLayer> | undefined,
): string[] | null {
  if (!layers || layers.length === 0) return null;

  const used = getUsedEntityStateKeysFromAnimationLayers(layers);
  const available = new Set<string>(["idle"]);

  if (used.has("limb_swing") || used.has("limb_speed")) {
    available.add("walking");
    // Many CEM packs infer running from limb_speed thresholds rather than
    // `is_sprinting`, so expose sprinting when movement vars are used.
    available.add("sprinting");
  }

  if (used.has("is_sprinting")) available.add("sprinting");

  if (used.has("swing_progress") || used.has("is_aggressive")) {
    available.add("attacking");
  }

  if (used.has("hurt_time") || used.has("is_hurt")) {
    available.add("hurt");
  }

  if (used.has("death_time")) {
    available.add("dying");
  }

  if (used.has("is_in_water") || used.has("is_wet")) {
    available.add("swimming");
  }

  if (used.has("is_sneaking")) {
    available.add("sneaking");
  }

  if (used.has("is_sitting")) {
    available.add("sitting");
  }

  if (used.has("is_riding") || used.has("is_ridden")) {
    available.add("riding");
  }

  if (used.has("anger_time") || used.has("anger_time_start")) {
    available.add("angry");
  }

  if (used.has("is_child")) {
    available.add("baby");
  }

  return ANIMATION_PRESETS.filter((preset) => available.has(preset.id)).map(
    (preset) => preset.id,
  );
}
