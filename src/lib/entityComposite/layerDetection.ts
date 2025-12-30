import type { AssetId } from "@state";

function stripNamespace(assetId: AssetId): string {
  const idx = assetId.indexOf(":");
  return idx >= 0 ? assetId.slice(idx + 1) : assetId;
}

function getEntityPath(assetId: AssetId): string | null {
  const path = stripNamespace(assetId);
  if (!path.startsWith("entity/")) return null;
  return path.slice("entity/".length);
}

/**
 * Heuristic filter for entity textures that are meant to be rendered as
 * feature layers rather than standalone entities.
 *
 * This is intentionally conservative: we only filter known overlay patterns.
 */
export function isEntityFeatureLayerTextureAssetId(assetId: AssetId): boolean {
  const entityPath = getEntityPath(assetId);
  if (!entityPath) return false;

  // Bee state textures are variants of the same entity model.
  if (entityPath.startsWith("bee/")) {
    const leaf = entityPath.split("/").pop() ?? "";
    if (
      leaf === "bee_angry" ||
      leaf === "bee_nectar" ||
      leaf === "bee_angry_nectar" ||
      leaf === "bee_stinger" ||
      leaf === "bee_angry_stinger" ||
      leaf === "bee_nectar_stinger" ||
      leaf === "bee_angry_nectar_stinger"
    ) {
      return true;
    }
  }

  // Villager feature layers
  if (entityPath.startsWith("villager/type/")) return true;
  if (entityPath.startsWith("villager/profession/")) return true;
  if (entityPath.startsWith("villager/profession_level/")) return true;
  if (entityPath.startsWith("zombie_villager/type/")) return true;
  if (entityPath.startsWith("zombie_villager/profession/")) return true;
  if (entityPath.startsWith("zombie_villager/profession_level/")) return true;

  // Banner pattern masks
  if (entityPath.startsWith("banner/")) {
    const leaf = entityPath.split("/").pop() ?? "";
    // The base banner texture should be treated as a primary entity texture so
    // it can be shown as a single resource card.
    if (leaf === "base" || leaf === "banner_base") return false;
    return true;
  }

  // Common overlay suffixes (same-UV layers)
  const leaf = entityPath.split("/").pop() ?? "";
  if (
    leaf.endsWith("_eyes") ||
    leaf.endsWith("_overlay") ||
    leaf.endsWith("_outer") ||
    leaf.endsWith("_outer_layer") ||
    leaf.endsWith("_fur") ||
    leaf.endsWith("_wool") ||
    leaf.endsWith("_wool_undercoat") ||
    leaf.endsWith("_undercoat") ||
    leaf.endsWith("_collar") ||
    leaf.endsWith("_saddle") ||
    leaf.endsWith("_armor") ||
    leaf.endsWith("_charge")
  ) {
    return true;
  }

  // Damage overlays (iron golem cracks)
  if (/_crackiness_(low|medium|high)$/.test(leaf)) return true;

  // A few entity families store overlays in dedicated subfolders.
  // (Keep these small; the composite resolver still uses the full asset list.)
  if (entityPath.includes("/overlay/")) return true;

  return false;
}

export function getLikelyBaseEntityAssetIdForLayer(
  layerAssetId: AssetId,
  allAssetIds: Iterable<AssetId>,
): AssetId | null {
  if (!isEntityFeatureLayerTextureAssetId(layerAssetId)) return null;
  const entityPath = getEntityPath(layerAssetId);
  if (!entityPath) return null;

  const set = new Set(allAssetIds);
  const ns = layerAssetId.includes(":") ? layerAssetId.split(":")[0] : "minecraft";
  const mk = (path: string) => `${ns}:${path}` as AssetId;

  // Bee variants -> base bee texture
  if (entityPath.startsWith("bee/")) {
    const candidates = [mk("entity/bee/bee"), mk("entity/bee")];
    for (const c of candidates) if (set.has(c)) return c;
  }

  // Villager overlays -> base villager texture
  if (entityPath.startsWith("villager/")) {
    const candidates = [
      mk("entity/villager/villager"),
      mk("entity/villager"),
    ];
    for (const c of candidates) if (set.has(c)) return c;
  }

  // Zombie villager overlays -> base zombie_villager texture
  if (entityPath.startsWith("zombie_villager/")) {
    const candidates = [
      mk("entity/zombie_villager/zombie_villager"),
      mk("entity/zombie_villager"),
    ];
    for (const c of candidates) if (set.has(c)) return c;
  }

  // Banner patterns -> base banner texture
  if (entityPath.startsWith("banner/")) {
    const candidates = [
      mk("entity/banner/base"),
      mk("entity/banner/banner_base"),
      mk("entity/banner_base"),
      mk("entity/banner"),
    ];
    for (const c of candidates) if (set.has(c)) return c;
  }

  const parts = entityPath.split("/");
  const dir = parts.slice(0, -1).join("/");
  const leaf = parts[parts.length - 1] ?? "";
  const stripSuffix = (suffix: string) =>
    leaf.endsWith(suffix) ? leaf.slice(0, -suffix.length) : null;

  const suffixes = [
    "_eyes",
    "_overlay",
    "_outer_layer",
    "_outer",
    "_fur",
    "_wool_undercoat",
    "_wool",
    "_undercoat",
    "_collar",
    "_saddle",
    "_armor",
    "_charge",
    "_crackiness_low",
    "_crackiness_medium",
    "_crackiness_high",
  ];
  for (const suffix of suffixes) {
    const baseLeaf = stripSuffix(suffix);
    if (!baseLeaf) continue;
    const candidates = [
      mk(`entity/${dir}/${baseLeaf}`),
      mk(`entity/${baseLeaf}`),
    ];
    for (const c of candidates) if (set.has(c)) return c;
  }

  return null;
}
