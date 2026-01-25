/**
 * Potted plant utilities
 */

import { getBaseName } from "./parsing";

/** Azalea plant name mappings for potted versions */
const AZALEA_MAPPINGS: Record<string, string> = {
  azalea: "azalea_bush",
  flowering_azalea: "flowering_azalea_bush",
};

const AZALEA_REVERSE_MAPPINGS: Record<string, string> = {
  azalea_bush: "azalea",
  flowering_azalea_bush: "flowering_azalea",
};

/**
 * Get the potted version asset ID for a plant
 * Example: "minecraft:block/oak_sapling" -> "minecraft:block/potted_oak_sapling"
 */
export function getPottedAssetId(assetId: string): string {
  const namespaceMatch = assetId.match(/^([^:]*:)/);
  const namespace = namespaceMatch ? namespaceMatch[1] : "minecraft:";

  const baseName = getBaseName(assetId);
  const pottedName = AZALEA_MAPPINGS[baseName] ?? baseName;

  return `${namespace}block/potted_${pottedName}`;
}

/**
 * Extract the plant name from a potted plant asset ID
 * Returns the full asset ID for the plant (with namespace and block/ prefix)
 */
export function getPlantNameFromPotted(assetId: string): string | null {
  const namespaceMatch = assetId.match(/^([^:]*:)/);
  const namespace = namespaceMatch ? namespaceMatch[1] : "minecraft:";

  const path = assetId.replace(/^[^:]*:/, "");
  const blockPath = path.replace(/^block\//, "");

  let plantName: string | null = null;

  if (blockPath.endsWith("_potted")) {
    plantName = blockPath.replace(/_potted$/, "");
  } else if (blockPath.startsWith("potted_")) {
    plantName = blockPath.replace(/^potted_/, "");
  }

  if (plantName && AZALEA_REVERSE_MAPPINGS[plantName]) {
    plantName = AZALEA_REVERSE_MAPPINGS[plantName];
  }

  return plantName ? `${namespace}block/${plantName}` : null;
}
