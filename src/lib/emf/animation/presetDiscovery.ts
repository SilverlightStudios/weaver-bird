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

// Map entity state keys to animation preset IDs
const STATE_KEY_TO_PRESET: Array<{
  keys: (keyof EntityState)[];
  preset: string;
}> = [
  { keys: ["limb_swing", "limb_speed"], preset: "walking" },
  { keys: ["limb_swing", "limb_speed"], preset: "sprinting" }, // Inferred from limb_speed thresholds
  { keys: ["is_sprinting"], preset: "sprinting" },
  { keys: ["swing_progress", "is_aggressive"], preset: "attacking" },
  { keys: ["hurt_time", "is_hurt"], preset: "hurt" },
  { keys: ["death_time"], preset: "dying" },
  { keys: ["is_in_water", "is_wet"], preset: "swimming" },
  { keys: ["is_sneaking"], preset: "sneaking" },
  { keys: ["is_sitting"], preset: "sitting" },
  { keys: ["is_riding", "is_ridden"], preset: "riding" },
  { keys: ["anger_time", "anger_time_start"], preset: "angry" },
  { keys: ["is_child"], preset: "baby" },
];

// Helper function to determine available presets based on used state keys
function determineAvailablePresets(used: Set<keyof EntityState>): Set<string> {
  const available = new Set<string>(["idle"]);

  for (const mapping of STATE_KEY_TO_PRESET) {
    if (mapping.keys.some((key) => used.has(key))) {
      available.add(mapping.preset);
    }
  }

  return available;
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
  const available = determineAvailablePresets(used);

  return ANIMATION_PRESETS.filter((preset) => available.has(preset.id)).map(
    (preset) => preset.id,
  );
}
