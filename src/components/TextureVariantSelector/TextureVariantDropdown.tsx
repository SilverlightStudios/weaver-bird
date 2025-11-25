import { useState, useEffect } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getPackTexturePath, getVanillaTexturePath } from "@lib/tauri";
import { normalizeAssetId, getVariantNumber } from "@lib/assetUtils";
import { useSelectWinner, useSelectPack } from "@state/selectors";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/ui/components/Tooltip/Tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/ui/components/DropdownMenu/DropdownMenu";
import s from "./TextureVariantDropdown.module.scss";

interface TextureVariantDropdownProps {
  variants: string[];
  selectedVariantId: string;
  onSelectVariant: (variantId: string) => void;
  label: string;
}

// Hook to load texture URL for a variant
function useVariantTexture(variantId: string) {
  const [textureUrl, setTextureUrl] = useState<string | null>(null);
  const winnerPackId = useSelectWinner(variantId);
  const pack = useSelectPack(winnerPackId || "");

  useEffect(() => {
    let mounted = true;

    async function loadTexture() {
      if (!variantId) return;

      try {
        const normalizedId = normalizeAssetId(variantId);
        let texturePath: string;

        if (winnerPackId && winnerPackId !== "minecraft:vanilla" && pack) {
          texturePath = await getPackTexturePath(
            pack.path,
            normalizedId,
            pack.is_zip,
          );
        } else {
          texturePath = await getVanillaTexturePath(normalizedId);
        }

        if (mounted) {
          const url = convertFileSrc(texturePath);
          setTextureUrl(url);
        }
      } catch (error) {
        console.warn(`Failed to load texture for ${variantId}:`, error);
        if (mounted) {
          setTextureUrl(null);
        }
      }
    }

    loadTexture();

    return () => {
      mounted = false;
    };
  }, [variantId, winnerPackId, pack]);

  return textureUrl;
}

// Individual texture thumbnail component
function TextureThumbnail({
  variantId,
  isSelected,
  onClick,
}: {
  variantId: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  const textureUrl = useVariantTexture(variantId);
  const variantNumber = getVariantNumber(variantId);
  const displayText =
    variantNumber !== null ? `Variant ${variantNumber}` : variantId;

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <button
          className={`${s.thumbnail} ${isSelected ? s.selected : ""}`}
          onClick={onClick}
          type="button"
          aria-label={displayText}
        >
          {textureUrl ? (
            <img
              src={textureUrl}
              alt={displayText}
              className={s.thumbnailImage}
            />
          ) : (
            <div className={s.thumbnailPlaceholder}>?</div>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={4}>
        {displayText}
      </TooltipContent>
    </Tooltip>
  );
}

export function TextureVariantDropdown({
  variants,
  selectedVariantId,
  onSelectVariant,
  label,
}: TextureVariantDropdownProps) {
  const selectedTexture = useVariantTexture(selectedVariantId);

  const handleSelect = (variantId: string) => {
    onSelectVariant(variantId);
  };

  const selectedVariantNumber = getVariantNumber(selectedVariantId);
  const selectedDisplayText =
    selectedVariantNumber !== null
      ? `Variant ${selectedVariantNumber}`
      : selectedVariantId;

  return (
    <div className={s.root}>
      <label htmlFor="texture-variant-trigger" className={s.label}>
        {label}
      </label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            id="texture-variant-trigger"
            className={s.trigger}
            type="button"
          >
            <div className={s.triggerContent}>
              {selectedTexture ? (
                <img
                  src={selectedTexture}
                  alt={selectedDisplayText}
                  className={s.triggerThumbnail}
                />
              ) : (
                <div className={s.triggerPlaceholder}>?</div>
              )}
              <span className={s.triggerText}>{selectedDisplayText}</span>
            </div>
            <span className={s.triggerIcon}>▼</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={8}
          className={s.dropdownContent}
        >
          <div className={s.variantList}>
            {variants.map((variantId, index) => (
              <div key={variantId} className={s.variantRow}>
                <span className={s.variantNumber}>{index + 1}.</span>
                <TextureThumbnail
                  variantId={variantId}
                  isSelected={variantId === selectedVariantId}
                  onClick={() => handleSelect(variantId)}
                />
              </div>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
