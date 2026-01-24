/**
 * Helper functions for model loading
 */
import type { PackMeta } from "@state/types";
import type { ModelElement } from "@lib/tauri/blockModels";
import { resolveTextureRef } from "@lib/utils/blockGeometry";
import { createDefaultElement } from "./utilities";

export async function loadBlockModelElements(
  packId: string,
  packsDir: string,
  blockStateId: string,
  stateProps: Record<string, string> | undefined,
): Promise<{
  elements: ModelElement[];
  textures: Record<string, string>;
}> {
  const { resolveBlockState, loadModelJson } = await import("@lib/tauri/blockModels");

  const resolution = await resolveBlockState(
    packId,
    blockStateId,
    packsDir,
    stateProps,
  );

  if (resolution.models.length === 0) {
    return { elements: [], textures: {} };
  }

  const allElements: ModelElement[] = [];
  let textures: Record<string, string> = {};

  for (const resolvedModel of resolution.models) {
    const model = await loadModelJson(packId, resolvedModel.modelId, packsDir);
    textures = { ...textures, ...(model.textures ?? {}) };

    if (model.elements && model.elements.length > 0) {
      allElements.push(...model.elements);
    }
  }

  const elements =
    allElements.length > 0 ? allElements : createDefaultElement(textures);

  return { elements, textures };
}

export async function loadTextureUrls(
  elements: ModelElement[],
  textures: Record<string, string>,
  pack: PackMeta | null,
): Promise<Map<string, string>> {
  const { loadTextureUrl } = await import("./modelLoader");
  const textureIds = new Set<string>();

  for (const element of elements) {
    for (const face of Object.values(element.faces)) {
      const textureId = resolveTextureRef(face.texture, textures);
      if (textureId) {
        textureIds.add(textureId);
      }
    }
  }

  const loadedTextures = await Promise.all(
    Array.from(textureIds).map(async (id) => {
      const url = await loadTextureUrl(id, pack);
      return [id, url] as [string, string];
    }),
  );

  return new Map(loadedTextures);
}

export async function parseAnimationInfo(
  textureUrls: Map<string, string>,
): Promise<Record<string, { frameCount: number }>> {
  const animationInfo: Record<string, { frameCount: number }> = {};

  await Promise.all(
    Array.from(textureUrls.entries()).map(async ([textureId, textureUrl]) => {
      try {
        const { parseAnimationTexture } = await import(
          "@lib/utils/animationTexture"
        );
        const info = await parseAnimationTexture(textureUrl);
        if (info.isAnimated) {
          animationInfo[textureUrl] = { frameCount: info.frameCount };
        }
      } catch (error) {
        console.debug(
          `[MinecraftCSSBlock] Failed to parse animation for ${textureId}:`,
          error,
        );
      }
    }),
  );

  return animationInfo;
}
