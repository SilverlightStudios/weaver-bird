/**
 * Hook for calculating preview camera position
 */

import { useMemo } from "react";
import * as THREE from "three";

export function usePreviewCamera(): [number, number, number] {
  return useMemo(() => {
    const radius = Math.sqrt(2 * 2 + 2 * 2 + 2 * 2);
    const pitch = THREE.MathUtils.degToRad(30);
    const yaw = 0.8 + Math.PI;
    const cosPitch = Math.cos(pitch);
    const x = radius * Math.sin(yaw) * cosPitch;
    const z = radius * Math.cos(yaw) * cosPitch;
    const y = radius * Math.sin(pitch);
    return [x, y, z] as [number, number, number];
  }, []);
}
