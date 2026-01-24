import { normalizeAssetId } from "./assetUtils";
import {
  resolveSignEntity,
  resolveBannerEntity,
  resolveBedEntity,
  resolveShulkerBoxEntity,
  resolveChestEntity,
  resolveDecoratedPotEntity,
} from "./blockEntityResolverHelpers";

export interface BlockEntityRenderSpec {
  assetId: string;
  entityTypeOverride?: string;
  parentEntityOverride?: string | null;
  /** If true, render both the block model AND the entity model (e.g., bells) */
  renderBoth?: boolean;
}

const ENTITY_PREFIX = "entity/";

const normalizeChestTextureKey = (value: string): string => {
  let key = value.replace(/^waxed_/, "");
  const match = key.match(/^(exposed|weathered|oxidized)_copper$/);
  if (match) {
    key = `copper_${match[1]}`;
  }
  return key;
};

const getChestEntityTypeOverride = (blockName: string): string => {
  if (blockName.includes("trapped")) return "trapped_chest";
  if (blockName.includes("ender")) return "ender_chest";
  return "chest";
};

const splitAssetId = (assetId: string): { namespace: string; path: string } => {
  const normalized = normalizeAssetId(assetId);
  const parts = normalized.split(":");
  if (parts.length === 2) {
    return { namespace: parts[0], path: parts[1] };
  }
  return { namespace: "minecraft", path: normalized };
};

const toEntityAssetId = (namespace: string, path: string): string => {
  if (path.includes(":")) return normalizeAssetId(path);
  const trimmed = path.startsWith(ENTITY_PREFIX) ? path : `${ENTITY_PREFIX}${path}`;
  return normalizeAssetId(`${namespace}:${trimmed}`);
};

const findEntityAssetId = (
  namespace: string,
  allAssetIds: Set<string>,
  candidates: string[],
): string | null => {
  for (const candidate of candidates) {
    const assetId = toEntityAssetId(namespace, candidate);
    if (allAssetIds.has(assetId)) return assetId;
  }
  return null;
};

const findAnyEntityAssetIdByPrefix = (
  namespace: string,
  allAssetIds: Set<string>,
  prefix: string,
  filter?: (id: string) => boolean,
): string | null => {
  const normalizedPrefix = toEntityAssetId(namespace, prefix);
  const matches: string[] = [];
  for (const id of allAssetIds) {
    if (!id.startsWith(normalizedPrefix)) continue;
    if (filter && !filter(id)) continue;
    matches.push(id);
  }
  if (matches.length === 0) return null;
  matches.sort();
  return matches[0];
};

export function resolveBlockEntityRenderSpec(
  assetId: string | undefined,
  allAssetIds: string[],
): BlockEntityRenderSpec | null {
  if (!assetId || allAssetIds.length === 0) return null;

  const normalizedAll = new Set(allAssetIds.map(normalizeAssetId));
  const { namespace, path } = splitAssetId(assetId);

  const normalizedPath = path.startsWith("block/break/")
    ? `block/${path.slice("block/break/".length)}`
    : path;

  if (!normalizedPath.startsWith("block/")) return null;

  const blockName = normalizedPath.slice("block/".length);

  // Try sign entity resolution
  const signResult = resolveSignEntity(blockName, namespace, normalizedAll, findEntityAssetId);
  if (signResult) return signResult;

  // Try banner entity resolution
  const bannerResult = resolveBannerEntity(blockName, namespace, normalizedAll, findEntityAssetId);
  if (bannerResult) return bannerResult;

  // Try bed entity resolution
  const bedResult = resolveBedEntity(blockName, namespace, normalizedAll, findEntityAssetId);
  if (bedResult) return bedResult;

  // Try shulker box entity resolution
  const shulkerResult = resolveShulkerBoxEntity(blockName, namespace, normalizedAll, findEntityAssetId);
  if (shulkerResult) return { ...shulkerResult, entityTypeOverride: "shulker_box" };

  // Try chest entity resolution
  const chestResult = resolveChestEntity(
    blockName,
    namespace,
    normalizedAll,
    findEntityAssetId,
    findAnyEntityAssetIdByPrefix,
    normalizeChestTextureKey,
    getChestEntityTypeOverride,
  );
  if (chestResult) return chestResult;

  // Try decorated pot entity resolution
  const decoratedPotResult = resolveDecoratedPotEntity(blockName, namespace, normalizedAll, findEntityAssetId);
  if (decoratedPotResult) return { ...decoratedPotResult, entityTypeOverride: "decorated_pot" };

  // Universal pattern: check if entity/{blockName}/* exists
  // This handles bells and any future blocks with entity models
  // The renderer will decide whether to show both based on block model geometry
  const genericEntityAssetId = findAnyEntityAssetIdByPrefix(
    namespace,
    normalizedAll,
    `entity/${blockName}/`,
  );
  if (genericEntityAssetId) {
    return {
      assetId: genericEntityAssetId,
      entityTypeOverride: blockName,
      renderBoth: true, // Let renderer decide based on block model geometry
    };
  }

  return null;
}
