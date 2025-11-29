/**
 * EMF (Entity Model Features) module
 *
 * Provides JEM entity model loading and conversion to Three.js
 */

// Export the new simplified JEM loader
export {
  loadJEM,
  parseJEM,
  jemToThreeJS,
  addDebugVisualization,
  logHierarchy,
} from "./jemLoader";
export type {
  JEMFile,
  JEMModelPart,
  JEMBox,
  ParsedEntityModel,
  ParsedPart,
  ParsedBox,
} from "./jemLoader";

// Import types for internal use in this file
import type { JEMFile, ParsedEntityModel } from "./jemLoader";
import { parseJEM as parseJEMImpl } from "./jemLoader";

/**
 * Helper to check if an asset ID is an entity texture
 */
export function isEntityTexture(assetId: string): boolean {
  return (
    assetId.includes("entity/") ||
    assetId.includes("chest/") ||
    assetId.includes("shulker_box/")
  );
}

/**
 * Extract entity information from asset ID
 * Returns both the variant name and the parent entity type for fallback
 *
 * Examples:
 * - "minecraft:entity/cow" -> { variant: "cow", parent: null }
 * - "minecraft:entity/chicken/cold_chicken" -> { variant: "cold_chicken", parent: "chicken" }
 * - "minecraft:entity/cow/red_mooshroom" -> { variant: "red_mooshroom", parent: "mooshroom" }
 */
export function getEntityInfoFromAssetId(assetId: string): {
  variant: string;
  parent: string | null;
} | null {
  // Remove namespace prefix
  const path = assetId.replace(/^minecraft:/, "");

  // Extract full entity path from asset ID
  const match = path.match(/entity\/(.+)/);
  if (!match) {
    // Handle special cases like chests
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
    // Base entity (e.g., "cow", "chicken")
    return { variant: segments[0], parent: null };
  } else {
    // Variant entity (e.g., "chicken/cold_chicken", "cow/red_mooshroom")
    const variant = segments[segments.length - 1];

    // Determine parent based on common patterns
    // For mooshrooms, the parent is "mooshroom" not "cow"
    let parent = segments[0];
    if (variant.includes("mooshroom")) {
      parent = "mooshroom";
    }

    return { variant, parent };
  }
}

/**
 * Extract entity type from asset ID (legacy function for compatibility)
 * e.g., "minecraft:entity/cow" -> "cow"
 * e.g., "minecraft:entity/chicken/cold_chicken" -> "cold_chicken"
 */
export function getEntityTypeFromAssetId(assetId: string): string | null {
  const info = getEntityInfoFromAssetId(assetId);
  return info?.variant ?? null;
}

/**
 * Load an entity model from a resource pack or vanilla
 *
 * LOADING STRATEGY:
 * 1. Try variant-specific JEM (e.g., cold_chicken.jem, red_mooshroom.jem)
 * 2. If not found, try parent entity JEM (e.g., chicken.jem, mooshroom.jem)
 * 3. Check for version-specific variants based on pack format
 * 4. Fall back to vanilla JEM files
 *
 * @param entityType - Entity type (e.g., "cow", "cold_chicken", "red_mooshroom")
 * @param packPath - Path to the resource pack
 * @param isZip - Whether the pack is a ZIP file
 * @param targetVersion - Target Minecraft version (e.g., "1.21.4")
 * @param entityVersionVariants - Map of entity -> available version folders (from scan)
 * @param parentEntity - Parent entity type for fallback (e.g., "chicken" for "cold_chicken")
 * @param packFormat - Pack format of the winning pack (for version matching)
 * @returns Parsed entity model with metadata, or null if not found
 */
export async function loadEntityModel(
  entityType: string,
  packPath?: string,
  isZip?: boolean,
  _targetVersion?: string | null,
  _entityVersionVariants?: Record<string, string[]>,
  parentEntity?: string | null,
  packFormat?: number,
): Promise<
  (ParsedEntityModel & { jemSource?: string; usedLegacyJem?: boolean }) | null
> {
  console.log(
    "[EMF] Loading entity model:",
    entityType,
    "parent:",
    parentEntity,
    "packFormat:",
    packFormat,
  );

  // Import invoke dynamically to avoid issues if Tauri is not available
  const { invoke } = await import("@tauri-apps/api/core");

  // Helper function to try loading a JEM file
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

      // Validate the model - must have at least one part with at least one valid box
      const hasValidBoxes = parsed.parts.some((part) => part.boxes.length > 0);
      if (!hasValidBoxes) {
        console.log(`[EMF] ✗ ${source} JEM has no valid boxes:`, jemName);
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

  // Helper to try vanilla JEM
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

      // Validate the model - must have at least one part with at least one valid box
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
    // STEP 1: Try variant-specific JEM (e.g., cold_chicken.jem, red_mooshroom.jem)
    let result = await tryLoadJem(entityType, "variant");
    if (result) return result;

    // STEP 2: Try parent entity JEM if variant not found (e.g., chicken.jem for cold_chicken)
    if (parentEntity) {
      result = await tryLoadJem(parentEntity, "parent");
      if (result) return result;
    }

    // STEP 3: Try version-specific JEM based on pack format (e.g., cow_21.4.jem)
    // Many entities changed in 1.21.5 (pack format 55), so we need legacy JEM for older packs
    if (packFormat) {
      // Map pack formats to legacy JEM versions
      // Pack formats < 55 (1.21.5) should use 21.4 JEM files
      let legacyVersion: string | null = null;

      if (packFormat < 55) {
        // Pre-1.21.5 = use 21.4 JEM files
        legacyVersion = "21.4";
      } else if (packFormat < 46) {
        // Pre-1.21.4 might need 21.1 or other versions
        legacyVersion = "21.1";
      }

      if (legacyVersion) {
        const versionedName = `${parentEntity || entityType}_${legacyVersion}`;

        result = await tryLoadJem(versionedName, "legacy versioned");
        if (result) {
          result.usedLegacyJem = true;
          return result;
        }
      }
    }
  }

  // STEP 4: Try vanilla JEM files
  // Try variant first
  let result = await tryLoadVanillaJem(entityType);
  if (result) return result;

  // Try parent entity
  if (parentEntity) {
    result = await tryLoadVanillaJem(parentEntity);
    if (result) return result;
  }

  console.log(`[EMF] No JEM found for ${entityType}`);
  return null;
}
