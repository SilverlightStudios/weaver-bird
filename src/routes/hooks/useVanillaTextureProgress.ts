/**
 * Vanilla Texture Progress Effect Hook
 *
 * Sets up listener for vanilla texture download progress.
 */

import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import type { VanillaProgress } from "./useVanillaProgress";

export function useVanillaTextureProgress(
  setVanillaProgress: (progress: VanillaProgress | null) => void,
  setVanillaProgressVisible: (visible: boolean) => void,
) {
  useEffect(() => {
    console.log("[useVanillaTextureProgress] Setting up listener");
    const unlistenPromise = listen<[number, number]>(
      "vanilla-texture-progress",
      (event) => {
        console.log("[useVanillaTextureProgress] Received event:", event.payload);
        const [current, total] = event.payload;
        setVanillaProgress({ current, total });
        setVanillaProgressVisible(true);

        if (current >= total) {
          setTimeout(() => {
            setVanillaProgressVisible(false);
            setVanillaProgress(null);
          }, 2000);
        }
      },
    );

    return () => {
      void unlistenPromise.then((fn) => fn());
    };
  }, [setVanillaProgress, setVanillaProgressVisible]);
}
