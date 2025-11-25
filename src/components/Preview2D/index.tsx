/**
 * Preview2D Component - Displays 2D textures (GUI, particles, entities, etc.)
 *
 * Uses Three.js to render a flat sprite with zoom/pan controls
 * Consistent with Preview3D but optimized for 2D textures
 */
import { useEffect, useState, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getVanillaTexturePath, getPackTexturePath } from "@lib/tauri";
import { normalizeAssetId } from "@lib/assetUtils";
import { useSelectWinner, useSelectPack } from "@state/selectors";
import { useStore } from "@state/store";
import {
  isEntityTexture,
  getEntityTypeFromAssetId,
  loadEntityModel,
} from "@lib/emf";
import type { ParsedEntityModel } from "@lib/emf";
import s from "./styles.module.scss";

interface Props {
  assetId?: string;
}

interface TextureSpriteProps {
  texturePath: string;
  textureWidth?: number;
  textureHeight?: number;
  onTextureLoaded?: (width: number, height: number) => void;
}

interface UVOverlayProps {
  entityModel: ParsedEntityModel;
  textureWidth: number;
  textureHeight: number;
  aspectRatio: number;
  onHover: (label: string | null, x: number, y: number) => void;
}

interface UVBoxProps {
  position: [number, number, number];
  size: [number, number];
  color: number;
  label: string;
  onHover: (label: string | null, x: number, y: number) => void;
}

/**
 * UV Box - A single UV mapping box with hover interaction
 */
function UVBox({ position, size, color, label, onHover }: UVBoxProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <mesh
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        onHover(label, e.clientX, e.clientY);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        onHover(null, 0, 0);
      }}
      onPointerMove={(e) => {
        if (hovered) {
          onHover(label, e.clientX, e.clientY);
        }
      }}
    >
      <planeGeometry args={size} />
      <meshBasicMaterial
        color={hovered ? 0xffffff : color}
        transparent
        opacity={hovered ? 0.5 : 0.3}
        side={THREE.DoubleSide}
        depthTest={false}
      />
    </mesh>
  );
}

/**
 * UV Overlay - Renders colored boxes showing where each JEM part maps its UVs
 */
function UVOverlay({
  entityModel,
  textureWidth,
  textureHeight,
  aspectRatio,
  onHover,
}: UVOverlayProps) {
  // Color palette for different parts
  const colors = [
    0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xff8800,
    0x88ff00, 0x0088ff, 0xff0088, 0x8800ff, 0x00ff88,
  ];

  const boxes: JSX.Element[] = [];
  let colorIndex = 0;

  // Iterate through all parts and their boxes
  entityModel.parts.forEach((part) => {
    const partColor = colors[colorIndex % colors.length];
    colorIndex++;

    part.boxes.forEach((box, boxIndex) => {
      // Draw rectangles for each face's UV coordinates
      Object.entries(box.uv).forEach(([faceName, uvCoords]) => {
        if (!uvCoords || uvCoords.every((v) => v === 0)) return;

        const [u1, v1, u2, v2] = uvCoords;

        // Convert UV pixel coordinates to normalized 0-1 space
        const x1 = u1 / textureWidth;
        const y1 = v1 / textureHeight;
        const x2 = u2 / textureWidth;
        const y2 = v2 / textureHeight;

        // Convert to sprite space (-1 to 1, flipped Y)
        const spriteX1 = (x1 - 0.5) * 2;
        const spriteY1 = (0.5 - y1) * 2; // Flip Y
        const spriteX2 = (x2 - 0.5) * 2;
        const spriteY2 = (0.5 - y2) * 2; // Flip Y

        const width = Math.abs(spriteX2 - spriteX1);
        const height = Math.abs(spriteY2 - spriteY1);
        const centerX = (spriteX1 + spriteX2) / 2;
        const centerY = (spriteY1 + spriteY2) / 2;

        // Scale by aspect ratio
        const scaledCenterX = centerX * aspectRatio;
        const scaledWidth = width * aspectRatio;

        const key = `${part.name}-${boxIndex}-${faceName}`;
        const label = `${part.name} - ${faceName}`;

        boxes.push(
          <UVBox
            key={key}
            position={[scaledCenterX, centerY, 0.01]}
            size={[scaledWidth, height]}
            color={partColor}
            label={label}
            onHover={onHover}
          />,
        );
      });
    });
  });

  return <group>{boxes}</group>;
}

/**
 * TextureSprite - Renders a 2D texture as a sprite in 3D space
 * The sprite always faces the camera and maintains aspect ratio
 */
function TextureSprite({ texturePath, onTextureLoaded }: TextureSpriteProps) {
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

        // Notify parent of texture dimensions
        if (onTextureLoaded) {
          onTextureLoaded(
            loadedTexture.image.width,
            loadedTexture.image.height,
          );
        }
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
  }, [texturePath, onTextureLoaded]);

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
  const showUVWrap = useStore((state) => state.canvas2DShowUVWrap);
  const [entityModel, setEntityModel] = useState<ParsedEntityModel | null>(
    null,
  );
  const [textureWidth, setTextureWidth] = useState(0);
  const [textureHeight, setTextureHeight] = useState(0);
  const [aspectRatio, setAspectRatio] = useState(1);
  const [tooltip, setTooltip] = useState<{
    label: string;
    x: number;
    y: number;
  } | null>(null);

  // Get the winning pack for this asset
  const winnerPackId = useSelectWinner(assetId || "");
  const winnerPack = useSelectPack(winnerPackId || "");

  // Check if this is an entity texture
  const isEntity = assetId ? isEntityTexture(assetId) : false;

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
          } catch {
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

  // Load entity model if this is an entity texture and UV wrap is enabled
  useEffect(() => {
    if (!isEntity || !showUVWrap || !assetId) {
      setEntityModel(null);
      return;
    }

    const entityType = getEntityTypeFromAssetId(assetId);
    if (!entityType) return;

    let mounted = true;

    const loadModel = async () => {
      try {
        const model = await loadEntityModel(
          entityType,
          winnerPack?.path,
          winnerPack?.is_zip,
        );

        if (mounted && model) {
          setEntityModel(model);
          console.log(
            "[Preview2D] Loaded entity model for UV debugging:",
            entityType,
          );
        }
      } catch (err) {
        console.error("[Preview2D] Failed to load entity model:", err);
      }
    };

    loadModel();

    return () => {
      mounted = false;
    };
  }, [isEntity, showUVWrap, assetId, winnerPack]);

  const handleTextureLoaded = (width: number, height: number) => {
    setTextureWidth(width);
    setTextureHeight(height);
    setAspectRatio(width / height);
  };

  const handleUVHover = (label: string | null, x: number, y: number) => {
    if (label) {
      setTooltip({ label, x, y });
    } else {
      setTooltip(null);
    }
  };

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
        <TextureSprite
          texturePath={texturePath}
          onTextureLoaded={handleTextureLoaded}
        />

        {showUVWrap && entityModel && textureWidth > 0 && textureHeight > 0 && (
          <UVOverlay
            entityModel={entityModel}
            textureWidth={textureWidth}
            textureHeight={textureHeight}
            aspectRatio={aspectRatio}
            onHover={handleUVHover}
          />
        )}
      </Canvas>

      {tooltip && (
        <div
          className={s.uvTooltip}
          style={{
            left: `${tooltip.x + 10}px`,
            top: `${tooltip.y + 10}px`,
          }}
        >
          {tooltip.label}
        </div>
      )}

      <div className={s.info}>
        <span className={s.infoText}>Scroll to zoom • Drag to pan</span>
      </div>
    </div>
  );
}
