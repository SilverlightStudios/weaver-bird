import { useEffect, useState, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  PerspectiveCamera,
  ContactShadows,
} from "@react-three/drei";
import * as THREE from "three";
import type { DocThreePreviewProps } from "./types";
import TexturedModel from "./TexturedModel";
import SolidColorModel from "./SolidColorModel";

export default function DocThreePreview({
  jemData,
  textureUrl,
  showPivots,
  solidColor,
  showLabels,
  color,
  extraLayers,
}: DocThreePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

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
        background: "#111",
        borderRadius: "8px",
        overflow: "hidden",
        minHeight: "300px",
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
          borderLeft: "2px solid rgba(255, 92, 92, 0.4)",
          borderTop: "2px solid rgba(255, 92, 92, 0.4)",
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

      {/* Controls hint */}
      <div
        style={{
          position: "absolute",
          bottom: "12px",
          left: "12px",
          display: "flex",
          gap: "8px",
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(8px)",
            padding: "4px 8px",
            borderRadius: "4px",
            fontFamily: "var(--docs-font-mono)",
            fontSize: "10px",
            color: "rgba(255, 255, 255, 0.5)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Drag to rotate
        </span>
        <span
          style={{
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(8px)",
            padding: "4px 8px",
            borderRadius: "4px",
            fontFamily: "var(--docs-font-mono)",
            fontSize: "10px",
            color: "rgba(255, 255, 255, 0.5)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Scroll to zoom
        </span>
      </div>

      {isVisible && (
        <Canvas
          onCreated={({ gl, scene }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.2;
            scene.background = null;
          }}
          gl={{
            antialias: true,
            alpha: true,
            outputColorSpace: THREE.SRGBColorSpace,
          }}
        >
          <PerspectiveCamera makeDefault position={[3, 2.5, 3]} fov={45} />
          <OrbitControls
            target={[0, 0.75, 0]}
            enableDamping
            dampingFactor={0.05}
            minDistance={1.5}
            maxDistance={10}
          />

          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[5, 8, 5]}
            intensity={1.5}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <directionalLight position={[-5, 3, -5]} intensity={0.3} />
          <pointLight position={[0, 4, 0]} intensity={0.5} color="#5ce1e6" />

          {textureUrl && !solidColor ? (
            <TexturedModel
              jemData={jemData}
              textureUrl={textureUrl}
              showPivots={showPivots}
              showLabels={showLabels}
              color={color}
            />
          ) : (
            <SolidColorModel
              jemData={jemData}
              showPivots={showPivots}
              showLabels={showLabels}
            />
          )}

          {/* Render extra layers */}
          {extraLayers?.map((layer, index) => (
            <TexturedModel
              key={index}
              jemData={layer.jemData}
              textureUrl={layer.textureUrl ?? ""}
              color={layer.color}
            />
          ))}

          <ContactShadows
            opacity={0.5}
            scale={20}
            blur={2}
            far={10}
            resolution={512}
            color="#000000"
            position={[0, 0, 0]}
          />

          {/* Grid */}
          <gridHelper
            args={[20, 20, 0x333333, 0x222222]}
            position={[0, 0, 0]}
          />
        </Canvas>
      )}
    </div>
  );
}
