import { getBlockStateIdFromAssetId } from "./assetUtils";

export interface MultiBlockPart {
  offset: [number, number, number];
  overrides?: Record<string, string>;
}

const directionOffsets: Record<string, [number, number, number]> = {
  north: [0, 0, -1],
  south: [0, 0, 1],
  west: [-1, 0, 0],
  east: [1, 0, 0],
};

function getHalfProperty(props: Record<string, string>): string | null {
  if (props.half !== undefined) return "half";
  if (props.double_block_half !== undefined) return "double_block_half";
  return null;
}

export function getMultiBlockParts(
  assetId: string,
  blockProps: Record<string, string>,
): MultiBlockPart[] | null {
  const canonicalPath = getBlockStateIdFromAssetId(assetId)
    .replace(/^[^:]+:block\//, "")
    .toLowerCase();

  let halfProp = getHalfProperty(blockProps);
  const isDoor = canonicalPath.includes("door") && !canonicalPath.includes("trapdoor");
  const isTrapdoor = canonicalPath.includes("trapdoor");

  // Trapdoors are single-block items - they should NOT be treated as multi-blocks
  // Their "half" property indicates where in the block space they sit (top/bottom),
  // not that they are part of a multi-block structure
  if (isTrapdoor) {
    return null;
  }

  if (!halfProp && isDoor) {
    halfProp = "half";
  }

  // Only treat as multi-block for actual doors (not trapdoors)
  if (halfProp && isDoor) {
    const hinge = blockProps.hinge ?? "left";
    const facing =
      blockProps.facing ||
      blockProps.horizontal_facing ||
      blockProps.axis ||
      "south";
    const open = blockProps.open ?? "false";

    const commonOverrides: Record<string, string> = {};
    commonOverrides.hinge = hinge;
    commonOverrides.facing = facing;
    commonOverrides.open = open;

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

  // For other blocks with half property (like tall plants), only create multi-block
  // if the block explicitly has the half property set
  if (halfProp && !isDoor) {
    const facing =
      blockProps.facing ||
      blockProps.horizontal_facing ||
      blockProps.axis;

    const commonOverrides: Record<string, string> = {};
    if (facing) commonOverrides.facing = facing;

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

  // Handle beds - they use the "part" property with values "head" or "foot"
  const part = blockProps.part?.toLowerCase();

  // If the block path includes "bed" and we have part info, it's definitely a bed
  const isBed = canonicalPath.includes("bed");

  if (isBed || part === "head" || part === "foot") {
    const facing =
      blockProps.facing ||
      blockProps.horizontal_facing ||
      blockProps.axis ||
      "south";
    const offset =
      directionOffsets[facing.toLowerCase()] ?? directionOffsets.south;

    // The head is offset in the facing direction from the foot
    return [
      { offset: [0, 0, 0], overrides: { part: "foot", facing } },
      { offset, overrides: { part: "head", facing } },
    ];
  }

  if (
    canonicalPath.includes("double_plant") ||
    canonicalPath.includes("tall_grass") ||
    canonicalPath.includes("large_fern") ||
    canonicalPath.includes("rose_bush") ||
    canonicalPath.includes("peony")
  ) {
    return [
      { offset: [0, 0, 0], overrides: { half: "lower" } },
      { offset: [0, 1, 0], overrides: { half: "upper" } },
    ];
  }

  return null;
}
