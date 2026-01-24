/**
 * Canvas content for Preview2D component
 */
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import type { ParsedEntityModel } from "@lib/emf";
import {
  CheckerboardBackground,
  TextureSprite,
  SignText,
  PixelGrid,
  UVOverlay,
} from "./index";

interface Preview2DCanvasProps {
  texturePath: string;
  isSign: boolean;
  isHangingSignTexture: boolean;
  signText: string[];
  aspectRatio: number;
  showPixelGrid: boolean;
  textureWidth: number;
  textureHeight: number;
  showUVWrap: boolean;
  entityModel: ParsedEntityModel | null;
  onTextureLoaded: (width: number, height: number) => void;
  onUVHover: (label: string | null, x: number, y: number) => void;
}

export function Preview2DCanvas({
  texturePath,
  isSign,
  isHangingSignTexture,
  signText,
  aspectRatio,
  showPixelGrid,
  textureWidth,
  textureHeight,
  showUVWrap,
  entityModel,
  onTextureLoaded,
  onUVHover,
}: Preview2DCanvasProps) {
  return (
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
        onTextureLoaded={onTextureLoaded}
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
          onHover={onUVHover}
        />
      )}
    </Canvas>
  );
}
