/**
 * Resource management helper functions
 */
import * as THREE from "three";
import type { BoneUserData } from "@/lib/emf/types";
import type { LayerGroupEntry } from "../types";

/** Build version folder candidates for texture/model resolution */
export function buildVersionFolderCandidates(
  targetVersion: string | null | undefined,
  knownFolders: string[] | undefined,
): string[] {
  const out: string[] = [];
  const add = (v: string) => {
    const trimmed = v.trim().replace(/^\/+|\/+$/g, "");
    if (trimmed && !out.includes(trimmed)) out.push(trimmed);
  };

  if (targetVersion) {
    add(targetVersion);
    if (targetVersion.startsWith("1.")) add(targetVersion.slice(2));
    const m = targetVersion.replace(/^1\./, "").match(/^(\d+\.\d+)/);
    if (m?.[1]) add(m[1]);

    // Fresh Animations uses dashed version folders (e.g. `21-5`)
    for (const v of [...out]) {
      add(v.replace(/\./g, "-"));
    }
  }

  if (knownFolders?.length) {
    for (const v of knownFolders) add(v);
  }

  return out;
}

/** Dispose materials from a group (reusable geometry) */
export function disposeGroupMaterials(group: THREE.Group): void {
  group.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const disposeMat = (mat: THREE.Material | null | undefined) => {
      if (!mat) return;
      const userData = mat.userData as BoneUserData;
      const meshMat = mat as THREE.MeshStandardMaterial;
      if (userData?.disposeMap && meshMat.map instanceof THREE.Texture) {
        meshMat.map.dispose();
      }
      mat.dispose();
    };
    if (Array.isArray(obj.material)) obj.material.forEach(disposeMat);
    else disposeMat(obj.material);
  });
}

/** Fully dispose a group (geometry + materials) */
export function disposeGroupAll(group: THREE.Group): void {
  group.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.geometry?.dispose();
    const disposeMat = (mat: THREE.Material | null | undefined) => {
      if (!mat) return;
      const userData = mat.userData as BoneUserData;
      const meshMat = mat as THREE.MeshStandardMaterial;
      if (userData?.disposeMap && meshMat.map instanceof THREE.Texture) {
        meshMat.map.dispose();
      }
      mat.dispose();
    };
    if (Array.isArray(obj.material)) obj.material.forEach(disposeMat);
    else disposeMat(obj.material);
  });
}

/** Normalize a JEM texture path to asset ID format */
export function normalizeJemTextureId(jemTex: string): string {
  let namespace = "minecraft";
  let path = jemTex.replace(/\\/g, "/");
  if (path.includes(":")) {
    const split = path.split(":");
    namespace = split[0] || namespace;
    path = split.slice(1).join(":");
  }
  if (path.startsWith("textures/")) {
    path = path.slice("textures/".length);
  }
  path = path.replace(/\.png$/i, "");
  return `${namespace}:${path}`;
}

/** Clean up layer groups */
export function cleanupLayerGroups(layers: LayerGroupEntry[]): void {
  for (const layer of layers) {
    if (layer.dispose === "materials") disposeGroupMaterials(layer.group);
    else disposeGroupAll(layer.group);
  }
}
