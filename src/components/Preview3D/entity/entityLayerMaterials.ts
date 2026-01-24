/**
 * Material creation and management for entity layers
 */
import * as THREE from "three";
import type { EntityLayerDefinition } from "@lib/entityComposite";
import type { BoneUserData } from "@/lib/emf/types";

function prepareTexture(tex: THREE.Texture | null): void {
  if (!tex) return;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
}

function createEmissiveMaterial(
  tex: THREE.Texture | null,
  opacity: number,
  blending: THREE.Blending,
  side: THREE.Side,
): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    map: tex ?? undefined,
    transparent: true,
    alphaTest: 0.1,
    opacity,
    blending,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
    side,
  });
}

function createEnergySwirlMaterial(
  tex: THREE.Texture | null,
  mode: Extract<EntityLayerDefinition["materialMode"], { kind: "energySwirl" }>,
  opacity: number,
  side: THREE.Side,
): THREE.MeshBasicMaterial {
  let map = tex ?? undefined;
  let disposeMap = false;
  if (tex) {
    map = tex.clone();
    map.magFilter = THREE.NearestFilter;
    map.minFilter = THREE.NearestFilter;
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(mode.repeat ?? 2, mode.repeat ?? 2);
    disposeMap = true;
  }
  const mat = new THREE.MeshBasicMaterial({
    map,
    transparent: true,
    alphaTest: 0.1,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
    side,
  });
  mat.userData = {
    ...mat.userData,
    energySwirl: {
      uPerSec: mode.scroll?.uPerSec ?? 0.2,
      vPerSec: mode.scroll?.vPerSec ?? 0.2,
      intensity: mode.intensity ?? 1,
    },
    disposeMap,
  } as BoneUserData;
  return mat;
}

function createStandardMaterial(
  tex: THREE.Texture | null,
  layer: EntityLayerDefinition,
  mode: EntityLayerDefinition["materialMode"],
  opacity: number,
  isAdditive: boolean,
  blending: THREE.Blending,
  hasAlpha: boolean,
  side: THREE.Side,
): THREE.MeshStandardMaterial {
  const color =
    mode?.kind === "tint"
      ? new THREE.Color(mode.color.r, mode.color.g, mode.color.b).convertSRGBToLinear()
      : new THREE.Color(1, 1, 1);

  // For cloneTexture layers (like horse markings), we need actual transparency
  // to blend with the base texture. For cemModel layers, prefer cutout rendering
  // (alphaTest) to avoid transparent sorting artifacts.
  const isCloneTexture = layer.kind === "cloneTexture";
  const needsTransparency = isAdditive || opacity < 1 || (isCloneTexture && hasAlpha);

  const mat = new THREE.MeshStandardMaterial({
    map: tex ?? undefined,
    transparent: needsTransparency,
    opacity,
    blending,
    depthWrite: !isAdditive && opacity >= 1 && !needsTransparency,
    depthTest: true,
    alphaTest: needsTransparency ? 0 : 0.1,
    color,
    emissive: isAdditive ? new THREE.Color(1, 1, 1) : new THREE.Color(0, 0, 0),
    emissiveIntensity: isAdditive ? 0.7 : 0,
    side,
  });

  // Apply polygon offset to all overlay layers to prevent z-fighting
  // and ensure proper depth ordering with base entity:
  // - positive zIndex pulls layer forward (closer to camera)
  // - negative zIndex pushes layer backward (behind base)
  mat.polygonOffset = true;
  const offset = 1 + Math.abs(layer.zIndex) / 1000;
  const dir = layer.zIndex >= 0 ? -1 : 1;
  mat.polygonOffsetFactor = dir * offset;
  mat.polygonOffsetUnits = dir * offset;

  return mat;
}

export function makeOverlayMaterial(tex: THREE.Texture | null, layer: EntityLayerDefinition, side: THREE.Side): THREE.Material {
  prepareTexture(tex);

  const opacity = layer.opacity ?? 1;
  const isAdditive = layer.blend === "additive";
  const blending = isAdditive ? THREE.AdditiveBlending : THREE.NormalBlending;
  const hasAlpha = !!tex && tex.format === THREE.RGBAFormat;
  const mode = layer.materialMode ?? { kind: "default" as const };

  if (mode.kind === "emissive") {
    return createEmissiveMaterial(tex, opacity, blending, side);
  }

  if (mode.kind === "energySwirl") {
    return createEnergySwirlMaterial(tex, mode, opacity, side);
  }

  return createStandardMaterial(tex, layer, mode, opacity, isAdditive, blending, hasAlpha, side);
}

export function applyOverlayMaterials(g: THREE.Group, tex: THREE.Texture | null, layer: EntityLayerDefinition) {
  g.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const prior = obj.material;
    const side = Array.isArray(prior) ? prior[0]?.side ?? THREE.FrontSide : prior?.side ?? THREE.FrontSide;
    obj.material = makeOverlayMaterial(tex, layer, side);
    if (Array.isArray(prior)) prior.forEach((m) => m.dispose());
    else prior?.dispose();
  });
}

export function collectEnergySwirlMaterials(g: THREE.Group, out: THREE.Material[]) {
  g.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      const userData = mat?.userData as BoneUserData;
      if (userData?.energySwirl) out.push(mat!);
    }
  });
}
