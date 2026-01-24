import { useState, useEffect } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getPackTexturePath, getVanillaTexturePath } from "@lib/tauri";
import { normalizeAssetId } from "@lib/asset/parsing";
import { loadEntityModel, getEntityInfoFromAssetId } from "@lib/emf";
import type { ParsedEntityModel } from "@lib/emf";
import type { PackInfo } from "@/components/Preview3D/entity/types";

export function useTextureLoader(
  assetId: string | undefined,
  winnerPackId: string | undefined,
  winnerPack: PackInfo | null
): { texturePath: string | null; error: boolean } {
  const [texturePath, setTexturePath] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!assetId) {
      setTexturePath(null);
      return;
    }

    let mounted = true;

    const loadTexture = async () => {
      try {
        const normalizedAssetId = normalizeAssetId(assetId);
        let path: string;

        if (winnerPackId && winnerPack) {
          try {
            path = await getPackTexturePath(
              winnerPack.path,
              normalizedAssetId,
              winnerPack.is_zip
            );
          } catch {
            console.warn(
              `[Preview2D] Pack texture not found for ${normalizedAssetId}, using vanilla`
            );
            path = await getVanillaTexturePath(normalizedAssetId);
          }
        } else {
          path = await getVanillaTexturePath(normalizedAssetId);
        }

        if (mounted) {
          const assetUrl = convertFileSrc(path);
          setTexturePath(assetUrl);
          setError(false);
        }
      } catch (err) {
        console.error("[Preview2D] Failed to load texture:", err);
        if (mounted) {
          setError(true);
        }
      }
    };

    void loadTexture();

    return () => {
      mounted = false;
    };
  }, [assetId, winnerPackId, winnerPack]);

  return { texturePath, error };
}

export function useEntityModelLoader(
  isEntity: boolean,
  showUVWrap: boolean,
  assetId: string | undefined,
  winnerPack: PackInfo | null
): ParsedEntityModel | null {
  const [entityModel, setEntityModel] = useState<ParsedEntityModel | null>(null);

  useEffect(() => {
    if (!isEntity || !showUVWrap || !assetId) {
      setEntityModel(null);
      return;
    }

    const entityInfo = getEntityInfoFromAssetId(assetId);
    if (!entityInfo) return;

    const { variant: entityType, parent: parentEntity } = entityInfo;

    let mounted = true;

    const loadModel = async () => {
      try {
        const model = await loadEntityModel(
          entityType,
          winnerPack?.path,
          winnerPack?.is_zip,
          null,
          undefined,
          parentEntity,
          winnerPack?.pack_format
        );

        if (mounted && model) {
          setEntityModel(model);
          console.log(
            "[Preview2D] Loaded entity model for UV debugging:",
            entityType
          );
        }
      } catch (err) {
        console.error("[Preview2D] Failed to load entity model:", err);
      }
    };

    void loadModel();

    return () => {
      mounted = false;
    };
  }, [isEntity, showUVWrap, assetId, winnerPack]);

  return entityModel;
}
