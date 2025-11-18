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
  const isDoor = canonicalPath.includes("door");
  if (!halfProp && isDoor) {
    halfProp = "half";
  }
  if (halfProp) {
    const hinge = blockProps.hinge ?? (isDoor ? "left" : undefined);
    const facing =
      blockProps.facing ||
      blockProps.horizontal_facing ||
      blockProps.axis ||
      (isDoor ? "south" : undefined);
    const open = blockProps.open ?? (isDoor ? "false" : undefined);

    const commonOverrides: Record<string, string> = {};
    if (hinge) commonOverrides.hinge = hinge;
    if (facing) commonOverrides.facing = facing;
    if (open) commonOverrides.open = open;

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
