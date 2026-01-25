import {
  isPottedPlant,
  extractBlockStateProperties,
  applyNaturalBlockStateDefaults,
} from "@lib/assetUtils";

export function getPlantNameFromPotted(pottedAssetId: string): string | null {
  const match = pottedAssetId.match(/potted_(.+)$/);
  return match ? match[1] : null;
}

export function getPottedAssetId(plantAssetId: string): string {
  const parts = plantAssetId.split("/");
  const lastPart = parts[parts.length - 1];
  parts[parts.length - 1] = `potted_${lastPart}`;
  return parts.join("/");
}

export function resolveModelAssetId(
  normalizedAssetId: string,
  isPotted: boolean,
  showPot: boolean,
): string {
  let modelAssetId = normalizedAssetId;
  const isAlreadyPotted = isPottedPlant(normalizedAssetId);

  if (isPotted && !showPot) {
    if (isAlreadyPotted) {
      const plantName = getPlantNameFromPotted(normalizedAssetId);
      if (plantName) {
        modelAssetId = plantName;
      }
    }
  } else if (isPotted && showPot) {
    if (!isAlreadyPotted) {
      modelAssetId = getPottedAssetId(normalizedAssetId);
    }
  }

  return modelAssetId;
}

export function mergeAndCleanProps(
  modelAssetId: string,
  assetId: string,
  blockProps: Record<string, string | number>,
): Record<string, string> {
  const inferredProps = extractBlockStateProperties(modelAssetId);
  let mergedProps = { ...inferredProps, ...blockProps };
  mergedProps = applyNaturalBlockStateDefaults(mergedProps, assetId);

  const cleanedProps: Record<string, string> = {};
  for (const [key, value] of Object.entries(mergedProps)) {
    if (value === "") continue;
    if (key === "wall") continue;
    if (key === "facing" && mergedProps.wall === "false") continue;
    cleanedProps[key] = String(value);
  }

  return cleanedProps;
}

export function resolveWallVariant(
  blockStateAssetId: string,
  mergedProps: Record<string, string | number>,
): string {
  if (mergedProps.wall !== "true") {
    return blockStateAssetId;
  }

  const parts = blockStateAssetId.split("/");
  const lastPart = parts[parts.length - 1];

  let wallVariant = `wall_${lastPart}`;

  if (lastPart.includes("_")) {
    const nameParts = lastPart.split("_");
    nameParts.splice(nameParts.length - 1, 0, "wall");
    wallVariant = nameParts.join("_");
  }

  parts[parts.length - 1] = wallVariant;
  const result = parts.join("/");

  console.log(`[BlockModel] Using wall variant blockstate: ${result}`);
  return result;
}

export function getVariantNumber(assetId: string): number | null {
  const match = assetId.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

export function applyVariantOverride(
  models: Array<{ modelId: string }>,
  variantNumber: number | null,
): Array<{ modelId: string }> {
  if (variantNumber === null) return models;

  return models.map((model) => ({
    ...model,
    modelId: model.modelId.replace(/\d+$/, variantNumber.toString()),
  }));
}
