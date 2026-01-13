import { normalizeAssetId } from "./assetUtils";

export interface BlockEntityRenderSpec {
  assetId: string;
  entityTypeOverride?: string;
  parentEntityOverride?: string | null;
  /** If true, render both the block model AND the entity model (e.g., bells) */
  renderBoth?: boolean;
}

const ENTITY_PREFIX = "entity/";

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

  if (!path.startsWith("block/")) return null;

  const blockName = path.slice("block/".length);

  if (blockName.endsWith("_wall_hanging_sign")) {
    const wood = blockName.replace(/_wall_hanging_sign$/, "");
    const entityAssetId = findEntityAssetId(namespace, normalizedAll, [
      `entity/signs/hanging/${wood}`,
    ]);
    if (entityAssetId) return { assetId: entityAssetId };
  }

  if (blockName.endsWith("_hanging_sign")) {
    const wood = blockName.replace(/_hanging_sign$/, "");
    const entityAssetId = findEntityAssetId(namespace, normalizedAll, [
      `entity/signs/hanging/${wood}`,
    ]);
    if (entityAssetId) return { assetId: entityAssetId };
  }

  if (blockName.endsWith("_wall_sign")) {
    const wood = blockName.replace(/_wall_sign$/, "");
    const entityAssetId = findEntityAssetId(namespace, normalizedAll, [
      `entity/signs/${wood}`,
    ]);
    if (entityAssetId) {
      return {
        assetId: entityAssetId,
        entityTypeOverride: `${wood}_wall_sign`,
      };
    }
  }

  if (blockName.endsWith("_sign")) {
    const wood = blockName.replace(/_sign$/, "");
    const entityAssetId = findEntityAssetId(namespace, normalizedAll, [
      `entity/signs/${wood}`,
    ]);
    if (entityAssetId) return { assetId: entityAssetId };
  }

  if (blockName.endsWith("_wall_banner") || blockName.endsWith("_banner")) {
    const entityAssetId = findEntityAssetId(namespace, normalizedAll, [
      "entity/banner_base",
      "entity/banner/base",
      "entity/banner/banner_base",
    ]);
    if (entityAssetId) return { assetId: entityAssetId };
  }

  if (blockName.endsWith("_bed")) {
    const color = blockName.replace(/_bed$/, "");
    const entityAssetId = findEntityAssetId(namespace, normalizedAll, [
      `entity/bed/${color}`,
    ]);
    if (entityAssetId) return { assetId: entityAssetId };
  }

  if (blockName === "shulker_box" || blockName.endsWith("_shulker_box")) {
    const color =
      blockName === "shulker_box"
        ? ""
        : blockName.replace(/_shulker_box$/, "");
    const shulkerSuffix = color ? `shulker_${color}` : "shulker";
    const entityAssetId = findEntityAssetId(namespace, normalizedAll, [
      `entity/shulker/${shulkerSuffix}`,
      "entity/shulker/shulker",
    ]);
    if (entityAssetId) {
      return { assetId: entityAssetId, entityTypeOverride: "shulker_box" };
    }
  }

  if (blockName === "chest" || blockName.endsWith("_chest")) {
    const prefix = blockName === "chest" ? "" : blockName.replace(/_chest$/, "");
    const candidate = prefix
      ? findEntityAssetId(namespace, normalizedAll, [`entity/chest/${prefix}`])
      : null;

    const fallback =
      candidate ??
      findEntityAssetId(namespace, normalizedAll, ["entity/chest/normal"]) ??
      findAnyEntityAssetIdByPrefix(
        namespace,
        normalizedAll,
        "entity/chest/",
        (id) => !id.endsWith("_left") && !id.endsWith("_right"),
      );

    if (fallback) {
      return { assetId: fallback, entityTypeOverride: blockName };
    }
  }

  if (blockName === "decorated_pot") {
    const entityAssetId = findEntityAssetId(namespace, normalizedAll, [
      "entity/decorated_pot/decorated_pot_base",
      "entity/decorated_pot_base",
    ]);
    if (entityAssetId) {
      return { assetId: entityAssetId, entityTypeOverride: "decorated_pot" };
    }
  }

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
