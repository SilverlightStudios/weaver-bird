/**
 * Preview2D Component - Displays 2D textures (GUI, particles, entities, etc.)
 *
 * Uses Three.js to render a flat sprite with zoom/pan controls
 * Consistent with Preview3D but optimized for 2D textures
 */
import { useEffect, useState, useRef } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Text } from "@react-three/drei";
import * as THREE from "three";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getVanillaTexturePath, getPackTexturePath } from "@lib/tauri";
import {
  normalizeAssetId,
  isSignTexture,
  isHangingSign,
} from "@lib/assetUtils";
import { useSelectWinner, useSelectPack } from "@state/selectors";
import { useStore } from "@state/store";
import {
  isEntityTexture,
  getEntityInfoFromAssetId,
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
  faceName: string; // north, south, east, west, up, down
  onHover: (label: string | null, x: number, y: number) => void;
}

/**
 * UV Box - A single UV mapping box with hover interaction and directional labels
 */
function UVBox({
  position,
  size,
  color,
  label,
  faceName,
  onHover,
}: UVBoxProps) {
  const [hovered, setHovered] = useState(false);

  // Determine directional labels based on face orientation
  const getDirectionalLabels = (): { top: string; bottom: string } | null => {
    const face = faceName.toLowerCase();

    if (
      face === "north" ||
      face === "south" ||
      face === "east" ||
      face === "west"
    ) {
      // Horizontal faces: show which side is up
      return { top: "UP", bottom: "DOWN" };
    } else if (face === "up" || face === "down") {
      // Vertical faces: show which sides are north/south
      return { top: "NORTH", bottom: "SOUTH" };
    }

    return null;
  };

  const labels = getDirectionalLabels();

  return (
    <group>
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

      {/* Render directional text labels when hovered */}
      {hovered && labels && (
        <>
          {/* Top label background */}
          <mesh
            position={[
              position[0],
              position[1] + size[1] / 2 + 0.05,
              position[2] + 0.01,
            ]}
          >
            <planeGeometry args={[size[0] * 0.8, 0.08]} />
            <meshBasicMaterial
              color={0x000000}
              transparent
              opacity={0.7}
              depthTest={false}
            />
          </mesh>
          {/* Top label text */}
          <Text
            position={[
              position[0],
              position[1] + size[1] / 2 + 0.05,
              position[2] + 0.02,
            ]}
            fontSize={0.04}
            color="white"
            anchorX="center"
            anchorY="middle"
            depthOffset={-1}
          >
            {labels.top}
          </Text>

          {/* Bottom label background */}
          <mesh
            position={[
              position[0],
              position[1] - size[1] / 2 - 0.05,
              position[2] + 0.01,
            ]}
          >
            <planeGeometry args={[size[0] * 0.8, 0.08]} />
            <meshBasicMaterial
              color={0x000000}
              transparent
              opacity={0.7}
              depthTest={false}
            />
          </mesh>
          {/* Bottom label text */}
          <Text
            position={[
              position[0],
              position[1] - size[1] / 2 - 0.05,
              position[2] + 0.02,
            ]}
            fontSize={0.04}
            color="white"
            anchorX="center"
            anchorY="middle"
            depthOffset={-1}
          >
            {labels.bottom}
          </Text>
        </>
      )}
    </group>
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
            faceName={faceName}
            onHover={onHover}
          />,
        );
      });
    });
  });

  return <group>{boxes}</group>;
}

/**
 * SignText - Renders text overlay on sign textures
 */
function SignText({
  lines,
  aspectRatio,
  isHanging,
}: {
  lines: string[];
  aspectRatio: number;
  isHanging: boolean;
}) {
  const width = aspectRatio >= 1 ? aspectRatio * 2 : 2;
  const height = aspectRatio >= 1 ? 2 : 2 / aspectRatio;

  // Font size adjustments - signs use smaller text
  const fontSize = height * 0.08; // Smaller font relative to sign height

  // Line spacing
  const lineSpacing = fontSize * 1.3; // Space between lines

  // Sign text positioning differs between regular and hanging signs
  // Regular signs: text is centered in the middle section of the sign
  // Hanging signs: text should be centered on the visible sign board portion
  let startY: number;
  if (isHanging) {
    // Hanging signs: center text on the lower sign board area
    const totalTextHeight = lineSpacing * 3; // 4 lines = 3 gaps
    startY = totalTextHeight / 2 - height * 0.15; // Slightly below center
  } else {
    // Regular signs: center the text block
    const totalTextHeight = lineSpacing * 3; // 4 lines = 3 gaps
    startY = totalTextHeight / 2; // Center the text block
  }

  return (
    <group position={[0, 0, 0.01]}>
      {" "}
      {/* Slightly in front of texture */}
      {lines.map((line, index) => {
        if (!line) return null; // Skip empty lines

        const yPos = startY - index * lineSpacing;

        return (
          <Text
            key={index}
            position={[0, yPos, 0]}
            fontSize={fontSize}
            color="black"
            anchorX="center"
            anchorY="middle"
            font="/src/assets/fonts/mac's Minecraft.ttf"
            maxWidth={width * 0.8}
          >
            {line}
          </Text>
        );
      })}
    </group>
  );
}

