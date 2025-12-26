import type { AnimationTriggerId } from "./triggerDiscovery";

export interface AnimationTriggerDefinition {
  id: AnimationTriggerId;
  name: string;
  description: string;
  durationSec: number;
}

export const ANIMATION_TRIGGERS: AnimationTriggerDefinition[] = [
  {
    id: "trigger.attack",
    name: "Attack",
    description: "Plays a one-shot swing/attack overlay (swing_progress).",
    durationSec: 0.5,
  },
  {
    id: "trigger.hurt",
    name: "Hurt",
    description: "Plays a one-shot hurt overlay (hurt_time).",
    durationSec: 0.5,
  },
  {
    id: "trigger.death",
    name: "Death",
    description: "Plays a one-shot death overlay (death_time).",
    durationSec: 1.0,
  },
  {
    id: "trigger.horse_rearing",
    name: "Rear",
    description:
      "Horse-family rearing overlay (driven by the vanilla `neck.ty` input).",
    durationSec: 1.0,
  },
  {
    id: "trigger.eat",
    name: "Eat",
    description:
      "Eating/grazing overlay (driven by vanilla-input bones like `neck.ty` or `head.rx`).",
    durationSec: 1.2,
  },
];

export function getTriggerDefinition(
  id: string | null | undefined,
): AnimationTriggerDefinition | null {
  if (!id) return null;
  return (
    ANIMATION_TRIGGERS.find((t) => t.id === id) ?? null
  );
}
