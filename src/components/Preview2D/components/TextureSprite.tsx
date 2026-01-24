import { useEffect } from "react";
import { useLoader } from "@react-three/fiber";
import * as THREE from "three";

export interface TextureSpriteProps {
  texturePath: string;
  textureWidth?: number;
  textureHeight?: number;
  onTextureLoaded?: (width: number, height: number) => void;
}

/**
 * TextureSprite - Renders a 2D texture as a sprite in 3D space
 * The sprite always faces the camera and maintains aspect ratio
 */
export function TextureSprite({
  texturePath,
  onTextureLoaded,
}: TextureSpriteProps) {
  // Load texture using drei's useLoader hook
  const texture = useLoader(THREE.TextureLoader, texturePath);

  // Configure texture settings (Three.js textures are mutable by design)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    texture.magFilter = THREE.NearestFilter; // Pixelated look (Minecraft style)
    texture.minFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(1, 1);
    texture.offset.set(0, 0);
    texture.needsUpdate = true;
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
