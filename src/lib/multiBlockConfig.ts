import { getBlockStateIdFromAssetId } from "./assetUtils";
import {
  getHalfProperty,
  isDoor,
  isTrapdoor,
  isStairs,
  isBed,
  isDoublePlant,
  isStem,
  isAttachedStem,
} from "./multiBlockDetection";
import {
  handleDoor,
  handleDoubleBlockHalf,
  handleBed,
  handleDoublePlant,
  handleStem,
  handleAttachedStem,
} from "./multiBlockHandlers";

export interface MultiBlockPart {
  offset: [number, number, number];
  assetId?: string;
  overrides?: Record<string, string>;
}

export function getMultiBlockParts(
  assetId: string,
  blockProps: Record<string, string>,
): MultiBlockPart[] | null {
  const canonicalPath = getBlockStateIdFromAssetId(assetId)
    .replace(/^[^:]+:block\//, "")
    .toLowerCase();

  // Trapdoors and stairs are single-block items
  if (isTrapdoor(canonicalPath) || isStairs(canonicalPath)) {
    return null;
  }

  let halfProp = getHalfProperty(blockProps);
  const doorCheck = isDoor(canonicalPath);

  // Default to "half" property for doors if not specified
  if (!halfProp && doorCheck) {
    halfProp = "half";
  }

  // Handle doors
  if (halfProp && doorCheck) {
    return handleDoor(halfProp, blockProps);
  }

  // Handle double-height blocks with explicit property
  if (halfProp === "double_block_half" && !doorCheck) {
    return handleDoubleBlockHalf();
  }

  // Handle beds
  const part = blockProps.part?.toLowerCase();
  if (isBed(canonicalPath, part)) {
    return handleBed(blockProps);
  }

  // Handle double plants
  if (isDoublePlant(canonicalPath)) {
    return handleDoublePlant();
  }

  // Handle stems
  if (isStem(canonicalPath)) {
    return handleStem(assetId, canonicalPath, blockProps);
  }

  // Handle attached stems
  if (isAttachedStem(canonicalPath)) {
    return handleAttachedStem(assetId, canonicalPath, blockProps);
  }

  return null;
}
