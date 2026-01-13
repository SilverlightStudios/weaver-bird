import type {
  ExtractedBlockEmission,
  ExtractedBlockEmissions,
} from "@lib/tauri";
import { getBlockEmissions as getBlockEmissionsFromTauri } from "@lib/tauri";

export interface ParticleEmission {
  particleId: string;
  condition?: string;
  /** Which method this emission comes from (determines call rate):
   * - "animateTick": ~2% per tick (random block sampling)
   * - "particleTick": 100% per tick (called every tick)
   */
  emissionSource?: string;
  /** Position expressions [x,y,z] taken from Minecraft source */
  positionExpr?: [string, string, string];
  /** Velocity expressions [vx,vy,vz] taken from Minecraft source (blocks/tick) */
  velocityExpr?: [string, string, string];
  /** Emission probability expression (e.g., "nextInt(5) == 0") */
  probabilityExpr?: string;
  /** Particle count expression (e.g., "nextInt(1) + 1") */
  countExpr?: string;
  /** Optional per-emission tint override [r,g,b] 0-255 */
  tint?: [number, number, number];
  /** Optional per-emission scale multiplier */
  scale?: number;
}

export interface BlockEmission {
  emissions: ParticleEmission[];
}

let extractedEmissionsCache: ExtractedBlockEmissions | null = null;
let extractedEmissionsLoading: Promise<ExtractedBlockEmissions | null> | null = null;

export async function initializeExtractedEmissions(): Promise<ExtractedBlockEmissions | null> {
  if (extractedEmissionsCache) return extractedEmissionsCache;
  if (extractedEmissionsLoading) return extractedEmissionsLoading;

  extractedEmissionsLoading = getBlockEmissionsFromTauri()
    .then((data) => {
      extractedEmissionsCache = data;
      return data;
    })
    .catch(() => null)
    .finally(() => {
      extractedEmissionsLoading = null;
    });

  return extractedEmissionsLoading;
}

export function setExtractedEmissions(data: ExtractedBlockEmissions): void {
  extractedEmissionsCache = data;
}

export function clearExtractedEmissionsCache(): void {
  extractedEmissionsCache = null;
  extractedEmissionsLoading = null;
}

function toCondition(condition?: string): string | undefined {
  return condition ? `${condition.toLowerCase()}=true` : undefined;
}

function toEmission(extracted: ExtractedBlockEmission): ParticleEmission {
  const opt = extracted.options ?? null;
  const tint = opt?.kind === "dust" && Array.isArray(opt.color) && opt.color.length === 3
    ? ([
        Math.round(opt.color[0] * 255),
        Math.round(opt.color[1] * 255),
        Math.round(opt.color[2] * 255),
      ] as [number, number, number])
    : undefined;

  const scale = opt?.kind === "dust" && typeof opt.scale === "number" && Number.isFinite(opt.scale)
    ? opt.scale
    : undefined;

  return {
    particleId: extracted.particleId.toLowerCase(),
    condition: toCondition(extracted.condition),
    emissionSource: extracted.emissionSource,
    positionExpr: extracted.positionExpr,
    velocityExpr: extracted.velocityExpr,
    probabilityExpr: extracted.probabilityExpr,
    countExpr: extracted.countExpr,
    tint,
    scale,
  };
}

export function getBlockEmissionsWithExtracted(blockId: string): BlockEmission | null {
  const id = blockId.replace(/^minecraft:/, "");
  const data = extractedEmissionsCache?.blocks[id];
  if (!data) return null;
  return { emissions: data.emissions.map(toEmission) };
}

// Backward-compatible alias used by components.
export const getBlockEmissions = getBlockEmissionsWithExtracted;

export function isEmissionConditionMet(
  emission: ParticleEmission,
  blockProps: Record<string, string>,
): boolean {
  if (!emission.condition) return true;
  const condition = emission.condition.trim();
  if (!condition) return true;

  const evaluatePart = (expr: string): boolean => {
    const trimmed = expr.trim();
    if (!trimmed) return true;
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
    if (trimmed.includes("=")) {
      const [key, expected] = trimmed.split("=");
      if (!key || expected === undefined) return true;
      return blockProps[key] === expected;
    }
    const key = trimmed.toLowerCase();
    return blockProps[key] === "true";
  };

  const orGroups = condition.split("||").map((group) => group.trim()).filter(Boolean);
  return orGroups.some((group) => {
    const andParts = group.split("&&").map((part) => part.trim()).filter(Boolean);
    if (andParts.length === 0) return true;
    return andParts.every((part) => evaluatePart(part));
  });
}

export function getBlocksEmittingParticle(particleId: string): string[] {
  const needle = particleId.toLowerCase();
  const result: string[] = [];

  if (!extractedEmissionsCache) return result;

  for (const [blockId, block] of Object.entries(extractedEmissionsCache.blocks)) {
    if (block.emissions.some((e) => e.particleId.toLowerCase() === needle)) {
      result.push(`minecraft:${blockId}`);
    }
  }

  return result.sort();
}
