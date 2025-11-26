import { useEffect, useMemo, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getPackTexturePath, getVanillaTexturePath } from "@lib/tauri";
import {
  assetIdToTexturePath,
  getColormapTypeFromAssetId,
  getColormapVariantLabel,
  isBiomeColormapAsset,
} from "@lib/assetUtils";
import {
  useSelectIsPenciled,
  useSelectOverrideVariantPath,
  useSelectSetOverride,
  useSelectWinner,
  useStore,
} from "@state";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/ui/components/Tooltip/Tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/ui/components/DropdownMenu/DropdownMenu";
import {
  getBiomesWithCoords,
  type BiomeData,
} from "@components/BiomeColorPicker/biomeData";
import s from "./styles.module.scss";

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

interface ColormapSourceOption {
  id: string;
  assetId: string;
  packId: string;
  packName: string;
  label: string;
  variantLabel?: string | null;
  relativePath: string;
  order: number;
}

export interface BiomeColorCardProps {
  assetId: string;
  type: "grass" | "foliage";
  onColorSelect?: (color: { r: number; g: number; b: number }) => void;
  showSourceSelector?: boolean;
  readOnly?: boolean;
  accent?: "emerald" | "gold" | "berry";
  /**
   * Whether to update global colormap coordinates when clicking
   * - true: Updates global state (affects all tinted blocks) - used in Settings
   * - false: Only calls onColorSelect callback (temporary override) - used in 3D preview
   * @default true
   */
  updateGlobalState?: boolean;
}

