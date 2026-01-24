/**
 * PreviewParticle - Standalone particle preview component
 *
 * When a user clicks on a particle texture card, this component
 * provides two view modes:
 * - 2D mode: Shows the particle texture(s) as a gallery (uses Preview2D)
 * - 3D mode: Shows a live animated particle emitter
 */

import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { useStore } from "@state/store";
import Preview2D from "@components/Preview2D";
import { Particle3DScene } from "./components/Particle3DScene";
import {
  PreviewParticleError,
  PreviewParticleNoData,
} from "./components/PreviewParticleStates";
import { ParticleInfoOverlay } from "./components/ParticleInfoOverlay";
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

  if (!particleType) return <PreviewParticleError />;
  if (canvasRenderMode === "2D") return <Preview2D assetId={assetId} />;

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
        <PreviewParticleNoData />
      )}

      <ParticleInfoOverlay
        displayName={displayName}
        physics={physics}
        emittingBlocks={emittingBlocks}
      />

      {hasPhysicsData && (
        <div className={s.info}>
          <span className={s.infoText}>Drag to rotate | Scroll to zoom</span>
        </div>
      )}
    </div>
  );
}
