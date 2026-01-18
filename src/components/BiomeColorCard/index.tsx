/**
 * BiomeColorCard Component
 *
 * Interactive colormap selector for grass/foliage biome tinting.
 *
 * DUAL-SAMPLING ARCHITECTURE:
 * ---------------------------
 * This component performs TWO types of color sampling:
 *
 * 1. INLINE CANVAS SAMPLING (Immediate feedback):
 *    - Uses document.createElement('canvas') on main thread
 *    - Provides instant visual feedback when clicking
 *    - Called via onColorSelect callback (for 3D preview temporary override)
 *
 * 2. WEB WORKER SAMPLING (Global state via colormapManager):
 *    - Triggered when updateGlobalState=true (default)
 *    - Calls setColormapCoordinates() which updates global state
 *    - main.tsx listens to coordinates and triggers worker sampling
 *    - Results stored in global state (affects all tinted blocks)
 *
 * USAGE MODES:
 * ------------
 * - Settings Page (updateGlobalState=true):
 *   Both inline + global worker sampling → affects all blocks
 *
 * - 3D Preview Biome Tab (updateGlobalState=false):
 *   Only inline sampling → temporary override for current preview only
 *
 * This design provides instant UI feedback while maintaining proper
 * global state management through the worker system.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getPackTexturePath, getVanillaTexturePath } from "@lib/tauri";
import { getColormapTypeFromAssetId } from "@lib/assetUtils";
import {
  useSelectIsPenciled,
  useSelectOverrideVariantPath,
  useSelectSetOverride,
  useSelectWinner,
  useStore,
} from "@state";
import { getBiomesWithCoords } from "@/components/BiomeColorCard/biomeData";
import { ColorSourceDropdown } from "./components/ColorSourceDropdown";
import { BiomeHotspot } from "./components/BiomeHotspot";
import {
  sampleColor,
  groupHotspotsByCoordinate,
  buildSourceOptions,
  selectActiveSource,
} from "./utilities";
import type { BiomeColorCardProps } from "./types";
import s from "./styles.module.scss";

export const BiomeColorCard = ({
  assetId,
  type,
  onColorSelect,
  showSourceSelector = true,
  readOnly = false,
  accent = "emerald",
  updateGlobalState = true,
}: BiomeColorCardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [colormapSrc, setColormapSrc] = useState<string>("");
  const [selectedBiome, setSelectedBiome] = useState<string | null>(null);
  const [hoveredBiome, setHoveredBiome] = useState<string | null>(null);
  const [imageData, setImageData] = useState<ImageData | null>(null);

  const setOverride = useSelectSetOverride();
  const winnerPackId = useSelectWinner(assetId);
  const overrideVariantPath = useSelectOverrideVariantPath(assetId);
  const isPenciled = useSelectIsPenciled(assetId);

  // Global biome state for display purposes
  const selectedBiomeId = useStore((state) => state.selectedBiomeId);

  const resolvedType = getColormapTypeFromAssetId(assetId) ?? type;

  // Get all assets and providers (simple subscriptions)
  const assets = useStore((state) => state.assets);
  const providersByAsset = useStore((state) => state.providersByAsset);
  const packs = useStore((state) => state.packs);
  const packOrder = useStore((state) => state.packOrder);
  const disabledPackIds = useStore((state) => state.disabledPackIds);

  const sourceOptions = useMemo(() => {
    console.log(`[BiomeColorCard.useMemo.sourceOptions] type=${resolvedType}`);
    return buildSourceOptions(
      assets,
      providersByAsset,
      packs,
      packOrder,
      disabledPackIds,
      assetId,
      resolvedType,
    );
  }, [
    assets,
    providersByAsset,
    packs,
    packOrder,
    assetId,
    disabledPackIds,
    resolvedType,
  ]);

  const selectedSource = useMemo(() => {
    return selectActiveSource(
      sourceOptions,
      assetId,
      winnerPackId,
      overrideVariantPath,
    );
  }, [assetId, overrideVariantPath, sourceOptions, winnerPackId]);

  // Resolve file path for the currently selected source
  useEffect(() => {
    console.log(
      `[BiomeColorCard.useEffect.loadColormap] source=${selectedSource?.packId}`,
    );
    let cancelled = false;

    async function loadColormap() {
      if (!selectedSource) {
        setColormapSrc("");
        return;
      }

      try {
        let path: string;
        if (selectedSource.packId === "minecraft:vanilla") {
          path = await getVanillaTexturePath(selectedSource.assetId);
        } else {
          const packMeta = packs[selectedSource.packId];
          if (!packMeta) {
            throw new Error(
              `Pack metadata not found for ${selectedSource.packId}`,
            );
          }
          path = await getPackTexturePath(
            packMeta.path,
            selectedSource.assetId,
            packMeta.is_zip,
          );
        }

        if (!cancelled) {
          setColormapSrc(convertFileSrc(path));
        }
      } catch (error) {
        console.error("[BiomeColorCard] Failed to load colormap:", error);
        if (!cancelled) {
          setColormapSrc("");
        }
      }
    }

    void loadColormap();
    return () => {
      cancelled = true;
    };
  }, [selectedSource, packs]);

  // Draw the colormap image to canvas and extract image data
  useEffect(() => {
    if (!colormapSrc || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      try {
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setImageData(data);
      } catch (error) {
        console.error("[BiomeColorCard] Unable to read image:", error);
        setImageData(null);
      }
    };
    img.onerror = (error) => {
      console.error("[BiomeColorCard] Failed to load image:", error);
    };
    img.src = colormapSrc;
  }, [colormapSrc]);

  // Get the coordinate setter from store
  const setColormapCoordinates = useStore(
    (state) => state.setColormapCoordinates,
  );

  function handleCanvasClick(event: React.MouseEvent<HTMLCanvasElement>) {
    if (!imageData || !canvasRef.current || readOnly) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(
      ((event.clientX - rect.left) / rect.width) * canvas.width,
    );
    const y = Math.floor(
      ((event.clientY - rect.top) / rect.height) * canvas.height,
    );

    // Update global colormap coordinates if enabled (affects all tinted blocks)
    if (updateGlobalState) {
      setColormapCoordinates({ x, y });
    }
    setSelectedBiome(null);

    // Call the optional callback if provided (for temporary override in 3D preview)
    if (onColorSelect) {
      const color = sampleColor(imageData, x, y);
      if (color) {
        onColorSelect(color);
      }
    }
  }

  function handleBiomeSelect(x: number, y: number, biomeId: string) {
    if (readOnly) return;

    // Update global colormap coordinates if enabled (affects all tinted blocks)
    if (updateGlobalState) {
      setColormapCoordinates({ x, y });
    }
    setSelectedBiome(biomeId);

    // Update global store so dropdown reflects the selection
    const { setSelectedBiomeId } = useStore.getState();
    setSelectedBiomeId(biomeId);

    // Call the optional callback if provided (for temporary override in 3D preview)
    if (onColorSelect) {
      const color = sampleColor(imageData, x, y);
      if (color) {
        onColorSelect(color);
      }
    }
  }

  function handleSourceSelect(optionId: string) {
    if (optionId === "__auto") {
      setOverride(assetId, undefined);
      return;
    }

    const option = sourceOptions.find((opt) => opt.id === optionId);
    if (!option) return;

    setOverride(assetId, option.packId, {
      variantPath: option.assetId === assetId ? undefined : option.relativePath,
    });
  }

  const biomesWithCoords = getBiomesWithCoords();
  const hotspotsByCoord = useMemo(
    () => groupHotspotsByCoordinate(biomesWithCoords),
    [biomesWithCoords],
  );

  const isAutoSelected = !isPenciled || !selectedSource;

  const accentClass =
    accent === "gold"
      ? s.accentGold
      : accent === "berry"
        ? s.accentBerry
        : s.accentEmerald;

  return (
    <div className={`${s.card} ${accentClass}`}>
      <div className={s.header}>
        <h3 className={s.title}>
          {resolvedType === "grass" ? "Grass" : "Foliage"} Colormap
        </h3>
        <p className={s.subtitle}>
          Select a biome or click anywhere on the map
        </p>
      </div>

      {showSourceSelector && sourceOptions.length > 0 && (
        <div className={s.sourceSelector}>
          <ColorSourceDropdown
            sourceOptions={sourceOptions}
            selectedSource={selectedSource}
            isAutoSelected={isAutoSelected}
            onSourceSelect={handleSourceSelect}
          />
        </div>
      )}

      <div className={s.content}>
        <div className={s.canvasContainer}>
          <canvas
            ref={canvasRef}
            className={s.canvas}
            onClick={handleCanvasClick}
          />

          {imageData && (
            <div className={s.hotspots}>
              {hotspotsByCoord.map((hotspot) => {
                // Use actual image dimensions
                const maxX = imageData.width - 1;
                const maxY = imageData.height - 1;
                // Check both local selection and global selection
                const isSelected = hotspot.biomes.some(
                  (b) => selectedBiome === b.id || selectedBiomeId === b.id,
                );
                const isHovered = hotspot.biomes.some(
                  (b) => hoveredBiome === b.id,
                );

                return (
                  <BiomeHotspot
                    key={hotspot.coordKey}
                    biomes={hotspot.biomes}
                    x={hotspot.x}
                    y={hotspot.y}
                    maxX={maxX}
                    maxY={maxY}
                    isSelected={isSelected}
                    isHovered={isHovered}
                    onSelect={() =>
                      handleBiomeSelect(hotspot.x, hotspot.y, hotspot.biomes[0].id)
                    }
                    onMouseEnter={() => setHoveredBiome(hotspot.biomes[0].id)}
                    onMouseLeave={() => setHoveredBiome(null)}
                    readOnly={readOnly}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
