import { useEffect, useState, useRef, useMemo, memo } from "react";
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
  isEntityTexture,
  getEntityInfoFromAssetId,
  loadEntityModel,
} from "@lib/emf";
import {
  useSelectWinner,
  useSelectIsPenciled,
  useSelectPack,
} from "@state/selectors";
import { useStore } from "@state/store";
import { MinecraftCSSBlock } from "@components/MinecraftCSSBlock";
import {
  needsGrassTint,
  needsFoliageTint,
  generateDisplayName,
} from "../../utilities";
import { getEntityTypeFromAssetId } from "@lib/emf";
import {
  isEntityCompatible,
  getIncompatibilityMessage,
} from "@lib/packFormatCompatibility";
import type { AssetCardProps } from "./types";
import s from "./styles.module.scss";

import { View } from "@react-three/drei";
import { EntityThumbnail } from "../EntityThumbnail";

function EntityThumbnailView({
  jemModel,
  textureUrl,
  extraTextureUrls,
}: {
  jemModel: any;
  textureUrl: string | null;
  extraTextureUrls?: Record<string, string | null> | null;
}) {
  if (!jemModel) return null;

  return (
    <View className={s.entityViewTrack} style={{ position: "absolute", inset: 0 }}>
      <EntityThumbnail
        jemModel={jemModel}
        textureUrl={textureUrl}
        extraTextureUrls={extraTextureUrls}
      />
    </View>
  );
}

