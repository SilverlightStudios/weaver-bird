/**
 * Hook for calculating redstone wire color based on power level
 */

import { useMemo } from "react";

function calculateRedstoneColor(power: number): { r: number; g: number; b: number } {
  // Apply the exact Minecraft redstone color formula
  // From RedStoneWireBlock.java (Minecraft 1.21.11)
  const powerRatio = power / 15.0;
  const r = powerRatio * 0.6 + (powerRatio > 0.0 ? 0.4 : 0.3);
  const g = Math.max(0.0, Math.min(1.0, powerRatio * powerRatio * 0.7 - 0.5));
  const b = Math.max(0.0, Math.min(1.0, powerRatio * powerRatio * 0.6 - 0.7));

  // Convert to RGB (0-255) format
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

function isRedstoneWire(assetId: string): boolean {
  return assetId.includes("redstone_dust") || assetId.includes("redstone_wire");
}

export function useRedstoneColor(
  assetId: string | undefined,
  biomeColor: { r: number; g: number; b: number } | null | undefined,
  powerProp: string | undefined,
): { r: number; g: number; b: number } | null | undefined {
  return useMemo(() => {
    if (!assetId || !isRedstoneWire(assetId)) {
      return biomeColor;
    }

    const powerStr = powerProp ?? "15";
    const power = parseInt(powerStr, 10);

    if (!isNaN(power) && power >= 0 && power <= 15) {
      const rgb = calculateRedstoneColor(power);
      console.log(`[Preview3D] Redstone wire power=${power}, color=RGB(${rgb.r}, ${rgb.g}, ${rgb.b})`);
      return rgb;
    }

    return biomeColor;
  }, [assetId, biomeColor, powerProp]);
}
