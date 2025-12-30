import { useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { View } from "@react-three/drei";

function InvalidateOnLayoutChanges() {
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    let raf = 0;
    const schedule = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        invalidate();
      });
    };

    // Initial paint.
    schedule();

    // Scroll doesn't bubble; listen in capture to catch scroll containers.
    const onScroll = () => schedule();
    const onResize = () => schedule();
    const scrollOpts: AddEventListenerOptions = { capture: true, passive: true };
    const resizeOpts: AddEventListenerOptions = { passive: true };

    document.addEventListener("scroll", onScroll, scrollOpts);
    window.addEventListener("resize", onResize, resizeOpts);

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onResize);
    };
  }, [invalidate]);

  return null;
}

function ClearBeforeViews() {
  const gl = useThree((s) => s.gl);
  useFrame(() => {
    // View renders into many scissored rectangles. With a demand-driven loop,
    // stale pixels can remain when cards move (scroll) unless we clear.
    gl.setScissorTest(false);
    gl.clear(true, true, true);
  }, 0);
  return null;
}

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
