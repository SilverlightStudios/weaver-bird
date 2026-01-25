import type { CSSProperties } from "react";
import { MinecraftCSSBlock } from "@components/MinecraftCSSBlock";
import { EntityThumbnailView } from "./EntityThumbnailView";
import s from "./styles.module.scss";
import type { ParsedEntityModel } from "@lib/emf";

interface AssetCardMediaProps {
  isVisible: boolean;
  isColormap: boolean;
  is2DTexture: boolean;
  isItem: boolean;
  useItemTextureForCard: boolean;
  imageSrc: string | null;
  imageError: boolean;
  isItemSpriteAnimated: boolean;
  itemFrameCount: number;
  itemSpriteStyle: CSSProperties;
  displayName: string;
  isEntity: boolean;
  jemModel: ParsedEntityModel | null;
  entityTextureUrl: string | null;
  entityExtraTextureUrls: Record<string, string | null> | null;
  assetId: string;
  winnerPackId: string | undefined;
  staggerIndex?: number;
  setImageError: (error: boolean) => void;
}

function getTextureClassName(
  isItem: boolean,
  useItemTextureForCard: boolean,
  is2DTexture: boolean
): string {
  if (isItem || useItemTextureForCard) return s.itemTexture;
  if (is2DTexture) return s.texture2D;
  return s.colormapTexture;
}

function getPlaceholderIcon(
  isItem: boolean,
  useItemTextureForCard: boolean,
  is2DTexture: boolean
): string {
  if (isItem || useItemTextureForCard) return "⚔️";
  if (is2DTexture) return "🖼️";
  return "🎨";
}

function render2DTexture(
  imageSrc: string | null,
  imageError: boolean,
  isItemSpriteAnimated: boolean,
  itemFrameCount: number,
  itemSpriteStyle: CSSProperties,
  displayName: string,
  isItem: boolean,
  useItemTextureForCard: boolean,
  is2DTexture: boolean,
  setImageError: (error: boolean) => void
): JSX.Element {
  if (imageSrc && !imageError) {
    if (isItemSpriteAnimated) {
      return (
        <div
          className={s.itemSprite}
          style={{ "--frame-count": itemFrameCount } as CSSProperties}
        >
          <img
            src={imageSrc}
            alt={displayName}
            className={s.itemSpriteImage}
            style={itemSpriteStyle}
            onError={() => setImageError(true)}
          />
        </div>
      );
    }
    return (
      <img
        src={imageSrc}
        alt={displayName}
        className={getTextureClassName(isItem, useItemTextureForCard, is2DTexture)}
        onError={() => setImageError(true)}
      />
    );
  }

  const icon = imageError
    ? getPlaceholderIcon(isItem, useItemTextureForCard, is2DTexture)
    : "⏳";

  return (
    <div className={s.placeholder}>
      <span className={s.placeholderIcon}>{icon}</span>
    </div>
  );
}

export function AssetCardMedia({
  isVisible,
  isColormap,
  is2DTexture,
  isItem,
  useItemTextureForCard,
  imageSrc,
  imageError,
  isItemSpriteAnimated,
  itemFrameCount,
  itemSpriteStyle,
  displayName,
  isEntity,
  jemModel,
  entityTextureUrl,
  entityExtraTextureUrls,
  assetId,
  winnerPackId,
  staggerIndex,
  setImageError,
}: AssetCardMediaProps) {
  if (isColormap || is2DTexture || isItem || useItemTextureForCard) {
    return render2DTexture(
      imageSrc,
      imageError,
      isItemSpriteAnimated,
      itemFrameCount,
      itemSpriteStyle,
      displayName,
      isItem,
      useItemTextureForCard,
      is2DTexture,
      setImageError
    );
  }

  if (!isVisible) {
    return (
      <div className={s.placeholder}>
        <span className={s.placeholderIcon}>⏳</span>
      </div>
    );
  }

  if (isEntity) {
    return (
      <EntityThumbnailView
        key={`entity-${assetId}`}
        jemModel={jemModel}
        textureUrl={entityTextureUrl}
        extraTextureUrls={entityExtraTextureUrls}
      />
    );
  }

  return (
    <MinecraftCSSBlock
      assetId={assetId}
      packId={winnerPackId}
      alt={displayName}
      size={75}
      staggerIndex={staggerIndex}
      onError={() => setImageError(true)}
      renderMode="block"
    />
  );
}
