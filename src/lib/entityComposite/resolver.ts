import type { AssetId } from "@state";
import { allLeavesInSet, CAT_SKIN_IDS, DYE_COLOR_IDS, WOOD_TYPE_IDS } from "../entityVariants";
import type {
  EntityCompositeSchema,
  EntityFeatureControl,
  EntityLayerDefinition,
} from "./types";
import {
  getLikelyBaseEntityAssetIdForLayer,
  isEntityFeatureLayerTextureAssetId,
} from "./layerDetection";
import { entityHandlers, type EntityHandlerContext } from "./handlers";
import {
  stripNamespace,
  getEntityPath,
  getDirectEntityDirAndLeaf,
  stableUnique,
  findAssetId,
} from "./handlers/utils";
import { DYE_COLORS } from "./dyeColors";
import type { EntityFeatureStateView } from "./types";

function getEntityRoot(entityPath: string): string {
  return entityPath.split("/")[0] ?? entityPath;
}

function getDirAndLeaf(entityPath: string): { dir: string; leaf: string } {
  const parts = entityPath.split("/");
  const leaf = parts[parts.length - 1] ?? entityPath;
  const dir = parts.slice(0, -1).join("/");
  return { dir, leaf };
}

function isHorseCoatLeaf(leaf: string): boolean {
  if (!leaf.startsWith("horse_")) return false;
  if (leaf.startsWith("horse_markings_")) return false;
  if (leaf.includes("skeleton") || leaf.includes("zombie")) return false;
  return true;
}

function sortByPreferredOrder(values: string[], preferredOrder: string[]): string[] {
  const order = new Map<string, number>();
  preferredOrder.forEach((id, idx) => order.set(id, idx));
  return [...values].sort((a, b) => {
    const ai = order.get(a);
    const bi = order.get(b);
    if (ai != null && bi != null) return ai - bi;
    if (ai != null) return -1;
    if (bi != null) return 1;
    return a.localeCompare(b);
  });
}

function normalizeBaseAssetId(
  selectedAssetId: AssetId,
  allAssetIds: AssetId[],
): AssetId {
  const all = new Set(allAssetIds);
  const baseFromLayer = getLikelyBaseEntityAssetIdForLayer(selectedAssetId, allAssetIds);
  let baseAssetId = baseFromLayer ?? selectedAssetId;
  const ns = baseAssetId.includes(":") ? baseAssetId.split(":")[0] : "minecraft";

  // Treat decorated pot patterns as feature variants of the base pot
  {
    const path = stripNamespace(baseAssetId);
    if (path.startsWith("entity/decorated_pot/") && !path.endsWith("/decorated_pot_base")) {
      const candidate = `${ns}:entity/decorated_pot/decorated_pot_base` as AssetId;
      if (all.has(candidate)) baseAssetId = candidate;
    }
  }

  // Canonicalize base entity textures for variant family directories
  {
    const entityPath = getEntityPath(baseAssetId);
    if (entityPath) {
      baseAssetId = normalizeVariantDirectory(baseAssetId, entityPath, ns, all) ?? baseAssetId;
      baseAssetId = normalizeFox(baseAssetId, entityPath, ns, all) ?? baseAssetId;
      baseAssetId = normalizeLlama(baseAssetId, entityPath, ns, all) ?? baseAssetId;
      baseAssetId = normalizeHorse(baseAssetId, entityPath, ns, all) ?? baseAssetId;
    }
  }

  return baseAssetId;
}

function normalizeVariantDirectory(
  baseAssetId: AssetId,
  entityPath: string,
  ns: string,
  all: Set<AssetId>,
): AssetId | null {
  const direct = getDirectEntityDirAndLeaf(entityPath);
  if (!direct || direct.dir === "bee" || direct.dir === "banner") return null;

  const variantLeaves: string[] = [];
  for (const id of all) {
    if (isEntityFeatureLayerTextureAssetId(id)) continue;
    const p = getEntityPath(id);
    if (!p) continue;
    const d = getDirectEntityDirAndLeaf(p);
    if (!d || d.dir !== direct.dir) continue;
    variantLeaves.push(d.leaf);
  }

  const uniqueLeavesRaw = stableUnique(variantLeaves);
  const isVariantDir = isVariantDirectory(direct.dir, uniqueLeavesRaw);
  if (!isVariantDir) return null;

  const canonicalLeaf = selectCanonicalLeaf(direct, uniqueLeavesRaw);
  return findAssetId(ns, [`entity/${direct.dir}/${canonicalLeaf}`], all);
}

