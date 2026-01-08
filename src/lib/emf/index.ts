export {
  loadJEM,
  parseJEM,
  jemToThreeJS,
  addDebugVisualization,
  logHierarchy,
  mergeVariantTextures,
} from "./jemLoader";
export type {
  JEMFile,
  JEMModelPart,
  JEMBox,
  ParsedEntityModel,
  ParsedPart,
  ParsedBox,
  AnimationLayer,
} from "./jemLoader";

import type {
  JEMFile,
  ParsedEntityModel,
  AnimationLayer,
  JEMModelPart,
  ParsedPart,
} from "./jemLoader";
import {
  parseJEM as parseJEMImpl,
  parseJEMPart,
  mergeVariantTextures,
} from "./jemLoader";

function indexPartsByName(parts: ParsedPart[]): Map<string, ParsedPart> {
  const map = new Map<string, ParsedPart>();
  const visit = (part: ParsedPart) => {
    map.set(part.name, part);
    for (const child of part.children) visit(child);
  };
  for (const part of parts) visit(part);
  return map;
}

function mergeVanillaPivotsIntoAttachPlaceholders(
  parsed: ParsedEntityModel,
  vanilla: ParsedEntityModel,
): void {
  const vanillaMap = indexPartsByName(vanilla.parts);

  const apply = (part: ParsedPart) => {
    const subtreeHasBoxes = (p: ParsedPart): boolean => {
      if (p.boxes.length > 0) return true;
      for (const c of p.children) {
        if (subtreeHasBoxes(c)) return true;
      }
      return false;
    };

    // For `attach:true` models, packs often include "vanilla skeleton" placeholder
    // parts (e.g. `neck`, `tail`, `mane`) with no geometry. Their pivots are
    // defined by vanilla; using `[0,0,0]` here breaks JPM expressions that read
    // these bones (e.g. `var.Nty = neck.ty` in Fresh Animations horse).
    if (!subtreeHasBoxes(part)) {
      const vanillaPart = vanillaMap.get(part.name);
      if (vanillaPart) {
        part.origin = [...vanillaPart.origin];
        part.rotation = [...vanillaPart.rotation];
        part.scale = vanillaPart.scale;
      }
    }

    for (const child of part.children) apply(child);
  };

  for (const part of parsed.parts) apply(part);
}

/**
 * JPM (JSON Part Model) file format.
 * Used by OptiFine/EMF for external model references.
 */
type JPMFile = Omit<JEMModelPart, "part" | "id" | "animations"> & {
  credit?: string;
  animations?: AnimationLayer[];
};

/**
 * Load a JPM file from the resource pack.
 * Returns null if missing or invalid.
 */
async function loadJpmFile(
  jpmFileName: string,
  packPath: string,
  isZip: boolean,
  jemDir: string,
): Promise<JPMFile | null> {
  const { invoke } = await import("@tauri-apps/api/core");

  try {
    const ref = jpmFileName.replace(/\\/g, "/");
    const resolved =
      ref.startsWith("assets/") || ref.startsWith("minecraft/")
        ? ref.startsWith("assets/")
          ? ref
          : `assets/${ref}`
        : `${jemDir}${ref}`;
    const jpmPath = resolved;
    console.log(`[EMF] Loading JPM file: ${jpmPath}`);

    const jpmContent = await invoke<string>("read_pack_file", {
      packPath,
      filePath: jpmPath,
      isZip,
    });

    return JSON.parse(jpmContent) as JPMFile;
  } catch (error) {
    console.log(`[EMF] Failed to load JPM file ${jpmFileName}:`, error);
    return null;
  }
}

// Cache for parsed entity models to prevent re-parsing the same JEM files
const entityModelCache = new Map<
  string,
  (ParsedEntityModel & { jemSource: string; usedLegacyJem: boolean }) | null
>();

function getShulkerBoxBlockColor(path: string): string | null {
  const normalizedPath = path.replace(/\.png$/i, "");
  if (normalizedPath === "block/shulker_box") return "";
  const match = normalizedPath.match(/^block\/(.+)_shulker_box$/);
  return match ? match[1] ?? "" : null;
}

