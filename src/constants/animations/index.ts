/**
 * Vanilla Minecraft Animations
 *
 * This module provides access to vanilla Minecraft animations extracted from the JAR.
 * These animations are used as fallbacks when resource packs don't provide custom animations.
 *
 * PRIORITY ORDER:
 * 1. Resource pack animations (e.g., Fresh Animations) - loaded from JEM/JPM files
 * 2. Vanilla extracted animations (this module) - extracted from Minecraft's Java code
 * 3. No animation (static pose)
 *
 * USAGE:
 * ```typescript
 * import { getVanillaAnimations } from '@constants/animations';
 *
 * const bellAnims = getVanillaAnimations('bell');
 * if (bellAnims?.ring) {
 *   // Animation exists
 *   const { trigger, duration, looping, parts } = bellAnims.ring;
 * }
 * ```
 */

import { VANILLA_ANIMATIONS } from './generated';

export type { BellAnimationName } from './generated/bell';
export type { ChestAnimationName } from './generated/chest';
export type { ShulkerBoxAnimationName } from './generated/shulker_box';

/**
 * Animation keyframe (JPM-compatible)
 */
export interface AnimationKeyframe {
  time: number;
  value: number;
  interpolation: string;
}

/**
 * Part animation with keyframes for rotation/position
 */
export interface PartAnimation {
  rotationX?: AnimationKeyframe[];
  rotationY?: AnimationKeyframe[];
  rotationZ?: AnimationKeyframe[];
  positionX?: AnimationKeyframe[];
  positionY?: AnimationKeyframe[];
  positionZ?: AnimationKeyframe[];
}

/**
 * Animation trigger type
 */
export type AnimationTrigger =
  | 'always' // Continuous loop (idle, walk, etc.)
  | 'interact' // Plays when player interacts
  | 'redstone' // Plays when redstone powered
  | 'damage' // Plays when entity takes damage
  | 'walk' // Plays when entity moves
  | string; // Custom trigger

/**
 * Single animation definition
 */
export interface VanillaAnimation {
  trigger: AnimationTrigger;
  duration: number; // Duration in game ticks (20 ticks = 1 second)
  looping: boolean;
  parts: Record<string, PartAnimation>;
}

/**
 * All animations for an entity
 */
export type EntityAnimations = Record<string, VanillaAnimation>;

/**
 * Get vanilla animations for an entity
 *
 * @param entityId - Entity ID (e.g., "bell", "chest", "zombie")
 * @returns Animations for the entity, or undefined if no animations exist
 *
 * @example
 * ```typescript
 * const bellAnims = getVanillaAnimations('bell');
 * if (bellAnims?.ring) {
 *   playAnimation(bellAnims.ring);
 * }
 * ```
 */
export function getVanillaAnimations(entityId: string): EntityAnimations | undefined {
  const animations = VANILLA_ANIMATIONS[entityId as keyof typeof VANILLA_ANIMATIONS];
  return animations as unknown as EntityAnimations | undefined;
}

/**
 * Get a specific animation for an entity
 *
 * @param entityId - Entity ID (e.g., "bell", "chest")
 * @param animationName - Animation name (e.g., "ring", "open")
 * @returns The animation, or undefined if not found
 *
 * @example
 * ```typescript
 * const ringAnim = getVanillaAnimation('bell', 'ring');
 * if (ringAnim) {
 *   playAnimation(ringAnim);
 * }
 * ```
 */
export function getVanillaAnimation(
  entityId: string,
  animationName: string,
): VanillaAnimation | undefined {
  const animations = getVanillaAnimations(entityId);
  return animations?.[animationName];
}

/**
 * Get all available animation names for an entity
 *
 * @param entityId - Entity ID
 * @returns Array of animation names
 *
 * @example
 * ```typescript
 * const animNames = getVanillaAnimationNames('bell');
 * // Returns: ['ring']
 * ```
 */
export function getVanillaAnimationNames(entityId: string): string[] {
  const animations = getVanillaAnimations(entityId);
  return animations ? Object.keys(animations) : [];
}

/**
 * Check if an entity has vanilla animations
 *
 * @param entityId - Entity ID
 * @returns True if entity has vanilla animations
 */
export function hasVanillaAnimations(entityId: string): boolean {
  return entityId in VANILLA_ANIMATIONS;
}

/**
 * Get all entity IDs that have vanilla animations
 *
 * @returns Array of entity IDs
 */
export function getVanillaAnimatedEntities(): string[] {
  return Object.keys(VANILLA_ANIMATIONS);
}

// Re-export VANILLA_ANIMATIONS for advanced usage
export { VANILLA_ANIMATIONS };

/**
 * Get the trigger type for a vanilla animation
 *
 * @param entityId - Entity ID (e.g., "bell", "chest")
 * @returns The trigger type, or undefined if not found
 *
 * @example
 * ```typescript
 * const trigger = getVanillaAnimationTrigger('bell');
 * // Returns: 'interact'
 * ```
 */
export function getVanillaAnimationTrigger(entityId: string): AnimationTrigger | undefined {
  // Static mapping of entity IDs to triggers
  // This is populated from the generated trigger exports
  const triggers: Record<string, AnimationTrigger> = {
    bell: 'interact',
    chest: 'interact',
    bannerflag: 'interact',
    skull: 'always',
    dragonhead: 'always',
    piglinhead: 'always',
    armorstand: 'always',
    armorstandarmor: 'always',
    endcrystal: 'always',
    windcharge: 'always',
    shulkerbullet: 'always',
    arrow: 'always',
    book: 'always',
    elytra: 'always',
    coppergolemstatue: 'always',
  };
  return triggers[entityId];
}
