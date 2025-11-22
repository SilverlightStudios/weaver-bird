/**
 * Preview3DItem Component - Renders Minecraft items as 3D dropped items
 *
 * Emulates the way items appear when dropped on the ground in Minecraft:
 * - Thin 3D plane (1px thickness)
 * - Texture applied on both sides
 * - Optional rotation animation
 * - Proper lighting and positioning
 *
 * Future: Will support multiple display modes (hand, head, item frame, etc.)
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
import type { ItemDisplayMode } from "@lib/itemDisplayModes";
import s from "./styles.module.scss";

interface Props {
  assetId?: string;
  displayMode?: ItemDisplayMode;
  rotate?: boolean;
}

interface ItemMeshProps {
  texturePath: string;
  rotate: boolean;
  displayMode: ItemDisplayMode;
}

/**
 * ItemMesh - Renders a 3D item with the texture applied
 * Emulates Minecraft's dropped item rendering (very thin 3D plane)
 */
function ItemMesh({ texturePath, rotate, displayMode }: ItemMeshProps) {
  const meshRef = useRef<THREE.Group>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

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

        console.log(
          `[Preview3DItem] Loaded texture: ${loadedTexture.image.width}x${loadedTexture.image.height}`,
        );
      },
      undefined,
      (error) => {
        console.error("[Preview3DItem] Failed to load texture:", error);
      },
    );

    return () => {
      if (texture) {
        texture.dispose();
      }
    };
  }, [texturePath]);

  // Rotation animation for dropped items
  useFrame((state, delta) => {
    if (meshRef.current && rotate && displayMode === "ground") {
      // Minecraft items rotate at about 1 revolution per 4 seconds (90 degrees/sec = π/2 rad/sec)
      meshRef.current.rotation.y += delta * (Math.PI / 2);
    }
  });

  if (!texture) {
    return null;
  }

  // Calculate rotation and position based on display mode
  const getTransform = () => {
    switch (displayMode) {
      case "ground":
      case "ground_fixed":
        // Dropped items are rotated at a slight angle for better visibility
        return {
          rotation: [Math.PI / 6, 0, 0] as [number, number, number], // 30 degree tilt
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
  const thickness = 0.0625; // 1/16 block (1 pixel in Minecraft)

  // Render as a card: single textured face with thin edges
  return (
    <group
      ref={meshRef as React.RefObject<THREE.Group>}
      rotation={transform.rotation}
      position={transform.position}
    >
      {/* Main textured face */}
      <mesh position={[0, 0, thickness / 2]}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial
          map={texture}
          transparent
          alphaTest={0.01}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* Thin edges to give it thickness */}
      {displayMode !== "gui" && (
        <>
          {/* Top edge */}
          <mesh position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1, thickness]} />
            <meshStandardMaterial color="#444444" />
          </mesh>
          {/* Bottom edge */}
          <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1, thickness]} />
            <meshStandardMaterial color="#444444" />
          </mesh>
          {/* Left edge */}
          <mesh position={[-0.5, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[thickness, 1]} />
            <meshStandardMaterial color="#444444" />
          </mesh>
          {/* Right edge */}
          <mesh position={[0.5, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <planeGeometry args={[thickness, 1]} />
            <meshStandardMaterial color="#444444" />
          </mesh>
        </>
      )}
    </group>
  );
}

export default function Preview3DItem({
  assetId,
  displayMode = "ground",
  rotate = true,
}: Props) {
  const [texturePath, setTexturePath] = useState<string | null>(null);
  const [error, setError] = useState(false);

  // Get the winning pack for this asset
  const winnerPackId = useSelectWinner(assetId || "");
  const winnerPack = useSelectPack(winnerPackId || "");

  useEffect(() => {
    if (!assetId) {
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
          } catch (packError) {
            console.warn(
              `[Preview3DItem] Pack texture not found for ${normalizedAssetId}, using vanilla`,
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
        console.error("[Preview3DItem] Failed to load texture:", err);
        if (mounted) {
          setError(true);
        }
      }
    };

    loadTexture();

    return () => {
      mounted = false;
    };
  }, [assetId, winnerPackId, winnerPack]);

  if (!assetId) {
    return (
      <div className={s.root}>
        <div className={s.placeholder}>Select an item to preview</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={s.root}>
        <div className={s.error}>Failed to load item texture</div>
      </div>
    );
  }

  if (!texturePath) {
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
        gl={{
          antialias: false, // Keep it pixelated
          alpha: true,
        }}
      >
        <PerspectiveCamera makeDefault position={[2, 1.5, 2]} fov={50} />

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={1}
          maxDistance={5}
        />

        {/* Lighting setup similar to Minecraft */}
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={0.8}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight position={[-5, 3, -5]} intensity={0.3} />

        <ItemMesh
          texturePath={texturePath}
          rotate={rotate}
          displayMode={displayMode}
        />

        {/* Contact shadow for dropped items */}
        {displayMode === "ground" || displayMode === "ground_fixed" ? (
          <ContactShadows
            position={[0, -0.6, 0]}
            opacity={0.4}
            scale={3}
            blur={2}
            far={2}
          />
        ) : null}

        {/* Grid floor for context */}
        <gridHelper args={[4, 8, "#666666", "#333333"]} position={[0, -0.6, 0]} />
      </Canvas>

      <div className={s.info}>
        <span className={s.infoText}>
          {rotate && displayMode === "ground"
            ? "Rotating • Drag to orbit • Scroll to zoom"
            : "Drag to orbit • Scroll to zoom"}
        </span>
      </div>
    </div>
  );
}