export default function BiomeColorCard({
  assetId,
  type,
  onColorSelect,
  showSourceSelector = true,
  readOnly = false,
  accent = "emerald",
  updateGlobalState = true,
}: BiomeColorCardProps) {
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

  const sourceOptions: ColormapSourceOption[] = useMemo(() => {
    console.log(`[BiomeColorCard.useMemo.sourceOptions] type=${resolvedType}`);
    const options: ColormapSourceOption[] = [];
    const seen = new Set<string>();
    const orderLookup = new Map<string, number>();
    packOrder.forEach((id, index) => orderLookup.set(id, index));
    const disabledSet = new Set(disabledPackIds);

    // Filter to only colormap assets of the correct type
    const colormapAssets = Object.values(assets).filter(
      (asset) =>
        isBiomeColormapAsset(asset.id) &&
        getColormapTypeFromAssetId(asset.id) === resolvedType,
    );

    colormapAssets.forEach((asset) => {
      const variantLabel = getColormapVariantLabel(asset.id);
      const providers = (providersByAsset[asset.id] ?? []).filter(
        (packId) => !disabledSet.has(packId),
      );

      providers.forEach((packId) => {
        const packName = packs[packId]?.name ?? packId;
        const id = `${asset.id}::${packId}`;
        if (seen.has(id)) return;
        seen.add(id);

        const priority = orderLookup.get(packId);
        options.push({
          id,
          assetId: asset.id,
          packId,
          packName,
          label: variantLabel ? `${packName} (${variantLabel})` : packName,
          variantLabel,
          relativePath: assetIdToTexturePath(asset.id),
          order: priority === undefined ? Number.MAX_SAFE_INTEGER : priority,
        });
      });
    });

    if (
      !options.some(
        (option) =>
          option.packId === "minecraft:vanilla" && option.assetId === assetId,
      )
    ) {
      options.push({
        id: `${assetId}::minecraft:vanilla`,
        assetId,
        packId: "minecraft:vanilla",
        packName: "Minecraft (Vanilla)",
        label: "Minecraft (Vanilla)",
        variantLabel: null,
        relativePath: assetIdToTexturePath(assetId),
        order: Number.MAX_SAFE_INTEGER / 2,
      });
    }

    return options.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      if (!!a.variantLabel !== !!b.variantLabel) {
        return a.variantLabel ? 1 : -1;
      }
      return a.label.localeCompare(b.label);
    });
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
    if (!sourceOptions.length) return null;
    if (!winnerPackId) {
      return sourceOptions[0];
    }

    if (overrideVariantPath) {
      const variantMatch = sourceOptions.find(
        (option) =>
          option.packId === winnerPackId &&
          option.relativePath === overrideVariantPath,
      );
      if (variantMatch) {
        return variantMatch;
      }
    }

    const directMatch = sourceOptions.find(
      (option) => option.packId === winnerPackId && option.assetId === assetId,
    );
    if (directMatch) {
      return directMatch;
    }

    return (
      sourceOptions.find((option) => option.packId === winnerPackId) ??
      sourceOptions[0]
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

    loadColormap();
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

  // Helper function to sample color from imageData
  function sampleColor(
    x: number,
    y: number,
  ): { r: number; g: number; b: number } | null {
    if (!imageData) return null;
    const index = (y * imageData.width + x) * 4;
    return {
      r: imageData.data[index],
      g: imageData.data[index + 1],
      b: imageData.data[index + 2],
    };
  }

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
      const color = sampleColor(x, y);
      if (color) {
        onColorSelect(color);
      }
    }
  }

  function handleBiomeSelect(biome: BiomeData, x: number, y: number) {
    if (readOnly) return;

    // Update global colormap coordinates if enabled (affects all tinted blocks)
    if (updateGlobalState) {
      setColormapCoordinates({ x, y });
    }
    setSelectedBiome(biome.id);

    // Update global store so dropdown reflects the selection
    const { setSelectedBiomeId } = useStore.getState();
    setSelectedBiomeId(biome.id);

    // Call the optional callback if provided (for temporary override in 3D preview)
    if (onColorSelect) {
      const color = sampleColor(x, y);
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

  // Group biomes by coordinate to deduplicate hotspots
  const hotspotsByCoord = useMemo(() => {
    const map = new Map<string, Array<BiomeData & { x: number; y: number }>>();

    biomesWithCoords.forEach((biome) => {
      const key = `${biome.x},${biome.y}`;
      const existing = map.get(key);
      if (existing) {
        existing.push(biome);
      } else {
        map.set(key, [biome]);
      }
    });

    return Array.from(map.entries()).map(([coordKey, biomes]) => ({
      coordKey,
      x: biomes[0].x,
      y: biomes[0].y,
      biomes,
    }));
  }, [biomesWithCoords]);

  const isAutoSelected = !isPenciled || !selectedSource;
  const currentSourceLabel = isAutoSelected
    ? `Pack order (${selectedSource?.packName ?? "Default"})`
    : (selectedSource?.label ?? "Select source");

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={s.dropdownTrigger} type="button">
                <span className={s.dropdownLabel}>Source</span>
                <span className={s.dropdownValue}>{currentSourceLabel}</span>
                <span className={s.dropdownChevron}>▼</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Colormap Source</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => handleSourceSelect("__auto")}
                className={isAutoSelected ? s.selectedItem : ""}
              >
                Pack order ({selectedSource?.packName ?? "Default"})
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {sourceOptions.map((option) => (
                <DropdownMenuItem
                  key={option.id}
                  onSelect={() => handleSourceSelect(option.id)}
                  className={
                    !isAutoSelected && selectedSource?.id === option.id
                      ? s.selectedItem
                      : ""
                  }
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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
                // Use actual image dimensions instead of hardcoded 255
                const maxX = imageData.width - 1;
                const maxY = imageData.height - 1;
                const leftPercent = (hotspot.x / maxX) * 100;
                const topPercent = (hotspot.y / maxY) * 100;
                // Check both local selection and global selection
                const isSelected = hotspot.biomes.some(
                  (b) => selectedBiome === b.id || selectedBiomeId === b.id,
                );
                const isHovered = hotspot.biomes.some(
                  (b) => hoveredBiome === b.id,
                );

                return (
                  <Tooltip key={hotspot.coordKey} delayDuration={100}>
                    <TooltipTrigger asChild>
                      <button
                        className={`${s.hotspot} ${isSelected ? s.selected : ""} ${isHovered ? s.hovered : ""}`}
                        style={{
                          left: `${leftPercent}%`,
                          top: `${topPercent}%`,
                        }}
                        onClick={() =>
                          handleBiomeSelect(
                            hotspot.biomes[0],
                            hotspot.x,
                            hotspot.y,
                          )
                        }
                        onMouseEnter={() =>
                          setHoveredBiome(hotspot.biomes[0].id)
                        }
                        onMouseLeave={() => setHoveredBiome(null)}
                        disabled={readOnly}
                      >
                        <span className={s.dot} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center">
                      {hotspot.biomes.length > 1 ? (
                        <div>
                          <ul
                            style={{
                              margin: 0,
                              paddingLeft: "1.2em",
                              textAlign: "left",
                              listStyleType: "disc",
                            }}
                          >
                            {hotspot.biomes.map((biome) => (
                              <li
                                key={biome.id}
                                style={{ display: "list-item" }}
                              >
                                {biome.name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        hotspot.biomes[0].name
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
