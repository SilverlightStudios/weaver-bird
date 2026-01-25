/**
 * Particle info overlay component
 */
import type { ParticlePhysics } from "@constants/particles";
import s from "../styles.module.scss";

interface ParticleInfoOverlayProps {
  displayName: string;
  physics: ParticlePhysics | null;
  emittingBlocks: string[];
}

function getGravityDisplay(gravity: number | undefined): string {
  if (gravity === undefined) return "Unknown";
  if (gravity > 0) return "Falls";
  if (gravity < 0) return "Rises";
  return "None";
}

export function ParticleInfoOverlay({
  displayName,
  physics,
  emittingBlocks,
}: ParticleInfoOverlayProps) {
  return (
    <div className={s.particleInfo}>
      <div className={s.particleName}>{displayName}</div>
      {physics && (
        <>
          {physics.lifetime && Array.isArray(physics.lifetime) && (
            <div className={s.particleStat}>
              Lifetime:{" "}
              <span>{`${physics.lifetime[0].toFixed(1)}s - ${physics.lifetime[1].toFixed(1)}s`}</span>
            </div>
          )}
          {physics.gravity !== undefined && (
            <div className={s.particleStat}>
              Gravity: <span>{getGravityDisplay(physics.gravity)}</span>
            </div>
          )}
        </>
      )}
      {emittingBlocks.length > 0 && (
        <div className={s.particleStat}>
          Emitted by:{" "}
          <span>
            {emittingBlocks.length} block
            {emittingBlocks.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}
    </div>
  );
}
