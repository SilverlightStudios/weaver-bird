/**
 * Preview2D Component - Displays 2D textures (GUI, particles, entities, etc.)
 *
 * Uses Three.js to render a flat sprite with zoom/pan controls
 * Consistent with Preview3D but optimized for 2D textures
 */
import { useEffect, useState, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getVanillaTexturePath, getPackTexturePath } from "@lib/tauri";
import { normalizeAssetId } from "@lib/assetUtils";
import { useSelectWinner, useSelectPack } from "@state/selectors";
import s from "./styles.module.scss";

interface Props {
  assetId?: string;
}

interface TextureSpriteProps {
  texturePath: string;
}

/**
 * TextureSprite - Renders a 2D texture as a sprite in 3D space
 * The sprite always faces the camera and maintains aspect ratio
 */
function TextureSprite({ texturePath }: TextureSpriteProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [aspectRatio, setAspectRatio] = useState(1);

  useEffect(() => {
    const loader = new THREE.TextureLoader();

    loader.load(
      texturePath,
      (loadedTexture) => {
        // Configure texture settings
        loadedTexture.magFilter = THREE.NearestFilter; // Pixelated look (Minecraft style)
        loadedTexture.minFilter = THREE.NearestFilter;
        loadedTexture.colorSpace = THREE.SRGBColorSpace;

        // Calculate aspect ratio
        const aspect = loadedTexture.image.width / loadedTexture.image.height;
        setAspectRatio(aspect);
        setTexture(loadedTexture);

        console.log(
          `[Preview2D] Loaded texture: ${loadedTexture.image.width}x${loadedTexture.image.height}`,
        );
      },
      undefined,
      (error) => {
        console.error("[Preview2D] Failed to load texture:", error);
      },
    );

    return () => {
      if (texture) {
        texture.dispose();
      }
    };
  }, [texturePath]);

  // Update mesh scale based on aspect ratio
  useEffect(() => {
    if (meshRef.current && texture) {
      // Scale sprite to maintain aspect ratio
      // Base size is 2 units, scale width by aspect ratio
      if (aspectRatio >= 1) {
        // Landscape or square
        meshRef.current.scale.set(aspectRatio * 2, 2, 1);
      } else {
        // Portrait
        meshRef.current.scale.set(2, 2 / aspectRatio, 1);
      }
    }
  }, [aspectRatio, texture]);

  if (!texture) {
    return null;
  }

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={texture}
        transparent
        side={THREE.DoubleSide}
        alphaTest={0.01}
      />
    </mesh>
  );
}

/**
 * Checkerboard background to show texture transparency
 */
function CheckerboardBackground() {
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      // Draw checkerboard pattern (light gray and dark gray)
      ctx.fillStyle = "#cccccc";
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = "#999999";
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillRect(16, 16, 16, 16);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshBasicMaterial;
      material.map = texture;
    }

    return () => {
      texture.dispose();
    };
  }, []);

  return (
    <mesh ref={meshRef} position={[0, 0, -0.01]} rotation={[0, 0, 0]}>
      <planeGeometry args={[10, 10]} />
      <meshBasicMaterial />
    </mesh>
  );
}

export default function Preview2D({ assetId }: Props) {
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
              `[Preview2D] Pack texture not found for ${normalizedAssetId}, using vanilla`,
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
        console.error("[Preview2D] Failed to load texture:", err);
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
        <div className={s.placeholder}>Select a 2D texture to preview</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={s.root}>
        <div className={s.error}>Failed to load texture</div>
      </div>
    );
  }

  if (!texturePath) {
    return (
      <div className={s.root}>
        <div className={s.loading}>Loading texture...</div>
      </div>
    );
  }

  return (
    <div className={s.root}>
      <Canvas
        gl={{
          antialias: false, // Keep it pixelated
          alpha: true,
        }}
        style={{ background: "transparent" }}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={50} />

        <OrbitControls
          enableRotate={false} // Disable rotation for 2D view
          enablePan={true}
          enableZoom={true}
          minDistance={1}
          maxDistance={20}
          mouseButtons={{
            LEFT: THREE.MOUSE.PAN,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN,
          }}
        />

        <ambientLight intensity={1} />

        <CheckerboardBackground />
        <TextureSprite texturePath={texturePath} />
      </Canvas>

      <div className={s.info}>
        <span className={s.infoText}>Scroll to zoom • Drag to pan</span>
      </div>
    </div>
  );
}
