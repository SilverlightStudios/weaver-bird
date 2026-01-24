/**
 * Entity Model Loader
 *
 * Loads and parses JEM entity models from resource packs and vanilla JAR.
 */

import type {
  ParsedEntityModel,
} from "./jemLoader";
import {
  normalizeEntityName,
} from "./utils";
import { getCachedModel, setCachedModel, hasCachedModel } from "./cache";
import {
  tryLoadJemByName as tryLoadJemByNameHelper,
  tryLoadVanillaJem as tryLoadVanillaJemHelper,
} from "./entityLoaderHelpers";

type LoadResult = (ParsedEntityModel & { jemSource?: string; usedLegacyJem?: boolean }) | null;

async function tryLoadHangingSignFromPack(
  entityType: string,
  normalizedEntityType: string,
  selectedVariant: string | undefined,
  cacheKey: string,
  tryLoadJemByName: (name: string, source: string, options?: { fallbackBaseName?: string }) => Promise<LoadResult>,
): Promise<LoadResult> {
  if (!entityType.includes("_hanging_sign")) return null;

  const woodType = entityType.replace("_hanging_sign", "");
  const hangingVariant = selectedVariant ?? "wall";
  const result = await tryLoadJemByName(
    `${woodType}/${hangingVariant}_hanging_sign`,
    `selected variant (${hangingVariant})`,
    { fallbackBaseName: normalizedEntityType },
  );

  if (result) setCachedModel(cacheKey, result);
  return result;
}

async function tryLoadLegacyVersioned(
  packFormat: number | undefined,
  normalizedEntityType: string,
  parentEntity: string | null | undefined,
  cacheKey: string,
  tryLoadJemByName: (name: string, source: string, options?: { fallbackBaseName?: string }) => Promise<LoadResult>,
): Promise<LoadResult> {
  if (!packFormat) return null;

  let legacyVersion: string | null = null;
  if (packFormat < 55) {
    legacyVersion = "21.4";
  } else if (packFormat < 46) {
    legacyVersion = "21.1";
  }

  if (!legacyVersion) return null;

  const versionedName = `${parentEntity ?? normalizedEntityType}_${legacyVersion}`;
  const result = await tryLoadJemByName(versionedName, "legacy versioned");

  if (result) {
    result.usedLegacyJem = true;
    setCachedModel(cacheKey, result);
  }

  return result;
}

async function tryLoadFromPackPath(
  packPath: string,
  entityType: string,
  normalizedEntityType: string,
  parentEntity: string | null | undefined,
  packFormat: number | undefined,
  selectedVariant: string | undefined,
  cacheKey: string,
  tryLoadJemByName: (name: string, source: string, options?: { fallbackBaseName?: string }) => Promise<LoadResult>,
): Promise<LoadResult> {
  const hangingResult = await tryLoadHangingSignFromPack(
    entityType,
    normalizedEntityType,
    selectedVariant,
    cacheKey,
    tryLoadJemByName,
  );
  if (hangingResult) return hangingResult;

  let result = await tryLoadJemByName(normalizedEntityType, "variant");
  if (result) {
    setCachedModel(cacheKey, result);
    return result;
  }

  if (parentEntity) {
    const normalizedParent = normalizeEntityName(parentEntity);
    result = await tryLoadJemByName(normalizedParent, "parent");
    if (result) {
      setCachedModel(cacheKey, result);
      return result;
    }
  }

  return tryLoadLegacyVersioned(packFormat, normalizedEntityType, parentEntity, cacheKey, tryLoadJemByName);
}

async function tryLoadFromVanilla(
  normalizedEntityType: string,
  selectedVariant: string | undefined,
  parentEntity: string | null | undefined,
  cacheKey: string,
  tryLoadVanillaJem: (name: string, fallbackBaseName?: string) => Promise<LoadResult>,
): Promise<LoadResult> {
  if (normalizedEntityType.includes("_hanging_sign")) {
    const woodType = normalizedEntityType.replace("_hanging_sign", "");
    const hangingVariant = selectedVariant ?? "wall";
    const result = await tryLoadVanillaJem(
      `${woodType}/${hangingVariant}_hanging_sign`,
      normalizedEntityType,
    );
    if (result) {
      setCachedModel(cacheKey, result);
      return result;
    }
  }

  let result = await tryLoadVanillaJem(normalizedEntityType);
  if (result) {
    setCachedModel(cacheKey, result);
    return result;
  }

  if (parentEntity) {
    const normalizedParent = normalizeEntityName(parentEntity);
    result = await tryLoadVanillaJem(normalizedParent);
    if (result) {
      setCachedModel(cacheKey, result);
      return result;
    }
  }

  return null;
}

export async function loadEntityModel(
  entityType: string,
  packPath?: string,
  isZip?: boolean,
  targetVersion?: string | null,
  entityVersionVariants?: Record<string, string[]>,
  parentEntity?: string | null,
  packFormat?: number,
  selectedVariant?: string,
): Promise<LoadResult> {
  const normalizedEntityType = normalizeEntityName(entityType);
  const cacheKey = `${normalizedEntityType}:${packPath ?? "vanilla"}:${isZip}:${parentEntity ?? "none"}:${packFormat ?? "default"}:${selectedVariant ?? "default"}:${targetVersion ?? "auto"}`;

  if (hasCachedModel(cacheKey)) {
    console.log("[EMF] ✓ Using cached model for:", normalizedEntityType);
    return getCachedModel(cacheKey) ?? null;
  }

  console.log("[EMF] Loading entity model:", normalizedEntityType, "parent:", parentEntity, "packFormat:", packFormat);

  const tryLoadJemByName = async (jemName: string, source: string, options?: { fallbackBaseName?: string }): Promise<LoadResult> => {
    return tryLoadJemByNameHelper(jemName, source, packPath!, isZip ?? false, targetVersion, entityVersionVariants, options);
  };

  const tryLoadVanillaJem = async (jemName: string, fallbackBaseName?: string): Promise<LoadResult> => {
    return tryLoadVanillaJemHelper(jemName, entityType, fallbackBaseName);
  };

  if (packPath) {
    const result = await tryLoadFromPackPath(
      packPath,
      entityType,
      normalizedEntityType,
      parentEntity,
      packFormat,
      selectedVariant,
      cacheKey,
      tryLoadJemByName,
    );
    if (result) return result;
  }

  const result = await tryLoadFromVanilla(normalizedEntityType, selectedVariant, parentEntity, cacheKey, tryLoadVanillaJem);
  if (result) return result;

  console.log(`[EMF] No JEM found for ${normalizedEntityType}`);
  setCachedModel(cacheKey, null);
  return null;
}
