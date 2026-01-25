/**
 * Bone mapping and visibility helper functions
 */
import * as THREE from "three";

/** Apply bone visibility overrides to the bone map */
export function applyBoneVisibilityOverrides(
  baseBoneMap: Map<string, THREE.Object3D>,
  overrides: Partial<Record<string, { visible?: boolean }>>,
): void {
  const wildcard = overrides["*"];
  if (wildcard?.visible !== undefined) {
    for (const obj of baseBoneMap.values()) {
      obj.visible = wildcard.visible;
    }
  }
  for (const [boneName, props] of Object.entries(overrides)) {
    if (boneName === "*" || !props) continue;
    const obj = baseBoneMap.get(boneName);
    if (obj && props.visible !== undefined) {
      obj.visible = props.visible;
    }
  }
}

/** Build a bone map from a Three.js group */
export function buildBoneMap(group: THREE.Group): Map<string, THREE.Object3D> {
  const map = new Map<string, THREE.Object3D>();
  group.traverse((obj) => {
    if (obj instanceof THREE.Group && obj.name && obj.name !== "jem_entity") {
      map.set(obj.name, obj);
    }
  });
  return map;
}

/** Resolve base bone with fallback alias resolution */
export function resolveBaseBone(
  name: string,
  baseBones: Map<string, THREE.Object3D>,
  aliasMap: Record<string, string> | null,
): THREE.Object3D | null {
  const toCamel = (value: string) =>
    value.replace(/_([a-z0-9])/g, (_, ch: string) => ch.toUpperCase());
  const toSnake = (value: string) =>
    value.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();

  const resolveAlias = (boneName: string): THREE.Object3D | null => {
    const candidates = new Set<string>();
    candidates.add(boneName);
    if (boneName.includes("_")) candidates.add(toCamel(boneName));
    if (/[A-Z]/.test(boneName)) candidates.add(toSnake(boneName));

    for (const candidate of candidates) {
      const direct = baseBones.get(candidate);
      if (direct) return direct;
    }

    for (const candidate of candidates) {
      if (candidate === "head" || candidate === "neck" || candidate === "body") {
        const alt = baseBones.get(`${candidate}2`);
        if (alt) return alt;
      }
      if (candidate.endsWith("2")) {
        const alt = baseBones.get(candidate.slice(0, -1));
        if (alt) return alt;
      }
    }

    return null;
  };

  const commonAliases: Record<string, string> = { left_shoe: "left_leg", right_shoe: "right_leg" };
  const alias = aliasMap?.[name] ?? commonAliases[name];
  if (alias) {
    const aliased = resolveAlias(alias);
    if (aliased) return aliased;
  }
  return resolveAlias(name);
}
