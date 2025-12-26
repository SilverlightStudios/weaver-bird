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
): Promise<JPMFile | null> {
  const { invoke } = await import("@tauri-apps/api/core");

  try {
    const jpmPath = `assets/minecraft/optifine/cem/${jpmFileName}`;
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

  return false;
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

    return null;
  }

  const fullPath = match[1];
  const segments = fullPath.split("/");

  if (segments.length === 1) {
    return { variant: segments[0], parent: null };
  } else {
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

export async function loadEntityModel(
  entityType: string,
  packPath?: string,
  isZip?: boolean,
  _targetVersion?: string | null,
  _entityVersionVariants?: Record<string, string[]>,
  parentEntity?: string | null,
  packFormat?: number,
  selectedVariant?: string,
): Promise<
  (ParsedEntityModel & { jemSource?: string; usedLegacyJem?: boolean }) | null
> {
  const normalizedEntityType = normalizeEntityName(entityType);

  // Create cache key from all parameters that affect the result
  const cacheKey = `${normalizedEntityType}:${packPath || "vanilla"}:${isZip}:${parentEntity || "none"}:${packFormat || "default"}:${selectedVariant || "default"}`;

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

  const tryLoadJem = async (
    jemName: string,
    source: string,
  ): Promise<
    (ParsedEntityModel & { jemSource: string; usedLegacyJem: boolean }) | null
  > => {
    try {
      const jemPath = `assets/minecraft/optifine/cem/${jemName}.jem`;
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
          if (!modelPart.model || !modelPart.model.endsWith(".jpm")) continue;

          const jpmFileName = modelPart.model;
          const childName =
            modelPart.id ||
            modelPart.part ||
            jpmFileName.replace(/\.jpm$/i, "");
          const parentName = modelPart.part || null;
          const isAttach =
            modelPart.attach === true || modelPart.attach === "true";

          let jpmData = jpmCache.get(jpmFileName);
          if (jpmData === undefined) {
            jpmData = await loadJpmFile(
              jpmFileName,
              packPath,
              isZip ?? false,
            );
            jpmCache.set(jpmFileName, jpmData);
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
        const vanilla = await tryLoadVanillaJem(jemName);
        if (vanilla) {
          mergeVanillaPivotsIntoAttachPlaceholders(parsed, vanilla);
        }
      }

      const hasValidBoxes = parsed.parts.some((part) => part.boxes.length > 0);
      if (!hasValidBoxes) {
        console.log(
          `[EMF] ✗ ${source} JEM has no valid boxes (likely texture-only variant):`,
          jemName,
        );

        // Prevent infinite loop: don't try to merge an entity with itself
        if (parentEntity && packPath && parentEntity !== jemName) {
          console.log(
            `[EMF] Attempting to merge textures from ${jemName} with geometry from ${parentEntity}`,
          );

          const baseModel = await tryLoadJem(
            parentEntity,
            "parent for texture merge",
          );

          if (baseModel) {
            const merged = mergeVariantTextures(baseModel, jemData);
            console.log(
              `[EMF] ✓ Successfully merged ${jemName} textures with ${parentEntity} geometry`,
            );

            // Preserve animations from the original parsed model
            if (parsed.animations && parsed.animations.length > 0) {
              merged.animations = parsed.animations;
            }

            return {
              ...merged,
              texturePath: merged.texturePath || `entity/${entityType}`,
              jemSource: `${jemName} (merged with ${parentEntity})`,
              usedLegacyJem: false,
            };
          }
        }

        return null;
      }

      return {
        ...parsed,
        texturePath: parsed.texturePath || `entity/${entityType}`,
        jemSource: jemName,
        usedLegacyJem: false,
      };
    } catch {
      console.log(`[EMF] ${source} JEM not found:`, jemName);
      return null;
    }
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
        const result = await tryLoadJem(
          `${woodType}/${selectedVariant}_hanging_sign`,
          `selected variant (${selectedVariant})`,
        );
        if (result) {
          entityModelCache.set(cacheKey, result);
          return result;
        }
      }
    }

    let result = await tryLoadJem(normalizedEntityType, "variant");
    if (result) {
      entityModelCache.set(cacheKey, result);
      return result;
    }

    if (parentEntity) {
      const normalizedParent = normalizeEntityName(parentEntity);
      result = await tryLoadJem(normalizedParent, "parent");
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

        result = await tryLoadJem(versionedName, "legacy versioned");
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
