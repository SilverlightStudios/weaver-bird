/**
 * Helper functions for entity model loading to reduce complexity
 */
import { loadEntityModel, type ParsedEntityModel } from "@lib/emf";
import type { AnimationLayer } from "@lib/emf/jemLoader";
import type { PackInfo } from "./types";

/**
 * Build list of pack candidates for model loading (excludes vanilla and disabled packs)
 */
export function buildModelPackCandidates(
  packOrder: string[],
  disabledPackIds: string[],
  packsById: Record<string, PackInfo>,
): PackInfo[] {
  const disabledSet = new Set(disabledPackIds);
  return packOrder
    .filter((id) => id !== "minecraft:vanilla" && !disabledSet.has(id) && packsById[id])
    .map((id) => ({
      id,
      path: packsById[id].path,
      is_zip: packsById[id].is_zip,
      pack_format: packsById[id].pack_format,
    }));
}

/**
 * Search through pack candidates for a valid entity model
 */
export async function searchPacksForModel(
  packCandidates: PackInfo[],
  cemEntityType: string,
  targetMinecraftVersion: string,
  entityVersionVariants: Record<string, string[]>,
  cemParentEntity: string | null,
  selectedEntityVariant: string | null,
): Promise<{ parsedModel: ParsedEntityModel | null; modelPack: PackInfo | null }> {
  for (const pack of packCandidates) {
    const attempt = await loadEntityModel(
      cemEntityType,
      pack.path,
      pack.is_zip,
      targetMinecraftVersion,
      entityVersionVariants,
      cemParentEntity,
      pack.pack_format,
      selectedEntityVariant,
    );
    if (attempt) {
      return { parsedModel: attempt, modelPack: pack };
    }
  }
  return { parsedModel: null, modelPack: null };
}

/**
 * Load vanilla fallback model
 */
export async function loadVanillaFallbackModel(
  cemEntityType: string,
  targetMinecraftVersion: string,
  entityVersionVariants: Record<string, string[]>,
  cemParentEntity: string | null,
  selectedEntityVariant: string | null,
): Promise<ParsedEntityModel | null> {
  return await loadEntityModel(
    cemEntityType,
    undefined,
    undefined,
    targetMinecraftVersion,
    entityVersionVariants,
    cemParentEntity,
    undefined,
    selectedEntityVariant,
  );
}

/**
 * Resolve CEM entity type and parent from override or defaults
 */
export function resolveCemEntity(
  cemOverride: { entityType?: string; parentEntity?: string | null } | undefined | null,
  defaultEntityType: string,
  defaultParentEntity: string | null,
): { cemEntityType: string; cemParentEntity: string | null } {
  const cemEntityType = cemOverride?.entityType ?? defaultEntityType;
  const cemParentEntity = cemOverride?.parentEntity === undefined
    ? defaultParentEntity
    : cemOverride?.parentEntity ?? null;
  return { cemEntityType, cemParentEntity };
}

/**
 * Set error state when model loading fails
 */
export function setModelLoadError(
  setError: (msg: string) => void,
  setLoading: (loading: boolean) => void,
  setAvailableAnimationPresets: (presets: string[] | null) => void,
  setAvailableAnimationTriggers: (triggers: string[] | null) => void,
  setAvailablePoseToggles: (toggles: string[] | null) => void,
  setPackAnimationLayers: (layers: AnimationLayer[] | undefined) => void,
  createPlaceholder: () => void,
  errorMessage: string,
) {
  setError(errorMessage);
  setLoading(false);
  setAvailableAnimationPresets(null);
  setAvailableAnimationTriggers(null);
  setAvailablePoseToggles(null);
  setPackAnimationLayers(undefined);
  createPlaceholder();
}
