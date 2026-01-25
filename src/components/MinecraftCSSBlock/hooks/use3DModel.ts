import { useEffect } from "react";
import type { PackMeta } from "@state/types";
import type { RenderedElement, ParsedEntityModel } from "../types";
import { loadBlockModel, loadEntityModel } from "../modelLoader";

interface Use3DModelProps {
  assetId: string;
  packId: string | null;
  packsDir: string | null;
  pack: PackMeta | null;
  scale: number;
  geometryReady: boolean;
  renderMode: "block" | "entity";
  jemModel: ParsedEntityModel | null;
  entityTextureUrl: string | null;
  onModelLoaded: (elements: RenderedElement[], fallbackUrl: string | null) => void;
  onUse3DModel: (use: boolean) => void;
  onError: () => void;
}

export function use3DModel({
  assetId,
  packId,
  packsDir,
  pack,
  scale,
  geometryReady,
  renderMode,
  jemModel,
  entityTextureUrl,
  onModelLoaded,
  onUse3DModel,
  onError,
}: Use3DModelProps) {
  useEffect(() => {
    if (!geometryReady) return;

    let mounted = true;

    const load = async () => {
      try {
        if (renderMode === "entity") {
          if (jemModel && entityTextureUrl) {
            const result = await loadEntityModel(jemModel, entityTextureUrl, scale);
            if (mounted) {
              onModelLoaded(result.renderedElements, result.fallbackTextureUrl);
              onUse3DModel(true);
            }
          }
          return;
        }

        const result = await loadBlockModel(assetId, packId, packsDir, pack, scale);
        if (mounted) {
          onModelLoaded(result.renderedElements, result.fallbackTextureUrl);
        }
      } catch (err) {
        console.warn(
          `[MinecraftCSSBlock] Failed to load 3D model for ${assetId}:`,
          err,
        );
        if (mounted) {
          onError();
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [
    assetId,
    packId,
    packsDir,
    pack,
    scale,
    geometryReady,
    renderMode,
    jemModel,
    entityTextureUrl,
    onModelLoaded,
    onUse3DModel,
    onError,
  ]);
}
