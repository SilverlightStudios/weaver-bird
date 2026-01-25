import { convertFileSrc } from "@tauri-apps/api/core";
import type { PackMeta } from "@state/types";
import type { ParsedEntityModel, ParsedPart as ParsedModelPart, ParsedBox } from "@lib/emf";

export function cloneEntityModel(m: ParsedEntityModel): ParsedEntityModel {
  const clonePart = (p: ParsedModelPart): ParsedModelPart => ({
    ...p,
    boxes: Array.isArray(p.boxes) ? p.boxes.map((b: ParsedBox) => ({ ...b })) : [],
    children: Array.isArray(p.children) ? p.children.map(clonePart) : [],
  });
  return { ...m, parts: Array.isArray(m.parts) ? m.parts.map(clonePart) : [] };
}

export function getChestTextureFallbacks(textureAssetId: string, ns: string): string[] | undefined {
  if (!textureAssetId.includes("/chest/")) return undefined;

  const chestType = textureAssetId.split("/chest/")[1] || "normal";
  return [
    `${ns}:chest/${chestType}`,
    chestType === "normal" ? `${ns}:entity/chest/chest` : `${ns}:chest/chest`,
    chestType === "normal" ? `${ns}:chest/chest` : undefined,
  ].filter(Boolean) as string[];
}

export async function resolveEntityTexturePath(
  assetId: string,
  fallbackAssetIds: string[] | undefined,
  winnerPackId: string | undefined,
  winnerPack: PackMeta | null | undefined,
  getPackTexturePath: (path: string, assetId: string, isZip: boolean) => Promise<string>,
  getVanillaTexturePath: (assetId: string) => Promise<string>,
): Promise<string> {
  if (winnerPackId && winnerPack) {
    try {
      return await getPackTexturePath(
        winnerPack.path,
        assetId,
        winnerPack.is_zip,
      );
    } catch {
      // Fall through to vanilla attempt
    }
  }

  try {
    return await getVanillaTexturePath(assetId);
  } catch (primaryError) {
    if (fallbackAssetIds && fallbackAssetIds.length > 0) {
      for (const fallbackId of fallbackAssetIds) {
        try {
          return await getVanillaTexturePath(fallbackId);
        } catch {
          // Continue to next fallback
        }
      }
    }
    throw primaryError;
  }
}

export async function handleDecoratedPotTextures(
  model: ParsedEntityModel,
  ns: string,
  winnerPackId: string | undefined,
  winnerPack: PackMeta | null | undefined,
  getPackTexturePath: (path: string, assetId: string, isZip: boolean) => Promise<string>,
  getVanillaTexturePath: (assetId: string) => Promise<string>,
): Promise<{ previewModel: ParsedEntityModel; texturePath: string; extra: Record<string, string | null> }> {
  const basePotAssetId = `${ns}:entity/decorated_pot/decorated_pot_base`;
  const sidePotAssetId = `${ns}:entity/decorated_pot/decorated_pot_side`;

  const previewModel = cloneEntityModel(model);
  const extra: Record<string, string | null> = {};

  const applySide = (part: ParsedModelPart) => {
    if (["front", "back", "left", "right"].includes(part.name)) {
      part.texturePath = sidePotAssetId;
    }
    if (part.children) part.children.forEach(applySide);
  };
  previewModel.parts?.forEach(applySide);

  const texturePath = await resolveEntityTexturePath(
    basePotAssetId,
    undefined,
    winnerPackId,
    winnerPack,
    getPackTexturePath,
    getVanillaTexturePath,
  );

  try {
    const sidePath = await resolveEntityTexturePath(
      sidePotAssetId,
      undefined,
      winnerPackId,
      winnerPack,
      getPackTexturePath,
      getVanillaTexturePath,
    );
    extra[sidePotAssetId] = convertFileSrc(sidePath);
  } catch {
    extra[sidePotAssetId] = null;
  }

  return { previewModel, texturePath, extra };
}