export function getEntityTextureAssetId(assetId: string): string {
  const normalized = (assetId.includes(":") ? assetId : `minecraft:${assetId}`)
    .replace(/\.png$/i, "");
  const [namespace, rawPath] = normalized.split(":");
  const path = rawPath ?? "";

  if (path.startsWith("entity/") || path.startsWith("chest/")) {
    return normalized;
  }

  const shulkerColor = getShulkerBoxBlockColor(path);
  if (shulkerColor !== null) {
    const suffix = shulkerColor ? `_${shulkerColor}` : "";
    return `${namespace}:entity/shulker/shulker${suffix}`;
  }

  return normalized;
}

export function isEntityTexture(assetId: string): boolean {
  if (assetId.includes("entity/")) {
    const match = assetId.match(/entity\/(.+)/);

    if (!match || !match[1] || match[1].trim() === "") {
      return false;
    }

    return true;
  }

  if (assetId.includes("chest/")) {
    const match = assetId.match(/chest\/(.+)/);
    if (!match || !match[1] || match[1].trim() === "") {
      return false;
    }
    return true;
  }

  if (assetId.includes("shulker_box/")) {
    const match = assetId.match(/shulker_box\/(.+)/);
    if (!match || !match[1] || match[1].trim() === "") {
      return false;
    }
    return true;
  }

  const path = assetId.replace(/^minecraft:/, "");
  return getShulkerBoxBlockColor(path) !== null;
}

export function getEntityInfoFromAssetId(assetId: string): {
  variant: string;
  parent: string | null;
} | null {
  const path = assetId.replace(/^minecraft:/, "");

  const match = path.match(/entity\/(.+)/);
  if (!match) {
    if (path.includes("chest/")) {
      if (path.includes("trapped"))
        return { variant: "trapped_chest", parent: null };
      if (path.includes("ender"))
        return { variant: "ender_chest", parent: null };
      return { variant: "chest", parent: null };
    }

    if (path.includes("shulker_box/")) {
      return { variant: "shulker_box", parent: null };
    }

    if (getShulkerBoxBlockColor(path) !== null) {
      return { variant: "shulker_box", parent: null };
    }

    return null;
  }

  const fullPath = match[1];
  const segments = fullPath.split("/");

  if (segments.length === 1) {
    if (segments[0] === "banner_base") {
      return { variant: "banner", parent: null };
    }
    return { variant: segments[0], parent: null };
  } else {
    if (segments[0] === "banner") {
      return { variant: "banner", parent: null };
    }
    if (segments[0] === "decorated_pot") {
      // Treat all decorated pot texture variants (base + pottery patterns)
      // as one model family, similar to banners.
      return { variant: "decorated_pot", parent: null };
    }
    if (segments[0] === "equipment") {
      // Equipment textures are not standalone entities; they are rendered on top
      // of base rigs (humanoid, horse, wolf, etc). Map them to our vanilla JEM
      // "display rigs" so the preview can render.
      const kind = segments[1] ?? "";
      const lower = kind.toLowerCase();

      // Humanoid armor uses two texture layers; leggings use layer 2, most
      // other pieces use layer 1.
      if (lower.includes("humanoid_leggings") || lower.includes("leggings")) {
        return { variant: "armor_layer_2", parent: null };
      }
      if (lower.includes("humanoid")) {
        return { variant: "armor_layer_1", parent: null };
      }

      // Animal equipment.
      // Saddles/harnesses generally have their own CEM model named after the
      // equipment kind (e.g. `pig_saddle`, `camel_saddle`, `happy_ghast_harness`).
      if (lower.includes("_saddle") || lower.endsWith("saddle")) {
        return { variant: lower, parent: null };
      }
      if (lower.includes("_harness") || lower.endsWith("harness")) {
        return { variant: lower, parent: null };
      }

      // Horse armor textures live under `equipment/horse_body/*` but the model
      // is named `horse_armor` in OptiFine/vanilla mocks.
      if (lower.includes("horse")) return { variant: "horse_armor", parent: null };
      if (lower.includes("wolf")) return { variant: "wolf_armor", parent: null };

      // Default to the equipment kind (many equipment categories have a
      // matching vanilla/pack CEM model). If missing, the renderer will show
      // a placeholder instead of an incorrect humanoid rig.
      return { variant: lower, parent: null };
    }
    if (segments[0] === "signs") {
      const woodType = segments[segments.length - 1];
      let signType = "";

      if (segments.length === 3) {
        signType = `_${segments[1]}_sign`;
      } else {
        signType = "_sign";
      }

      return {
        variant: `${woodType}${signType}`,
        parent: "signs",
      };
    }

    const variant = segments[segments.length - 1];

    let parent = segments[0];
    if (variant.includes("mooshroom")) {
      parent = "mooshroom";
    }

    if (parent === "boat" && variant === "bamboo") {
      return { variant: "raft", parent: null };
    }
    if (parent === "chest_boat" && variant === "bamboo") {
      return { variant: "chest_raft", parent: null };
    }

    return { variant, parent };
  }
}

