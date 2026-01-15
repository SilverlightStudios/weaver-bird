import type { AnimationLayer } from "./types";

export type AnimationTriggerId =
  | "trigger.interact"
  | "trigger.attack"
  | "trigger.hurt"
  | "trigger.death"
  | "trigger.horse_rearing"
  | "trigger.eat";

export function getAvailableAnimationTriggerIdsForAnimationLayers(
  animationLayers: AnimationLayer[] | undefined,
): AnimationTriggerId[] {
  if (!animationLayers || animationLayers.length === 0) {
    return ["trigger.hurt", "trigger.death", "trigger.attack"];
  }

  const keys = new Set<string>();
  const exprText: string[] = [];
  for (const layer of animationLayers) {
    for (const [k, v] of Object.entries(layer)) {
      keys.add(k);
      if (typeof v === "string") exprText.push(v);
    }
  }

  const allText = `${Array.from(keys).join("\n")}\n${exprText.join("\n")}`;
  const has = (needle: string) =>
    new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\b`).test(
      allText,
    );

  const triggers: AnimationTriggerId[] = [];

  if (has("swing_progress")) triggers.push("trigger.attack");
  if (has("hurt_time") || has("is_hurt")) triggers.push("trigger.hurt");
  if (has("death_time") || has("is_alive")) triggers.push("trigger.death");

  // Fresh Animations horse-family state overlays are inferred from `var.rearing`
  // and eating variables (driven by vanilla-input bones like `neck.ty` or `head.rx`).
  if (keys.has("var.rearing") || has("var.rearing"))
    triggers.push("trigger.horse_rearing");
  if (
    keys.has("var.eating") ||
    has("var.eating") ||
    keys.has("var.eat") ||
    has("var.eat") ||
    keys.has("var.Aeat") ||
    has("var.Aeat") ||
    // Fresh Animations chicken/sheep-family rigs often use NAeat/Neat naming.
    keys.has("var.NAeat") ||
    has("var.NAeat") ||
    keys.has("var.Neat") ||
    has("var.Neat") ||
    // Some packs gate eating via rule-index booleans.
    keys.has("varb.index_eat") ||
    has("varb.index_eat")
  )
    triggers.push("trigger.eat");

  return triggers;
}
