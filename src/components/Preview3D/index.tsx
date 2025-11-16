import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  PerspectiveCamera,
  ContactShadows,
} from "@react-three/drei";
import * as THREE from "three";
import BlockModel from "./BlockModel";
import BlockStatePanel from "./BlockStatePanel";
import { isPottedPlant } from "@lib/assetUtils";
import s from "./styles.module.scss";

interface Props {
  assetId?: string;
  biomeColor?: { r: number; g: number; b: number } | null;
  onTintDetected?: (hasTint: boolean) => void;
}

export default function Preview3D({
  assetId,
  biomeColor,
  onTintDetected,
}: Props) {
  const [showPot, setShowPot] = useState(true);
  const [blockProps, setBlockProps] = useState<Record<string, string>>({});
  const [seed, setSeed] = useState(0);
  const isPlantPotted = assetId ? isPottedPlant(assetId) : false;

  useEffect(() => {
    console.log("[Preview3D] Component mounted");
    console.log("[Preview3D] Asset ID:", assetId);

    return () => {
      console.log("[Preview3D] Component unmounting");
    };
  }, []);

  useEffect(() => {
    if (assetId) {
      console.log("[Preview3D] Asset changed to:", assetId);
      console.log("[Preview3D] Is potted plant:", isPlantPotted);
      // Reset block state when asset changes
      setBlockProps({});
      setSeed(0);
    }
  }, [assetId, isPlantPotted]);

  return (
    <div className={s.root}>
      <div className={s.header}>
        <span>Preview</span>
        {isPlantPotted && (
          <label className={s.pottedControl}>
            <input
              type="checkbox"
              checked={showPot}
              onChange={(e) => setShowPot(e.target.checked)}
            />
            Show Pot
          </label>
        )}
      </div>
      <div className={s.canvas}>
        {/* Always show placeholder when no asset selected */}
        {!assetId && (
          <div className={s.placeholder}>Select an asset to preview</div>
        )}

        {/* Always keep Canvas mounted to prevent context loss - NO Suspense wrapper here! */}
        <Canvas
          onCreated={({ gl, scene }) => {
            console.log("[Preview3D] Canvas created successfully");
            // Disable tone mapping for accurate Minecraft colors
            gl.toneMapping = THREE.NoToneMapping;
            // Set background to light gray/white
            scene.background = new THREE.Color(0xf0f0f0);
          }}
          onError={(error) => console.error("[Preview3D] Canvas error:", error)}
          style={{
            display: assetId ? "block" : "none",
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
          }}
          gl={{
            toneMapping: THREE.NoToneMapping,
            outputColorSpace: THREE.SRGBColorSpace,
          }}
          resize={{ scroll: false, debounce: { scroll: 0, resize: 0 } }}
        >
          <PerspectiveCamera makeDefault position={[2, 2, 2]} fov={50} />
          <OrbitControls
            enablePan={false}
            minDistance={1.5}
            maxDistance={5}
            target={[0, 0, 0]}
          />

          {/* Minecraft-style lighting - ambient + directional for face differentiation */}
          <ambientLight intensity={1.0} />
          <directionalLight position={[3, 10, 5]} intensity={2.0} />
          <directionalLight position={[-5, 5, -5]} intensity={0.4} />
          <pointLight position={[0, -5, 0]} intensity={0.5} color="#ffffff" />

          {/* Block Model - only render when assetId is present */}
          {assetId && (
            <BlockModel
              key={`${assetId}-${JSON.stringify(blockProps)}-${seed}`}
              assetId={assetId}
              biomeColor={biomeColor}
              onTintDetected={onTintDetected}
              showPot={showPot}
              isPotted={isPlantPotted}
              blockProps={blockProps}
              seed={seed}
            />
          )}

          {/* Soft contact shadow - tight under the block */}
          <ContactShadows
            position={[0, 0, 0]}
            opacity={0.7}
            scale={12.0}
            blur={1.5}
            far={0.5}
            resolution={256}
            frames={1}
            color="#000000"
          />
        </Canvas>
      </div>
      {/* Block State Panel - only show when asset is selected */}
      {assetId && (
        <BlockStatePanel
          assetId={assetId}
          blockProps={blockProps}
          onBlockPropsChange={setBlockProps}
          seed={seed}
          onSeedChange={setSeed}
        />
      )}
    </div>
  );
}
