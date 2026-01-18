import { Text } from "@react-three/drei";

export default function DirectionalLabels() {
  return (
    <group>
      <Text
        position={[0, 0, -2.5]}
        fontSize={0.25}
        color="#3b82f6"
        anchorY="bottom"
      >
        North (-Z)
      </Text>
      <Text
        position={[0, 0, 2.5]}
        fontSize={0.25}
        color="#3b82f6"
        anchorY="top"
      >
        South (+Z)
      </Text>
      <Text
        position={[-2.5, 0, 0]}
        fontSize={0.25}
        color="#ef4444"
        anchorX="right"
      >
        West (-X)
      </Text>
      <Text
        position={[2.5, 0, 0]}
        fontSize={0.25}
        color="#ef4444"
        anchorX="left"
      >
        East (+X)
      </Text>
      <Text
        position={[0, 2.8, 0]}
        fontSize={0.25}
        color="#22c55e"
        anchorY="bottom"
      >
        Up (+Y)
      </Text>

      {/* Axis lines - X (Red) */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.015, 0.015, 5]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.6} />
      </mesh>

      {/* Axis lines - Y (Green) */}
      <mesh position={[0, 1.25, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 2.5]} />
        <meshBasicMaterial color="#22c55e" transparent opacity={0.6} />
      </mesh>

      {/* Axis lines - Z (Blue) */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 5]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}
