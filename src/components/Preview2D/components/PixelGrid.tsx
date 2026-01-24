import { useEffect, useState } from "react";
import * as THREE from "three";

export interface PixelGridProps {
  textureWidth: number;
  textureHeight: number;
  aspectRatio: number;
}

/**
 * Pixel grid overlay showing individual Minecraft pixels
 */
export function PixelGrid({
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
