/**
 * Vanilla Progress Hook
 *
 * Manages vanilla texture download progress state.
 */

import { useState } from "react";

export interface VanillaProgress {
  current: number;
  total: number;
}

export function useVanillaProgress() {
  const [vanillaProgress, setVanillaProgress] = useState<VanillaProgress | null>(null);
  const [vanillaProgressVisible, setVanillaProgressVisible] = useState(false);

  return {
    vanillaProgress,
    setVanillaProgress,
    vanillaProgressVisible,
    setVanillaProgressVisible,
  };
}
