/**
 * Hook for determining if a block should have contact shadows
 */

import { useMemo } from "react";

const NO_SHADOW_BLOCKS = [
  "tripwire",
  "string",
  "scaffolding",
  "ladder",
  "vine",
  "glow_lichen",
  "sculk_vein",
];

export function useShadowDetection(assetId: string | undefined): boolean {
  return useMemo(() => {
    if (!assetId) return true;

    const normalizedId = assetId.toLowerCase();

    // Pattern-based checks for block families
    if (normalizedId.includes("glass")) return false;
    if (normalizedId.includes("redstone_wire") || normalizedId.includes("redstone_dust"))
      return false;
    if (normalizedId.includes("torch")) return false;

    // Explicit flat/transparent blocks
    return !NO_SHADOW_BLOCKS.some((block) => normalizedId.includes(block));
  }, [assetId]);
}
