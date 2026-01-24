import { useState, useEffect, useRef } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getVanillaTexturePath, getPackTexturePath } from "@lib/tauri";
import {
  isBiomeColormapAsset,
  normalizeAssetId,
  is2DOnlyTexture,
  isMinecraftItem,
  shouldUseItemTextureForCard,
} from "@lib/assetUtils";
import {
  buildAnimationTimeline,
  loadAnimationMetadata,
  parseAnimationTexture,
} from "@lib/utils/animationTexture";
import type { PackMeta } from "@state/types";

// Define a minimal Asset interface to avoid importing full AssetRecord if strictly not needed, 
// or import AssetRecord from @state/types
interface Asset {
  id: string;
}

export function useAssetImage(
  asset: Asset,
  isVisible: boolean,
  winnerPack: PackMeta | undefined,
  winnerPackId: string | null
) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [itemFrameCount, setItemFrameCount] = useState(1);
  const [itemFrameIndex, setItemFrameIndex] = useState(0);
  const itemAnimationTimeoutRef = useRef<number | null>(null);

  const isColormap = isBiomeColormapAsset(asset.id);
  const is2DTexture = is2DOnlyTexture(asset.id);
  const isItem = isMinecraftItem(asset.id);
  const useItemTextureForCard = shouldUseItemTextureForCard(asset.id);

  // Only load image when visible - needed for colormaps, 2D textures, and items
  useEffect(() => {
    if (
      !isVisible ||
      (!isColormap && !is2DTexture && !isItem && !useItemTextureForCard)
    )
      return;

    let mounted = true;

    const loadImage = async () => {
      try {
        let texturePath: string;
        // Normalize asset ID to fix trailing underscores and other issues
        let normalizedAssetId = normalizeAssetId(asset.id);

        // For cross-shaped plants, use the item texture instead of block texture
        if (shouldUseItemTextureForCard(normalizedAssetId)) {
          normalizedAssetId = normalizedAssetId.replace(
            /^(minecraft:)block\//,
            "$1item/",
          );
          // Tall seagrass drops regular seagrass when sheared, so use seagrass item texture
          normalizedAssetId = normalizedAssetId.replace(
            /tall_seagrass(_top|_bottom)?$/,
            "seagrass",
          );
        }

        // Priority: 1. Pack texture (if exists), 2. Vanilla texture (fallback)
        if (winnerPackId && winnerPack) {
          try {
            // Try to load from the winning pack
            texturePath = await getPackTexturePath(
              winnerPack.path,
              normalizedAssetId,
              winnerPack.is_zip,
            );
          } catch (packError) {
            // If pack texture fails, fall back to vanilla
            console.warn(
              `Pack texture not found for ${normalizedAssetId}, using vanilla.`,
              packError,
            );
            texturePath = await getVanillaTexturePath(normalizedAssetId);
          }
        } else {
          // No pack provides this texture, use vanilla
          texturePath = await getVanillaTexturePath(normalizedAssetId);
        }

        if (mounted) {
          // Convert file path to Tauri asset URL
          const assetUrl = convertFileSrc(texturePath);
          setImageSrc(assetUrl);
          setImageError(false);
        }
      } catch (error) {
        if (mounted) {
          setImageError(true);
          console.warn(`Failed to load texture for ${asset.id}:`, error);
        }
      }
    };

    void loadImage();

    return () => {
      mounted = false;
    };
  }, [
    isVisible,
    isColormap,
    is2DTexture,
    isItem,
    useItemTextureForCard,
    asset.id,
    winnerPackId,
    winnerPack,
  ]);

  useEffect(() => {
    setItemFrameCount(1);
    setItemFrameIndex(0);
  }, [imageSrc]);

  useEffect(() => {
    if (
      !isVisible ||
      !imageSrc ||
      (!isItem && !useItemTextureForCard)
    ) {
      return;
    }

    let mounted = true;

    void (async () => {
      const info = await parseAnimationTexture(imageSrc);
      if (!mounted) return;
      if (info.frameCount > 1) {
        setItemFrameCount(info.frameCount);
        setItemFrameIndex(0);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [imageSrc, isItem, isVisible, useItemTextureForCard]);

  useEffect(() => {
    if (itemAnimationTimeoutRef.current) {
      window.clearTimeout(itemAnimationTimeoutRef.current);
      itemAnimationTimeoutRef.current = null;
    }

    if (
      !isVisible ||
      !imageSrc ||
      (!isItem && !useItemTextureForCard) ||
      itemFrameCount <= 1
    ) {
      return;
    }

    let mounted = true;
    let sequenceIndex = 0;
    let frames: number[] = Array.from(
      { length: itemFrameCount },
      (_, index) => index,
    );
    let frameTimesMs: number[] = Array.from(
      { length: itemFrameCount },
      () => 50,
    );

    const scheduleNext = () => {
      if (!mounted) return;
      const durationMs = frameTimesMs[sequenceIndex] ?? 50;
      itemAnimationTimeoutRef.current = window.setTimeout(() => {
        if (!mounted) return;
        sequenceIndex = (sequenceIndex + 1) % frames.length;
        setItemFrameIndex(frames[sequenceIndex] ?? 0);
        scheduleNext();
      }, durationMs);
    };

    void (async () => {
      const metadata = await loadAnimationMetadata(imageSrc);
      if (!mounted) return;
      const timeline = buildAnimationTimeline(itemFrameCount, metadata);
      frames = timeline.frames;
      frameTimesMs = timeline.frameTimesMs;
      sequenceIndex = 0;
      setItemFrameIndex(frames[sequenceIndex] ?? 0);
      scheduleNext();
    })();

    return () => {
      mounted = false;
      if (itemAnimationTimeoutRef.current) {
        window.clearTimeout(itemAnimationTimeoutRef.current);
        itemAnimationTimeoutRef.current = null;
      }
    };
  }, [
    imageSrc,
    isItem,
    isVisible,
    itemFrameCount,
    useItemTextureForCard,
  ]);

  return {
    imageSrc,
    imageError,
    setImageError,
    itemFrameCount,
    itemFrameIndex,
    setItemFrameCount,
    isColormap,
    is2DTexture,
    isItem,
    useItemTextureForCard
  };
}
