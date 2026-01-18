import { useState, useEffect, useMemo } from "react";
import { useStore } from "@state/store";
import { clearTintCache, type TintColor } from "@lib/textureColorization";
import type { RenderedElement } from "./types";
import {
    checkNeedsGrassTint,
    checkNeedsFoliageTint,
    resolveGrassColor,
    resolveFoliageColor,
    getTintedTextures,
} from "./tint-utilities";

export function useBlockTinting(
    assetId: string,
    renderedElements: RenderedElement[],
) {
    const [tintedTextures, setTintedTextures] = useState<Map<string, string>>(
        new Map(),
    );

    // OPTIMIZATION: Determine if this block uses tinting to avoid unnecessary subscriptions
    const needsGrassTint = useMemo(
        () => checkNeedsGrassTint(assetId),
        [assetId],
    );

    const needsFoliageTint = useMemo(
        () => checkNeedsFoliageTint(assetId),
        [assetId],
    );

    const needsAnyTint = needsGrassTint || needsFoliageTint;

    // Get selected biome/colors for tinting - only subscribe if needed
    const selectedBiomeId = useStore((state) =>
        needsAnyTint ? state.selectedBiomeId : undefined,
    );
    const selectedGrassColor = useStore((state) =>
        needsGrassTint ? state.selectedGrassColor : undefined,
    );
    const selectedFoliageColor = useStore((state) =>
        needsFoliageTint ? state.selectedFoliageColor : undefined,
    );

    // Subscribe to colormap URLs only if block uses tinting
    // This prevents non-tinted blocks from re-rendering on pack order changes
    const grassColormapUrl = useStore((state) =>
        needsGrassTint ? state.grassColormapUrl : undefined,
    );
    const foliageColormapUrl = useStore((state) =>
        needsFoliageTint ? state.foliageColormapUrl : undefined,
    );

    // Prevent unused variable warnings
    void grassColormapUrl;
    void foliageColormapUrl;

    // Compute grass tint color
    const grassColor: TintColor | null = useMemo(
        () => resolveGrassColor(selectedGrassColor),
        [selectedGrassColor],
    );

    // Compute foliage tint color
    const foliageColor: TintColor = useMemo(
        () => resolveFoliageColor(selectedFoliageColor, selectedBiomeId),
        [selectedBiomeId, selectedFoliageColor],
    );

    // Apply foliage tinting to leaf textures
    useEffect(() => {
        if ((!grassColor && !foliageColor) || renderedElements.length === 0) {
            setTintedTextures(new Map());
            return;
        }

        let mounted = true;

        const applyTinting = async () => {
            const newTintedTextures = await getTintedTextures(
                renderedElements,
                grassColor,
                foliageColor,
            );

            if (mounted) {
                setTintedTextures(newTintedTextures);
            }
        };

        applyTinting().catch((err) => {
            console.error("[useBlockTinting] Failed to apply tinting:", err);
        });

        return () => {
            mounted = false;
        };
    }, [grassColor, foliageColor, renderedElements]);

    // Cleanup tint cache on unmount
    useEffect(() => {
        return () => {
            clearTintCache();
        };
    }, []);

    return {
        tintedTextures,
        foliageColor,
    };
}
