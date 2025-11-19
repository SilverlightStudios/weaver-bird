import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  PerspectiveCamera,
  ContactShadows,
} from "@react-three/drei";
import * as THREE from "three";
import BlockModel from "./BlockModel";
import GridFloor from "./GridFloor";
import {
  getColormapTypeFromAssetId,
  isBiomeColormapAsset,
  isPottedPlant,
} from "@lib/assetUtils";
import { getMultiBlockParts, type MultiBlockPart } from "@lib/multiBlockConfig";
import s from "./styles.module.scss";

interface Props {
  assetId?: string;
  biomeColor?: { r: number; g: number; b: number } | null;
  onTintDetected?: (info: {
    hasTint: boolean;
    tintType?: "grass" | "foliage";
  }) => void;
  showPot: boolean;
  onShowPotChange: (show: boolean) => void;
  blockProps?: Record<string, string>;
  seed?: number;
  foliagePreviewBlock: string;
}

export default function Preview3D({
  assetId,
  biomeColor,
  onTintDetected,
  showPot,
  onShowPotChange,
  blockProps = {},
  seed = 0,
  foliagePreviewBlock,
}: Props) {
  const [tintInfo, setTintInfo] = useState<{
    hasTint: boolean;
    tintType?: "grass" | "foliage";
  }>({ hasTint: false });
  const isPlantPotted = assetId ? isPottedPlant(assetId) : false;
  const isColormapAsset = assetId ? isBiomeColormapAsset(assetId) : false;
  const colormapType = assetId
    ? (getColormapTypeFromAssetId(assetId) ?? "grass")
    : "grass";
  const previewAssetId = assetId
    ? isColormapAsset
      ? colormapType === "foliage"
        ? foliagePreviewBlock
        : "minecraft:block/grass_block"
      : assetId
    : undefined;
  const multiBlockParts: MultiBlockPart[] | null = previewAssetId
    ? getMultiBlockParts(previewAssetId, blockProps)
    : null;
  const showPotToggle = isPlantPotted && !isColormapAsset;

  useEffect(() => {
    console.log("[Preview3D] Component mounted");
    console.log("[Preview3D] Asset ID:", assetId);

    return () => {
      console.log("[Preview3D] Component unmounting");
    };
  }, [assetId]);

  // Forward tint detection to parent if callback provided
  useEffect(() => {
    if (onTintDetected) {
      onTintDetected(tintInfo);
    }
  }, [tintInfo, onTintDetected]);

  useEffect(() => {
    if (isColormapAsset) {
      setTintInfo({ hasTint: false, tintType: undefined });
    }
  }, [isColormapAsset, assetId]);

  const handleTintDetected = (info: {
    hasTint: boolean;
    tintType?: "grass" | "foliage";
  }) => {
    if (isColormapAsset) {
      setTintInfo({ hasTint: false, tintType: undefined });
      return;
    }
    setTintInfo(info);
  };

  return (
    <div className={s.root}>
      <div className={s.header}>
        <span>Preview</span>
        {showPotToggle && (
          <label className={s.pottedControl}>
            <input
              type="checkbox"
              checked={showPot}
              onChange={(e) => onShowPotChange(e.target.checked)}
            />
            Show Pot
          </label>
        )}
      </div>

      <div className={s.canvas}>
        {/* Always show placeholder when no asset selected */}
        {!previewAssetId && (
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
            display: previewAssetId ? "block" : "none",
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
          {previewAssetId &&
            (multiBlockParts ? (
              multiBlockParts.map((part, index) => (
                <BlockModel
                  key={`${previewAssetId}-${index}`}
                  assetId={previewAssetId}
                  biomeColor={biomeColor}
                  onTintDetected={index === 0 ? handleTintDetected : undefined}
                  forcedPackId={
                    isColormapAsset ? "minecraft:vanilla" : undefined
                  }
                  showPot={showPot && !isColormapAsset}
                  isPotted={isPlantPotted && !isColormapAsset}
                  blockProps={{
                    ...blockProps,
                    ...(part.overrides ?? {}),
                  }}
                  seed={seed}
                  positionOffset={part.offset}
                />
              ))
            ) : (
              <BlockModel
                assetId={previewAssetId}
                biomeColor={biomeColor}
                onTintDetected={handleTintDetected}
                forcedPackId={isColormapAsset ? "minecraft:vanilla" : undefined}
                showPot={showPot && !isColormapAsset}
                isPotted={isPlantPotted && !isColormapAsset}
                blockProps={blockProps}
                seed={seed}
              />
            ))}

          {/* Grid floor with dashed lines - 1 Minecraft block spacing */}
          <GridFloor
            position={[0, 0, 0]}
            size={20}
            gridSize={1}
            lineWidth={0.02}
            dashLength={0.1}
            gapLength={0.1}
            lineColor="#666666"
            fadeStart={2}
            fadeEnd={8}
          />

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
    </div>
  );
}
