import type * as THREE from "three";
import { VANILLA_HIERARCHIES } from "@constants/animations/generated";
import {
  detectEntityType,
  buildHumanoidParentMap,
  buildArmsOnlyParentMap,
  buildVillagerParentMap,
  buildQuadrupedParentMap,
  normalizeVillagerHead,
  buildExtractedParentMap,
} from "./jemHierarchyUtils";

/**
 * Apply a parent map to reparent bones while preserving world transforms.
 * Used by both extracted hierarchies and heuristic-based hierarchies.
 */
export function applyParentMap(
  root: THREE.Group,
  rootGroups: Record<string, THREE.Group>,
  parentMap: Record<string, string>,
  animatedBones: Set<string>,
  referencedBonesByTarget: Map<string, Set<string>>,
  referencedTranslationBonesByTarget: Map<string, Set<string>>,
  skipSafetyChecks = false,
): void {
  root.updateMatrixWorld(true);

  const reparentPreserveWorld = (
    child: THREE.Object3D,
    parent: THREE.Object3D,
  ) => {
    child.updateMatrixWorld(true);
    const worldMatrix = child.matrixWorld.clone();

    parent.add(child);
    parent.updateMatrixWorld(true);

    const parentInv = parent.matrixWorld.clone().invert();
    const localMatrix = worldMatrix.clone().premultiply(parentInv);
    localMatrix.decompose(child.position, child.quaternion, child.scale);
  };

  const getAncestorChain = (name: string): string[] => {
    const chain: string[] = [];
    let cur: string | undefined = name;
    while (cur) {
      chain.push(cur);
      cur = parentMap[cur];
    }
    return chain;
  };

  for (const [childName, parentName] of Object.entries(parentMap)) {
    const child = rootGroups[childName];
    const parent = rootGroups[parentName];
    if (!child || !parent) continue;
    if (child.parent === parent) continue;

    // For extracted hierarchies from Minecraft code, skip safety checks
    // since we know the hierarchy is correct
    if (!skipSafetyChecks) {
      // If the child animation already references any would-be ancestor transforms,
      // re-parenting would double-apply those transforms (common in Fresh Animations).
      const childRefs = referencedBonesByTarget.get(childName);
      const ancestors = getAncestorChain(parentName);
      const childReferencesAncestor =
        animatedBones.has(childName) &&
        !!childRefs &&
        ancestors.some((a) => childRefs.has(a));
      if (childReferencesAncestor) continue;

      // If the parent drives its own translations from the child's translations,
      // parenting the child under the parent will double-apply translations.
      const parentTranslationRefs =
        referencedTranslationBonesByTarget.get(parentName);
      if (parentTranslationRefs?.has(childName)) continue;
    }

    // Mark these as vanilla skeleton parts for animation semantics.
    child.userData.vanillaPart = true;
    parent.userData.vanillaPart = true;

    reparentPreserveWorld(child, parent);
  }
}

/**
 * Re-parent common vanilla parts into their implicit hierarchy while preserving
 * world transforms. This aligns our scene graph with OptiFine/Minecraft's
 * built-in skeleton so animation translations are applied in the right space.
 */
export function applyVanillaHierarchy(
  root: THREE.Group,
  rootGroups: Record<string, THREE.Group>,
  animatedBones: Set<string>,
  referencedBonesByTarget: Map<string, Set<string>>,
  referencedTranslationBonesByTarget: Map<string, Set<string>>,
  entityId?: string,
): void {
  const entityType = detectEntityType(rootGroups);

  // First, check if we have extracted hierarchy data for this entity from Minecraft's code
  // This is the preferred source of truth for parent-child relationships
  if (entityId) {
    const extractedHierarchy = VANILLA_HIERARCHIES[entityId as keyof typeof VANILLA_HIERARCHIES];
    if (extractedHierarchy && Object.keys(extractedHierarchy).length > 0) {
      const parentMap = buildExtractedParentMap(extractedHierarchy, rootGroups);

      if (Object.keys(parentMap).length > 0) {
        const skipChecks = entityType.hasArmsOnly || entityType.hasVillagerLimbs;
        applyParentMap(
          root,
          rootGroups,
          parentMap,
          animatedBones,
          referencedBonesByTarget,
          referencedTranslationBonesByTarget,
          skipChecks,
        );
        return;
      }
    }
  }

  // Fall back to heuristic-based hierarchy for models without extracted data
  if (!entityType.hasBody) return;

  const parentMap = buildHeuristicParentMap(rootGroups, entityType);
  if (!parentMap) return;

  // Apply the heuristic-based parent map
  // Skip safety checks for arms-only and villager rigs as they rely on specific inheritance
  const skipChecks = entityType.hasArmsOnly || entityType.hasVillagerLimbs;
  applyParentMap(
    root,
    rootGroups,
    parentMap,
    animatedBones,
    referencedBonesByTarget,
    referencedTranslationBonesByTarget,
    skipChecks,
  );
}

/**
 * Build heuristic-based parent map based on entity type
 */
function buildHeuristicParentMap(
  rootGroups: Record<string, THREE.Group>,
  entityType: ReturnType<typeof detectEntityType>,
): Record<string, string> | null {
  if (entityType.hasHumanoidLimbs) {
    // For CEM/JPM animation, Fresh Animations commonly authors body motion
    // (translations/rotations) as offsets relative to the limbs, and drives
    // attachments via explicit cross-bone references instead of relying on an
    // inherited hierarchy. Only re-parent true overlays to their base bones.
    return buildHumanoidParentMap(rootGroups);
  }

  if (entityType.hasArmsOnly) {
    // Allay/Vex-style rigs: animations expect arms to inherit body motion via hierarchy.
    return buildArmsOnlyParentMap(rootGroups);
  }

  if (entityType.hasVillagerLimbs) {
    // Villager rigs are authored with an empty `head` bone and put the actual
    // head cubes in `headwear` as a separate root part. Animations target
    // `head.*`, so swap the names to animate the real head geometry without
    // forcing a hard-coded pivot translation.
    normalizeVillagerHead(rootGroups);

    // Villager rigs rely on the vanilla head attachments hierarchy so facial
    // overlays inherit head motion.
    return buildVillagerParentMap(rootGroups);
  }

  if (entityType.isQuadruped) {
    // Quadruped overlays (e.g. horse saddle) are authored as separate root parts
    // but should inherit body motion via the vanilla hierarchy.
    return buildQuadrupedParentMap();
  }

  // No heuristic-based hierarchy applies - extracted hierarchies are handled above
  return null;
}
