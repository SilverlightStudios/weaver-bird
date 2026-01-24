/**
 * Helper functions for block entity resolution to reduce complexity
 */
import type { BlockEntityRenderSpec } from "./blockEntityResolver";

type FindEntityFn = (namespace: string, normalizedAll: Set<string>, paths: string[]) => string | null;

/**
 * Handle sign block variants (hanging and wall signs)
 */
export function resolveSignEntity(
  blockName: string,
  namespace: string,
  normalizedAll: Set<string>,
  findEntityAssetId: FindEntityFn,
): BlockEntityRenderSpec | null {
  if (blockName.endsWith("_wall_hanging_sign")) {
    const wood = blockName.replace(/_wall_hanging_sign$/, "");
    const entityAssetId = findEntityAssetId(namespace, normalizedAll, [`entity/signs/hanging/${wood}`]);
    if (entityAssetId) return { assetId: entityAssetId };
  }

  if (blockName.endsWith("_hanging_sign")) {
    const wood = blockName.replace(/_hanging_sign$/, "");
    const entityAssetId = findEntityAssetId(namespace, normalizedAll, [`entity/signs/hanging/${wood}`]);
    if (entityAssetId) return { assetId: entityAssetId };
  }

  if (blockName.endsWith("_wall_sign")) {
    const wood = blockName.replace(/_wall_sign$/, "");
    const entityAssetId = findEntityAssetId(namespace, normalizedAll, [`entity/signs/${wood}`]);
    if (entityAssetId) {
      return { assetId: entityAssetId, entityTypeOverride: `${wood}_wall_sign` };
    }
  }

  if (blockName.endsWith("_sign")) {
    const wood = blockName.replace(/_sign$/, "");
    const entityAssetId = findEntityAssetId(namespace, normalizedAll, [`entity/signs/${wood}`]);
    if (entityAssetId) return { assetId: entityAssetId };
  }

  return null;
}

/**
 * Handle banner blocks
 */
export function resolveBannerEntity(
  blockName: string,
  namespace: string,
  normalizedAll: Set<string>,
  findEntityAssetId: FindEntityFn,
): BlockEntityRenderSpec | null {
  if (blockName.endsWith("_wall_banner") || blockName.endsWith("_banner")) {
    const entityAssetId = findEntityAssetId(namespace, normalizedAll, [
      "entity/banner_base",
      "entity/banner/base",
      "entity/banner/banner_base",
    ]);
    if (entityAssetId) return { assetId: entityAssetId };
  }
  return null;
}

/**
 * Handle bed blocks
 */
export function resolveBedEntity(
  blockName: string,
  namespace: string,
  normalizedAll: Set<string>,
  findEntityAssetId: FindEntityFn,
): BlockEntityRenderSpec | null {
  if (blockName.endsWith("_bed")) {
    const color = blockName.replace(/_bed$/, "");
    const entityAssetId = findEntityAssetId(namespace, normalizedAll, [`entity/bed/${color}`]);
    if (entityAssetId) return { assetId: entityAssetId };
  }
  return null;
}

/**
 * Handle shulker box blocks
 */
export function resolveShulkerBoxEntity(
  blockName: string,
  namespace: string,
  normalizedAll: Set<string>,
  findEntityAssetId: FindEntityFn,
): BlockEntityRenderSpec | null {
  if (blockName === "shulker_box" || blockName.endsWith("_shulker_box")) {
    const color = blockName === "shulker_box" ? "" : blockName.replace(/_shulker_box$/, "");
    const shulkerSuffix = color ? `shulker_${color}` : "shulker";
    const entityAssetId = findEntityAssetId(namespace, normalizedAll, [
      `entity/shulker/${shulkerSuffix}`,
      `entity/${shulkerSuffix}`,
    ]);
    if (entityAssetId) return { assetId: entityAssetId };
  }
  return null;
}

/**
 * Build comprehensive chest texture fallback candidates
 */
export function buildChestFallbackCandidates(chestType: string): string[] {
  const fallbackCandidates: string[] = [
    // Primary path with entity/ prefix
    `entity/chest/${chestType}`,
    // Older format without entity/ prefix
    `chest/${chestType}`,
  ];

  // Add generic fallbacks
  fallbackCandidates.push(
    "entity/chest/normal",
    "chest/normal",
    "entity/chest/chest",
    "chest/chest",
  );

  return fallbackCandidates;
}

/**
 * Handle chest blocks (including trapped chests)
 */
export function resolveChestEntity(
  blockName: string,
  namespace: string,
  normalizedAll: Set<string>,
  findEntityAssetId: FindEntityFn,
  findAnyEntityAssetIdByPrefix: (
    ns: string,
    all: Set<string>,
    prefix: string,
    filter?: (id: string) => boolean,
  ) => string | null,
  normalizeChestTextureKey: (key: string) => string,
  getChestEntityTypeOverride: (blockName: string) => string | undefined,
): BlockEntityRenderSpec | null {
  if (!(blockName === "chest" || blockName.endsWith("_chest"))) {
    return null;
  }

  const rawPrefix = blockName === "chest" ? "normal" : blockName.replace(/_chest$/, "");
  const chestType = normalizeChestTextureKey(rawPrefix);

  const fallbackCandidates = buildChestFallbackCandidates(chestType);

  let fallback: string | null = null;
  for (const path of fallbackCandidates) {
    fallback = findEntityAssetId(namespace, normalizedAll, [path]);
    if (fallback) break;
  }

  // Last resort: find any chest texture
  fallback ??=
    findAnyEntityAssetIdByPrefix(
      namespace,
      normalizedAll,
      "entity/chest/",
      (id) => !id.endsWith("_left") && !id.endsWith("_right"),
    ) ??
    findAnyEntityAssetIdByPrefix(
      namespace,
      normalizedAll,
      "chest/",
      (id) => !id.endsWith("_left") && !id.endsWith("_right"),
    );

  if (fallback) {
    return {
      assetId: fallback,
      entityTypeOverride: getChestEntityTypeOverride(blockName),
    };
  }

  return null;
}

/**
 * Handle decorated pot blocks
 */
export function resolveDecoratedPotEntity(
  blockName: string,
  namespace: string,
  normalizedAll: Set<string>,
  findEntityAssetId: FindEntityFn,
): BlockEntityRenderSpec | null {
  if (blockName === "decorated_pot") {
    const entityAssetId = findEntityAssetId(namespace, normalizedAll, [
      "entity/decorated_pot/decorated_pot_base",
      "entity/decorated_pot_base",
    ]);
    if (entityAssetId) return { assetId: entityAssetId };
  }
  return null;
}

/**
 * Handle bell blocks
 */
export function resolveBellEntity(
  blockName: string,
  namespace: string,
  normalizedAll: Set<string>,
  findEntityAssetId: FindEntityFn,
): BlockEntityRenderSpec | null {
  if (blockName === "bell") {
    const entityAssetId = findEntityAssetId(namespace, normalizedAll, [
      "entity/bell/bell_body",
      "entity/bell_body",
    ]);
    if (entityAssetId) return { assetId: entityAssetId };
  }
  return null;
}

/**
 * Handle conduit blocks
 */
export function resolveConduitEntity(
  blockName: string,
  namespace: string,
  normalizedAll: Set<string>,
  findEntityAssetId: FindEntityFn,
): BlockEntityRenderSpec | null {
  if (blockName === "conduit") {
    const entityAssetId = findEntityAssetId(namespace, normalizedAll, [
      "entity/conduit/base",
      "entity/conduit",
    ]);
    if (entityAssetId) return { assetId: entityAssetId };
  }
  return null;
}
