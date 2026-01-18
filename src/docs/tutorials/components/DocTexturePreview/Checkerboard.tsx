import { useMemo } from "react";
import * as THREE from "three";

export default function Checkerboard() {
  const texture = useMemo(() => {
    const size = 32;
    const data = new Uint8Array(size * size * 4);

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const idx = (i * size + j) * 4;
        const isLight = (i + j) % 2 === 0;
        const value = isLight ? 40 : 30;
        data[idx] = value;
        data[idx + 1] = value;
        data[idx + 2] = value;
        data[idx + 3] = 255;
      }
    }

    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);
    tex.needsUpdate = true;
    return tex;
  }, []);

  return (
    <mesh position={[0, 0, -0.1]}>
      <planeGeometry args={[10, 10]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}
