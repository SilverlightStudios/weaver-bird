/**
 * Core asset ID parsing and normalization utilities
 */
import {
  EXACT_RENAMES, PREFIX_MAPPINGS, REGEX_TRANSFORMS, PRESERVED_NAMES,
  PRESSURE_PLATE_MAPPINGS, WALL_PATTERNS, SPECIAL_PATH_PATTERNS,
  VARIANT_GROUP_OVERRIDES, VARIANT_GROUP_PATTERNS,
  STRUCTURAL_SUFFIX_REGEX, STATE_SUFFIX_REGEX,
  VARIANT_STRUCTURAL_SUFFIX_REGEX, VARIANT_STATE_SUFFIX_REGEX,
  BLOCKSTATE_NUMERIC_SUFFIX_REGEX,
} from "../assetMappings";

export interface ParsedAssetId {
  original: string;
  namespace: string;
  category: string;
  baseName: string;
  variantGroupKey: string;
  variantNumber: string | null;
  isInventory: boolean;
}

/** Normalize an asset ID by removing trailing underscores and underscores before numbers */
export function normalizeAssetId(assetId: string): string {
  return assetId.replace(/\.png$/i, "").replace(/_(\d+)/g, "$1").replace(/_+$/, "");
}

function applySpecialPathTransforms(name: string): string | null {
  const variatedMatch = name.match(SPECIAL_PATH_PATTERNS.variated);
  if (variatedMatch) return variatedMatch[1];

  let transformed = name;
  if (SPECIAL_PATH_PATTERNS.break.test(transformed)) {
    transformed = transformed.replace(SPECIAL_PATH_PATTERNS.break, "");
  }
  if (SPECIAL_PATH_PATTERNS.oldIron.test(transformed)) {
    transformed = transformed.replace(SPECIAL_PATH_PATTERNS.oldIron, "");
  }

  const nestedMatch = transformed.match(SPECIAL_PATH_PATTERNS.nestedPath);
  if (nestedMatch) {
    if (transformed.includes("readme")) return "readme";
    transformed = nestedMatch[1];
  }

  return transformed !== name ? transformed : null;
}

function applyWallPatterns(name: string): string {
  if (WALL_PATTERNS.wallPrefix.test(name)) {
    return name.replace(WALL_PATTERNS.wallPrefix, "");
  }
  if (WALL_PATTERNS.wallInfix.test(name)) {
    return name.replace(WALL_PATTERNS.wallInfix, "_");
  }
  return name;
}

function applyMappings(name: string): string | null {
  if (EXACT_RENAMES[name]) return EXACT_RENAMES[name];

  for (const { prefix, target } of PREFIX_MAPPINGS) {
    if (name.startsWith(prefix)) return target;
  }

  for (const { pattern, replacement } of REGEX_TRANSFORMS) {
    if (pattern.test(name)) {
      if (typeof replacement === "function") {
        const match = name.match(pattern);
        if (match) return replacement(match);
      } else {
        return name.replace(pattern, replacement);
      }
    }
  }

  return null;
}

/** Compute the base name for blockstate lookup */
export function computeBaseName(name: string): string {
  name = name.replace(/\.png$/, "");

  const specialTransform = applySpecialPathTransforms(name);
  if (specialTransform) return specialTransform;

  name = name.replace(/^(warped|crimson)_fungi/, "$1_fungus");
  name = applyWallPatterns(name);

  const mapped = applyMappings(name);
  if (mapped) return mapped;

  if (PRESERVED_NAMES.has(name)) return name;

  if (name.endsWith("_pp")) {
    const base = name.replace(/_pp$/, "");
    return PRESSURE_PLATE_MAPPINGS[base] ?? `${base}_pressure_plate`;
  }

  return name
    .replace(/_dfx$/, "")
    .replace(STRUCTURAL_SUFFIX_REGEX, "")
    .replace(STATE_SUFFIX_REGEX, "")
    .replace(/\d+$/, "");
}

function handleWallTransforms(path: string): string {
  if (path.includes("/wall_")) return path.replace(/\/wall_/, "/");
  if (path.includes("_wall_")) return path.replace(/_wall_/, "_");
  return path;
}

function handlePottedPlants(path: string): string {
  if (path.includes("/potted_")) {
    return path
      .replace("/potted_", "/")
      .replace("/azalea_bush", "/azalea")
      .replace("/flowering_azalea_bush", "/flowering_azalea");
  }
  if (path.endsWith("_potted")) {
    return path.replace(/_potted$/, "");
  }
  return path;
}

function handleSpecialBlockNames(blockName: string, pathPrefix: string): { blockName: string; pathPrefix: string } {
  let name = blockName;
  let prefix = pathPrefix;

  if (name.endsWith("_wall_hanging_sign")) {
    name = name.replace(/_wall_hanging_sign$/, "_hanging_sign");
  } else if (name.endsWith("_wall_sign")) {
    name = name.replace(/_wall_sign$/, "_sign");
  } else if (name.startsWith("redstone_dust")) {
    name = "redstone_wire";
    prefix = "block";
  } else if (name === "campfire_fire" || name === "campfire_log") {
    name = "campfire";
    prefix = "block";
  } else if (name === "soul_campfire_fire" || name === "soul_campfire_log") {
    name = "soul_campfire";
    prefix = "block";
  }

  return { blockName: name, pathPrefix: prefix };
}

