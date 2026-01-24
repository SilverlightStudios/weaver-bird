import { PerspectiveCamera, OrbitControls } from "@react-three/drei";
import { useStore } from "@state/store";
import GridFloor from "@components/Preview3D/GridFloor";
import { ParticleEmitter3D } from "@components/Preview3D/ParticleEmitter3D";

export interface Particle3DSceneProps {
  particleType: string;
}

/**
 * 3D particle preview scene
 */
export function Particle3DScene({ particleType }: Particle3DSceneProps): JSX.Element {
  const showGrid = useStore((state) => state.canvas3DShowGrid);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 1.5, 3]} fov={50} />

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={0.75}
        maxDistance={10}
        target={[0, 0.5, 0]}
      />

      {/* Lighting */}
      <ambientLight intensity={1.0} />
      <directionalLight position={[3, 10, 5]} intensity={0.5} />

      {/* Grid */}
      {showGrid && <GridFloor />}

      {/* Particle emitter at center, elevated slightly */}
      <ParticleEmitter3D
        particleType={particleType}
        position={[0, 0.5, 0]}
        emissionRate={5} // Higher rate for preview visibility
        enabled={true}
      />
    </>
  );
}
