import { useState, useEffect } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getPackTexturePath } from "@lib/tauri";
import { readBlockModel, type BlockModel } from "@lib/tauri/blockModels";
import { resolveTextureRef } from "@lib/utils/blockGeometry";
import { useSelectPacksDir } from "@state/selectors";
import { useStore } from "@/state/store";
import type { VariantChooserProps } from "./types";
import s from "./styles.module.scss";

const TEXTURE_KEY_PRIORITY = [
  "all",
  "side",
  "end",
  "top",
  "bottom",
  "particle",
  "layer0",
  "layer1",
];

const resolveTextureId = (
  textureRef: string | null,
  fallbackNamespace: string,
): string | null => {
  if (!textureRef || textureRef.startsWith("#")) return null;
  const cleaned = textureRef.replace(/\.png$/i, "");
  return cleaned.includes(":") ? cleaned : `${fallbackNamespace}:${cleaned}`;
};

const pickModelTextureId = (
  model: BlockModel,
  fallbackNamespace: string,
): string | null => {
  const textures = model.textures ?? {};
  for (const key of TEXTURE_KEY_PRIORITY) {
    const resolved = resolveTextureRef(textures[key] ?? "", textures);
    const textureId = resolveTextureId(resolved, fallbackNamespace);
    if (textureId) return textureId;
  }

  for (const value of Object.values(textures)) {
    const resolved = resolveTextureRef(value, textures);
    const textureId = resolveTextureId(resolved, fallbackNamespace);
    if (textureId) return textureId;
  }

  return null;
};

export const VariantChooser = ({
  providers,
  onSelectProvider,
  assetId,
}: VariantChooserProps) => {
  const packs = useStore((state) => state.packs);
  const packsDir = useSelectPacksDir();
  const [textureUrls, setTextureUrls] = useState<Record<string, string>>({});
  const [loadingTextures, setLoadingTextures] = useState<Record<string, boolean>>({});

  // Load texture URLs for each provider
  useEffect(() => {
    if (!assetId || providers.length === 0) return;

    const loadTextureUrls = async () => {
      const newUrls: Record<string, string> = {};
      const newLoading: Record<string, boolean> = {};

      // Mark all as loading
      for (const provider of providers) {
        newLoading[provider.packId] = true;
      }
      setLoadingTextures(newLoading);

      // Load texture URLs in parallel
      await Promise.all(
        providers.map(async (provider) => {
          const pack = packs[provider.packId];
          if (!pack) return;

          try {
            const texturePath = await getPackTexturePath(
              pack.path,
              assetId,
              pack.is_zip,
            );

            newUrls[provider.packId] = convertFileSrc(texturePath);
          } catch (error) {
            try {
              const assetPath = assetId.includes(":")
                ? assetId.split(":")[1] ?? assetId
                : assetId;
              const isBlockTexture = assetPath.startsWith("block/");
              if (!isBlockTexture || !packsDir) {
                throw error;
              }

              const namespace = assetId.split(":")[0] || "minecraft";
              const model = await readBlockModel(provider.packId, assetId, packsDir);
              const textureId = pickModelTextureId(model, namespace);
              if (!textureId) {
                throw error;
              }

              const texturePath = await getPackTexturePath(
                pack.path,
                textureId,
                pack.is_zip,
              );
              newUrls[provider.packId] = convertFileSrc(texturePath);
            } catch (fallbackError) {
              console.error(
                `Failed to load texture for ${provider.packId}:`,
                fallbackError,
              );
            }
          }
        })
      );

      setTextureUrls(newUrls);
      setLoadingTextures({});
    };

    void loadTextureUrls();
  }, [assetId, providers, packs, packsDir]);

  if (!assetId || providers.length === 0) {
    return (
      <div className={s.root}>
        <h3 className={s.header}>Variants</h3>
        <div className={s.emptyState}>
          {!assetId
            ? "Select an asset to see available variants"
            : "No variants available"}
        </div>
      </div>
    );
  }

  return (
    <div className={s.root}>
      <div className={s.providers}>
        {providers.map((provider) => (
          <div
            key={provider.packId}
            className={`${s.provider} ${provider.isWinner ? s.winner : ""} ${provider.isPenciled ? s.penciled : ""
              }`}
            onClick={() => onSelectProvider(provider.packId)}
            title="Click to select this texture variant"
          >
            <div className={s.texturePreview}>
              {loadingTextures[provider.packId] ? (
                <div className={s.texturePlaceholder} />
              ) : textureUrls[provider.packId] ? (
                <img
                  src={textureUrls[provider.packId]}
                  alt={`${provider.packName} texture`}
                  className={s.textureIcon}
                />
              ) : (
                <div className={s.texturePlaceholder} />
              )}
            </div>
            <div className={s.providerInfo}>
              <div className={s.providerName}>
                {provider.packName}
                {provider.isPenciled && (
                  <span className={`${s.badge} ${s.pencilBadge}`}>Override</span>
                )}
                {provider.isWinner && !provider.isPenciled && (
                  <span className={s.badge}>Active</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
