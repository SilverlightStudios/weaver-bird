import { convertFileSrc } from "@tauri-apps/api/core";
import { getVanillaTexturePath, getPackTexturePath } from "@lib/tauri";
import type { ModelElement } from "@lib/tauri/blockModels";
import {
  applyNaturalBlockStateDefaults,
  extractBlockStateProperties,
  getBlockStateIdFromAssetId,
  normalizeAssetId,
} from "@lib/assetUtils";
import { blockGeometryWorker } from "@lib/blockGeometryWorker";
import type { PackMeta } from "@state/types";
import type { RenderedElement, ParsedEntityModel } from "./types";
import {
  shouldUse2DItemIcon,
  getItemAssetId,
  getLeavesInventoryTextureId,
  isSuitableFor3D,
  createDefaultElement,
} from "./utilities";

export interface LoadedModel {
  renderedElements: RenderedElement[];
  fallbackTextureUrl: string | null;
}

export async function loadTextureUrl(
  textureId: string,
  pack: PackMeta | null,
): Promise<string> {
  let texturePath: string;

  if (textureId.includes("leaves")) {
    const inventoryTextureId = getLeavesInventoryTextureId(textureId);
    try {
      if (pack) {
        try {
          texturePath = await getPackTexturePath(
            pack.path,
            inventoryTextureId,
            pack.is_zip,
          );
          return convertFileSrc(texturePath);
        } catch {
          // Fall through to vanilla
        }
      }
      texturePath = await getVanillaTexturePath(inventoryTextureId);
      return convertFileSrc(texturePath);
    } catch {
      // Inventory variant doesn't exist, use base texture
    }
  }

  if (pack) {
    try {
      texturePath = await getPackTexturePath(
        pack.path,
        textureId,
        pack.is_zip,
      );
    } catch {
      texturePath = await getVanillaTexturePath(textureId);
    }
  } else {
    texturePath = await getVanillaTexturePath(textureId);
  }

  return convertFileSrc(texturePath);
}

export async function load2DItemIcon(
  normalizedAssetId: string,
  pack: PackMeta | null,
): Promise<LoadedModel> {
  const itemAssetId = getItemAssetId(normalizedAssetId);
  const textureUrl = await loadTextureUrl(itemAssetId, pack);

  return {
    renderedElements: [],
    fallbackTextureUrl: textureUrl,
  };
}

export async function loadEntityModel(
  jemModel: ParsedEntityModel,
  entityTextureUrl: string,
  scale: number,
): Promise<LoadedModel> {
  const { convertJEMModelToFaces } = await import("@lib/utils/entityGeometry");

  const renderedElements = convertJEMModelToFaces(
    jemModel,
    entityTextureUrl,
    scale,
  );

  return {
    renderedElements,
    fallbackTextureUrl: null,
  };
}

export async function loadBlockModel(
  assetId: string,
  packId: string | null,
  packsDir: string | null,
  pack: PackMeta | null,
  scale: number,
): Promise<LoadedModel> {
  const normalizedAssetId = normalizeAssetId(assetId);

  // Check if should use 2D item icon
  if (shouldUse2DItemIcon(normalizedAssetId)) {
    return load2DItemIcon(normalizedAssetId, pack);
  }

  let elements: ModelElement[] = [];
  let textures: Record<string, string> = {};
  let textureUrls = new Map<string, string>();

  // Try to load block model data
  if (packsDir && packId) {
    try {
      const blockStateId = getBlockStateIdFromAssetId(normalizedAssetId);
      const inferredProps = extractBlockStateProperties(normalizedAssetId);
      const mergedProps = applyNaturalBlockStateDefaults(
        inferredProps,
        normalizedAssetId,
      );
      const stateProps =
        Object.keys(mergedProps).length > 0 ? mergedProps : undefined;

      const { loadBlockModelElements, loadTextureUrls } = await import(
        "./modelLoaderHelpers"
      );

      const result = await loadBlockModelElements(
        packId,
        packsDir,
        blockStateId,
        stateProps,
      );
      elements = result.elements;
      textures = result.textures;

      if (elements.length > 0) {
        textureUrls = await loadTextureUrls(elements, textures, pack);

        if (!isSuitableFor3D(elements)) {
          const fallbackTexture = await loadTextureUrl(normalizedAssetId, pack);
          return {
            renderedElements: [],
            fallbackTextureUrl: fallbackTexture,
          };
        }
      }
    } catch (modelError) {
      console.debug(
        `[MinecraftCSSBlock] Could not load block model for ${assetId}`,
        modelError,
      );
    }
  }

  // Fallback: create simple cube
  if (elements.length === 0) {
    const textureUrl = await loadTextureUrl(normalizedAssetId, pack);
    textureUrls.set(normalizedAssetId, textureUrl);
    textures = { all: normalizedAssetId };
    elements = createDefaultElement(textures);
  }

  // Parse animation info
  const { parseAnimationInfo } = await import("./modelLoaderHelpers");
  const animationInfo = await parseAnimationInfo(textureUrls);

  const rendered = await blockGeometryWorker.processElements(
    elements,
    textures,
    textureUrls,
    scale,
    animationInfo,
  );

  return {
    renderedElements: rendered,
    fallbackTextureUrl: null,
  };
}
