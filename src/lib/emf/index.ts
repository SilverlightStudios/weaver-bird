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
 * Extract entity type from asset ID
 * e.g., "minecraft:entity/cow" -> "cow"
 * e.g., "minecraft:entity/chest/normal" -> "chest"
 */
export function getEntityTypeFromAssetId(assetId: string): string | null {
  // Remove namespace prefix
  const path = assetId.replace(/^minecraft:/, "");

  // Extract entity type from path
  const match = path.match(/entity\/([^/]+)/);
  if (match) {
    return match[1];
  }

  // Handle special cases like chests
  if (path.includes("chest/")) {
    if (path.includes("trapped")) return "trapped_chest";
    if (path.includes("ender")) return "ender_chest";
    return "chest";
  }

  if (path.includes("shulker_box/")) {
    return "shulker_box";
  }

  return null;
}

/**
 * Load an entity model from a resource pack or vanilla
 *
 * Loads JEM files from OptiFine CEM directory structure:
 * - assets/minecraft/optifine/cem/{entityType}.jem
 *
 * @param entityType - Entity type (e.g., "cow", "chest", "shulker_box")
 * @param packPath - Path to the resource pack
 * @param isZip - Whether the pack is a ZIP file
 * @returns Parsed entity model or null if not found
 */
export async function loadEntityModel(
  entityType: string,
  packPath?: string,
  isZip?: boolean,
): Promise<ParsedEntityModel | null> {
  console.log("[EMF] Loading entity model:", entityType);

  // Import invoke dynamically to avoid issues if Tauri is not available
  const { invoke } = await import("@tauri-apps/api/core");

  // Try loading from resource pack first
  if (packPath) {
    try {
      const jemPath = `assets/minecraft/optifine/cem/${entityType}.jem`;
      console.log("[EMF] Looking for JEM in pack:", jemPath);

      const jemContent = await invoke<string>("read_pack_file", {
        packPath,
        filePath: jemPath,
        isZip: isZip ?? false,
      });

      const jemData = JSON.parse(jemContent) as JEMFile;
      console.log("[EMF] ✓ JEM file loaded from pack");

      const parsed = parseJEMImpl(jemData);
      return {
        ...parsed,
        texturePath: parsed.texturePath || `entity/${entityType}`,
      };
    } catch {
      console.log(
        `[EMF] No custom JEM in pack for ${entityType}, trying vanilla fallback...`,
      );
    }
  }

  // Fallback to vanilla JEM files
  try {
    console.log("[EMF] Looking for vanilla JEM:", entityType);

    // Use Tauri to read from __mocks__/cem/ directory
    const jemContent = await invoke<string>("read_vanilla_jem", {
      entityType,
    });

    const jemData = JSON.parse(jemContent) as JEMFile;
    console.log("[EMF] ✓ Vanilla JEM loaded successfully");

    const parsed = parseJEMImpl(jemData);
    return {
      ...parsed,
      texturePath: parsed.texturePath || `entity/${entityType}`,
    };
  } catch {
    console.log(`[EMF] No vanilla JEM found for ${entityType}`);
    return null;
  }
}
