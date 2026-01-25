/**
 * Helper functions for entity model loading
 * Extracted from entityLoader.ts to reduce file size
 *
 * TODO: Further split this file into smaller modules:
 * - jemLoading.ts (tryLoadJemPath, tryLoadJemByName)
 * - jpmProcessing.ts (processJpmModels)
 * - vanillaLoading.ts (tryLoadVanillaJem, mergeVanillaPivots)
 */
/* eslint-disable max-lines, complexity, max-depth */

import type { ParsedPart, ParsedEntityModel, JEMFile, JEMModelPart } from "./jemLoader";
import { parseJEM, parseJEMPart, mergeVariantTextures, applyVariantPartMask } from "./jemLoader";
import { loadJpmFile, type JPMFile } from "./jpmLoader";
import { getJemDir, normalizeEntityName, getVersionFolderCandidates, mergeVanillaPivotsIntoAttachPlaceholders } from "./utils";
import { invoke } from "@tauri-apps/api/core";

/** Index all parts in a tree by name */
export function createPartIndexer() {
  const partMap = new Map<string, ParsedPart>();

  const indexPart = (p: ParsedPart) => {
    partMap.set(p.name, p);
    for (const c of p.children) indexPart(c);
  };

  const reindex = (parts: ParsedPart[]) => {
    partMap.clear();
    for (const p of parts) indexPart(p);
  };

  return { partMap, reindex };
}

/** Replace a part in the tree by name */
export function replacePart(
  list: ParsedPart[],
  name: string,
  replacement: ParsedPart,
): boolean {
  for (let i = 0; i < list.length; i++) {
    if (list[i].name === name) {
      list[i] = replacement;
      return true;
    }
    if (replacePart(list[i].children, name, replacement)) return true;
  }
  return false;
}

/** Attach child part to parent by name, or to root if not found */
export function attachToParent(
  child: ParsedPart,
  parentName: string | null,
  partMap: Map<string, ParsedPart>,
  rootParts: ParsedPart[],
) {
  if (parentName && parentName !== child.name) {
    const parent = partMap.get(parentName);
    if (parent) {
      parent.children.push(child);
      return;
    }
  }
  rootParts.push(child);
}

/** Check if part subtree has any boxes */
export function subtreeHasBoxes(p: ParsedPart): boolean {
  if (p.boxes.length > 0) return true;
  for (const c of p.children) {
    if (subtreeHasBoxes(c)) return true;
  }
  return false;
}

/** Build list of version folder candidates */
export function buildVersionCandidates(targetVersion: string | null | undefined): string[] {
  const out: string[] = [];
  const add = (p: string) => {
    const trimmed = p.trim().replace(/^\/+|\/+$/g, "");
    if (trimmed && !out.includes(trimmed)) out.push(trimmed);
  };

  if (targetVersion) {
    add(targetVersion);
    if (targetVersion.startsWith("1.")) add(targetVersion.slice(2));
    const m = targetVersion.replace(/^1\./, "").match(/^(\d+\.\d+)/);
    if (m?.[1]) add(m[1]);
    for (const v of [...out]) add(v.replace(/\./g, "-"));
  }

  return out;
}

/** Try to load JEM from a specific path */
export async function tryLoadJemPath(
  jemPath: string,
  jemNameForVanillaPivot: string,
  source: string,
  packPath: string,
  isZip: boolean,
  fallbackBaseName?: string,
): Promise<(ParsedEntityModel & { jemSource: string; usedLegacyJem: boolean }) | null> {
  try {
    console.log(`[EMF] Trying ${source} JEM:`, jemPath);

    const jemContent = await invoke<string>("read_pack_file", {
      packPath,
      filePath: jemPath,
      isZip,
    });

    const jemData = JSON.parse(jemContent) as JEMFile;
    console.log(`[EMF] ✓ Loaded ${source} JEM`);

    const parsed = parseJEM(jemData);
    const hasAttachModel = !!jemData.models?.some(
      (modelPart) =>
        modelPart.attach === true || modelPart.attach === "true",
    );

    // Load external JPM files for animations and optional geometry
    if (jemData.models) {
      await processJpmModels(jemData.models, parsed, packPath, isZip, jemPath);
    }

    // Merge vanilla fallback pivots/hierarchies if needed
    const jemBaseName = fallbackBaseName ?? jemNameForVanillaPivot;
    await mergeVanillaPivots(parsed, jemBaseName, hasAttachModel);

    return {
      ...parsed,
      jemSource: source,
      usedLegacyJem: jemPath.includes("/cem/") && !jemPath.includes("/optifine/cem/"),
    };
  } catch (error) {
    console.log(`[EMF] Could not load ${source} JEM (${jemPath}):`, error);
    return null;
  }
}