/**
 * TextureSprite - Renders a 2D texture as a sprite in 3D space
 * The sprite always faces the camera and maintains aspect ratio
 */
function TextureSprite({ texturePath, onTextureLoaded }: TextureSpriteProps) {
  // Load texture using drei's useLoader hook
  const texture = useLoader(THREE.TextureLoader, texturePath);

  // Configure texture settings (Three.js textures are mutable by design)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    texture.magFilter = THREE.NearestFilter; // Pixelated look (Minecraft style)

    texture.minFilter = THREE.NearestFilter;

    texture.colorSpace = THREE.SRGBColorSpace;
  }, [texture]);

  // Calculate aspect ratio and notify parent
  useEffect(() => {
    if (texture.image) {
      const { width } = texture.image;
      const { height } = texture.image;

      console.log(`[Preview2D] Loaded texture: ${width}x${height}`);

      if (onTextureLoaded) {
        onTextureLoaded(width, height);
      }
    }
  }, [texture, onTextureLoaded]);

  // Calculate geometry size based on aspect ratio
  const aspectRatio = texture.image
    ? texture.image.width / texture.image.height
    : 1;
  const width = aspectRatio >= 1 ? aspectRatio * 2 : 2;
  const height = aspectRatio >= 1 ? 2 : 2 / aspectRatio;

  return (
    <mesh position={[0, 0, 0]} scale={[width, height, 1]}>
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
 * Pixel grid overlay showing individual Minecraft pixels
 */
interface PixelGridProps {
  textureWidth: number;
  textureHeight: number;
  aspectRatio: number;
}

function PixelGrid({
  textureWidth,
  textureHeight,
  aspectRatio,
}: PixelGridProps) {
  const [gridTexture, setGridTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (textureWidth === 0 || textureHeight === 0) return;

    // Create a canvas to draw the grid
    const canvas = document.createElement("canvas");
    // Make the canvas high-res enough to show crisp lines
    const scale = 16; // Each "pixel" gets 16 canvas pixels
    canvas.width = textureWidth * scale;
    canvas.height = textureHeight * scale;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      // Draw grid lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)"; // Semi-transparent white
      ctx.lineWidth = 1;

      // Vertical lines
      for (let x = 0; x <= textureWidth; x++) {
        ctx.beginPath();
        ctx.moveTo(x * scale, 0);
        ctx.lineTo(x * scale, canvas.height);
        ctx.stroke();
      }

      // Horizontal lines
      for (let y = 0; y <= textureHeight; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * scale);
        ctx.lineTo(canvas.width, y * scale);
        ctx.stroke();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;

    setGridTexture(texture);

    return () => {
      texture.dispose();
      setGridTexture(null);
    };
  }, [textureWidth, textureHeight]);

  // Match the size of the texture sprite
  const width = aspectRatio >= 1 ? aspectRatio * 2 : 2;
  const height = aspectRatio >= 1 ? 2 : 2 / aspectRatio;

  if (!gridTexture) return null;

  return (
    <mesh position={[0, 0, 0.02]} rotation={[0, 0, 0]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={gridTexture}
        transparent
        opacity={1}
        depthWrite={false}
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
  const showPixelGrid = useStore((state) => state.canvas2DShowPixelGrid);
  const signText = useStore((state) => state.signText || ["", "", "", ""]);
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

  // Check if this is a sign texture
  const isSign = assetId ? isSignTexture(assetId) : false;
  const isHangingSignTexture = assetId ? isHangingSign(assetId) : false;

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

    const entityInfo = getEntityInfoFromAssetId(assetId);
    if (!entityInfo) return;

    const { variant: entityType, parent: parentEntity } = entityInfo;

    let mounted = true;

    const loadModel = async () => {
      try {
        const model = await loadEntityModel(
          entityType,
          winnerPack?.path,
          winnerPack?.is_zip,
          null, // targetVersion - not critical for 2D preview
          undefined, // entityVersionVariants - not critical for 2D preview
          parentEntity,
          winnerPack?.pack_format,
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
          minDistance={0.5}
          maxDistance={40}
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

        {isSign && aspectRatio > 0 && (
          <SignText
            lines={signText}
            aspectRatio={aspectRatio}
            isHanging={isHangingSignTexture}
          />
        )}

        {showPixelGrid && textureWidth > 0 && textureHeight > 0 && (
          <PixelGrid
            textureWidth={textureWidth}
            textureHeight={textureHeight}
            aspectRatio={aspectRatio}
          />
        )}

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
