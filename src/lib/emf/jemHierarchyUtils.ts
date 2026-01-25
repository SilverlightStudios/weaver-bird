import * as THREE from "three";

/**
 * Utility functions for JEM hierarchy detection and building
 */

/**
 * Entity type detection results
 */
export interface EntityTypeInfo {
  hasBody: boolean;
  hasHumanoidLimbs: boolean;
  hasArmsOnly: boolean;
  hasVillagerLimbs: boolean;
  isQuadruped: boolean;
}

/**
 * Check if an object has mesh descendants
 */
export function hasMeshDescendant(obj: THREE.Object3D): boolean {
  let hasMesh = false;
  obj.traverse((child) => {
    if (child !== obj && child instanceof THREE.Mesh) hasMesh = true;
  });
  return hasMesh;
}

/**
 * Check if entity has standard humanoid limbs
 */
function hasHumanoidLimbs(rootGroups: Record<string, THREE.Group>): boolean {
  const hasArms = !!rootGroups.left_arm && !!rootGroups.right_arm;
  const hasLegs = !!rootGroups.left_leg && !!rootGroups.right_leg;
  const hasShoes = !!rootGroups.left_shoe && !!rootGroups.right_shoe;
  return hasArms && (hasLegs || hasShoes);
}

/**
 * Check if entity has arms only (allay, vex)
 */
function hasArmsOnly(rootGroups: Record<string, THREE.Group>): boolean {
  const hasArms = !!rootGroups.left_arm && !!rootGroups.right_arm;
  const hasLegs = !!rootGroups.left_leg && !!rootGroups.right_leg;
  const hasShoes = !!rootGroups.left_shoe && !!rootGroups.right_shoe;
  return hasArms && !hasLegs && !hasShoes;
}

/**
 * Check if entity has villager-style limbs
 */
function hasVillagerLimbs(rootGroups: Record<string, THREE.Group>): boolean {
  const hasVillagerArms = !!rootGroups.arms;
  const hasVillagerLegs = !!rootGroups.left_leg && !!rootGroups.right_leg;
  return hasVillagerArms && hasVillagerLegs;
}

/**
 * Check if entity is a quadruped
 */
function isQuadruped(rootGroups: Record<string, THREE.Group>): boolean {
  const hasQuadrupedLegs =
    !!rootGroups.leg1 &&
    !!rootGroups.leg2 &&
    !!rootGroups.leg3 &&
    !!rootGroups.leg4;
  const hasDirectionalLegs =
    !!rootGroups.front_left_leg &&
    !!rootGroups.front_right_leg &&
    !!rootGroups.back_left_leg &&
    !!rootGroups.back_right_leg;
  return hasQuadrupedLegs || hasDirectionalLegs;
}

/**
 * Detect entity type from bone structure
 */
export function detectEntityType(
  rootGroups: Record<string, THREE.Group>,
): EntityTypeInfo {
  return {
    hasBody: !!rootGroups.body,
    hasHumanoidLimbs: hasHumanoidLimbs(rootGroups),
    hasArmsOnly: hasArmsOnly(rootGroups),
    hasVillagerLimbs: hasVillagerLimbs(rootGroups),
    isQuadruped: isQuadruped(rootGroups),
  };
}

/**
 * Build parent map for humanoid limbs (player, zombie, skeleton, etc.)
 */
export function buildHumanoidParentMap(
  rootGroups: Record<string, THREE.Group>,
): Record<string, string> {
  return {
    ...(rootGroups.headwear ? { headwear: "head" } : {}),
    jacket: "body",
    left_ear: "head",
    right_ear: "head",
    left_sleeve: "left_arm",
    right_sleeve: "right_arm",
    left_pants: "left_leg",
    right_pants: "right_leg",
  };
}

/**
 * Build parent map for arms-only entities (allay, vex)
 */
export function buildArmsOnlyParentMap(
  _rootGroups: Record<string, THREE.Group>,
): Record<string, string> {
  return {
    left_arm: "body",
    right_arm: "body",
  };
}

/**
 * Build parent map for villager-style entities
 */
export function buildVillagerParentMap(
  rootGroups: Record<string, THREE.Group>,
): Record<string, string> {
  return {
    ...(rootGroups.headwear ? { headwear: "head" } : {}),
    ...(rootGroups.nose ? { nose: "head" } : {}),
  };
}

/**
 * Build parent map for quadruped entities (cow, sheep, pig, horse, etc.)
 */
export function buildQuadrupedParentMap(): Record<string, string> {
  return {
    saddle: "body",
  };
}

/**
 * Swap villager head and headwear if needed (head is empty, headwear has mesh)
 */
export function normalizeVillagerHead(
  rootGroups: Record<string, THREE.Group>,
): void {
  if (!rootGroups.head || !rootGroups.headwear) return;

  const { head } = rootGroups;
  const { headwear } = rootGroups;

  if (!hasMeshDescendant(head) && hasMeshDescendant(headwear)) {
    let pivotName = "head_pivot";
    while (rootGroups[pivotName]) pivotName = `${pivotName}_`;

    head.name = pivotName;
    rootGroups[pivotName] = head;
    delete rootGroups.head;

    headwear.name = "head";
    rootGroups.head = headwear;
    delete rootGroups.headwear;
  }
}

/**
 * Build parent map from extracted hierarchy data
 */
export function buildExtractedParentMap(
  extractedHierarchy: Record<string, string | null>,
  rootGroups: Record<string, THREE.Group>,
): Record<string, string> {
  const parentMap: Record<string, string> = {};
  for (const [bone, parent] of Object.entries(extractedHierarchy)) {
    if (parent !== null && rootGroups[bone] && rootGroups[parent]) {
      parentMap[bone] = parent;
    }
  }
  return parentMap;
}