export function getEntityTypeFromAssetId(assetId: string): string | null {
  const info = getEntityInfoFromAssetId(assetId);
  return info?.variant ?? null;
}

export function getEntityVariants(assetId: string): string[] {
  const info = getEntityInfoFromAssetId(assetId);
  if (!info) return [];

  if (info.variant.includes("_hanging_sign")) {
    return ["wall", "ceiling", "ceiling_middle"];
  }

  return [];
}

function normalizeEntityName(entityName: string): string {
  const normalizations: Record<string, string> = {
    armorstand: "armor_stand",
    polarbear: "polar_bear",
  };

  return normalizations[entityName] || entityName;
}

function getJemDir(jemPath: string): string {
  const normalized = jemPath.replace(/\\/g, "/");
  const idx = normalized.lastIndexOf("/");
  if (idx === -1) return "";
  return normalized.slice(0, idx + 1);
}

function parseVersionParts(value: string): number[] | null {
  const cleaned = value.replace(/^v/i, "").replace(/^1\./, "");
  const parts = cleaned
    .split(".")
    .map((p) => (p.match(/^\d+$/) ? parseInt(p, 10) : NaN));
  if (parts.length === 0 || parts.some((n) => Number.isNaN(n))) return null;
  return parts;
}

function compareVersionFoldersDesc(a: string, b: string): number {
  const ap = parseVersionParts(a);
  const bp = parseVersionParts(b);
  if (!ap && !bp) return a.localeCompare(b);
  if (!ap) return 1;
  if (!bp) return -1;
  const len = Math.max(ap.length, bp.length);
  for (let i = 0; i < len; i++) {
    const av = ap[i] ?? 0;
    const bv = bp[i] ?? 0;
    if (av !== bv) return bv - av;
  }
  return 0;
}

function getVersionFolderCandidates(
  targetVersion: string | null | undefined,
  knownFolders: string[] | undefined,
): string[] {
  const out: string[] = [];
  const add = (v: string) => {
    const trimmed = v.trim();
    if (!trimmed) return;
    if (!out.includes(trimmed)) out.push(trimmed);
  };

  if (targetVersion) {
    add(targetVersion);
    if (targetVersion.startsWith("1.")) add(targetVersion.slice(2));
    // Also add major.minor (e.g. 1.21.4 -> 21.4) if present
    const m = targetVersion.replace(/^1\./, "").match(/^(\d+\.\d+)/);
    if (m?.[1]) add(m[1]);
  }

  if (knownFolders && knownFolders.length > 0) {
    const sorted = [...knownFolders].sort(compareVersionFoldersDesc);
    for (const v of sorted) add(v);
  }

  return out;
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
): Promise<
  (ParsedEntityModel & { jemSource?: string; usedLegacyJem?: boolean }) | null
