import * as THREE from "three";

type Entry = {
  refs: number;
  promise: Promise<THREE.Texture>;
  texture: THREE.Texture | null;
  disposed: boolean;
};

const cache = new Map<string, Entry>();

function loadTexture(url: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (tex) => {
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        tex.colorSpace = THREE.SRGBColorSpace;
        resolve(tex);
      },
      undefined,
      (err) => reject(err),
    );
  });
}

export async function acquireUrlTexture(url: string): Promise<THREE.Texture | null> {
  if (!url) return null;

  const existing = cache.get(url);
  if (existing) {
    existing.refs++;
    return existing.promise
      .then((tex) => (existing.disposed ? null : tex))
      .catch(() => null);
  }

  const entry: Entry = {
    refs: 1,
    texture: null,
    disposed: false,
    promise: loadTexture(url)
      .then((tex) => {
        entry.texture = tex;
        if (entry.disposed) {
          tex.dispose();
          entry.texture = null;
          return tex;
        }
        return tex;
      })
      .catch((err) => {
        cache.delete(url);
        throw err;
      }),
  };

  cache.set(url, entry);
  try {
    const tex = await entry.promise;
    return entry.disposed ? null : tex;
  } catch {
    return null;
  }
}

export function releaseUrlTexture(url: string): void {
  if (!url) return;
  const entry = cache.get(url);
  if (!entry) return;

  entry.refs--;
  if (entry.refs > 0) return;

  entry.disposed = true;
  cache.delete(url);
  if (entry.texture) entry.texture.dispose();
}

