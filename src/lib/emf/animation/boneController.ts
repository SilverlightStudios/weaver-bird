/**
 * Bone Controller for Three.js Entity Models
 *
 * Manages bone transforms for CEM animation playback.
 * Handles building bone maps and applying animation transforms.
 */

import * as THREE from "three";
import type { BoneTransform } from "./types";

// Pixels per Three.js unit (matches jemLoader.ts)
const PIXELS_PER_UNIT = 16;

// Debug flag - set to true to enable extensive logging
export const DEBUG_ANIMATIONS = true;

// Track which bones we've logged to avoid spam
const loggedBones = new Set<string>();
let frameCount = 0;

/**
 * Map of bone names to their Three.js Object3D references.
 */
export type BoneMap = Map<string, THREE.Object3D>;

/**
 * Stored base transforms for resetting bones to their original state.
 */
export interface BaseTransforms {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  visible: boolean;
}

/**
 * Map of bone names to their base (rest pose) transforms.
 */
export type BaseTransformMap = Map<string, BaseTransforms>;

/**
 * Build a map of bone names to Three.js objects from a model group.
 * Traverses the entire hierarchy to find all named groups.
 *
 * @param root The root Three.js group of the entity model
 * @returns Map of bone names to Object3D references
 */
export function buildBoneMap(root: THREE.Group): BoneMap {
  const bones: BoneMap = new Map();

  root.traverse((obj) => {
    // Only include named objects (bones/parts have names from jemLoader)
    if (obj.name && obj.name !== "jem_entity") {
      bones.set(obj.name, obj);
    }
  });

  if (DEBUG_ANIMATIONS) {
    console.log("[BoneController] Built bone map with", bones.size, "bones:");
    for (const [name, bone] of bones) {
      const parentName = bone.parent?.name || "(root)";
      console.log(
        `  - ${name}: pos=[${bone.position.x.toFixed(3)}, ${bone.position.y.toFixed(3)}, ${bone.position.z.toFixed(3)}], parent=${parentName}`
      );
    }
  }

  return bones;
}

/**
 * Store base transforms for all bones (rest pose).
 * Used to reset bones after animation or apply relative transforms.
 *
 * @param bones The bone map to store transforms from
 * @returns Map of bone names to their base transforms
 */
export function storeBaseTransforms(bones: BoneMap): BaseTransformMap {
  const baseTransforms: BaseTransformMap = new Map();

  for (const [name, bone] of bones) {
    baseTransforms.set(name, {
      position: bone.position.clone(),
      rotation: bone.rotation.clone(),
      scale: bone.scale.clone(),
      visible: bone.visible,
    });
  }

  if (DEBUG_ANIMATIONS) {
    console.log("[BoneController] Stored base transforms:");
    for (const [name, base] of baseTransforms) {
      console.log(
        `  - ${name}: base_pos=[${base.position.x.toFixed(3)}, ${base.position.y.toFixed(3)}, ${base.position.z.toFixed(3)}]`
      );
    }
  }

  return baseTransforms;
}

/**
 * Reset a bone to its base transform.
 *
 * @param bone The bone to reset
 * @param baseTransform The base transform to restore
 */
export function resetBone(
  bone: THREE.Object3D,
  baseTransform: BaseTransforms
): void {
  bone.position.copy(baseTransform.position);
  bone.rotation.copy(baseTransform.rotation);
  bone.scale.copy(baseTransform.scale);
  bone.visible = baseTransform.visible;
}

/**
 * Reset all bones to their base transforms.
 *
 * @param bones The bone map
 * @param baseTransforms The base transform map
 */
export function resetAllBones(
  bones: BoneMap,
  baseTransforms: BaseTransformMap
): void {
  for (const [name, bone] of bones) {
    const base = baseTransforms.get(name);
    if (base) {
      resetBone(bone, base);
    }
  }
}

/**
 * Apply animation transforms to a bone.
 *
 * CEM animation tx/ty/tz values are OFFSETS (in pixels) to add to the part's
 * base translate value. Since Three.js position = -translate/16, we need to
 * SUBTRACT the animation offset from the base position:
 *
 *   final_translate = base_translate + animation_offset
 *   final_position = -final_translate / 16
 *                  = -(base_translate + animation_offset) / 16
 *                  = -base_translate/16 - animation_offset/16
 *                  = base_position - animation_offset/16
 *
 * Rotations are always ADDED to base rotation.
 * Scales are always MULTIPLIED with base scale.
 *
 * @param bone The Three.js object to transform
 * @param transforms The transforms to apply
 * @param baseTransform Optional base transform for relative positioning
 * @param _parentTransforms Unused - kept for API compatibility
 */
