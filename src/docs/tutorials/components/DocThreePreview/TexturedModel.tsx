import { useEffect, useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { loadJEM, addDebugVisualization, type JEMFile } from "@lib/emf/jemLoader";
import DirectionalLabels from "./DirectionalLabels";

export default function TexturedModel({
  jemData,
  textureUrl,
  showPivots,
  showLabels,
  color,
}: {
  jemData: JEMFile;
  textureUrl: string;
  showPivots?: boolean;
  showLabels?: boolean;
  color?: string;
}) {
  const loadedTexture = useLoader(THREE.TextureLoader, textureUrl);

  // Configure texture settings
  useEffect(() => {
    if (loadedTexture) {
      // eslint-disable-next-line react-hooks/immutability
      loadedTexture.magFilter = THREE.NearestFilter;
      loadedTexture.minFilter = THREE.NearestFilter;
      loadedTexture.colorSpace = THREE.SRGBColorSpace;
    }
  }, [loadedTexture]);

  const group = useMemo(() => {
    const modelGroup = loadJEM(jemData, loadedTexture);

    if (color) {
      modelGroup.traverse((child) => {
        if (
          child instanceof THREE.Mesh &&
          child.material instanceof THREE.MeshStandardMaterial
        ) {
          child.material.color.set(color);
        }
      });
    }

    if (showPivots) {
      addDebugVisualization(modelGroup);
    }

    return modelGroup;
  }, [jemData, loadedTexture, showPivots, color]);

  return (
    <group>
      <primitive object={group} />
      {showLabels && <DirectionalLabels />}
    </group>
  );
}
