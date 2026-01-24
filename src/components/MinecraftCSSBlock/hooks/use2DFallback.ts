import { useEffect } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getVanillaTexturePath, getPackTexturePath } from "@lib/tauri";
import { normalizeAssetId } from "@lib/assetUtils";
import type { PackMeta } from "@state/types";

interface Use2DFallbackProps {
  assetId: string;
  packId: string | null;
  pack: PackMeta | null;
  renderMode: "block" | "entity";
  onFallbackLoaded: (url: string | null) => void;
  onGeometryReady: () => void;
  onError: () => void;
}

async function loadSimpleTexture(
  textureId: string,
  pack: PackMeta | null,
): Promise<string> {
  let texturePath: string;
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

export function use2DFallback({
  assetId,
  pack,
  renderMode,
  onFallbackLoaded,
  onGeometryReady,
  onError,
}: Use2DFallbackProps) {
  useEffect(() => {
    if (renderMode === "entity") {
      onGeometryReady();
      return;
    }

    let mounted = true;

    const scheduleGeometryReady = () => {
      const idleCallback =
        window.requestIdleCallback || ((cb: () => void) => setTimeout(cb, 1));
      idleCallback(
        () => {
          if (mounted) {
            onGeometryReady();
          }
        },
        { timeout: 100 },
      );
    };

    const load2DFallback = async () => {
      try {
        const normalizedAssetId = normalizeAssetId(assetId);
        const textureUrl = await loadSimpleTexture(normalizedAssetId, pack);
        if (mounted) {
          onFallbackLoaded(textureUrl);
          scheduleGeometryReady();
        }
      } catch (err) {
        console.warn(
          `[MinecraftCSSBlock] Failed to load 2D fallback for ${assetId}:`,
          err,
        );
        if (mounted) {
          onFallbackLoaded(null);
          onError();
          scheduleGeometryReady();
        }
      }
    };

    void load2DFallback();

    return () => {
      mounted = false;
    };
  }, [assetId, pack, renderMode, onFallbackLoaded, onGeometryReady, onError]);
}
