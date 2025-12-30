import type { EntityState } from "./types";

export type PoseToggleId =
  | "pose.aim_crossbow"
  | "pose.hold_axe_right"
  | "pose.hold_axe_left"
  | "pose.sneak";

export interface PoseToggleDefinition {
  id: PoseToggleId;
  name: string;
  description: string;
  /** If set, only one toggle in the same group can be enabled at a time. */
  exclusiveGroup?: string;
  /**
   * Optional entity-state overrides applied each frame while the toggle is enabled.
   * Useful for vanilla-driven toggles like `is_sneaking`.
   */
  entityStateOverrides?: (state: EntityState) => Partial<EntityState>;
  /**
   * Injects "vanilla input" bone values into `context.boneValues` before JPM
   * evaluation so packs that infer poses from arm rotations can react.
   *
   * Values are in radians for rotations, pixels for translations (CEM space).
   */
  boneInputs?: (state: EntityState) => Record<string, Record<string, number>>;
}

const degToRad = (deg: number) => (deg * Math.PI) / 180;

export const POSE_TOGGLES: PoseToggleDefinition[] = [
  {
    id: "pose.aim_crossbow",
    name: "Aim Crossbow",
    description:
      "Aims a crossbow on top of the current base animation (piglin-family style).",
    exclusiveGroup: "weapon",
    boneInputs: () => ({
      left_arm: { ry: degToRad(40) },
      right_arm: { ry: degToRad(-40) },
    }),
  },
  {
    id: "pose.hold_axe_right",
    name: "Hold Axe (Right)",
    description:
      "Sets a right-hand melee stance on top of the current base animation.",
    exclusiveGroup: "weapon",
    boneInputs: () => ({
      right_arm: { rx: degToRad(-90) },
    }),
  },
  {
    id: "pose.hold_axe_left",
    name: "Hold Axe (Left)",
    description:
      "Sets a left-hand melee stance on top of the current base animation.",
    exclusiveGroup: "weapon",
    boneInputs: () => ({
      left_arm: { rx: degToRad(-90) },
    }),
  },
  {
    id: "pose.sneak",
    name: "Sneak / Crouch",
    description:
      "Forces `is_sneaking=true` on top of the current base animation (some mobs use this for roll/curl states).",
    entityStateOverrides: () => ({
      is_sneaking: true,
    }),
  },
];

export function getPoseToggleDefinition(
  id: string | null | undefined,
): PoseToggleDefinition | null {
  if (!id) return null;
  return (POSE_TOGGLES.find((p) => p.id === id) ?? null) as
    | PoseToggleDefinition
    | null;
}