> {
  const normalizedEntityType = normalizeEntityName(entityType);

  // Create cache key from all parameters that affect the result
  const cacheKey = `${normalizedEntityType}:${packPath || "vanilla"}:${isZip}:${parentEntity || "none"}:${packFormat || "default"}:${selectedVariant || "default"}:${targetVersion || "auto"}`;

  // Check cache first
  if (entityModelCache.has(cacheKey)) {
    console.log("[EMF] ✓ Using cached model for:", normalizedEntityType);
    return entityModelCache.get(cacheKey) || null;
  }

  console.log(
    "[EMF] Loading entity model:",
    normalizedEntityType,
    "parent:",
    parentEntity,
    "packFormat:",
    packFormat,
  );

  const { invoke } = await import("@tauri-apps/api/core");

  const tryLoadJemPath = async (
    jemPath: string,
    jemNameForVanillaPivot: string,
    source: string,
  ): Promise<(ParsedEntityModel & { jemSource: string; usedLegacyJem: boolean }) | null> => {
    try {
      console.log(`[EMF] Trying ${source} JEM:`, jemPath);

      const jemContent = await invoke<string>("read_pack_file", {
        packPath: packPath!,
        filePath: jemPath,
        isZip: isZip ?? false,
      });

      const jemData = JSON.parse(jemContent) as JEMFile;
      console.log(`[EMF] ✓ Loaded ${source} JEM`);

      const parsed = parseJEMImpl(jemData);
      const hasAttachModel = !!jemData.models?.some(
        (modelPart) =>
          modelPart.attach === true || modelPart.attach === "true",
      );

      // Load external JPM files for animations and optional geometry.
      if (packPath && jemData.models) {
        const jpmCache = new Map<string, JPMFile | null>();
        const jemDir = getJemDir(jemPath);

        const partMap = new Map<string, ParsedPart>();
        const indexPart = (p: ParsedPart) => {
          partMap.set(p.name, p);
          for (const c of p.children) indexPart(c);
        };
        const reindex = () => {
          partMap.clear();
          for (const p of parsed.parts) indexPart(p);
        };
        reindex();

        const replacePart = (
          list: ParsedPart[],
          name: string,
          replacement: ParsedPart,
        ): boolean => {
          for (let i = 0; i < list.length; i++) {
            if (list[i].name === name) {
              list[i] = replacement;
              return true;
            }
            if (replacePart(list[i].children, name, replacement)) return true;
          }
          return false;
        };

        const attachToParent = (
          child: ParsedPart,
          parentName: string | null,
        ) => {
          if (parentName && parentName !== child.name) {
            const parent = partMap.get(parentName);
            if (parent) {
              parent.children.push(child);
              return;
            }
          }
          parsed.parts.push(child);
        };

        for (const modelPart of jemData.models) {
          if (
            !modelPart.model ||
            !/\.jpm$/i.test(String(modelPart.model).trim())
          )
            continue;

          const jpmFileName = String(modelPart.model).trim();
          const childName =
            modelPart.id ||
            modelPart.part ||
            jpmFileName.replace(/\.jpm$/i, "");
          const parentName = modelPart.part || null;
          const isAttach =
            modelPart.attach === true || modelPart.attach === "true";

          // Cache by resolved path (JEM-relative), not by raw reference.
          const cacheKey = `${jemDir}:${jpmFileName}`;
          let jpmData = jpmCache.get(cacheKey);
          if (jpmData === undefined) {
            jpmData = await loadJpmFile(
              jpmFileName,
              packPath,
              isZip ?? false,
              jemDir,
            );
            jpmCache.set(cacheKey, jpmData);
          }

          if (jpmData?.animations && jpmData.animations.length > 0) {
            parsed.animations ??= [];
            parsed.animations.push(...jpmData.animations);
            console.log(
              `[EMF] ✓ Merged ${jpmData.animations.length} animation layers from ${jpmFileName}`,
            );
          }

          const hasGeometry =
            !!jpmData &&
            ((jpmData.boxes && jpmData.boxes.length > 0) ||
              jpmData.submodel ||
              (jpmData.submodels && jpmData.submodels.length > 0));

          // Avoid creating duplicate bones unless we are replacing
          if (isAttach && partMap.has(childName)) continue;

          if (isAttach) {
	            if (hasGeometry && jpmData) {
	              const jpmPart = parseJEMPart(
	                { ...(jpmData as JEMModelPart), id: childName, part: childName },
	                jpmData.textureSize || parsed.textureSize,
	                { isJpm: true },
	                parsed.texturePath,
	              );
              jpmPart.name = childName;
              attachToParent(jpmPart, parentName);
            } else {
              // Create empty attachment bone for animations/pivots
              const attachClone: JEMModelPart = { ...modelPart };
              delete (attachClone as any).model;
              delete (attachClone as any).attach;
	              const emptyPart = parseJEMPart(
	                attachClone,
	                parsed.textureSize,
	                {},
	                parsed.texturePath,
	              );
              emptyPart.boxes = [];
              emptyPart.children = [];
              emptyPart.name = childName;
              attachToParent(emptyPart, parentName);
            }
          } else {
            // Replacement/standalone external part
            const baseClone: JEMModelPart = { ...modelPart };
            delete (baseClone as any).model;
            delete (baseClone as any).attach;
	            const basePart = parseJEMPart(
	              baseClone,
	              parsed.textureSize,
	              {},
	              parsed.texturePath,
	            );
	            basePart.name = childName;

            if (hasGeometry && jpmData) {
	              const jpmPart = parseJEMPart(
	                { ...(jpmData as JEMModelPart), id: childName, part: childName },
	                jpmData.textureSize || parsed.textureSize,
	                { isJpm: true },
	                parsed.texturePath,
	              );
              basePart.boxes = jpmPart.boxes;
              basePart.children = jpmPart.children;

              if (!modelPart.rotate) basePart.rotation = jpmPart.rotation;
              if (modelPart.scale == null) basePart.scale = jpmPart.scale;
              if (!modelPart.mirrorTexture)
                basePart.mirrorUV = jpmPart.mirrorUV;
              if (!modelPart.translate) basePart.origin = jpmPart.origin;
            }

            if (!replacePart(parsed.parts, childName, basePart)) {
              parsed.parts.push(basePart);
            }
          }

          reindex();
        }
      }

      // If this pack uses `attach:true`, merge vanilla pivots into any empty
      // placeholder parts so JPM expressions can read correct bone values.
      if (hasAttachModel) {
        const vanilla = await tryLoadVanillaJem(jemNameForVanillaPivot);
        if (vanilla) {
          mergeVanillaPivotsIntoAttachPlaceholders(parsed, vanilla);
        }
      }

      const subtreeHasBoxes = (p: ParsedPart): boolean => {
        if (p.boxes.length > 0) return true;
        for (const c of p.children) {
          if (subtreeHasBoxes(c)) return true;
        }
        return false;
      };

      const hasValidBoxes = parsed.parts.some(subtreeHasBoxes);
        if (!hasValidBoxes) {
          console.log(
            `[EMF] ✗ ${source} JEM has no valid boxes (likely texture-only variant):`,
            jemNameForVanillaPivot,
          );

        // Prevent infinite loop: don't try to merge an entity with itself
        if (
          parentEntity &&
          packPath &&
          parentEntity !== jemNameForVanillaPivot
        ) {
          console.log(
            `[EMF] Attempting to merge textures from ${jemNameForVanillaPivot} with geometry from ${parentEntity}`,
          );

          const baseModel = await tryLoadJemByName(
            parentEntity,
            "parent for texture merge",
          );

          if (baseModel) {
            const merged = mergeVariantTextures(baseModel, jemData);
            console.log(
              `[EMF] ✓ Successfully merged ${jemNameForVanillaPivot} textures with ${parentEntity} geometry`,
            );

            // Preserve animations from the original parsed model
            if (parsed.animations && parsed.animations.length > 0) {
              merged.animations = parsed.animations;
            }

            return {
              ...merged,
              texturePath: merged.texturePath || `entity/${entityType}`,
              jemSource: `${jemNameForVanillaPivot} (merged with ${parentEntity})`,
              usedLegacyJem: false,
            };
          }
        }

        return null;
      }

      return {
        ...parsed,
        texturePath: parsed.texturePath || `entity/${entityType}`,
        jemSource: jemPath,
        usedLegacyJem: false,
      };
    } catch {
      console.log(`[EMF] ${source} JEM not found:`, jemPath);
      return null;
    }
  };

  const tryLoadJemByName = async (
    jemName: string,
    source: string,
  ): Promise<(ParsedEntityModel & { jemSource: string; usedLegacyJem: boolean }) | null> => {
    const baseName = normalizeEntityName(jemName);
    const known = entityVersionVariants?.[baseName];
    const versionFolders = getVersionFolderCandidates(targetVersion, known);

    // Prefer versioned folders first (Fresh Animations commonly stores newer
    // entities in version directories), then fall back to root.
    const candidates: string[] = [];
    const add = (p: string) => {
      if (!candidates.includes(p)) candidates.push(p);
    };
    for (const folder of versionFolders) {
      add(`assets/minecraft/optifine/cem/${folder}/${baseName}.jem`);
    }
    add(`assets/minecraft/optifine/cem/${baseName}.jem`);

    for (const jemPath of candidates) {
      const result = await tryLoadJemPath(jemPath, baseName, source);
      if (result) return result;
    }
    return null;
  };

  const tryLoadVanillaJem = async (
    jemName: string,
  ): Promise<
    (ParsedEntityModel & { jemSource: string; usedLegacyJem: boolean }) | null
  > => {
    try {
      console.log("[EMF] Looking for vanilla JEM:", jemName);
      const jemContent = await invoke<string>("read_vanilla_jem", {
        entityType: jemName,
      });

      const jemData = JSON.parse(jemContent) as JEMFile;
      console.log("[EMF] ✓ Vanilla JEM loaded:", jemName);

      const parsed = parseJEMImpl(jemData);

      const hasValidBoxes = parsed.parts.some((part) => part.boxes.length > 0);
      if (!hasValidBoxes) {
        console.log("[EMF] ✗ Vanilla JEM has no valid boxes:", jemName);
        return null;
      }

      return {
        ...parsed,
        texturePath: parsed.texturePath || `entity/${entityType}`,
        jemSource: jemName,
        usedLegacyJem: false,
      };
    } catch {
      console.log("[EMF] Vanilla JEM not found:", jemName);
      return null;
    }
  };

  if (packPath) {
    if (selectedVariant) {
      if (entityType.includes("_hanging_sign")) {
        const woodType = entityType.replace("_hanging_sign", "");
        const result = await tryLoadJemByName(
          `${woodType}/${selectedVariant}_hanging_sign`,
          `selected variant (${selectedVariant})`,
        );
        if (result) {
          entityModelCache.set(cacheKey, result);
          return result;
        }
      }
    }

    let result = await tryLoadJemByName(normalizedEntityType, "variant");
    if (result) {
      entityModelCache.set(cacheKey, result);
      return result;
    }

    if (parentEntity) {
      const normalizedParent = normalizeEntityName(parentEntity);
      result = await tryLoadJemByName(normalizedParent, "parent");
      if (result) {
        entityModelCache.set(cacheKey, result);
        return result;
      }
    }

    if (packFormat) {
      let legacyVersion: string | null = null;

      if (packFormat < 55) {
        legacyVersion = "21.4";
      } else if (packFormat < 46) {
        legacyVersion = "21.1";
      }

      if (legacyVersion) {
        const versionedName = `${parentEntity || normalizedEntityType}_${legacyVersion}`;

        result = await tryLoadJemByName(versionedName, "legacy versioned");
        if (result) {
          result.usedLegacyJem = true;
          entityModelCache.set(cacheKey, result);
          return result;
        }
      }
    }
  }

  if (selectedVariant) {
    if (normalizedEntityType.includes("_hanging_sign")) {
      const woodType = normalizedEntityType.replace("_hanging_sign", "");
      const result = await tryLoadVanillaJem(
        `${woodType}/${selectedVariant}_hanging_sign`,
      );
      if (result) {
        entityModelCache.set(cacheKey, result);
        return result;
      }
    }
  }

  let result = await tryLoadVanillaJem(normalizedEntityType);
  if (result) {
    entityModelCache.set(cacheKey, result);
    return result;
  }

  if (parentEntity) {
    const normalizedParent = normalizeEntityName(parentEntity);
    result = await tryLoadVanillaJem(normalizedParent);
    if (result) {
      entityModelCache.set(cacheKey, result);
      return result;
    }
  }

  console.log(`[EMF] No JEM found for ${normalizedEntityType}`);

  // Cache the null result to prevent repeated failed lookups
  entityModelCache.set(cacheKey, null);
  return null;
}

// Export function to clear cache when packs change
export function clearEntityModelCache() {
  entityModelCache.clear();
  console.log("[EMF] Entity model cache cleared");
}
