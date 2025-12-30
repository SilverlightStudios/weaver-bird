/**
 * PreviewItem Component - Wrapper for item previews
 *
 * Renders items in two modes:
 * - Block items (asset ID contains "block"): Uses BlockModel with 30% scale
 * - Regular items: Uses flat 3D item mesh
 */
import { useEffect, useState, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
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
import { getItemGeometry } from "@lib/three/itemGeometryGenerator";
import BlockModel from "@components/Preview3D/BlockModel";
import GridFloor from "@components/Preview3D/GridFloor";
import s from "./styles.module.scss";

interface Props {
  assetId?: string;
  displayMode?: ItemDisplayMode;
}

interface ItemMeshProps {
  texturePath: string;
  rotate: boolean;
  hover: boolean;
  displayMode: ItemDisplayMode;
}

/**
 * ItemMesh - Renders a 3D item with the texture applied
 * Emulates Minecraft's dropped item rendering with proper thickness effect
 */
function ItemMesh({ texturePath, rotate, hover, displayMode }: ItemMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();

    loader.load(
      texturePath,
      (loadedTexture) => {
        // Configure texture for pixelated Minecraft look
        loadedTexture.magFilter = THREE.NearestFilter;
        loadedTexture.minFilter = THREE.NearestFilter;
        loadedTexture.colorSpace = THREE.SRGBColorSpace;
        loadedTexture.wrapS = THREE.ClampToEdgeWrapping;
        loadedTexture.wrapT = THREE.ClampToEdgeWrapping;

        setTexture(loadedTexture);

        // Generate custom geometry based on texture alpha channel
        try {
          const customGeometry = getItemGeometry(loadedTexture, 0.0625);
          setGeometry(customGeometry);

          console.log(
            `[PreviewItem] Loaded texture: ${loadedTexture.image.width}x${loadedTexture.image.height}`,
          );
          console.log(
            `[PreviewItem] Generated geometry with ${customGeometry.attributes.position.count} vertices`,
          );
        } catch (error) {
          console.error("[PreviewItem] Failed to generate geometry:", error);
          // Fall back to simple box geometry
          const fallbackGeometry = new THREE.BoxGeometry(1, 1, 0.0625);
          setGeometry(fallbackGeometry);
        }
      },
      undefined,
      (error) => {
        console.error("[PreviewItem] Failed to load texture:", error);
      },
    );

    return () => {
      if (texture) {
        texture.dispose();
      }
      // Note: geometry from cache shouldn't be disposed here
      // It will be managed by the cache
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texturePath]);

  // Rotation and bobbing animation for dropped items
  useFrame((state, delta) => {
    if (meshRef.current && displayMode === "ground") {
      if (rotate) {
        // Minecraft items rotate at about 1 revolution per 4 seconds (90 degrees/sec = π/2 rad/sec)
        meshRef.current.rotation.y += delta * (Math.PI / 2);
      }

      if (hover) {
        // Bobbing animation - items float up and down slightly
        // Using a slow sine wave with small amplitude (0.05 units)
        // Period of ~3 seconds matches Minecraft's gentle bobbing
        const bobSpeed = 2; // Radians per second (full cycle in ~3.14 seconds)
        const bobAmplitude = 0.05; // Small vertical movement
        // Base position is -0.25 (lowered by 50%) plus bobbing offset
        meshRef.current.position.y =
          -0.25 + Math.sin(state.clock.elapsedTime * bobSpeed) * bobAmplitude;
      } else {
        // Reset position when hover is disabled - lowered by 50%
        meshRef.current.position.y = -0.25;
      }
    }
  });

  if (!texture || !geometry) {
    return null;
  }

  // Calculate rotation and position based on display mode
  const getTransform = () => {
    switch (displayMode) {
      case "ground":
      case "ground_fixed":
        // Dropped items are vertical (no tilt) like in Minecraft
        return {
          rotation: [0, 0, 0] as [number, number, number],
          position: [0, 0, 0] as [number, number, number],
        };
      case "gui":
        return {
          rotation: [0, 0, 0] as [number, number, number],
          position: [0, 0, 0] as [number, number, number],
        };
      default:
        return {
          rotation: [0, 0, 0] as [number, number, number],
          position: [0, 0, 0] as [number, number, number],
        };
    }
  };

  const transform = getTransform();

  // Render with custom geometry that follows the texture shape
  // Front/back faces show full texture, edges show 1-pixel texture slices
  return (
    <mesh
      ref={meshRef as React.RefObject<THREE.Mesh>}
      rotation={transform.rotation}
      position={transform.position}
      geometry={geometry}
    >
      <meshStandardMaterial
        map={texture}
        transparent
        alphaTest={0.01}
        side={THREE.DoubleSide}
        flatShading={false}
      />
    </mesh>
  );
}

/**
 * BlockItemModel - Renders a block at 30% scale with animations
 */
interface BlockItemModelProps {
  assetId: string;
  rotate: boolean;
  hover: boolean;
}

function BlockItemModel({ assetId, rotate, hover }: BlockItemModelProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Rotation and bobbing animation for dropped block items
  useFrame((state, delta) => {
    if (groupRef.current) {
      if (rotate) {
        // Minecraft items rotate at about 1 revolution per 4 seconds
        groupRef.current.rotation.y += delta * (Math.PI / 2);
      }

      if (hover) {
        // Bobbing animation
        const bobSpeed = 2;
        const bobAmplitude = 0.05;
        // Base position is -0.25 (lowered by 50%) plus bobbing offset
        groupRef.current.position.y =
          -0.25 + Math.sin(state.clock.elapsedTime * bobSpeed) * bobAmplitude;
      } else {
        // Reset position when hover is disabled - lowered by 50%
        groupRef.current.position.y = -0.25;
      }
    }
  });

  return (
    <group ref={groupRef} scale={0.3}>
      <BlockModel assetId={assetId} />
    </group>
  );
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

  // Get the winning pack for this asset
  const winnerPackId = useSelectWinner(assetId || "");
  const winnerPack = useSelectPack(winnerPackId || "");

  // Determine if this is a block item (contains "block" in asset ID)
  const isBlockItem = assetId ? assetId.includes("block") : false;

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

    loadTexture();

    return () => {
      mounted = false;
    };
  }, [assetId, winnerPackId, winnerPack, isBlockItem]);

  if (!assetId) {
    return (
      <div className={s.root}>
        <div className={s.placeholder}>Select an item to preview</div>
      </div>
    );
  }

  if (!isBlockItem && error) {
    return (
      <div className={s.root}>
        <div className={s.error}>Failed to load item texture</div>
      </div>
    );
  }

  if (!isBlockItem && !texturePath) {
    return (
      <div className={s.root}>
        <div className={s.loading}>Loading item...</div>
      </div>
    );
  }

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
        <span className={s.infoText}>
          {rotate && hover && displayMode === "ground"
            ? "Rotating • Hovering • Drag to orbit • Scroll to zoom"
            : rotate && displayMode === "ground"
              ? "Rotating • Drag to orbit • Scroll to zoom"
              : hover && displayMode === "ground"
                ? "Hovering • Drag to orbit • Scroll to zoom"
                : "Drag to orbit • Scroll to zoom"}
        </span>
      </div>
    </div>
  );
}