export function applyBoneTransform(
  bone: THREE.Object3D,
  transforms: BoneTransform,
  baseTransform?: BaseTransforms,
  _parentTransforms?: BoneTransform
): void {
  const base = baseTransform;
  const boneName = bone.name;

  // Log detailed transform info (only first few frames per bone to avoid spam)
  const shouldLog = DEBUG_ANIMATIONS && !loggedBones.has(boneName);
  if (shouldLog && (transforms.tx !== undefined || transforms.ty !== undefined || transforms.tz !== undefined)) {
    frameCount++;
    if (frameCount <= 50) {
      console.log(`[BoneController] Applying transform to "${boneName}":`);
      console.log(`  Animation values: tx=${transforms.tx?.toFixed(3)}, ty=${transforms.ty?.toFixed(3)}, tz=${transforms.tz?.toFixed(3)}`);
      console.log(`  Base position: [${base?.position.x.toFixed(3)}, ${base?.position.y.toFixed(3)}, ${base?.position.z.toFixed(3)}]`);
    }
    if (frameCount === 5) {
      loggedBones.add(boneName);
    }
  }

  // Apply translations: position = base_position - animation_offset / 16
  // The SUBTRACTION is because position = -translate/16 in jemLoader
  if (transforms.tx !== undefined) {
    const newX = (base?.position.x ?? 0) - transforms.tx / PIXELS_PER_UNIT;
    if (shouldLog && frameCount <= 50) {
      console.log(`  Setting position.x = ${newX.toFixed(3)} (base ${base?.position.x?.toFixed(3)} - ${transforms.tx.toFixed(3)}/16)`);
    }
    bone.position.x = newX;
  }

  if (transforms.ty !== undefined) {
    const newY = (base?.position.y ?? 0) - transforms.ty / PIXELS_PER_UNIT;
    if (shouldLog && frameCount <= 50) {
      console.log(`  Setting position.y = ${newY.toFixed(3)} (base ${base?.position.y?.toFixed(3)} - ${transforms.ty.toFixed(3)}/16)`);
    }
    bone.position.y = newY;
  }

  if (transforms.tz !== undefined) {
    const newZ = (base?.position.z ?? 0) - transforms.tz / PIXELS_PER_UNIT;
    if (shouldLog && frameCount <= 50) {
      console.log(`  Setting position.z = ${newZ.toFixed(3)} (base ${base?.position.z?.toFixed(3)} - ${transforms.tz.toFixed(3)}/16)`);
    }
    bone.position.z = newZ;
  }

  if (shouldLog && frameCount <= 50) {
    console.log(`  Final position: [${bone.position.x.toFixed(3)}, ${bone.position.y.toFixed(3)}, ${bone.position.z.toFixed(3)}]`);
  }

  // Apply rotations (in radians, ADDED to base rotation)
  if (transforms.rx !== undefined) {
    bone.rotation.x = (base?.rotation.x ?? 0) + transforms.rx;
  }
  if (transforms.ry !== undefined) {
    bone.rotation.y = (base?.rotation.y ?? 0) + transforms.ry;
  }
  if (transforms.rz !== undefined) {
    bone.rotation.z = (base?.rotation.z ?? 0) + transforms.rz;
  }

  // Apply scale (multiplied with base scale, default 1.0)
  if (transforms.sx !== undefined) {
    bone.scale.x = (base?.scale.x ?? 1) * transforms.sx;
  }
  if (transforms.sy !== undefined) {
    bone.scale.y = (base?.scale.y ?? 1) * transforms.sy;
  }
  if (transforms.sz !== undefined) {
    bone.scale.z = (base?.scale.z ?? 1) * transforms.sz;
  }

  // Apply visibility
  if (transforms.visible !== undefined) {
    bone.visible = transforms.visible;
  }
}

/**
 * Parse a bone property string into target and property components.
 *
 * Examples:
 * - "head.rx" -> { target: "head", property: "rx" }
 * - "var.hy" -> { target: "var", property: "hy" }
 * - "render.shadow_size" -> { target: "render", property: "shadow_size" }
 *
 * @param propertyPath Full property path string
 * @returns Parsed target and property, or null if invalid
 */