async function processJpmModels(
  models: JEMModelPart[],
  parsed: ParsedEntityModel,
  packPath: string,
  isZip: boolean,
  jemPath: string,
) {
  const jpmCache = new Map<string, JPMFile | null>();
  const jemDir = getJemDir(jemPath);

  const { partMap, reindex } = createPartIndexer();
  reindex(parsed.parts);

  for (const modelPart of models) {
    if (
      !modelPart.model ||
      !/\.jpm$/i.test(String(modelPart.model).trim())
    )
      continue;

    const jpmFileName = String(modelPart.model).trim();
    const childName =
      modelPart.id ??
      modelPart.part ??
      jpmFileName.replace(/\.jpm$/i, "");
    const parentName = modelPart.part ?? null;
    const isAttach =
      modelPart.attach === true || modelPart.attach === "true";

    // Cache by resolved path (JEM-relative), not by raw reference
    const cacheKey = `${jemDir}:${jpmFileName}`;
    let jpmData = jpmCache.get(cacheKey);
    if (jpmData === undefined) {
      jpmData = await loadJpmFile(
        jpmFileName,
        packPath,
        isZip,
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

    const hasGeometry = !!(
      jpmData && (
        (jpmData.boxes?.length ?? 0) > 0 ||
        !!jpmData.submodel ||
        (jpmData.submodels?.length ?? 0) > 0
      )
    );

    // Avoid creating duplicate bones unless we are replacing
    if (isAttach && partMap.has(childName)) continue;

    if (isAttach) {
      if (hasGeometry && jpmData) {
        const jpmPart = parseJEMPart(
          { ...(jpmData as JEMModelPart), id: childName, part: childName },
          jpmData.textureSize ?? parsed.textureSize,
          { isJpm: true },
          parsed.texturePath,
        );
        jpmPart.name = childName;
        attachToParent(jpmPart, parentName, partMap, parsed.parts);
      } else {
        // Create empty attachment bone for animations/pivots
        const attachClone: JEMModelPart = { ...modelPart };
        delete attachClone.model;
        delete attachClone.attach;
        const emptyPart = parseJEMPart(
          attachClone,
          parsed.textureSize,
          {},
          parsed.texturePath,
        );
        emptyPart.boxes = [];
        emptyPart.children = [];
        emptyPart.name = childName;
        attachToParent(emptyPart, parentName, partMap, parsed.parts);
      }
    } else {
      // Replacement/standalone external part
      const baseClone: JEMModelPart = { ...modelPart };
      delete baseClone.model;
      delete baseClone.attach;
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
          jpmData.textureSize ?? parsed.textureSize,
          { isJpm: true },
          parsed.texturePath,
        );
        basePart.boxes = jpmPart.boxes;
        basePart.children = jpmPart.children;

        if (!modelPart.rotate) basePart.rotation = jpmPart.rotation;
        if (modelPart.scale == null) basePart.scale = jpmPart.scale;

        if (subtreeHasBoxes(jpmPart)) {
          if (!jpmData.textureSize) {
            if (basePart.textureSize) {
              console.warn(
                `[EMF] JPM ${jpmFileName} has geometry but no textureSize; using parent textureSize`,
              );
            } else {
              console.warn(
                `[EMF] JPM ${jpmFileName} has geometry but no textureSize`,
              );
            }
          }
        }
      }

      const existing = partMap.get(childName);
      if (existing) {
        if (replacePart(parsed.parts, childName, basePart)) {
          console.log(`[EMF] Replaced part ${childName} with JPM`);
        }
      } else {
        attachToParent(basePart, parentName, partMap, parsed.parts);
      }
    }

    reindex(parsed.parts);
  }
}

