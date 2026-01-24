import { useState } from "react";
import { Text } from "@react-three/drei";
import * as THREE from "three";

export interface UVBoxProps {
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
export function UVBox({
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
