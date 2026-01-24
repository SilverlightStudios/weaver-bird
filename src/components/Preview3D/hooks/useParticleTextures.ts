import { useState, useEffect, useMemo } from "react";
import { loadParticleTextures, type LoadedParticleTexture } from "@lib/particle/particleTextureLoader";
import { getParticlePhysics } from "@constants/particles";
import type { PackRecord } from "@state/types";

export interface SpawnTextureConfig {
  textures: THREE.Texture[];
  frameDuration?: number;
  tint?: [number, number, number];
}

export function useParticleTexture(
  particleType: string,
  winnerPack: PackRecord | null | undefined,
) {
  const [texture, setTexture] = useState<LoadedParticleTexture | null>(null);

  useEffect(() => {
    console.log(`[useParticleTexture] Loading textures for ${particleType}, pack=${winnerPack?.path}`);
    let cancelled = false;

    void (async () => {
      const loaded = await loadParticleTextures(
        particleType,
        winnerPack?.path,
        winnerPack?.is_zip,
      ).catch((err) => {
        console.error(`[useParticleTexture] Failed to load textures for ${particleType}:`, err);
        return null;
      });

      console.log(`[useParticleTexture] Texture load result for ${particleType}:`, {
        loaded: !!loaded,
        textureCount: loaded?.textures?.length,
        tint: loaded?.tint,
      });

      if (!cancelled) {
        setTexture(loaded?.textures?.length ? loaded : null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [particleType, winnerPack?.path, winnerPack?.is_zip]);

  return texture;
}

export function useSpawnParticleTextures(
  particleType: string,
  particleDataReady: boolean,
  winnerPack: PackRecord | null | undefined,
) {
  const spawnParticleTypes = useMemo(() => {
    if (!particleDataReady) return [];
    const physics = getParticlePhysics(particleType);
    const spawns = physics?.spawnsParticles ?? physics?.spawns_particles;
    if (!spawns || spawns.length === 0) return [];
    const ids = spawns
      .map((spawn) => spawn.particleId ?? spawn.particle_id ?? "")
      .filter((id) => id.length > 0);
    return Array.from(new Set(ids));
  }, [particleType, particleDataReady]);

  const spawnKey = useMemo(() => spawnParticleTypes.join("|"), [spawnParticleTypes]);
  const [spawnTextures, setSpawnTextures] = useState<Record<string, SpawnTextureConfig>>({});

  useEffect(() => {
    let cancelled = false;
    if (!spawnKey) {
      setSpawnTextures({});
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      const entries = await Promise.all(
        spawnParticleTypes.map(async (spawnType) => {
          const loaded = await loadParticleTextures(
            spawnType,
            winnerPack?.path,
            winnerPack?.is_zip,
          ).catch(() => null);
          if (!loaded?.textures?.length) return null;
          return [
            spawnType,
            {
              textures: loaded.textures,
              frameDuration: loaded.frameDuration,
              tint: loaded.tint,
            } satisfies SpawnTextureConfig,
          ] as const;
        }),
      );

      if (cancelled) return;

      const map: Record<string, SpawnTextureConfig> = {};
      for (const entry of entries) {
        if (entry) {
          map[entry[0]] = entry[1];
        }
      }
      setSpawnTextures(map);
    })();

    return () => {
      cancelled = true;
    };
  }, [spawnKey, spawnParticleTypes, winnerPack?.path, winnerPack?.is_zip]);

  return spawnTextures;
}
