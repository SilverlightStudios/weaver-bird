import { useState, useEffect } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getPackTexturePath, getVanillaTexturePath } from "@lib/tauri";
import { useSelectWinner, useSelectPack } from "@state/selectors";

/**
 * Hook to load texture URL for a variant
 */
export function useVariantTexture(variantId: string): string | null {
    const [textureUrl, setTextureUrl] = useState<string | null>(null);
    const winnerPackId = useSelectWinner(variantId);
    const pack = useSelectPack(winnerPackId ?? "");

    useEffect(() => {
        let mounted = true;

        async function loadTexture() {
            if (!variantId) return;

            try {
                let texturePath: string;

                if (winnerPackId && winnerPackId !== "minecraft:vanilla" && pack) {
                    texturePath = await getPackTexturePath(
                        pack.path,
                        variantId,
                        pack.is_zip,
                    );
                } else {
                    texturePath = await getVanillaTexturePath(variantId);
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

        void loadTexture();

        return () => {
            mounted = false;
        };
    }, [variantId, winnerPackId, pack]);

    return textureUrl;
}
