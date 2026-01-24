/**
 * Entity layer cloning utilities
 */
import * as THREE from "three";
import type { EntityLayerDefinition } from "@lib/entityComposite";
import { makeOverlayMaterial } from "./entityLayerMaterials";

export function cloneGroupWithTexture(base: THREE.Group, tex: THREE.Texture | null, layer: EntityLayerDefinition): THREE.Group {
  const clone = base.clone(true);
  clone.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const prior = obj.material;
    const side = Array.isArray(prior) ? prior[0]?.side ?? THREE.FrontSide : prior?.side ?? THREE.FrontSide;
    obj.material = makeOverlayMaterial(tex, layer, side);
  });
  return clone;
}
