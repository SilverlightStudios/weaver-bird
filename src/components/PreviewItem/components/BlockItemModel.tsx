import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import BlockModel from "@components/Preview3D/BlockModel";

export interface BlockItemModelProps {
  assetId: string;
  rotate: boolean;
  hover: boolean;
}

/**
 * BlockItemModel - Renders a block at 30% scale with animations
 */
export function BlockItemModel({
  assetId,
  rotate,
  hover,
}: BlockItemModelProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Rotation and bobbing animation for dropped block items
  useFrame((state, delta) => {
    if (groupRef.current) {
      if (rotate) {
        // Minecraft items rotate at about 1 revolution per 4 seconds
        groupRef.current.rotation.y += delta * (Math.PI / 2);
      }

      if (hover) {
        // Bobbing animation
        const bobSpeed = 2;
        const bobAmplitude = 0.05;
        // Base position is -0.25 (lowered by 50%) plus bobbing offset
        groupRef.current.position.y =
          -0.25 + Math.sin(state.clock.elapsedTime * bobSpeed) * bobAmplitude;
      } else {
        // Reset position when hover is disabled - lowered by 50%
        groupRef.current.position.y = -0.25;
      }
    }
  });

  return (
    <group ref={groupRef} scale={0.3}>
      <BlockModel assetId={assetId} />
    </group>
  );
}
