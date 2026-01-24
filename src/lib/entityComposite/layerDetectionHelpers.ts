/**
 * Helper functions for entity layer detection
 */

import type { AssetId } from "@state";
import {
  OVERLAY_SUFFIXES,
  FEATURE_LAYER_PREFIXES,
  BEE_LAYER_VARIANTS,
  BREEZE_LAYER_VARIANTS,
  EQUIPMENT_ENTITY_MAP,
} from "./layerDetectionPatterns";

export function stripNamespace(assetId: AssetId): string {
  const idx = assetId.indexOf(":");
  return idx >= 0 ? assetId.slice(idx + 1) : assetId;
}

export function getEntityPath(assetId: AssetId): string | null {
  const path = stripNamespace(assetId);
  if (!path.startsWith("entity/")) return null;
  return path.slice("entity/".length);
}

export function getLeafName(entityPath: string): string {
  return entityPath.split("/").pop() ?? "";
}

export function isEquipmentLayer(entityPath: string): boolean {
  if (!entityPath.startsWith("equipment/")) return false;
  // Humanoid layer 1 armor textures remain visible
  if (entityPath.startsWith("equipment/humanoid/")) return false;
  return true;
}

export function isBeeVariantLayer(entityPath: string): boolean {
  if (!entityPath.startsWith("bee/")) return false;
  const leaf = getLeafName(entityPath);
  return BEE_LAYER_VARIANTS.includes(leaf);
}

export function isBreezeVariantLayer(entityPath: string): boolean {
  if (!entityPath.startsWith("breeze/")) return false;
  const leaf = getLeafName(entityPath);
  return BREEZE_LAYER_VARIANTS.includes(leaf);
}

export function isVillagerLayer(entityPath: string): boolean {
  return FEATURE_LAYER_PREFIXES.some((prefix) => entityPath.startsWith(prefix));
}

export function isBannerLayer(entityPath: string): boolean {
  if (!entityPath.startsWith("banner/")) return false;
  const leaf = getLeafName(entityPath);
  // Base banner texture should be shown as primary entity
  if (leaf === "base" || leaf === "banner_base") return false;
  return true;
}

export function isHorseMarkingLayer(entityPath: string): boolean {
  const leaf = getLeafName(entityPath);
  return leaf.startsWith("horse_markings_");
}

export function isCowMushroomLayer(entityPath: string): boolean {
  if (!entityPath.startsWith("cow/")) return false;
  const leaf = getLeafName(entityPath);
  return leaf === "red_mushroom" || leaf === "brown_mushroom";
}

export function hasOverlaySuffix(leaf: string): boolean {
  return OVERLAY_SUFFIXES.some((suffix) => leaf.endsWith(suffix));
}

export function hasCrackinessSuffix(leaf: string): boolean {
  return /_crackiness_(low|medium|high)$/.test(leaf);
}

export function hasOverlayInPath(entityPath: string): boolean {
  return entityPath.includes("/overlay/");
}

export function tryFindBaseEntity(
  set: Set<AssetId>,
  namespace: string,
  candidates: string[],
): AssetId | null {
  const mk = (path: string) => `${namespace}:${path}` as AssetId;
  for (const candidate of candidates) {
    const id = mk(candidate);
    if (set.has(id)) return id;
  }
  return null;
}

export function findEquipmentOwner(
  entityPath: string,
  set: Set<AssetId>,
): AssetId | null {
  const parts = entityPath.split("/");
  const kind = parts[1] ?? "";
  const kindLower = kind.toLowerCase();

  const preferredEntities: string[] = [];
  for (const [pattern, entities] of Object.entries(EQUIPMENT_ENTITY_MAP)) {
    if (kindLower.includes(pattern)) {
      preferredEntities.push(...entities);
    }
  }

  // Find the first matching entity
  for (const entityName of preferredEntities) {
    for (const id of set) {
      const p = stripNamespace(id);
      if (p.startsWith(`entity/${entityName}/`)) {
        return id;
      }
    }
  }

  return null;
}

export function stripKnownSuffix(leaf: string): string | null {
  for (const suffix of OVERLAY_SUFFIXES) {
    if (leaf.endsWith(suffix)) {
      return leaf.slice(0, -suffix.length);
    }
  }
  return null;
}