export function parseBoneProperty(
  propertyPath: string
): { target: string; property: string } | null {
  const dotIndex = propertyPath.indexOf(".");
  if (dotIndex === -1) {
    return null;
  }

  return {
    target: propertyPath.substring(0, dotIndex),
    property: propertyPath.substring(dotIndex + 1),
  };
}

/**
 * Check if a property is a bone transform property.
 * Bone transforms are: tx, ty, tz, rx, ry, rz, sx, sy, sz, visible, visible_boxes
 *
 * @param property The property name to check
 * @returns True if this is a bone transform property
 */
export function isBoneTransformProperty(property: string): boolean {
  return [
    "tx",
    "ty",
    "tz",
    "rx",
    "ry",
    "rz",
    "sx",
    "sy",
    "sz",
    "visible",
    "visible_boxes",
  ].includes(property);
}

/**
 * Convert a property value to a BoneTransform object.
 *
 * @param property The property name (rx, ty, etc.)
 * @param value The numeric value
 * @returns A BoneTransform with only that property set
 */
export function createBoneTransform(
  property: string,
  value: number
): BoneTransform {
  const transform: BoneTransform = {};

  switch (property) {
    case "tx":
      transform.tx = value;
      break;
    case "ty":
      transform.ty = value;
      break;
    case "tz":
      transform.tz = value;
      break;
    case "rx":
      transform.rx = value;
      break;
    case "ry":
      transform.ry = value;
      break;
    case "rz":
      transform.rz = value;
      break;
    case "sx":
      transform.sx = value;
      break;
    case "sy":
      transform.sy = value;
      break;
    case "sz":
      transform.sz = value;
      break;
    case "visible":
      transform.visible = value !== 0;
      break;
    case "visible_boxes":
      transform.visible_boxes = value !== 0;
      break;
  }

  return transform;
}

/**
 * Merge multiple bone transforms into one.
 * Later transforms override earlier ones for the same property.
 *
 * @param transforms Array of transforms to merge
 * @returns Merged transform
 */
export function mergeBoneTransforms(
  ...transforms: BoneTransform[]
): BoneTransform {
  const result: BoneTransform = {};

  for (const transform of transforms) {
    if (transform.tx !== undefined) result.tx = transform.tx;
    if (transform.ty !== undefined) result.ty = transform.ty;
    if (transform.tz !== undefined) result.tz = transform.tz;
    if (transform.rx !== undefined) result.rx = transform.rx;
    if (transform.ry !== undefined) result.ry = transform.ry;
    if (transform.rz !== undefined) result.rz = transform.rz;
    if (transform.sx !== undefined) result.sx = transform.sx;
    if (transform.sy !== undefined) result.sy = transform.sy;
    if (transform.sz !== undefined) result.sz = transform.sz;
    if (transform.visible !== undefined) result.visible = transform.visible;
    if (transform.visible_boxes !== undefined)
      result.visible_boxes = transform.visible_boxes;
  }

  return result;
}

/**
 * Accumulated bone transforms during animation evaluation.
 * Allows multiple animation layers to contribute to bone state.
 */
export class BoneTransformAccumulator {
  private transforms: Map<string, BoneTransform> = new Map();

  /**
   * Add a transform value for a bone.
   */
  set(boneName: string, property: string, value: number): void {
    let transform = this.transforms.get(boneName);
    if (!transform) {
      transform = {};
      this.transforms.set(boneName, transform);
    }

    const partialTransform = createBoneTransform(property, value);
    Object.assign(transform, partialTransform);
  }

  /**
   * Get the accumulated transform for a bone.
   */
  get(boneName: string): BoneTransform | undefined {
    return this.transforms.get(boneName);
  }

  /**
   * Get all accumulated transforms.
   */
  getAll(): Map<string, BoneTransform> {
    return this.transforms;
  }

  /**
   * Clear all accumulated transforms.
   */
  clear(): void {
    this.transforms.clear();
  }

  /**
   * Apply all accumulated transforms to bones.
   */
  applyAll(bones: BoneMap, baseTransforms: BaseTransformMap): void {
    for (const [boneName, transform] of this.transforms) {
      const bone = bones.get(boneName);
      if (bone) {
        const base = baseTransforms.get(boneName);
        applyBoneTransform(bone, transform, base);
      }
    }
  }
}
