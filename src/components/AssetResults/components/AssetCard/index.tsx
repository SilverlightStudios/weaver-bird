import {
  useEffect,
  useState,
  useRef,
  useMemo,
  memo,
  type CSSProperties,
} from "react";
import {
  useSelectWinner,
  useSelectIsPenciled,
  useSelectPack,
} from "@state/selectors";
import { useStore } from "@state/store";
import { generateDisplayName } from "../../utilities";
import type { AssetCardProps } from "./types";
import s from "./styles.module.scss";

import { AssetCardMedia } from "./AssetCardMedia";
import { useAssetImage } from "./hooks/useAssetImage";
import { useEntityModel } from "./hooks/useEntityModel";

export const AssetCard = memo(
  function AssetCard({
    asset,
    isSelected,
    onSelect,
    variantCount,
    staggerIndex,
  }: AssetCardProps) {
    // State for intersection observer
    const [isVisible, setIsVisible] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    // Get pack info
    const winnerPackId = useSelectWinner(asset.id);
    const isPenciled = useSelectIsPenciled(asset.id);
    const winnerPack = useSelectPack(winnerPackId ?? "");

    const packFormat = useStore((state) =>
      winnerPackId ? state.packFormats[winnerPackId] : undefined,
    );
    const targetMinecraftVersion = useStore(
      (state) => state.targetMinecraftVersion,
    );
    const entityVersionVariants = useStore(
      (state) => state.entityVersionVariants,
    );

    // Intersection Observer to detect visibility
    useEffect(() => {
      if (!cardRef.current) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          setIsVisible(entry.isIntersecting);
        },
        { rootMargin: "200px" },
      );

      observer.observe(cardRef.current);

      return () => {
        observer.disconnect();
      };
    }, []);

    // Entity rendering state (via hook)
    const {
        jemModel,
        entityTextureUrl,
        entityExtraTextureUrls,
        isEntity,
        isCompatible,
        incompatibilityMessage,
    } = useEntityModel({
        asset,
        isVisible,
        winnerPack,
        winnerPackId: winnerPackId ?? null,
        packFormat,
        targetMinecraftVersion,
        entityVersionVariants,
    });

    // Image loading for 2D textures, colormaps, and items
    // Use helper functions instead of assuming asset.type exists
    const { 
      imageSrc, 
      imageError, 
      setImageError,
      itemFrameCount, 
      itemFrameIndex,
      isColormap,
      is2DTexture,
      isItem,
      useItemTextureForCard
    } = useAssetImage(
        asset,
        isVisible,
        winnerPack,
        winnerPackId ?? null
      );

    // Generate display name
    const displayName = useMemo(() => generateDisplayName(asset), [asset]);

    const isItemSpriteAnimated =
      (isItem || useItemTextureForCard) && itemFrameCount > 1;

    const itemSpriteStyle = useMemo(() => {
      const safeCount = Math.max(1, itemFrameCount);
      const translate = (itemFrameIndex * 100) / safeCount;
      return {
        transform: `translateY(-${translate}%)`,
      } as CSSProperties;
    }, [itemFrameCount, itemFrameIndex]);

    return (
      <div
        ref={cardRef}
        className={`${s.card} ${isSelected ? s.selected : ""}`}
        onClick={onSelect}
      >
        <div className={s.imageContainer}>
          <AssetCardMedia
            isVisible={isVisible}
            isColormap={isColormap}
            is2DTexture={is2DTexture}
            isItem={isItem}
            useItemTextureForCard={useItemTextureForCard}
            imageSrc={imageSrc}
            imageError={imageError}
            isItemSpriteAnimated={isItemSpriteAnimated}
            itemFrameCount={itemFrameCount}
            itemSpriteStyle={itemSpriteStyle}
            displayName={displayName}
            isEntity={isEntity}
            jemModel={jemModel}
            entityTextureUrl={entityTextureUrl}
            entityExtraTextureUrls={entityExtraTextureUrls}
            assetId={asset.id}
            winnerPackId={winnerPackId ?? undefined}
            staggerIndex={staggerIndex}
            setImageError={setImageError}
          />
          {isPenciled && (
            <div
              className={s.penciledIndicator}
              title="Manually selected texture"
            >
              ✏️
            </div>
          )}
          {!isCompatible && incompatibilityMessage && (
            <div className={s.warningIndicator} title={incompatibilityMessage}>
              ⚠️
            </div>
          )}
          {variantCount != null && variantCount > 1 && (
            <div className={s.variantBadge} title={`${variantCount} variants`}>
              {variantCount}
            </div>
          )}
        </div>
        <div className={s.assetName}>{displayName}</div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function - return true if props are equal (skip re-render)
    // Only re-render if these specific props change:
    return (
      prevProps.asset.id === nextProps.asset.id &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.variantCount === nextProps.variantCount
      // Note: foliageColor changes will trigger re-render via the hook inside the component
      // Note: winnerPackId, isPenciled changes will trigger re-render via selectors
    );
  },
);
