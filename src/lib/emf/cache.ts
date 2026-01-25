import type { ParsedEntityModel } from "./types";

// Cache for parsed entity models to prevent re-parsing the same JEM files
const entityModelCache = new Map<
  string,
  (ParsedEntityModel & { jemSource: string; usedLegacyJem: boolean }) | null
>();

export function getCachedModel(
  cacheKey: string,
): (ParsedEntityModel & { jemSource: string; usedLegacyJem: boolean }) | null | undefined {
  return entityModelCache.get(cacheKey);
}

export function setCachedModel(
  cacheKey: string,
  model: (ParsedEntityModel & { jemSource: string; usedLegacyJem: boolean }) | null,
): void {
  entityModelCache.set(cacheKey, model);
}

export function hasCachedModel(cacheKey: string): boolean {
  return entityModelCache.has(cacheKey);
}

export function clearEntityModelCache(): void {
  entityModelCache.clear();
  console.log("[EMF] Entity model cache cleared");
}
