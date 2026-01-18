import { useEffect, useState, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { parseJEM } from "@lib/emf/jemLoader";
import type { DocTexturePreviewProps } from "./types";
import Checkerboard from "./Checkerboard";
import TextureSprite from "./TextureSprite";
import UVOverlay from "./UVOverlay";

export default function DocTexturePreview({
  textureUrl,
  jemData,
  showUV,
}: DocTexturePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [tooltip, setTooltip] = useState<{
    label: string;
    x: number;
    y: number;
  } | null>(null);

  const entityModel = useMemo(() => {
    if (jemData) return parseJEM(jemData);
    return null;
  }, [jemData]);

  const aspectRatio = dims.h ? dims.w / dims.h : 1;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { rootMargin: "200px 0px 200px 0px", threshold: 0.01 },
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        minHeight: "300px",
        background: "linear-gradient(180deg, #1a1f2e 0%, #12151c 100%)",
        borderRadius: "var(--docs-radius-md)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Corner decorations */}
      <div
        style={{
          position: "absolute",
          top: "8px",
          left: "8px",
          width: "16px",
          height: "16px",
          borderLeft: "2px solid rgba(139, 92, 246, 0.4)",
          borderTop: "2px solid rgba(139, 92, 246, 0.4)",
          zIndex: 10,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "8px",
          right: "8px",
          width: "16px",
          height: "16px",
          borderRight: "2px solid rgba(92, 225, 230, 0.4)",
          borderBottom: "2px solid rgba(92, 225, 230, 0.4)",
          zIndex: 10,
          pointerEvents: "none",
        }}
      />

      {/* Label */}
      <div
        style={{
          position: "absolute",
          top: "12px",
          right: "12px",
          background: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(8px)",
          padding: "4px 10px",
          borderRadius: "4px",
          fontFamily: "var(--docs-font-mono)",
          fontSize: "10px",
          color: "rgba(255, 255, 255, 0.6)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        {dims.w}×{dims.h}px
      </div>

      {/* Help text */}
      <div
        style={{
          position: "absolute",
          bottom: "12px",
          left: "12px",
          background: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(8px)",
          padding: "4px 8px",
          borderRadius: "4px",
          fontFamily: "var(--docs-font-mono)",
          fontSize: "10px",
          color: "rgba(255, 255, 255, 0.5)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        Hover UV regions
      </div>

      {isVisible && (
        <Canvas>
          <PerspectiveCamera makeDefault position={[0, 0, 2.5]} />
          <OrbitControls
            enableRotate={false}
            enableDamping
            dampingFactor={0.1}
            minDistance={1}
            maxDistance={5}
          />
          <ambientLight intensity={1} />
          <Checkerboard />
          <TextureSprite
            textureUrl={textureUrl}
            onLoaded={(w, h) => setDims({ w, h })}
          />

          {showUV && entityModel && dims.w > 0 && (
            <UVOverlay
              entityModel={entityModel}
              textureWidth={dims.w}
              textureHeight={dims.h}
              aspectRatio={aspectRatio}
              onHover={(l, x, y) =>
                l ? setTooltip({ label: l, x, y }) : setTooltip(null)
              }
            />
          )}
        </Canvas>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x + 12,
            top: tooltip.y + 12,
            background: "rgba(18, 21, 28, 0.95)",
            backdropFilter: "blur(8px)",
            color: "white",
            padding: "8px 12px",
            borderRadius: "var(--docs-radius-sm)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            pointerEvents: "none",
            fontSize: "13px",
            fontFamily: "var(--docs-font-mono)",
            zIndex: 1000,
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
          }}
        >
          <span style={{ color: "var(--docs-accent)" }}>
            {tooltip.label.split(" → ")[0]}
          </span>
          <span style={{ color: "var(--docs-text-muted)" }}> → </span>
          <span style={{ color: "var(--docs-accent-secondary)" }}>
            {tooltip.label.split(" → ")[1]}
          </span>
        </div>
      )}
    </div>
  );
}
