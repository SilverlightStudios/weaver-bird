import { normalizeAssetId } from "./assetUtils";

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
    const rawPrefix = blockName === "chest" ? "normal" : blockName.replace(/_chest$/, "");
    const chestType = normalizeChestTextureKey(rawPrefix);

    // Build comprehensive fallback list
    // Vanilla Minecraft has used different paths over versions: entity/chest/X and chest/X
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
      "chest/chest"
    );

    let fallback: string | null = null;
    for (const path of fallbackCandidates) {
      fallback = findEntityAssetId(namespace, normalizedAll, [path]);
      if (fallback) break;
    }

    // Last resort: find any chest texture
    if (!fallback) {
      fallback = findAnyEntityAssetIdByPrefix(
        namespace,
        normalizedAll,
        "entity/chest/",
        (id) => !id.endsWith("_left") && !id.endsWith("_right"),
      ) ?? findAnyEntityAssetIdByPrefix(
        namespace,
        normalizedAll,
        "chest/",
        (id) => !id.endsWith("_left") && !id.endsWith("_right"),
      );
    }

    if (fallback) {
      return {
        assetId: fallback,
        entityTypeOverride: getChestEntityTypeOverride(blockName),
      };
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
