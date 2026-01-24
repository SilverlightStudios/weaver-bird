/**
 * Helper functions for BlockModel loadModel to reduce complexity
 */
import * as THREE from "three";
import { loadModelJson, type ElementFace } from "@lib/tauri/blockModels";
import { createDefaultElement } from "@components/MinecraftCSSBlock/utilities";
import { getBlockTintType } from "@/constants/vanillaBlockColors";
import { normalizeAssetId } from "@lib/assetUtils";

export interface ModelLoadResult {
  renderModel: {
    textures?: Record<string, string>;
    elements?: Array<{
      faces?: Record<string, ElementFace>;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
  hasTint: boolean;
  tintIndices: Set<number>;
}

/**
 * Load model JSON and apply fallback to item model if needed
 */
export async function loadModelWithFallback(
  packId: string,
  modelId: string,
  packsDirPath: string,
): Promise<ModelLoadResult["renderModel"]> {
  const model = await loadModelJson(packId, modelId, packsDirPath);

  // If model has elements, use it as is
  if (model.elements && model.elements.length > 0) {
    return model;
  }

  // Try to load item model as fallback
  const itemModelId = modelId
    .replace(/^minecraft:block\//, "minecraft:item/")
    .replace(/^block\//, "item/");
  let fallbackTextures = model.textures;

  try {
    const itemModel = await loadModelJson(packId, itemModelId, packsDirPath);
    if (itemModel.textures && Object.keys(itemModel.textures).length) {
      fallbackTextures = itemModel.textures;
    }
  } catch {
    // Ignore item model failures - fall back to block textures if any.
  }

  if (fallbackTextures && Object.keys(fallbackTextures).length) {
    return {
      ...model,
      textures: fallbackTextures,
      elements: createDefaultElement(fallbackTextures),
    };
  }

  return model;
}

/**
 * Check if a model has tintindex and collect tint indices
 */
export function checkModelTint(model: ModelLoadResult["renderModel"]): {
  hasTint: boolean;
  tintIndices: Set<number>;
} {
  const tintIndices = new Set<number>();
  let hasTint = false;

  model.elements?.forEach((element) => {
    const faces = element.faces ?? {};
    Object.values<ElementFace>(faces).forEach((face) => {
      if (face.tintindex !== undefined && face.tintindex !== null) {
        hasTint = true;
        tintIndices.add(Number(face.tintindex));
      }
    });
  });

  return { hasTint, tintIndices };
}

/**
 * Apply polygon offset to prevent Z-fighting in multipart models
 */
export function applyPolygonOffset(
  modelGroup: THREE.Group,
  index: number,
  totalModels: number,
) {
  if (totalModels <= 1) return;

  modelGroup.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.material) {
      const materials = Array.isArray(obj.material)
        ? obj.material
        : [obj.material];
      materials.forEach((mat) => {
        // Apply to all material types (MeshStandardMaterial and ShaderMaterial)
        if (
          mat instanceof THREE.MeshStandardMaterial ||
          mat instanceof THREE.ShaderMaterial
        ) {
          mat.polygonOffset = true;
          // Increased from 0.1 to 1.0 for better separation
          mat.polygonOffsetFactor = -index * 1.0;
          mat.polygonOffsetUnits = -index * 1.0;
        }
      });
    }
  });
}

/**
 * Convert assetId to blockId format for light emission calculation
 * e.g., "minecraft:block/torch" -> "torch"
 */
export function assetIdToBlockId(blockStateAssetId: string): string {
  return blockStateAssetId
    .replace(/^minecraft:/, "")
    .replace(/^block\//, "");
}

/**
 * Determine tint type from vanilla block colors registry
 */
export function determineTintType(
  assetId: string,
  hasTintindex: boolean,
): {
  hasTint: boolean;
  tintType?: "grass" | "foliage";
} {
  if (!hasTintindex) {
    return { hasTint: false };
  }

  // Convert assetId to blockId: "minecraft:block/oak_leaves" -> "minecraft:oak_leaves"
  let blockId = normalizeAssetId(assetId);
  if (blockId.includes("/block/")) {
    blockId = blockId.replace("/block/", ":");
  } else if (blockId.includes("/item/")) {
    blockId = blockId.replace("/item/", ":");
  }

  // Check registry for this block's tint type
  const registryTintType = getBlockTintType(blockId);

  // Only report grass/foliage (we don't handle water/special in renderer yet)
  const tintType =
    registryTintType === "grass" || registryTintType === "foliage"
      ? registryTintType
      : undefined;

  return { hasTint: hasTintindex, tintType };
}

/**
 * Log detailed error information for BlockModel failures
 */
export function logBlockModelError(err: unknown) {
  console.error("=== [BlockModel] Model Load FAILED ===");
  console.error(
    "[BlockModel] Error type:",
    err instanceof Error ? err.constructor.name : typeof err,
  );
  console.error(
    "[BlockModel] Error message:",
    err instanceof Error ? err.message : String(err),
  );
  console.error("[BlockModel] Full error:", err);

  if (typeof err === "object" && err !== null) {
    console.error("[BlockModel] Error details:", JSON.stringify(err, null, 2));
    if ("code" in err) console.error("[BlockModel] Error code:", err.code);
    if ("message" in err)
      console.error("[BlockModel] Error message field:", err.message);
    if ("details" in err)
      console.error("[BlockModel] Error details field:", err.details);
  }

  console.error("========================================");
}

/**
 * Extract error message from unknown error type
 */
export function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === "object" && err !== null && "message" in err) {
    return String(err.message);
  }
  return "Unknown error";
}
