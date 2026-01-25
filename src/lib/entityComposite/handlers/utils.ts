import type { AssetId } from "@state";

export function stripNamespace(assetId: AssetId): string {
  const idx = assetId.indexOf(":");
  return idx >= 0 ? assetId.slice(idx + 1) : assetId;
}

export function getEntityPath(assetId: AssetId): string | null {
  const path = stripNamespace(assetId);
  if (!path.startsWith("entity/")) return null;
  return path.slice("entity/".length);
}

export function getDirectEntityDirAndLeaf(entityPath: string): { dir: string; leaf: string } | null {
  const parts = entityPath.split("/");
  if (parts.length !== 2) return null;
  const dir = parts[0] ?? "";
  const leaf = parts[1] ?? "";
  if (!dir || !leaf) return null;
  return { dir, leaf };
}

export function stableUnique(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

export function titleLabel(value: string): string {
  return value
    .split("_")
    .map((word) => (word ? word[0]!.toUpperCase() + word.slice(1) : ""))
    .join(" ");
}

export function findAssetId(
  ns: string,
  pathCandidates: string[],
  all: Set<AssetId>,
): AssetId | null {
  for (const path of pathCandidates) {
    const id = `${ns}:${path}` as AssetId;
    if (all.has(id)) return id;
  }
  return null;
}

export function getToggle(state: { toggles: Record<string, boolean> }, id: string, def: boolean) {
  return state.toggles[id] ?? def;
}

export function getSelect(state: { selects: Record<string, string> }, id: string, def: string) {
  return state.selects[id] ?? def;
}