function isVariantDirectory(dir: string, leaves: string[]): boolean {
  if (leaves.length <= 1) return false;

  const isPatternDir = leaves.every((l) =>
    l === dir || l.startsWith(`${dir}_`) || l.endsWith(`_${dir}`)
  );
  const isDyeDir = allLeavesInSet(leaves, DYE_COLOR_IDS);
  const isWoodDir = allLeavesInSet(leaves, WOOD_TYPE_IDS);
  const isCatDir = dir === "cat" && allLeavesInSet(leaves, CAT_SKIN_IDS);

  return isPatternDir || isDyeDir || isWoodDir || isCatDir;
}

function selectCanonicalLeaf(
  direct: { dir: string; leaf: string },
  uniqueLeavesRaw: string[],
): string {
  const isDyeDir = allLeavesInSet(uniqueLeavesRaw, DYE_COLOR_IDS);
  const isWoodDir = allLeavesInSet(uniqueLeavesRaw, WOOD_TYPE_IDS);
  const isCatDir = direct.dir === "cat" && allLeavesInSet(uniqueLeavesRaw, CAT_SKIN_IDS);

  if (isDyeDir) {
    if (uniqueLeavesRaw.includes("red")) return "red";
    return sortByPreferredOrder(uniqueLeavesRaw, DYE_COLORS.map((d) => d.id))[0] ?? direct.leaf;
  }
  if (isWoodDir) {
    if (uniqueLeavesRaw.includes("oak")) return "oak";
    return sortByPreferredOrder(uniqueLeavesRaw, Array.from(WOOD_TYPE_IDS))[0] ?? direct.leaf;
  }
  if (isCatDir) {
    if (uniqueLeavesRaw.includes("tabby")) return "tabby";
    return sortByPreferredOrder(uniqueLeavesRaw, Array.from(CAT_SKIN_IDS))[0] ?? direct.leaf;
  }
  if (direct.dir === "frog" && uniqueLeavesRaw.includes("temperate_frog")) {
    return "temperate_frog";
  }
  if (uniqueLeavesRaw.includes(direct.dir)) return direct.dir;
  return uniqueLeavesRaw[0] ?? direct.leaf;
}

function normalizeFox(
  baseAssetId: AssetId,
  entityPath: string,
  ns: string,
  all: Set<AssetId>,
): AssetId | null {
  if (!entityPath.startsWith("fox/")) return null;
  return findAssetId(ns, ["entity/fox/fox"], all);
}

function normalizeLlama(
  baseAssetId: AssetId,
  entityPath: string,
  ns: string,
  all: Set<AssetId>,
): AssetId | null {
  if (!entityPath.startsWith("llama/")) return null;

  const leaves: string[] = [];
  for (const id of all) {
    if (isEntityFeatureLayerTextureAssetId(id)) continue;
    const p = getEntityPath(id);
    if (!p) continue;
    const d = getDirectEntityDirAndLeaf(p);
    if (!d || d.dir !== "llama") continue;
    leaves.push(d.leaf);
  }

  const unique = stableUnique(leaves);
  const preferred = unique.includes("creamy")
    ? "creamy"
    : unique.includes("white")
      ? "white"
      : unique[0];

  return preferred ? findAssetId(ns, [`entity/llama/${preferred}`], all) : null;
}

function normalizeHorse(
  baseAssetId: AssetId,
  entityPath: string,
  ns: string,
  all: Set<AssetId>,
): AssetId | null {
  if (!entityPath.startsWith("horse/")) return null;

  const coats: string[] = [];
  for (const id of all) {
    if (isEntityFeatureLayerTextureAssetId(id)) continue;
    const p = getEntityPath(id);
    if (!p) continue;
    const d = getDirectEntityDirAndLeaf(p);
    if (!d || d.dir !== "horse" || !isHorseCoatLeaf(d.leaf)) continue;
    coats.push(d.leaf);
  }

  const unique = stableUnique(coats);
  const preferred = unique.includes("horse_brown") ? "horse_brown" : unique[0];
  const canonical = preferred ? findAssetId(ns, [`entity/horse/${preferred}`], all) : null;

  const direct = getDirectEntityDirAndLeaf(entityPath);
  if (canonical && direct && isHorseCoatLeaf(direct.leaf)) {
    return canonical;
  }

  return null;
}

