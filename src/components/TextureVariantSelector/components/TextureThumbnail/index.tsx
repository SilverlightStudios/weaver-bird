import { getVariantNumber } from "@lib/assetUtils";
import {
    Tooltip,
    TooltipTrigger,
    TooltipContent,
} from "@/ui/components/Tooltip";
import { useVariantTexture } from "../../hooks/useVariantTexture";
import type { TextureThumbnailProps } from "./types";
import s from "../../styles.module.scss";

/**
 * Individual texture thumbnail component
 */
export const TextureThumbnail = ({
    variantId,
    index,
    isSelected,
    onClick,
}: TextureThumbnailProps) => {
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
                    <span className={s.thumbnailNumber}>{index + 1}</span>
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
};
