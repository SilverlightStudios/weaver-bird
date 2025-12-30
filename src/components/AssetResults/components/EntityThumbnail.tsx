import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { PerspectiveCamera } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { jemToThreeJS } from "@lib/emf";
import {
  acquireUrlTexture,
  releaseUrlTexture,
} from "@lib/three/urlTextureCache";

interface Props {
  jemModel: any;
  textureUrl: string | null;
  extraTextureUrls?: Record<string, string | null> | null;
}

export function EntityThumbnail({
  jemModel,
  textureUrl,
  extraTextureUrls,
}: Props) {
  const invalidate = useThree((s) => s.invalidate);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [baseTexture, setBaseTexture] = useState<THREE.Texture | null>(null);
  const [textureMap, setTextureMap] = useState<Record<string, THREE.Texture>>(
    {},
  );

  useEffect(() => {
    let cancelled = false;
    if (!textureUrl) {
      setBaseTexture(null);
      return;
    }

    acquireUrlTexture(textureUrl).then((tex) => {
      if (cancelled) return;
      setBaseTexture(tex);
      invalidate();
    });

    return () => {
      cancelled = true;
      releaseUrlTexture(textureUrl);
    };
  }, [textureUrl, invalidate]);

  useEffect(() => {
    const urls = extraTextureUrls
      ? (Object.entries(extraTextureUrls).filter(([, url]) => !!url) as Array<
          [string, string]
        >)
      : [];

    if (urls.length === 0) {
      setTextureMap({});
      return;
    }

    let cancelled = false;
    const next: Record<string, THREE.Texture> = {};

    Promise.all(
      urls.map(async ([key, url]) => {
        const tex = await acquireUrlTexture(url);
        if (tex) next[key] = tex;
      }),
    ).then(() => {
      if (cancelled) return;
      setTextureMap(next);
      invalidate();
    });

    return () => {
      cancelled = true;
      for (const [, url] of urls) releaseUrlTexture(url);
    };
  }, [extraTextureUrls, invalidate]);

  const group = useMemo(() => {
    if (!jemModel) return null;
    try {
      return jemToThreeJS(jemModel, baseTexture, textureMap);
    } catch (err) {
      console.warn("[EntityThumbnail] Failed to convert JEM to ThreeJS:", err);
      return null;
    }
  }, [jemModel, baseTexture, textureMap]);

  // Fit the camera once when the model becomes available.
  useEffect(() => {
    if (!group || !groupRef.current || !cameraRef.current) return;

    const cam = cameraRef.current;
    const box = new THREE.Box3().setFromObject(groupRef.current);
    if (!Number.isFinite(box.min.x) || !Number.isFinite(box.max.x)) return;

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    const fov = (cam.fov * Math.PI) / 180;
    const dist = maxDim / 2 / Math.tan(fov / 2);
    const radius = dist * 2.2;
    const theta = THREE.MathUtils.degToRad(30); // look down ~40°
    const yOff = radius * Math.sin(theta);
    const zOff = radius * Math.cos(theta);

    cam.position.set(center.x, center.y + yOff, center.z + zOff);
    cam.near = Math.max(0.01, radius / 100);
    cam.far = radius * 100;
    cam.updateProjectionMatrix();
    cam.lookAt(center);

    // A slight angle reads better than perfectly front-on for many mobs.
    // Rotate 180° so thumbnails face "forward" like in-game, and pitch the
    // camera down slightly by placing it higher above the model.
    groupRef.current.rotation.y = 0.8 + Math.PI;

    invalidate();
  }, [group, invalidate]);

  useEffect(() => {
    return () => {
      if (!group) return;
      group.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return;
        obj.geometry?.dispose();
        const mats = Array.isArray(obj.material)
          ? obj.material
          : [obj.material];
        for (const m of mats) m?.dispose();
      });
    };
  }, [group]);

  if (!group) return null;

  return (
    <>
      <ambientLight intensity={1.1} />
      <directionalLight position={[8, 10, 6]} intensity={1.0} />
      <directionalLight position={[-6, 6, -8]} intensity={0.6} />
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        fov={50}
        position={[0, 5, 10]}
      />
      <group ref={groupRef}>
        <primitive object={group} />
      </group>
    </>
  );
}
