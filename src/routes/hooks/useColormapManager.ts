/**
 * Colormap Manager Hook
 *
 * Manages colormap state: resolves winners, loads URLs, samples colors.
 */

import { useEffect, useTransition } from "react";
import { useStore } from "@/state/store";
import {
  GRASS_COLORMAP_ASSET_ID,
  FOLIAGE_COLORMAP_ASSET_ID,
} from "@/constants/colormaps";
import {
  resolveColormapWinner,
  loadColormapUrl,
  sampleColormapColors,
  getPlainsCoordinates,
  coordinatesToBiome,
} from "@/lib/colormapManager";
import type { PackMeta } from "@state";

export function useColormapManager(
  allAssets: unknown[],
  packOrder: string[],
  packs: PackMeta[],
  providersByAsset: Record<string, string[]>,
  colormapOverrides: Record<string, { packId: string; variantPath?: string }>,
  disabledPackIds: string[],
) {
  const [_isPending, startTransition] = useTransition();

  useEffect(() => {
    console.log(`[useColormapManager] triggered`);
    const updateColormapState = async () => {
      if (allAssets.length === 0 || packOrder.length === 0) {
        return;
      }

      const packsMap = packs.reduce(
        (acc: Record<string, PackMeta>, p: PackMeta) => {
          acc[p.id] = p;
          return acc;
        },
        {},
      );

      startTransition(() => {
        void (async () => {
          try {
            const grassWinner = resolveColormapWinner(
              GRASS_COLORMAP_ASSET_ID,
              packOrder,
              providersByAsset,
              colormapOverrides,
              disabledPackIds,
            );

            const foliageWinner = resolveColormapWinner(
              FOLIAGE_COLORMAP_ASSET_ID,
              packOrder,
              providersByAsset,
              colormapOverrides,
              disabledPackIds,
            );

            const grassUrl = grassWinner
              ? await loadColormapUrl(
                  GRASS_COLORMAP_ASSET_ID,
                  grassWinner,
                  packsMap,
                )
              : null;

            const foliageUrl = foliageWinner
              ? await loadColormapUrl(
                  FOLIAGE_COLORMAP_ASSET_ID,
                  foliageWinner,
                  packsMap,
                )
              : null;

            useStore.getState().setGrassColormapUrl(grassUrl ?? undefined);
            useStore.getState().setGrassColormapPackId(grassWinner ?? undefined);
            useStore.getState().setFoliageColormapUrl(foliageUrl ?? undefined);
            useStore.getState().setFoliageColormapPackId(foliageWinner ?? undefined);

            const currentCoords = useStore.getState().colormapCoordinates;
            const coords = currentCoords ?? getPlainsCoordinates();

            if (!currentCoords) {
              useStore.getState().setColormapCoordinates(coords);
            }

            const { grassColor, foliageColor } = await sampleColormapColors(
              grassUrl,
              foliageUrl,
              coords.x,
              coords.y,
            );

            useStore.getState().setSelectedGrassColor(grassColor ?? undefined);
            useStore.getState().setSelectedFoliageColor(foliageColor ?? undefined);

            const biomeId = coordinatesToBiome(coords.x, coords.y);
            useStore.getState().setSelectedBiomeId(biomeId ?? undefined);
          } catch (error) {
            console.error("[useColormapManager] Failed to update state:", error);
          }
        })();
      });
    };

    void updateColormapState();
  }, [
    allAssets,
    packOrder,
    packs,
    providersByAsset,
    colormapOverrides,
    disabledPackIds,
    startTransition,
  ]);
}
