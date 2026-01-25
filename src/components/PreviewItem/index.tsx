/**
 * PreviewItem Component - Wrapper for item previews
 *
 * Renders items in two modes:
 * - Block items (asset ID contains "block"): Uses BlockModel with 30% scale
 * - Regular items: Uses flat 3D item mesh
 */
import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  PerspectiveCamera,
  ContactShadows,
} from "@react-three/drei";
import * as THREE from "three";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getVanillaTexturePath, getPackTexturePath } from "@lib/tauri";
import { normalizeAssetId } from "@lib/assetUtils";
import { useSelectWinner, useSelectPack } from "@state/selectors";
import { useStore } from "@state/store";
import type { ItemDisplayMode } from "@lib/itemDisplayModes";
import { ItemMesh } from "./components/ItemMesh";
import { BlockItemModel } from "./components/BlockItemModel";
import {
  PreviewItemPlaceholder,
  PreviewItemError,
  PreviewItemLoading,
} from "./components/PreviewItemStates";
import GridFloor from "@components/Preview3D/GridFloor";
import s from "./styles.module.scss";

// Helper function for info text
function getInfoText(rotate: boolean, hover: boolean, displayMode: ItemDisplayMode): string {
  const baseText = "Drag to orbit • Scroll to zoom";
  if (displayMode !== "ground") return baseText;

  if (rotate && hover) return `Rotating • Hovering • ${baseText}`;
  if (rotate) return `Rotating • ${baseText}`;
  if (hover) return `Hovering • ${baseText}`;
  return baseText;
}

interface Props {
  assetId?: string;
  displayMode?: ItemDisplayMode;
}


export default function PreviewItem({
  assetId,
  displayMode = "ground",
}: Props) {
  const [texturePath, setTexturePath] = useState<string | null>(null);
  const [error, setError] = useState(false);

  // Read rotation, hover, and grid settings from global state
  const rotate = useStore((state) => state.canvasItemRotate);
  const hover = useStore((state) => state.canvasItemHover);
  const showGrid = useStore((state) => state.canvasItemShowGrid);
  const animateTextures = useStore((state) => state.canvasItemAnimate);
  const selectedFrame = useStore((state) => state.canvasItemAnimationFrame);
  const setAnimationFrameCount = useStore(
    (state) => state.setCanvasItemAnimationFrameCount,
  );
  const setAnimationFrame = useStore(
    (state) => state.setCanvasItemAnimationFrame,
  );

  // Get the winning pack for this asset
  const winnerPackId = useSelectWinner(assetId ?? "");
  const winnerPack = useSelectPack(winnerPackId ?? "");

  // Determine if this is a block item (contains "block" in asset ID)
  const isBlockItem = assetId ? assetId.includes("block") : false;

  useEffect(() => {
    if (!assetId || isBlockItem) {
      setAnimationFrameCount(0);
    }
  }, [assetId, isBlockItem, setAnimationFrameCount]);

  useEffect(() => {
    if (!assetId || isBlockItem) {
      // Don't load texture for block items - they use BlockModel
      setTexturePath(null);
      return;
    }

    let mounted = true;

    const loadTexture = async () => {
      try {
        const normalizedAssetId = normalizeAssetId(assetId);
        let path: string;

        // Try to load from winning pack first, fall back to vanilla
        if (winnerPackId && winnerPack) {
          try {
            path = await getPackTexturePath(
              winnerPack.path,
              normalizedAssetId,
              winnerPack.is_zip,
            );
          } catch {
            console.warn(
              `[PreviewItem] Pack texture not found for ${normalizedAssetId}, using vanilla`,
            );
            path = await getVanillaTexturePath(normalizedAssetId);
          }
        } else {
          path = await getVanillaTexturePath(normalizedAssetId);
        }

        if (mounted) {
          const assetUrl = convertFileSrc(path);
          setTexturePath(assetUrl);
          setError(false);
        }
      } catch (err) {
        console.error("[PreviewItem] Failed to load texture:", err);
        if (mounted) {
          setError(true);
        }
      }
    };

    void loadTexture();

    return () => {
      mounted = false;
    };
  }, [assetId, winnerPackId, winnerPack, isBlockItem]);

  if (!assetId) return <PreviewItemPlaceholder />;
  if (!isBlockItem && error) return <PreviewItemError />;
  if (!isBlockItem && !texturePath) return <PreviewItemLoading />;

  return (
    <div className={s.root}>
      <Canvas
        shadows
        onCreated={({ gl, scene }) => {
          console.log("[PreviewItem] Canvas created successfully");
          // Disable tone mapping for accurate Minecraft colors
          gl.toneMapping = THREE.NoToneMapping;
          // Set background to light gray/white - same as Preview3D
          scene.background = new THREE.Color(0xf0f0f0);
        }}
        gl={{
          antialias: false, // Keep it pixelated
          alpha: true,
          toneMapping: THREE.NoToneMapping,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        resize={{ scroll: false, debounce: { scroll: 0, resize: 0 } }}
      >
        <PerspectiveCamera
          makeDefault
          position={[2, 1.5, 2]}
          fov={50}
          near={0.01}
          far={100}
        />

        <OrbitControls
          enablePan={false}
          minDistance={0.75}
          maxDistance={10}
          target={[0, 0, 0]}
        />

        {/* Minecraft-style lighting - same as Preview3D */}
        <ambientLight intensity={1.0} />
        <directionalLight position={[3, 10, 5]} intensity={2.0} />
        <directionalLight position={[-5, 5, -5]} intensity={0.4} />
        <pointLight position={[0, -5, 0]} intensity={0.5} color="#ffffff" />

        {/* Render block items with BlockModel, regular items with ItemMesh */}
        {isBlockItem ? (
          <BlockItemModel assetId={assetId} rotate={rotate} hover={hover} />
        ) : texturePath ? (
          <ItemMesh
            texturePath={texturePath}
            rotate={rotate}
            hover={hover}
            displayMode={displayMode}
            animateTextures={animateTextures}
            selectedFrame={selectedFrame}
            onFrameCountChange={setAnimationFrameCount}
            onFrameSelect={setAnimationFrame}
          />
        ) : null}

        {/* Grid floor with dashed lines - at ground level where shadow is cast */}
        {showGrid && (
          <GridFloor
            position={[0.5, -0.5, 0.5]}
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

        {/* Soft contact shadow - positioned below item with subtle blur */}
        {/* frames={Infinity} ensures shadow updates continuously, preventing load order issues */}
        <ContactShadows
          position={[0, -0.5, 0]}
          opacity={0.5}
          scale={2.5}
          blur={2.0}
          far={1.0}
          resolution={512}
          frames={Infinity}
          color="#000000"
        />
      </Canvas>

      <div className={s.info}>
        <span className={s.infoText}>{getInfoText(rotate, hover, displayMode)}</span>
      </div>
    </div>
  );
}