async function mergeVanillaPivots(
  parsed: ParsedEntityModel,
  jemBaseName: string,
  hasAttachModel: boolean,
) {
  if (hasAttachModel) {
    const vanilla = await tryLoadVanillaJem(jemBaseName, jemBaseName);
    if (vanilla) {
      mergeVanillaPivotsIntoAttachPlaceholders(parsed, vanilla);
    } else {
      console.log(
        `[EMF] No vanilla pivots available for ${jemBaseName}; skipping attach placeholder merge`,
      );
    }
  } else {
    console.log(
      `[EMF] No attach models => skipping vanilla pivot merge for ${jemBaseName}`,
    );
  }
}

/** Try to load JEM by entity name with version fallbacks */
export async function tryLoadJemByName(
  jemName: string,
  source: string,
  packPath: string,
  isZip: boolean,
  targetVersion: string | null | undefined,
  entityVersionVariants?: Record<string, string[]>,
  options?: { fallbackBaseName?: string },
): Promise<(ParsedEntityModel & { jemSource: string; usedLegacyJem: boolean }) | null> {
  const baseName = normalizeEntityName(jemName);
  const known = entityVersionVariants?.[baseName];
  const versionFolders = getVersionFolderCandidates(targetVersion, known);

  // Prefer versioned folders first (Fresh Animations commonly stores newer
  // entities in version directories), then fall back to root
  const candidates: string[] = [];
  for (const folder of versionFolders) {
    const path = `assets/minecraft/optifine/cem/${folder}/${baseName}.jem`;
    if (!candidates.includes(path)) candidates.push(path);
  }
  const rootPath = `assets/minecraft/optifine/cem/${baseName}.jem`;
  if (!candidates.includes(rootPath)) candidates.push(rootPath);

  for (const jemPath of candidates) {
    const result = await tryLoadJemPath(
      jemPath,
      baseName,
      source,
      packPath,
      isZip,
      options?.fallbackBaseName,
    );
    if (result) return result;
  }
  return null;
}

/** Try to load vanilla JEM from JAR */
export async function tryLoadVanillaJem(
  jemName: string,
  entityType: string,
  fallbackBaseName?: string,
): Promise<
  (ParsedEntityModel & { jemSource: string; usedLegacyJem: boolean }) | null
> {
  try {
    console.log("[EMF] Looking for vanilla JEM:", jemName);
    const jemContent = await invoke<string>("read_vanilla_jem", {
      entityType: jemName,
    });

    const jemData = JSON.parse(jemContent) as JEMFile;
    console.log("[EMF] ✓ Vanilla JEM loaded:", jemName);

    const parsed = parseJEM(jemData);

    // Note: Vanilla JEMs cannot load JPM files since they're in the JAR, not a pack
    // JPM processing only happens for pack-based JEMs

    const hasValidBoxes = parsed.parts.some((part) => part.boxes.length > 0);
    if (!hasValidBoxes) {
      console.log("[EMF] ✗ Vanilla JEM has no valid boxes:", jemName);
      if (fallbackBaseName && fallbackBaseName !== jemName) {
        const baseModel = await tryLoadVanillaJem(fallbackBaseName, entityType);
        if (baseModel) {
          const merged = mergeVariantTextures(baseModel, jemData);
          const masked = applyVariantPartMask(merged, jemData);
          return {
            ...masked,
            texturePath: masked.texturePath ?? `entity/${entityType}`,
            jemSource: `${jemName} (masked ${fallbackBaseName})`,
            usedLegacyJem: baseModel.usedLegacyJem,
          };
        }
      }
      return null;
    }

    return {
      ...parsed,
      texturePath: parsed.texturePath ?? `entity/${entityType}`,
      jemSource: jemName,
      usedLegacyJem: false,
    };
  } catch {
    console.log("[EMF] Vanilla JEM not found:", jemName);
    return null;
  }
}
