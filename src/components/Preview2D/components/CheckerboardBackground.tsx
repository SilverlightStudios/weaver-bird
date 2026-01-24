import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Checkerboard background to show texture transparency
 */
export function CheckerboardBackground() {
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
