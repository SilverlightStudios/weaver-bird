import type { AnimationLayer } from "./types";

export type AnimationTriggerId =
  | "trigger.interact"
  | "trigger.attack"
  | "trigger.hurt"
  | "trigger.death"
  | "trigger.horse_rearing"
  | "trigger.eat";

function hasKeyOrInText(keys: Set<string>, text: string, needle: string): boolean {
  if (keys.has(needle)) return true;
  const regex = new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\b`);
  return regex.test(text);
}

function detectEatingVariable(keys: Set<string>, allText: string): boolean {
  const eatingVariants = [
    "var.eating",
    "var.eat",
    "var.Aeat",
    "var.NAeat",
    "var.Neat",
    "varb.index_eat",
  ];

  return eatingVariants.some((variant) => hasKeyOrInText(keys, allText, variant));
}

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
  const has = (needle: string) => hasKeyOrInText(keys, allText, needle);

  const triggers: AnimationTriggerId[] = [];

  if (has("swing_progress")) triggers.push("trigger.attack");
  if (has("hurt_time") || has("is_hurt")) triggers.push("trigger.hurt");
  if (has("death_time") || has("is_alive")) triggers.push("trigger.death");
  if (has("var.rearing")) triggers.push("trigger.horse_rearing");
  if (detectEatingVariable(keys, allText)) triggers.push("trigger.eat");

  return triggers;
}
