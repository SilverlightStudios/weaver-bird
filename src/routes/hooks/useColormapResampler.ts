/**
 * Colormap Resampler Hook
 *
 * Re-samples colors when coordinates change.
 */

import { useEffect } from "react";
import { useStore } from "@/state/store";
import { sampleColormapColors, coordinatesToBiome } from "@/lib/colormapManager";

export function useColormapResampler(
  colormapCoordinates: { x: number; y: number } | null | undefined,
  grassColormapUrl: string | undefined,
  foliageColormapUrl: string | undefined,
) {
  useEffect(() => {
    console.log(
      `[useColormapResampler] coords=${colormapCoordinates?.x},${colormapCoordinates?.y}`,
    );
    const resampleColors = async () => {
      if (!colormapCoordinates || (!grassColormapUrl && !foliageColormapUrl)) {
        return;
      }

      const idleCallback = window.requestIdleCallback ?? ((cb) => setTimeout(cb, 1));
      idleCallback(async () => {
        try {
          const { grassColor, foliageColor } = await sampleColormapColors(
            grassColormapUrl ?? null,
            foliageColormapUrl ?? null,
            colormapCoordinates.x,
            colormapCoordinates.y,
          );

          useStore.getState().setSelectedGrassColor(grassColor ?? undefined);
          useStore.getState().setSelectedFoliageColor(foliageColor ?? undefined);

          const biomeId = coordinatesToBiome(
            colormapCoordinates.x,
            colormapCoordinates.y,
          );
          useStore.getState().setSelectedBiomeId(biomeId ?? undefined);
        } catch (error) {
          console.error("[useColormapResampler] Failed to re-sample colors:", error);
        }
      });
    };

    void resampleColors();
  }, [colormapCoordinates, grassColormapUrl, foliageColormapUrl]);
}
