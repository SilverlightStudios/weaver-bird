/**
 * PreviewParticle - Standalone particle preview component
 *
 * When a user clicks on a particle texture card, this component
 * provides two view modes:
 * - 2D mode: Shows the particle texture(s) as a gallery (uses Preview2D)
 * - 3D mode: Shows a live animated particle emitter
 */

import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { useStore } from "@state/store";
import Preview2D from "@components/Preview2D";
import GridFloor from "@components/Preview3D/GridFloor";
import { ParticleEmitter3D } from "@components/Preview3D/ParticleEmitter3D";
import {
  getParticleTypeFromAssetId,
  getParticleDisplayName,
} from "@lib/assetUtils";
import {
  getParticlePhysics,
  getBlocksEmittingParticle,
} from "@constants/particles";
import s from "./styles.module.scss";

interface PreviewParticleProps {
  assetId: string;
}

/**
 * 3D particle preview scene
 */
interface Particle3DSceneProps {
  particleType: string;
}

function Particle3DScene({
  particleType,
}: Particle3DSceneProps): JSX.Element {
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

/**
 * PreviewParticle component
 */
export default function PreviewParticle({
  assetId,
}: PreviewParticleProps): JSX.Element {
  const canvasRenderMode = useStore((state) => state.canvasRenderMode);
  // Subscribe to re-render when particle data loads
  const particleDataReady = useStore((state) => state.particleDataReady);

  // Extract particle info
  const particleType = getParticleTypeFromAssetId(assetId);
  const displayName = particleType
    ? getParticleDisplayName(particleType)
    : "Unknown Particle";
  const physics = particleType && particleDataReady ? getParticlePhysics(particleType) : null;
  const emittingBlocks = particleType && particleDataReady
    ? getBlocksEmittingParticle(particleType)
    : [];
  const hasPhysicsData = physics !== null;

  // If no valid particle type, show error
  if (!particleType) {
    return (
      <div className={s.root}>
        <div className={s.error}>Invalid particle asset ID</div>
      </div>
    );
  }

  // 2D mode - use Preview2D to show the texture
  if (canvasRenderMode === "2D") {
    return <Preview2D assetId={assetId} />;
  }

  // 3D mode - show live particle emitter (only if we have physics data)
  return (
    <div className={s.root}>
      {hasPhysicsData ? (
        <Canvas
          gl={{
            antialias: true,
            alpha: true,
            toneMapping: THREE.NoToneMapping,
          }}
          style={{ background: "transparent" }}
        >
          <Particle3DScene particleType={particleType} />
        </Canvas>
      ) : (
        <div className={s.noData}>
          <span>Particle physics not extracted</span>
        </div>
      )}

      {/* Particle info overlay */}
      <div className={s.particleInfo}>
        <div className={s.particleName}>{displayName}</div>
        {physics && (
          <>
            {physics.lifetime && Array.isArray(physics.lifetime) && (
              <div className={s.particleStat}>
                Lifetime: <span>{`${physics.lifetime[0].toFixed(1)}s - ${physics.lifetime[1].toFixed(1)}s`}</span>
              </div>
            )}
            {physics.gravity !== undefined && (
              <div className={s.particleStat}>
                Gravity: <span>{physics.gravity > 0 ? "Falls" : physics.gravity < 0 ? "Rises" : "None"}</span>
              </div>
            )}
          </>
        )}
        {emittingBlocks.length > 0 && (
          <div className={s.particleStat}>
            Emitted by: <span>{emittingBlocks.length} block{emittingBlocks.length !== 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      {/* Controls hint */}
      {hasPhysicsData && (
        <div className={s.info}>
          <span className={s.infoText}>Drag to rotate | Scroll to zoom</span>
        </div>
      )}
    </div>
  );
}
