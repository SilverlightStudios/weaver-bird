import { useMemo } from "react";
import * as THREE from "three";
import { loadJEM, addDebugVisualization, type JEMFile } from "@lib/emf/jemLoader";
import DirectionalLabels from "./DirectionalLabels";

export default function SolidColorModel({
  jemData,
  showPivots,
  showLabels,
}: {
  jemData: JEMFile;
  showPivots?: boolean;
  showLabels?: boolean;
}) {
  const group = useMemo(() => {
    const modelGroup = loadJEM(jemData, null);

    modelGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: 0x888888,
          roughness: 0.7,
          metalness: 0.1,
          side: THREE.DoubleSide,
        });
      }
    });

    if (showPivots) {
      addDebugVisualization(modelGroup);
    }

    return modelGroup;
  }, [jemData, showPivots]);

  return (
    <group>
      <primitive object={group} />
      {showLabels && <DirectionalLabels />}
    </group>
  );
}