export const AssetCard = memo(
  function AssetCard({
    asset,
    isSelected,
    onSelect,
    variantCount,
    staggerIndex,
  }: AssetCardProps) {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [imageError, setImageError] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    const isColormap = isBiomeColormapAsset(asset.id);
    const is2DTexture = is2DOnlyTexture(asset.id);
    const isItem = isMinecraftItem(asset.id);
    const isEntity = isEntityTexture(asset.id);
    const useItemTextureForCard = shouldUseItemTextureForCard(asset.id);

    // Entity rendering state
    const [jemModel, setJemModel] = useState<any>(null);
    const [entityTextureUrl, setEntityTextureUrl] = useState<string | null>(
      null,
    );
    const [entityExtraTextureUrls, setEntityExtraTextureUrls] = useState<
      Record<string, string | null> | null
    >(null);

    // Get the winning pack for this asset
    const winnerPackId = useSelectWinner(asset.id);
    const isPenciled = useSelectIsPenciled(asset.id);
    const winnerPack = useSelectPack(winnerPackId || "");

    // Check entity compatibility
    const entityId = useMemo(
      () => getEntityTypeFromAssetId(asset.id),
      [asset.id],
    );
    const packFormat = useStore((state) =>
      winnerPackId ? state.packFormats[winnerPackId] : undefined,
    );
    const targetMinecraftVersion = useStore(
      (state) => state.targetMinecraftVersion,
    );
    const entityVersionVariants = useStore(
      (state) => state.entityVersionVariants,
    );

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

    // OPTIMIZATION: Selective subscriptions - only subscribe to colors/colormaps if this asset uses them
    // Determine if this block uses tinting (grass, leaves, vines, etc.)
    const needsGrass = useMemo(() => needsGrassTint(asset.id), [asset.id]);
    const needsFoliage = useMemo(() => needsFoliageTint(asset.id), [asset.id]);

    // Only subscribe to colors and colormap URLs if this asset actually uses them
    // This prevents 95%+ of cards from re-rendering on pack order changes
    const selectedGrassColor = useStore((state) =>
      needsGrass ? state.selectedGrassColor : undefined,
    );
    const selectedFoliageColor = useStore((state) =>
      needsFoliage ? state.selectedFoliageColor : undefined,
    );
    const grassColormapUrl = useStore((state) =>
      needsGrass ? state.grassColormapUrl : undefined,
    );
    const foliageColormapUrl = useStore((state) =>
      needsFoliage ? state.foliageColormapUrl : undefined,
    );

    // Prevent unused variable warnings
    void selectedGrassColor;
    void selectedFoliageColor;
    void grassColormapUrl;
    void foliageColormapUrl;

    // Intersection Observer to detect visibility
    useEffect(() => {
      if (!cardRef.current) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          // Continuously track visibility for proper scroll behavior
          setIsVisible(entry.isIntersecting);
        },
        { rootMargin: "200px" }, // Start loading 200px before visible
      );

      observer.observe(cardRef.current);

      return () => {
        observer.disconnect();
      };
    }, []);

    // Only load image when visible - needed for colormaps, 2D textures, and items
    // MinecraftCSSBlock handles its own texture loading for 3D blocks
    // OPTIMIZATION: Memoize winning pack path to prevent reloads when pack hasn't changed
    const winnerPackPath = useMemo(() => {
      return winnerPack ? `${winnerPack.path}:${winnerPack.is_zip}` : null;
    }, [winnerPack]);

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

      loadImage();

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
      winnerPackPath,
      winnerPack,
    ]);

    // Load entity model and texture when visible
    useEffect(() => {
      if (!isVisible || !isEntity) return;

      let mounted = true;
      setEntityExtraTextureUrls(null);

      const loadEntity = async () => {
        try {
          const normalizedAssetId = normalizeAssetId(asset.id);
          const entityInfo = getEntityInfoFromAssetId(normalizedAssetId);
          const path = normalizedAssetId.includes(":")
            ? normalizedAssetId.split(":")[1]!
            : normalizedAssetId;
          const isDecoratedPot = path.startsWith("entity/decorated_pot/");
          const ns = normalizedAssetId.includes(":")
            ? normalizedAssetId.split(":")[0]!
            : "minecraft";

          if (!entityInfo) {
            console.warn(
              `[AssetCard] Could not extract entity info from ${asset.id}`,
            );
            return;
          }

          // Load JEM model
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

          const cloneModel = (m: any): any => {
            const clonePart = (p: any): any => ({
              ...p,
              boxes: Array.isArray(p.boxes) ? p.boxes.map((b: any) => ({ ...b })) : [],
              children: Array.isArray(p.children) ? p.children.map(clonePart) : [],
            });
            return { ...m, parts: Array.isArray(m.parts) ? m.parts.map(clonePart) : [] };
          };

          // Load entity texture
          let texturePath: string;
          const resolveTexturePath = async (assetId: string): Promise<string> => {
            if (winnerPackId && winnerPack) {
              try {
                return await getPackTexturePath(
                  winnerPack.path,
                  assetId,
                  winnerPack.is_zip,
                );
              } catch {
                return await getVanillaTexturePath(assetId);
              }
            }
            return await getVanillaTexturePath(assetId);
          };

          const basePotAssetId = `${ns}:entity/decorated_pot/decorated_pot_base`;
          const sidePotAssetId = `${ns}:entity/decorated_pot/decorated_pot_side`;

          // Decorated pot needs multiple textures: base + side/pattern masks.
          // For the resource card preview, default to the base pot with side texture.
          const previewModel = isDecoratedPot ? cloneModel(model) : model;
          const extra: Record<string, string | null> | null = isDecoratedPot
            ? {}
            : null;

          if (isDecoratedPot) {
            const applySide = (part: any) => {
              if (["front", "back", "left", "right"].includes(part.name)) {
                part.texturePath = sidePotAssetId;
              }
              if (part.children) part.children.forEach(applySide);
            };
            previewModel.parts?.forEach(applySide);

            // Main texture should be the base pot texture (not whichever pattern leaf).
            texturePath = await resolveTexturePath(basePotAssetId);
            try {
              const sidePath = await resolveTexturePath(sidePotAssetId);
              extra![sidePotAssetId] = convertFileSrc(sidePath);
            } catch {
              extra![sidePotAssetId] = null;
            }
          } else {
            texturePath = await resolveTexturePath(normalizedAssetId);
          }

          if (mounted) {
            const textureUrl = convertFileSrc(texturePath);
            setJemModel(previewModel);
            setEntityTextureUrl(textureUrl);
            setEntityExtraTextureUrls(extra);
          }
        } catch (error) {
          console.error(
            `[AssetCard] Failed to load entity ${asset.id}:`,
            error,
          );
          if (mounted) setEntityExtraTextureUrls(null);
        }
      };

      loadEntity();

      return () => {
        mounted = false;
      };
    }, [
      isVisible,
      isEntity,
      asset.id,
      winnerPackId,
      winnerPack,
      targetMinecraftVersion,
      entityVersionVariants,
      packFormat,
    ]);

    // Generate display name
    const displayName = useMemo(() => generateDisplayName(asset), [asset]);

    return (
      <div
        ref={cardRef}
        className={`${s.card} ${isSelected ? s.selected : ""}`}
        onClick={onSelect}
      >
        <div className={s.imageContainer}>
          {isColormap || is2DTexture || isItem || useItemTextureForCard ? (
            // Colormaps, 2D textures, items, and cross-shaped plants display as flat images
            imageSrc && !imageError ? (
              <img
                src={imageSrc}
                alt={displayName}
                className={
                  isItem || useItemTextureForCard
                    ? s.itemTexture
                    : is2DTexture
                      ? s.texture2D
                      : s.colormapTexture
                }
                onError={() => setImageError(true)}
              />
            ) : imageError ? (
              <div className={s.placeholder}>
                <span className={s.placeholderIcon}>
                  {isItem || useItemTextureForCard
                    ? "⚔️"
                    : is2DTexture
                      ? "🖼️"
                      : "🎨"}
                </span>
              </div>
            ) : (
              <div className={s.placeholder}>
                <span className={s.placeholderIcon}>⏳</span>
              </div>
            )
          ) : // ... (existing imports)

          // ... inside component ...

          // Blocks and entities display as 3D CSS cubes (or Three.js View for entities)
          isVisible ? (
            isEntity ? (
              <EntityThumbnailView
                key={`entity-${asset.id}`}
                jemModel={jemModel}
                textureUrl={entityTextureUrl}
                extraTextureUrls={entityExtraTextureUrls}
              />
            ) : (
              <MinecraftCSSBlock
                assetId={asset.id}
                packId={winnerPackId || undefined}
                alt={displayName}
                size={75}
                staggerIndex={staggerIndex}
                onError={() => setImageError(true)}
                renderMode="block"
              />
            )
          ) : (
            <div className={s.placeholder}>
              <span className={s.placeholderIcon}>⏳</span>
            </div>
          )}
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
