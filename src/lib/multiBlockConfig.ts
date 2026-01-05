import { getBlockStateIdFromAssetId } from "./assetUtils";

export interface MultiBlockPart {
  offset: [number, number, number];
  assetId?: string;
  overrides?: Record<string, string>;
}

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
  const isDoor =
    canonicalPath.includes("door") && !canonicalPath.includes("trapdoor");
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
      blockProps.facing || blockProps.horizontal_facing || "north";
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
      blockProps.facing || blockProps.horizontal_facing || blockProps.axis;

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
      directionOffsets[facing.toLowerCase()] ?? directionOffsets.north;

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
    canonicalPath.includes("peony") ||
    canonicalPath.includes("tall_seagrass")
  ) {
    return [
      { offset: [0, 0, 0], overrides: { half: "lower" } },
      { offset: [0, 1, 0], overrides: { half: "upper" } },
    ];
  }

  if (canonicalPath === "pumpkin_stem" || canonicalPath === "melon_stem") {
    const age = parseInt(blockProps.age ?? "0", 10);
    const isFinalAge = Number.isFinite(age) && age >= 7;
    if (!isFinalAge || blockProps.ripe !== "true") {
      return null;
    }

    const facing =
      blockProps.facing || blockProps.horizontal_facing || "north";
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

  if (
    canonicalPath === "attached_pumpkin_stem" ||
    canonicalPath === "attached_melon_stem"
  ) {
    const facing =
      blockProps.facing || blockProps.horizontal_facing || "north";
    const offset = stemOffsets[facing.toLowerCase()] ?? stemOffsets.north;
    const namespaceMatch = assetId.match(/^([^:]+):/);
    const namespace = namespaceMatch ? namespaceMatch[1] : "minecraft";
    const fruit =
      canonicalPath === "attached_pumpkin_stem" ? "pumpkin" : "melon";

    return [
      { offset: [0, 0, 0], overrides: { facing } },
      {
        offset,
        assetId: `${namespace}:block/${fruit}`,
      },
    ];
  }

  return null;
}