interface HandlerAccumulator {
  controls: EntityFeatureControl[];
  layerContributors: Array<(state: EntityFeatureStateView) => EntityLayerDefinition[]>;
  baseAssetId: AssetId;
  getBaseTextureAssetId?: EntityCompositeSchema["getBaseTextureAssetId"];
  getCemEntityType?: EntityCompositeSchema["getCemEntityType"];
  getRootTransform?: EntityCompositeSchema["getRootTransform"];
  getBoneRenderOverrides?: EntityCompositeSchema["getBoneRenderOverrides"];
  getBoneInputOverrides?: EntityCompositeSchema["getBoneInputOverrides"];
  getEntityStateOverrides?: EntityCompositeSchema["getEntityStateOverrides"];
  getPartTextureOverrides?: EntityCompositeSchema["getPartTextureOverrides"];
}

function applyHandlers(
  context: EntityHandlerContext,
  baseAssetId: AssetId,
): HandlerAccumulator {
  const accumulator: HandlerAccumulator = {
    controls: [],
    layerContributors: [],
    baseAssetId,
  };

  for (const handler of entityHandlers) {
    const result = handler(context);
    if (!result) continue;

    if (result.controls) accumulator.controls.push(...result.controls);
    if (result.baseAssetIdOverride) accumulator.baseAssetId = result.baseAssetIdOverride;
    if (result.getBaseTextureAssetId) accumulator.getBaseTextureAssetId = result.getBaseTextureAssetId;
    if (result.getCemEntityType) accumulator.getCemEntityType = result.getCemEntityType;
    if (result.getRootTransform) accumulator.getRootTransform = result.getRootTransform;
    if (result.getBoneRenderOverrides) accumulator.getBoneRenderOverrides = result.getBoneRenderOverrides;
    if (result.getBoneInputOverrides) accumulator.getBoneInputOverrides = result.getBoneInputOverrides;
    if (result.getEntityStateOverrides) accumulator.getEntityStateOverrides = result.getEntityStateOverrides;
    if (result.getPartTextureOverrides) accumulator.getPartTextureOverrides = result.getPartTextureOverrides;
    if (result.getLayerContributions) accumulator.layerContributors.push(result.getLayerContributions);
  }

  return accumulator;
}

function buildSchema(
  accumulator: HandlerAccumulator,
  entityRoot: string,
): EntityCompositeSchema {
  const getActiveLayers = (state: EntityFeatureStateView): EntityLayerDefinition[] => {
    const layers: EntityLayerDefinition[] = [];
    for (const contributor of accumulator.layerContributors) {
      layers.push(...contributor(state));
    }
    return layers.sort((a, b) => a.zIndex - b.zIndex);
  };

  return {
    baseAssetId: accumulator.baseAssetId,
    entityRoot,
    controls: accumulator.controls,
    ...(accumulator.getBaseTextureAssetId ? { getBaseTextureAssetId: accumulator.getBaseTextureAssetId } : {}),
    ...(accumulator.getCemEntityType ? { getCemEntityType: accumulator.getCemEntityType } : {}),
    ...(accumulator.getRootTransform ? { getRootTransform: accumulator.getRootTransform } : {}),
    ...(accumulator.getBoneRenderOverrides ? { getBoneRenderOverrides: accumulator.getBoneRenderOverrides } : {}),
    ...(accumulator.getBoneInputOverrides ? { getBoneInputOverrides: accumulator.getBoneInputOverrides } : {}),
    ...(accumulator.getEntityStateOverrides ? { getEntityStateOverrides: accumulator.getEntityStateOverrides } : {}),
    ...(accumulator.getPartTextureOverrides ? { getPartTextureOverrides: accumulator.getPartTextureOverrides } : {}),
    getActiveLayers,
  };
}

export function resolveEntityCompositeSchema(
  selectedAssetId: AssetId,
  allAssetIds: AssetId[],
): EntityCompositeSchema | null {
  const all = new Set(allAssetIds);
  const baseAssetId = normalizeBaseAssetId(selectedAssetId, allAssetIds);
  const ns = baseAssetId.includes(":") ? baseAssetId.split(":")[0] : "minecraft";

  const entityPath = getEntityPath(baseAssetId);
  if (!entityPath) return null;

  const folderRoot = getEntityRoot(entityPath);
  const { dir, leaf } = getDirAndLeaf(entityPath);
  const entityType = leaf;

  const context = {
    all,
    ns,
    baseAssetId,
    entityPath,
    folderRoot,
    dir,
    leaf,
    entityType,
    selectedAssetId,
    allAssetIds,
  };

  const accumulator = applyHandlers(context, baseAssetId);
  return buildSchema(accumulator, folderRoot);
}
