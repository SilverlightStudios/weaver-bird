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
  onColorSelect: (color: { r: number; g: number; b: number }) => void;
  showSourceSelector?: boolean;
  readOnly?: boolean;
  accent?: "emerald" | "gold" | "berry";
}

export default function BiomeColorCard({
  assetId,
  type,
  onColorSelect,
  showSourceSelector = true,
  readOnly = false,
  accent = "emerald",
}: BiomeColorCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [colormapSrc, setColormapSrc] = useState<string>("");
  const [selectedBiome, setSelectedBiome] = useState<string | null>(null);
  const [hoveredBiome, setHoveredBiome] = useState<string | null>(null);
  const [imageData, setImageData] = useState<ImageData | null>(null);

  const assets = useStore((state) => state.assets);
  const providersByAsset = useStore((state) => state.providersByAsset);
  const packs = useStore((state) => state.packs);
  const packOrder = useStore((state) => state.packOrder);

  const setOverride = useSelectSetOverride();
  const winnerPackId = useSelectWinner(assetId);
  const overrideVariantPath = useSelectOverrideVariantPath(assetId);
  const isPenciled = useSelectIsPenciled(assetId);

  const resolvedType = getColormapTypeFromAssetId(assetId) ?? type;

  const sourceOptions: ColormapSourceOption[] = useMemo(() => {
    const options: ColormapSourceOption[] = [];
    const seen = new Set<string>();
    const orderLookup = new Map<string, number>();
    packOrder.forEach((id, index) => orderLookup.set(id, index));

    Object.values(assets)
      .filter((asset) => {
        if (!isBiomeColormapAsset(asset.id)) return false;
        return getColormapTypeFromAssetId(asset.id) === resolvedType;
      })
      .forEach((asset) => {
        const variantLabel = getColormapVariantLabel(asset.id);
        const providers = providersByAsset[asset.id] ?? [];

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
  }, [assets, providersByAsset, packs, packOrder, assetId, resolvedType]);

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

    const color = sampleColor(x, y);
    if (color) {
      onColorSelect(color);
      setSelectedBiome(null);
    }
  }

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

  function handleBiomeSelect(biome: BiomeData, x: number, y: number) {
    if (readOnly) return;
    setSelectedBiome(biome.id);
    const color = sampleColor(x, y);
    if (color) {
      onColorSelect(color);
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

  const isAutoSelected = !isPenciled || !selectedSource;
  const currentSourceLabel = isAutoSelected
    ? `Pack order (${selectedSource?.packName ?? "Default"})`
    : selectedSource?.label ?? "Select source";

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
        <p className={s.subtitle}>Select a biome or click anywhere on the map</p>
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
              {biomesWithCoords.map((biome) => {
                const leftPercent = (biome.x / 255) * 100;
                const topPercent = (biome.y / 255) * 100;
                const isSelected = selectedBiome === biome.id;
                const isHovered = hoveredBiome === biome.id;

                return (
                  <Tooltip key={biome.id} delayDuration={100}>
                    <TooltipTrigger asChild>
                      <button
                        className={`${s.hotspot} ${isSelected ? s.selected : ""} ${isHovered ? s.hovered : ""}`}
                        style={{
                          left: `${leftPercent}%`,
                          top: `${topPercent}%`,
                        }}
                        onClick={() =>
                          handleBiomeSelect(biome, biome.x, biome.y)
                        }
                        onMouseEnter={() => setHoveredBiome(biome.id)}
                        onMouseLeave={() => setHoveredBiome(null)}
                        disabled={readOnly}
                      >
                        <span className={s.dot} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center">
                      {biome.name}
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
