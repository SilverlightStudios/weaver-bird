/**
 * Detection logic for multi-block types
 */

export function getHalfProperty(props: Record<string, string>): string | null {
  if (props.half !== undefined) return "half";
  if (props.double_block_half !== undefined) return "double_block_half";
  return null;
}

export function isDoor(canonicalPath: string): boolean {
  return (
    canonicalPath.includes("door") && !canonicalPath.includes("trapdoor")
  );
}

export function isTrapdoor(canonicalPath: string): boolean {
  return canonicalPath.includes("trapdoor");
}

export function isStairs(canonicalPath: string): boolean {
  return canonicalPath.includes("stairs");
}

export function isBed(
  canonicalPath: string,
  part?: string,
): boolean {
  return (
    canonicalPath.includes("bed") ||
    part === "head" ||
    part === "foot"
  );
}

export function isDoublePlant(canonicalPath: string): boolean {
  return (
    canonicalPath.includes("double_plant") ||
    canonicalPath.includes("tall_grass") ||
    canonicalPath.includes("large_fern") ||
    canonicalPath.includes("rose_bush") ||
    canonicalPath.includes("peony") ||
    canonicalPath.includes("tall_seagrass")
  );
}

export function isStem(canonicalPath: string): boolean {
  return canonicalPath === "pumpkin_stem" || canonicalPath === "melon_stem";
}

export function isAttachedStem(canonicalPath: string): boolean {
  return (
    canonicalPath === "attached_pumpkin_stem" ||
    canonicalPath === "attached_melon_stem"
  );
}
