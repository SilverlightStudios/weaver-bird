/**
 * Individual handlers for different multi-block types
 */

import type { MultiBlockPart } from "./multiBlockConfig";

const directionOffsets: Record<string, [number, number, number]> = {
  north: [0, 0, -1],
  south: [0, 0, 1],
  west: [-1, 0, 0],
  east: [1, 0, 0],
};

const stemOffsets: Record<string, [number, number, number]> = {
  north: [0, 0, 1],
  south: [0, 0, -1],
  west: [-1, 0, 0],
  east: [1, 0, 0],
};

export function handleDoor(
  halfProp: string,
  blockProps: Record<string, string>,
): MultiBlockPart[] {
  const hinge = blockProps.hinge ?? "left";
  const facing = blockProps.facing ?? blockProps.horizontal_facing ?? "north";
  const open = blockProps.open ?? "false";

  const commonOverrides: Record<string, string> = {
    hinge,
    facing,
    open,
  };

  return [
    {
      offset: [0, 0, 0],
      overrides: { ...commonOverrides, [halfProp]: "lower" },
    },
    {
      offset: [0, 1, 0],
      overrides: { ...commonOverrides, [halfProp]: "upper" },
    },
  ];
}

export function handleDoubleBlockHalf(): MultiBlockPart[] {
  return [
    { offset: [0, 0, 0], overrides: { double_block_half: "lower" } },
    { offset: [0, 1, 0], overrides: { double_block_half: "upper" } },
  ];
}

export function handleBed(blockProps: Record<string, string>): MultiBlockPart[] {
  const facing =
    blockProps.facing ||
    blockProps.horizontal_facing ||
    blockProps.axis ||
    "south";
  const offset = directionOffsets[facing.toLowerCase()] ?? directionOffsets.north;

  return [
    { offset: [0, 0, 0], overrides: { part: "foot", facing } },
    { offset, overrides: { part: "head", facing } },
  ];
}

export function handleDoublePlant(): MultiBlockPart[] {
  return [
    { offset: [0, 0, 0], overrides: { half: "lower" } },
    { offset: [0, 1, 0], overrides: { half: "upper" } },
  ];
}

export function handleStem(
  assetId: string,
  canonicalPath: string,
  blockProps: Record<string, string>,
): MultiBlockPart[] | null {
  const age = parseInt(blockProps.age ?? "0", 10);
  const isFinalAge = Number.isFinite(age) && age >= 7;
  if (!isFinalAge || blockProps.ripe !== "true") {
    return null;
  }

  const facing = blockProps.facing ?? blockProps.horizontal_facing ?? "north";
  const offset = stemOffsets[facing.toLowerCase()] ?? stemOffsets.north;
  const namespaceMatch = assetId.match(/^([^:]+):/);
  const namespace = namespaceMatch ? namespaceMatch[1] : "minecraft";
  const fruit = canonicalPath === "pumpkin_stem" ? "pumpkin" : "melon";

  return [
    {
      offset: [0, 0, 0],
      assetId: `${namespace}:block/attached_${fruit}_stem`,
      overrides: { facing },
    },
    {
      offset,
      assetId: `${namespace}:block/${fruit}`,
    },
  ];
}

export function handleAttachedStem(
  assetId: string,
  canonicalPath: string,
  blockProps: Record<string, string>,
): MultiBlockPart[] {
  const facing = blockProps.facing ?? blockProps.horizontal_facing ?? "north";
  const offset = stemOffsets[facing.toLowerCase()] ?? stemOffsets.north;
  const namespaceMatch = assetId.match(/^([^:]+):/);
  const namespace = namespaceMatch ? namespaceMatch[1] : "minecraft";
  const fruit = canonicalPath === "attached_pumpkin_stem" ? "pumpkin" : "melon";

  return [
    { offset: [0, 0, 0], overrides: { facing } },
    {
      offset,
      assetId: `${namespace}:block/${fruit}`,
    },
  ];
}
