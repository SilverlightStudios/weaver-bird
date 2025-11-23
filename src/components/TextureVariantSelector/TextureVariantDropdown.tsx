import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getPackTexturePath, getVanillaTexturePath } from "@lib/tauri";
import { normalizeAssetId, getVariantNumber } from "@lib/assetUtils";
import { useSelectWinner, useSelectPack } from "@state/selectors";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/ui/components/Tooltip/Tooltip";
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
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const selectedTexture = useVariantTexture(selectedVariantId);

  // Calculate grid columns based on variant count
  // Formula: min(floor(x/1.7), 3) where x = number of variants
  const gridColumns = Math.min(Math.floor(variants.length / 1.7), 3);

  // Close on click outside
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  // Position the dropdown relative to trigger
  useEffect(() => {
    if (!open || !contentRef.current || !triggerRef.current) return;

    const trigger = triggerRef.current;
    const content = contentRef.current;

    const updatePosition = () => {
      const triggerRect = trigger.getBoundingClientRect();
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const scrollX = window.scrollX || document.documentElement.scrollLeft;

      // Position below the trigger
      content.style.top = `${triggerRect.bottom + scrollY + 8}px`;
      content.style.left = `${triggerRect.left + scrollX}px`;
    };

    requestAnimationFrame(() => {
      updatePosition();
    });

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  const handleSelect = (variantId: string) => {
    onSelectVariant(variantId);
    setOpen(false);
  };

  const selectedVariantNumber = getVariantNumber(selectedVariantId);
  const selectedDisplayText =
    selectedVariantNumber !== null
      ? `Variant ${selectedVariantNumber}`
      : selectedVariantId;

  const dropdownContent = open
    ? createPortal(
        <div ref={contentRef} className={s.content}>
          <div
            className={s.grid}
            style={{
              gridTemplateColumns: `repeat(${gridColumns}, 32px)`,
            }}
          >
            {variants.map((variantId) => (
              <TextureThumbnail
                key={variantId}
                variantId={variantId}
                isSelected={variantId === selectedVariantId}
                onClick={() => handleSelect(variantId)}
              />
            ))}
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className={s.root}>
      <label htmlFor="texture-variant-trigger" className={s.label}>
        {label}
      </label>
      <button
        id="texture-variant-trigger"
        ref={triggerRef}
        className={s.trigger}
        onClick={() => setOpen(!open)}
        type="button"
        aria-expanded={open}
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
        <span className={s.triggerIcon}>{open ? "▲" : "▼"}</span>
      </button>
      {dropdownContent}
    </div>
  );
}