function stripVariantSuffixes(blockName: string): string {
  let name = blockName;
  let changed = true;
  while (changed) {
    const before = name;
    name = name.replace(VARIANT_STRUCTURAL_SUFFIX_REGEX, "");
    if (name === before) name = name.replace(VARIANT_STATE_SUFFIX_REGEX, "");
    changed = name !== before;
  }
  return name;
}

/** Compute the variant group key for UI grouping */
export function computeVariantGroupKey(fullPath: string): string {
  let path = fullPath;

  if (VARIANT_GROUP_OVERRIDES[path]) return VARIANT_GROUP_OVERRIDES[path];

  for (const { pattern, groupKey } of VARIANT_GROUP_PATTERNS) {
    if (pattern.test(path)) return groupKey;
  }

  if (path.startsWith("block/break/")) path = `block/${path.slice("block/break/".length)}`;

  path = handleWallTransforms(path);

  if (path.startsWith("colormap/")) {
    const parts = path.split("/");
    if (parts.length > 1) return `colormap/${parts[parts.length - 1]}`;
  }

  path = handlePottedPlants(path);

  const stemPatterns = [/(^|\/)pumpkin_stem$/, /(^|\/)melon_stem$/, /(^|\/)attached_pumpkin_stem$/, /(^|\/)attached_melon_stem$/];
  if (stemPatterns.some(p => p.test(path))) return path;

  const variatedMatch = path.match(/^(.+?)\/variated\/([^/]+)\//);
  if (variatedMatch) return `${variatedMatch[1]}/${variatedMatch[2]}`;

  const variatedMatchEnd = path.match(/^(.+?)\/variated\/([^/]+)\/([^/]+)$/);
  if (variatedMatchEnd) return `${variatedMatchEnd[1]}/${variatedMatchEnd[2]}`;

  const pathParts = path.split("/");
  const blockNameRaw = pathParts[pathParts.length - 1];
  const pathPrefixRaw = pathParts.slice(0, -1).join("/");

  const { blockName, pathPrefix } = handleSpecialBlockNames(blockNameRaw, pathPrefixRaw);

  const strippedBlockName = stripVariantSuffixes(blockName);

  path = pathPrefix ? `${pathPrefix}/${strippedBlockName}` : strippedBlockName;

  const numberMatch = path.match(/^(.+?)_?(\d+)$/);
  if (numberMatch) return numberMatch[1].replace(/_$/, "");

  return path;
}

function extractVariantNumber(name: string): string | null {
  if (BLOCKSTATE_NUMERIC_SUFFIX_REGEX.test(name)) return null;
  const match = name.match(/(\d+)$/);
  return match ? match[1] : null;
}

/** Parse an asset ID into its components */
export function parseAssetId(assetId: string): ParsedAssetId {
  const normalized = normalizeAssetId(assetId);
  const colonIndex = normalized.indexOf(":");
  const namespace = colonIndex >= 0 ? normalized.slice(0, colonIndex) : "minecraft";
  const fullPath = colonIndex >= 0 ? normalized.slice(colonIndex + 1) : normalized;
  const firstSlash = fullPath.indexOf("/");
  const category = firstSlash >= 0 ? fullPath.slice(0, firstSlash) : "";
  const name = firstSlash >= 0 ? fullPath.slice(firstSlash + 1) : fullPath;

  return {
    original: assetId, namespace, category,
    baseName: computeBaseName(name),
    variantGroupKey: computeVariantGroupKey(fullPath),
    variantNumber: extractVariantNumber(name),
    isInventory: /_inventory\d*$/.test(name),
  };
}

/** Extract the base name without variant suffixes */
export function getBaseName(assetId: string): string {
  const name = assetId.replace(/^minecraft:(block\/|item\/|)/, "").replace(/\.png$/, "");
  return computeBaseName(name);
}

/** Get the variant group key for an asset */
export function getVariantGroupKey(assetId: string): string {
  const normalized = normalizeAssetId(assetId);
  const pathMatch = normalized.match(/^[^:]*:(.+)$/);
  return computeVariantGroupKey(pathMatch ? pathMatch[1] : normalized);
}

/** Transform asset name to match blockstate file naming convention */
export function normalizeBlockNameForBlockstate(name: string): string {
  return name.endsWith("_potted") ? `potted_${name.replace(/_potted$/, "")}` : name;
}

/** Convert a texture asset ID to the canonical blockstate asset ID */
export function getBlockStateIdFromAssetId(assetId: string): string {
  const namespaceMatch = assetId.match(/^([^:]+):/);
  const namespace = namespaceMatch ? namespaceMatch[1] : "minecraft";
  const baseName = normalizeBlockNameForBlockstate(getBaseName(assetId));
  return `${namespace}:block/${baseName}`;
}

/** Convert an asset ID to its relative texture path inside a pack */
export function assetIdToTexturePath(assetId: string): string {
  const [namespace, rawPath] = assetId.includes(":") ? assetId.split(":") : ["minecraft", assetId];
  return `assets/${namespace}/textures/${rawPath}.png`;
}

/** Check if an asset ID represents a numbered variant */
export function isNumberedVariant(assetId: string): boolean {
  const name = assetId.replace(/^minecraft:(block\/|item\/|)/, "");
  return !BLOCKSTATE_NUMERIC_SUFFIX_REGEX.test(name) && /\d+$/.test(name);
}

/** Extract the variant number from an asset ID */
export function getVariantNumber(assetId: string): string | null {
  const name = assetId.replace(/^minecraft:(block\/|item\/|)/, "");
  if (BLOCKSTATE_NUMERIC_SUFFIX_REGEX.test(name)) return null;
  const match = name.match(/(\d+)$/);
  return match ? match[1] : null;
}
