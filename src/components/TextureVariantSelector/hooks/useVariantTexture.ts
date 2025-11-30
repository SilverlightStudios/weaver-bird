import { useState, useEffect } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getPackTexturePath, getVanillaTexturePath } from "@lib/tauri";
import { normalizeAssetId } from "@lib/assetUtils";
import { useSelectWinner, useSelectPack } from "@state/selectors";

/**
 * Hook to load texture URL for a variant
 */
export function useVariantTexture(variantId: string): string | null {
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
