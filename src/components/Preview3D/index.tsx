import { useEffect, useState, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  PerspectiveCamera,
  ContactShadows,
} from "@react-three/drei";
import * as THREE from "three";
import { useStore } from "@state/store";
import GridFloor from "./GridFloor";
import { ParticleWrapper } from "./ParticleWrapper";
import { AnimationUpdater } from "./components/AnimationUpdater";
import { PreviewScene } from "./components/PreviewScene";
import { isBiomeColormapAsset } from "@lib/assetUtils";
import { usePreviewCamera } from "./hooks/usePreviewCamera";
import { useRedstoneColor } from "./hooks/useRedstoneColor";
import { usePottedPlantCheck } from "./hooks/usePottedPlantCheck";
import { useAssetSpecs } from "./hooks/useAssetSpecs";
import { useShadowDetection } from "./hooks/useShadowDetection";
import s from "./styles.module.scss";

interface Props {
  assetId?: string;
  sourceAssetId?: string;
  biomeColor?: { r: number; g: number; b: number } | null;
  onTintDetected?: (info: {
    hasTint: boolean;
    tintType?: "grass" | "foliage";
  }) => void;
  showPot: boolean;
  blockProps?: Record<string, string>;
  particleConditionOverrides?: Record<string, string>;
  seed?: number;
  allAssetIds?: string[];
}

// Default values defined outside component to prevent re-creation on every render
const EMPTY_BLOCK_PROPS: Record<string, string> = {};
const EMPTY_PARTICLE_OVERRIDES: Record<string, string> = {};
const EMPTY_ASSET_IDS: string[] = [];

export default function Preview3D({
  assetId,
  sourceAssetId,
  biomeColor,
  onTintDetected,
  showPot,
  blockProps = EMPTY_BLOCK_PROPS,
  particleConditionOverrides = EMPTY_PARTICLE_OVERRIDES,
  seed = 0,
  allAssetIds = EMPTY_ASSET_IDS,
}: Props) {
  const showGrid = useStore((state) => state.canvas3DShowGrid);
  const showBlockParticles = useStore((state) => state.showBlockParticles);

  const [tintInfo, setTintInfo] = useState<{
    hasTint: boolean;
    tintType?: "grass" | "foliage";
  }>({ hasTint: false });

  const isColormapAsset = assetId ? isBiomeColormapAsset(assetId) : false;
  const previewAssetId = assetId && !isColormapAsset ? assetId : undefined;

  // Use custom hooks to reduce complexity
  const previewCameraPosition = usePreviewCamera();
  const effectiveBiomeColor = useRedstoneColor(assetId, biomeColor, blockProps.power);
  const { isPlantPotted, canBePotted } = usePottedPlantCheck(assetId, allAssetIds);
  const {
    minecartCompositeSpec,
    multiBlockParts,
    blockEntitySpec,
    entityAssetId,
    isMinecartEntity,
  } = useAssetSpecs(previewAssetId, sourceAssetId, blockProps, allAssetIds);
  const shouldHaveShadow = useShadowDetection(previewAssetId);

  const particleStateProps = useMemo(
    () => ({ ...blockProps, ...particleConditionOverrides }),
    [blockProps, particleConditionOverrides],
  );

  useEffect(() => {
    console.log(
      `[Preview3D.useEffect] asset=${assetId} effectiveBiomeColor=${effectiveBiomeColor ? "set" : "none"}`,
    );
  }, [assetId, effectiveBiomeColor]);

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
      <div className={s.canvas}>
        {/* Always keep Canvas mounted to prevent context loss - NO Suspense wrapper here! */}
        <Canvas
          onCreated={({ gl, scene }) => {
            // Disable tone mapping for accurate Minecraft colors
            gl.toneMapping = THREE.NoToneMapping;
            // Set background to light gray/white
            scene.background = new THREE.Color(0xf0f0f0);
          }}
          onError={(error) => console.error("[Preview3D] Canvas error:", error)}
          style={{
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
          <PerspectiveCamera
            makeDefault
            position={previewCameraPosition}
            fov={50}
          />
          <OrbitControls
            enablePan={false}
            minDistance={0.75}
            maxDistance={10}
            target={[0, 0, 0]}
          />

          {/* Update animated textures every frame */}
          <AnimationUpdater />

          {/* Minecraft-style lighting - ambient + directional for face differentiation */}
          <ambientLight intensity={1.0} />
          <directionalLight position={[3, 10, 5]} intensity={2.0} />
          <directionalLight position={[-5, 5, -5]} intensity={0.4} />
          <pointLight position={[0, -5, 0]} intensity={0.5} color="#ffffff" />

          {/* Model rendering */}
          {previewAssetId && (
            <PreviewScene
              assetId={previewAssetId}
              isColormapAsset={isColormapAsset}
              entityAssetId={entityAssetId}
              isMinecartEntity={isMinecartEntity}
              minecartCompositeSpec={minecartCompositeSpec}
              blockEntitySpec={blockEntitySpec}
              multiBlockParts={multiBlockParts}
              effectiveBiomeColor={effectiveBiomeColor}
              showPot={showPot}
              isPlantPotted={isPlantPotted}
              canBePotted={canBePotted}
              blockProps={blockProps}
              seed={seed}
              onTintDetected={handleTintDetected}
            />
          )}

          {/* Particle emissions (blocks and entities) */}
          {previewAssetId && showBlockParticles && (
            <ParticleWrapper
              assetId={previewAssetId}
              stateProps={particleStateProps}
              enabled={showBlockParticles}
            />
          )}

          {/* Grid floor with dashed lines - 1 Minecraft block spacing */}
          {/* Grid offset by 0.5 units so lines pass through block centers, not edges */}
          {showGrid && (
            <GridFloor
              position={[0.5, 0, 0.5]}
              size={20}
              gridSize={1}
              lineWidth={0.02}
              dashLength={0.1}
              gapLength={0.1}
              lineColor="#666666"
              fadeStart={2}
              fadeEnd={8}
            />
          )}

          {/* Soft contact shadow - tight under the block */}
          {/* Don't render shadows for transparent blocks like redstone wire, glass, etc. */}
          {shouldHaveShadow && (
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
          )}
        </Canvas>
      </div>
    </div>
  );
}
