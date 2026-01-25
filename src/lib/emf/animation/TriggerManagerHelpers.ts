import type { EntityState } from "./types";

interface RootOverlay {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
}

/**
 * Update entity state time counters
 */
export function updateTimeCounters(
  entityState: EntityState,
  dtTicks: number,
  animationDurationTicks: number,
): void {
  if (entityState.hurt_time > 0) {
    entityState.hurt_time = Math.max(0, entityState.hurt_time - dtTicks);
    entityState.is_hurt = entityState.hurt_time > 0;
  }
  if (entityState.death_time > 0) {
    entityState.death_time = Math.max(0, entityState.death_time - dtTicks);
  }
  // Interaction ticks count UP (not down) for proper dampening
  if (entityState.ticks > 0 && entityState.ticks < animationDurationTicks) {
    entityState.ticks += dtTicks;
  } else if (entityState.ticks >= animationDurationTicks) {
    entityState.ticks = 0; // Reset after animation completes
  }
}

/**
 * Apply attack trigger effects
 */
export function applyAttackTrigger(t: number, entityState: EntityState): void {
  const swing = Math.sin(Math.PI * t);
  entityState.swing_progress = swing;
}

/**
 * Apply hurt trigger effects
 */
export function applyHurtTrigger(t: number, rootOverlay: RootOverlay): void {
  const envelope = Math.sin(Math.PI * t);
  rootOverlay.y += 0.06 * envelope;
}

/**
 * Apply death trigger effects
 */
export function applyDeathTrigger(t: number, rootOverlay: RootOverlay): void {
  const envelope = Math.sin((Math.PI / 2) * t);
  rootOverlay.x += 0.12 * envelope;
  rootOverlay.y += 0.02 * envelope;
  rootOverlay.rz += 1.1 * envelope;
}

/**
 * Apply horse rearing trigger effects
 */
export function applyHorseRearingTrigger(
  t: number,
  boneInputOverrides: Record<string, Record<string, number>>,
): void {
  const envelope = Math.sin(Math.PI * t);
  const neutral = 4;
  const target = -4;
  const value = neutral + (target - neutral) * envelope;
  boneInputOverrides.neck ??= {};
  boneInputOverrides.neck.ty = value;
}

/**
 * Apply eat trigger effects
 */
export function applyEatTrigger(
  t: number,
  entityState: EntityState,
  boneInputOverrides: Record<string, Record<string, number>>,
  expressionChecker: (needle: string) => boolean,
): void {
  const envelope = Math.sin(Math.PI * t);

  // Horse-family: driven by `neck.ty` input and `var.eating`
  if (expressionChecker("neck.ty")) {
    const neutral = 4;
    const target = 11;
    const value = neutral + (target - neutral) * envelope;
    boneInputOverrides.neck ??= {};
    boneInputOverrides.neck.ty = value;
  }

  // Sheep/cow-family: driven by placeholder `head.rx`
  if (expressionChecker("head.rx")) {
    const headPitchRad = (entityState.head_pitch * Math.PI) / 180;
    const value = headPitchRad + 1.2 * envelope;
    boneInputOverrides.head ??= {};
    boneInputOverrides.head.rx = value;
  }
}
