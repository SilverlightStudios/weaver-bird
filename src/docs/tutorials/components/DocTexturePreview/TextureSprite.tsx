import { useEffect } from "react";
import { useLoader } from "@react-three/fiber";
import * as THREE from "three";

export default function TextureSprite({
  textureUrl,
  onLoaded,
}: {
  textureUrl: string;
  onLoaded: (w: number, h: number) => void;
}) {
  const texture = useLoader(THREE.TextureLoader, textureUrl);

  // Configure texture settings
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
  }, [texture]);

  useEffect(() => {
    if (texture.image) {
      onLoaded(texture.image.width, texture.image.height);
    }
  }, [texture, onLoaded]);

  const aspectRatio = texture.image
    ? texture.image.width / texture.image.height
    : 1;
  const width = aspectRatio >= 1 ? aspectRatio * 2 : 2;
  const height = aspectRatio >= 1 ? 2 : 2 / aspectRatio;

  return (
    <mesh scale={[width, height, 1]}>
      <planeGeometry />
      <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} />
    </mesh>
  );
}
