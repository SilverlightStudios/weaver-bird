import { useState, useEffect, useRef } from "react";
import type * as THREE from "three";
import { ParticleEngine } from "@lib/particle/ParticleEngine";
import type { SpawnTextureConfig } from "./useParticleTextures";

export function useParticleEngine(
  particleType: string,
  invalidExpressions: boolean,
  spawnTextures: Record<string, SpawnTextureConfig>,
) {
  const engineRef = useRef<ParticleEngine | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const [object3D, setObject3D] = useState<THREE.Object3D | null>(null);

  useEffect(() => {
    if (invalidExpressions) {
      if (engineRef.current) {
        console.log(`[useParticleEngine] Disposing ParticleEngine for ${particleType}`);
        engineRef.current.dispose();
        engineRef.current = null;
        setEngineReady(false);
        setObject3D(null);
      }
      return;
    }
    console.log(`[useParticleEngine] Creating ParticleEngine for ${particleType}`);
    const engine = new ParticleEngine("medium");
    engineRef.current = engine;
    setObject3D(engine.getObject3D());
    setEngineReady(true);
    console.log(`[useParticleEngine] ParticleEngine created successfully for ${particleType}`);
    return () => {
      console.log(`[useParticleEngine] Disposing ParticleEngine for ${particleType}`);
      engine.dispose();
      engineRef.current = null;
      setEngineReady(false);
      setObject3D(null);
    };
  }, [particleType, invalidExpressions]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setSpawnTextureMap(spawnTextures);
  }, [spawnTextures]);

  return { engineRef, engineReady, object3D };
}
