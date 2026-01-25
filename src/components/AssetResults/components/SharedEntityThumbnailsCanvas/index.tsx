import { Canvas } from "@react-three/fiber";
import { View } from "@react-three/drei";
import { ClearBeforeViews } from "./ClearBeforeViews";
import { InvalidateOnLayoutChanges } from "./InvalidateOnLayoutChanges";

/**
 * Shared WebGL canvas used for all entity thumbnails in resource cards.
 *
 * This prevents "too many WebGL contexts" errors by ensuring thumbnails don't
 * create per-card <Canvas> instances.
 */
export function SharedEntityThumbnailsCanvas() {
  return (
    <Canvas
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        // Within the drawer stacking context, sit above cards but below the
        // search/pagination overlays (which use z-index: 10+).
        zIndex: 5,
      }}
      frameloop="demand"
      dpr={1}
      gl={{
        alpha: true,
        antialias: false,
        powerPreference: "low-power",
      }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
      }}
    >
      <ClearBeforeViews />
      <View.Port />
      <InvalidateOnLayoutChanges />
    </Canvas>
  );
}
