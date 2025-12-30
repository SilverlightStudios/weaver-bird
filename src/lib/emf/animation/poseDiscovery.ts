import type { AnimationLayer } from "./types";
import type { PoseToggleId } from "./poses";

export function getAvailablePoseToggleIdsForAnimationLayers(
  animationLayers: AnimationLayer[] | undefined,
): PoseToggleId[] | null {
  if (!animationLayers || animationLayers.length === 0) return null;

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

  const available: PoseToggleId[] = [];

  // Piglin-family packs often infer crossbow/melee stances from arm pose values
  // (e.g. `var.crossbow`, `var.melee_r`, `var.melee_l`) rather than entity booleans.
  if (keys.has("var.crossbow") || has("var.crossbow")) available.push("pose.aim_crossbow");
  if (keys.has("var.melee_r") || has("var.melee_r")) available.push("pose.hold_axe_right");
  if (keys.has("var.melee_l") || has("var.melee_l")) available.push("pose.hold_axe_left");

  // Some mobs (including newer ones like armadillo) drive alternative poses via vanilla booleans.
  if (has("is_sneaking")) available.push("pose.sneak");

  return available.length > 0 ? available : null;
}
