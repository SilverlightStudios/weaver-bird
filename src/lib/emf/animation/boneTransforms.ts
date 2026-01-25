import type { BoneTransform } from "./types";

export function parseBoneProperty(
  propertyPath: string,
): { target: string; property: string } | null {
  const dotIndex = propertyPath.indexOf(".");
  if (dotIndex < 0) return null;
  return {
    target: propertyPath.slice(0, dotIndex),
    property: propertyPath.slice(dotIndex + 1),
  };
}

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

export function createBoneTransform(
  property: string,
  value: number,
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

export class BoneTransformAccumulator {
  private transforms: Map<string, BoneTransform> = new Map();

  set(boneName: string, property: string, value: number): void {
    let transform = this.transforms.get(boneName);
    if (!transform) {
      transform = {};
      this.transforms.set(boneName, transform);
    }

    const partialTransform = createBoneTransform(property, value);
    Object.assign(transform, partialTransform);
  }

  get(boneName: string): BoneTransform | undefined {
    return this.transforms.get(boneName);
  }

  getAll(): Map<string, BoneTransform> {
    return this.transforms;
  }

  clear(): void {
    this.transforms.clear();
  }
}
