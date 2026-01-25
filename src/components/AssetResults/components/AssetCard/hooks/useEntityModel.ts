import { useState, useEffect, useMemo } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getVanillaTexturePath, getPackTexturePath } from "@lib/tauri";
import {
  isEntityTexture,
  getEntityInfoFromAssetId,
  getEntityTextureAssetId,
  loadEntityModel,
  getEntityTypeFromAssetId,
} from "@lib/emf";
import {
  isEntityCompatible,
  getIncompatibilityMessage,
} from "@lib/packFormatCompatibility";
import { normalizeAssetId } from "@lib/assetUtils";
import type { PackMeta } from "@state/types";
import type { ParsedEntityModel } from "@lib/emf";
import {
  getChestTextureFallbacks,
  resolveEntityTexturePath,
  handleDecoratedPotTextures,
} from "./entityTextureUtils";
import {
  isEntityBlock as checkIsEntityBlock,
  convertBlockToEntityAssetId,
} from "./blockEntityConversion";

interface Asset {
  id: string;
}

interface UseEntityModelParams {
  asset: Asset;
  isVisible: boolean;
  winnerPack: PackMeta | undefined;
  winnerPackId: string | null;
  packFormat: number | undefined;
  targetMinecraftVersion: string | null;
  entityVersionVariants: Record<string, string[]>;
}

export function useEntityModel({
  asset,
  isVisible,
  winnerPack,
  winnerPackId,
  packFormat,
  targetMinecraftVersion,
  entityVersionVariants,
}: UseEntityModelParams) {
  // Entity rendering state
  const [jemModel, setJemModel] = useState<ParsedEntityModel | null>(null);
  const [entityTextureUrl, setEntityTextureUrl] = useState<string | null>(null);
  const [entityExtraTextureUrls, setEntityExtraTextureUrls] = useState<
    Record<string, string | null> | null
  >(null);

  const isEntityBlock = useMemo(() => checkIsEntityBlock(asset.id), [asset.id]);
  const isEntity = isEntityTexture(asset.id) || isEntityBlock;

  const effectiveAssetId = useMemo(
    () => convertBlockToEntityAssetId(asset.id),
    [asset.id],
  );

  // Check entity compatibility
  const entityId = getEntityTypeFromAssetId(effectiveAssetId);

  const isCompatible = useMemo(() => {
    if (!entityId) return true;
    return isEntityCompatible(
      entityId,
      packFormat,
      targetMinecraftVersion,
      entityVersionVariants,
    );
  }, [entityId, packFormat, targetMinecraftVersion, entityVersionVariants]);

  const incompatibilityMessage = useMemo(() => {
    if (
      isCompatible ||
      !entityId ||
      packFormat === undefined ||
      !targetMinecraftVersion
    )
      return "";
    return getIncompatibilityMessage(
      entityId,
      packFormat,
      targetMinecraftVersion,
    );
  }, [isCompatible, entityId, packFormat, targetMinecraftVersion]);

  // Load entity model and texture when visible
  useEffect(() => {
    if (!isVisible || !isEntity) return;

    let mounted = true;
    setEntityExtraTextureUrls(null);

    const loadEntity = async () => {
      try {
        const normalizedAssetId = normalizeAssetId(effectiveAssetId);
        const entityInfo = getEntityInfoFromAssetId(normalizedAssetId);
        const textureAssetId = getEntityTextureAssetId(normalizedAssetId);
        const path = normalizedAssetId.includes(":")
          ? normalizedAssetId.split(":")[1]!
          : normalizedAssetId;
        const isDecoratedPot = path.startsWith("entity/decorated_pot/");
        const ns = normalizedAssetId.includes(":")
          ? normalizedAssetId.split(":")[0]!
          : "minecraft";

        if (!entityInfo) {
          console.warn(
            `[AssetCard] Could not extract entity info from ${effectiveAssetId}`,
          );
          return;
        }

        const model = await loadEntityModel(
          entityInfo.variant,
          winnerPack?.path,
          winnerPack?.is_zip,
          targetMinecraftVersion,
          entityVersionVariants,
          entityInfo.parent,
          packFormat,
        );

        if (!model) {
          console.warn(
            `[AssetCard] No JEM model found for entity ${entityInfo.variant}`,
          );
          return;
        }

        let previewModel: ParsedEntityModel;
        let texturePath: string;
        let extra: Record<string, string | null> | null;

        if (isDecoratedPot) {
          const result = await handleDecoratedPotTextures(
            model,
            ns,
            winnerPackId,
            winnerPack,
            getPackTexturePath,
            getVanillaTexturePath,
          );
          previewModel = result.previewModel;
          texturePath = result.texturePath;
          extra = result.extra;
        } else {
          previewModel = model;
          const fallbacks = getChestTextureFallbacks(textureAssetId, ns);
          texturePath = await resolveEntityTexturePath(
            textureAssetId,
            fallbacks,
            winnerPackId,
            winnerPack,
            getPackTexturePath,
            getVanillaTexturePath,
          );
          extra = null;
        }

        if (mounted) {
          const textureUrl = convertFileSrc(texturePath);
          setJemModel(previewModel);
          setEntityTextureUrl(textureUrl);
          setEntityExtraTextureUrls(extra);
        }
      } catch (error) {
        console.error(
          `[AssetCard] Failed to load entity ${effectiveAssetId}:`,
          error,
        );
        if (mounted) setEntityExtraTextureUrls(null);
      }
    };

    void loadEntity();

    return () => {
      mounted = false;
    };
  }, [
    isVisible,
    isEntity,
    effectiveAssetId,
    winnerPackId,
    winnerPack,
    targetMinecraftVersion,
    entityVersionVariants,
    packFormat,
  ]);

  return {
    jemModel,
    entityTextureUrl,
    entityExtraTextureUrls,
    isEntity,
    isCompatible,
    incompatibilityMessage,
  };
}
