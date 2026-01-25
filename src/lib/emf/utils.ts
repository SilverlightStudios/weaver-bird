import type { ParsedPart, ParsedEntityModel } from "./types";

export function indexPartsByName(parts: ParsedPart[]): Map<string, ParsedPart> {
  const map = new Map<string, ParsedPart>();
  const visit = (part: ParsedPart) => {
    map.set(part.name, part);
    for (const child of part.children) visit(child);
  };
  for (const part of parts) visit(part);
  return map;
}

export function mergeVanillaPivotsIntoAttachPlaceholders(
  parsed: ParsedEntityModel,
  vanilla: ParsedEntityModel,
): void {
  const vanillaMap = indexPartsByName(vanilla.parts);

  const apply = (part: ParsedPart) => {
    const subtreeHasBoxes = (p: ParsedPart): boolean => {
      if (p.boxes.length > 0) return true;
      for (const c of p.children) {
        if (subtreeHasBoxes(c)) return true;
      }
      return false;
    };

    // For `attach:true` models, packs often include "vanilla skeleton" placeholder
    // parts (e.g. `neck`, `tail`, `mane`) with no geometry. Their pivots are
    // defined by vanilla; using `[0,0,0]` here breaks JPM expressions that read
    // these bones (e.g. `var.Nty = neck.ty` in Fresh Animations horse).
    if (!subtreeHasBoxes(part)) {
      const vanillaPart = vanillaMap.get(part.name);
      if (vanillaPart) {
        part.origin = [...vanillaPart.origin];
        part.rotation = [...vanillaPart.rotation];
        part.scale = vanillaPart.scale;
      }
    }

    for (const child of part.children) apply(child);
  };

  for (const part of parsed.parts) apply(part);
}

export function normalizeEntityName(entityName: string): string {
  const normalizations: Record<string, string> = {
    armorstand: "armor_stand",
    polarbear: "polar_bear",
  };

  return normalizations[entityName] ?? entityName;
}

export function getJemDir(jemPath: string): string {
  const normalized = jemPath.replace(/\\/g, "/");
  const idx = normalized.lastIndexOf("/");
  if (idx === -1) return "";
  return normalized.slice(0, idx + 1);
}

export function parseVersionParts(value: string): number[] | null {
  const cleaned = value.replace(/^v/i, "").replace(/^1\./, "");
  const parts = cleaned
    .split(".")
    .map((p) => (p.match(/^\d+$/) ? parseInt(p, 10) : NaN));
  if (parts.length === 0 || parts.some((n) => Number.isNaN(n))) return null;
  return parts;
}

export function compareVersionFoldersDesc(a: string, b: string): number {
  const ap = parseVersionParts(a);
  const bp = parseVersionParts(b);
  if (!ap && !bp) return a.localeCompare(b);
  if (!ap) return 1;
  if (!bp) return -1;
  const len = Math.max(ap.length, bp.length);
  for (let i = 0; i < len; i++) {
    const av = ap[i] ?? 0;
    const bv = bp[i] ?? 0;
    if (av !== bv) return bv - av;
  }
  return 0;
}

export function getVersionFolderCandidates(
  targetVersion: string | null | undefined,
  knownFolders: string[] | undefined,
): string[] {
  const out: string[] = [];
  const add = (v: string) => {
    const trimmed = v.trim();
    if (!trimmed) return;
    if (!out.includes(trimmed)) out.push(trimmed);
  };

  if (targetVersion) {
    add(targetVersion);
    if (targetVersion.startsWith("1.")) add(targetVersion.slice(2));
    // Also add major.minor (e.g. 1.21.4 -> 21.4) if present
    const m = targetVersion.replace(/^1\./, "").match(/^(\d+\.\d+)/);
    if (m?.[1]) add(m[1]);
  }

  if (knownFolders && knownFolders.length > 0) {
    const sorted = [...knownFolders].sort(compareVersionFoldersDesc);
    for (const v of sorted) add(v);
  }

  return out;
}
