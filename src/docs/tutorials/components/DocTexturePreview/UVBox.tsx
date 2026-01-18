import { useState } from "react";
import { Text } from "@react-three/drei";
import * as THREE from "three";

export interface UVBoxProps {
  position: [number, number, number];
  size: [number, number];
  color: number;
  label: string;
  faceName: string;
  onHover: (label: string | null, x: number, y: number) => void;
}

export default function UVBox({
  position,
  size,
  color,
  label,
  faceName,
  onHover,
}: UVBoxProps) {
  const [hovered, setHovered] = useState(false);

  const getDirectionalLabels = () => {
    const face = faceName.toLowerCase();
    if (["north", "south", "east", "west"].includes(face)) {
      return { top: "UP", bottom: "DOWN" };
    } else if (["up", "down"].includes(face)) {
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
          if (hovered) onHover(label, e.clientX, e.clientY);
        }}
      >
        <planeGeometry args={size} />
        <meshBasicMaterial
          color={hovered ? 0xffffff : color}
          transparent
          opacity={hovered ? 0.6 : 0.35}
          side={THREE.DoubleSide}
          depthTest={false}
        />
      </mesh>

      {/* Border */}
      <lineSegments position={position}>
        <edgesGeometry args={[new THREE.PlaneGeometry(...size)]} />
        <lineBasicMaterial
          color={hovered ? 0xffffff : color}
          opacity={0.8}
          transparent
        />
      </lineSegments>

      {hovered && labels && (
        <>
          <Text
            position={[
              position[0],
              position[1] + size[1] / 2 + 0.08,
              position[2] + 0.02,
            ]}
            fontSize={0.08}
            color="#5ce1e6"
            anchorY="bottom"
          >
            {labels.top}
          </Text>
          <Text
            position={[
              position[0],
              position[1] - size[1] / 2 - 0.08,
              position[2] + 0.02,
            ]}
            fontSize={0.08}
            color="#5ce1e6"
            anchorY="top"
          >
            {labels.bottom}
          </Text>
        </>
      )}
    </group>
  );
}
