import { normalizeAssetId } from "./assetUtils";

export type MinecartCargoSpec = {
  kind: "block" | "entity";
  assetId: string;
  blockProps?: Record<string, string>;
  entityTypeOverride?: string;
  parentEntityOverride?: string | null;
};

export type MinecartCompositeSpec = {
  entityTypeOverride?: string;
  cargo?: MinecartCargoSpec;
};

const MINECART_CARGO_BY_KIND: Record<
  string,
  { kind: MinecartCargoSpec["kind"]; path: string }
> = {
  chest: { kind: "entity", path: "entity/chest/normal" },
  hopper: { kind: "block", path: "block/hopper" },
  tnt: { kind: "block", path: "block/tnt" },
  furnace: { kind: "block", path: "block/furnace" },
  command_block: { kind: "block", path: "block/command_block" },
};

export function resolveMinecartCompositeSpec(
  assetId: string | undefined,
  allAssetIds: string[],
): MinecartCompositeSpec | null {
  if (!assetId) return null;

  const normalized = normalizeAssetId(assetId);
  const [rawNamespace, rawPath] = normalized.includes(":")
    ? normalized.split(":")
    : ["minecraft", normalized];
  const namespace = rawNamespace || "minecraft";
  const path = rawPath ?? "";

  if (!path.startsWith("item/")) return null;

  const baseName = path.slice("item/".length);
  if (!baseName.endsWith("_minecart")) return null;

  const cartKind = baseName.replace(/_minecart$/, "");

  const normalizedAll = allAssetIds.map(normalizeAssetId);
  const allSet = new Set(normalizedAll);

  const findByPath = (targetPath: string): string | null => {
    const preferred = normalizeAssetId(`${namespace}:${targetPath}`);
    if (allSet.has(preferred)) return preferred;
    const fallback = normalizedAll.find(
      (id) => id.split(":")[1] === targetPath,
    );
    return fallback ?? null;
  };

  const findByPrefix = (targetPrefix: string): string | null => {
    const preferredPrefix = normalizeAssetId(`${namespace}:${targetPrefix}`);
    const preferredMatch = normalizedAll.find((id) =>
      id.startsWith(preferredPrefix),
    );
    if (preferredMatch) return preferredMatch;
    const fallbackMatch = normalizedAll.find((id) =>
      id.split(":")[1]?.startsWith(targetPrefix),
    );
    return fallbackMatch ?? null;
  };

  const baseSpec = MINECART_CARGO_BY_KIND[cartKind];
  if (baseSpec) {
    const assetPath =
      baseSpec.kind === "entity"
        ? findByPath(baseSpec.path) ?? findByPrefix("entity/chest/")
        : findByPath(baseSpec.path);
    if (assetPath) {
      return {
        entityTypeOverride: baseName,
        cargo: {
          kind: baseSpec.kind,
          assetId: assetPath,
        },
      };
    }
    return { entityTypeOverride: baseName };
  }

  const fallbackBlock = findByPath(`block/${cartKind}`);
  if (fallbackBlock) {
    return {
      entityTypeOverride: baseName,
      cargo: {
        kind: "block",
        assetId: fallbackBlock,
      },
    };
  }

  return { entityTypeOverride: baseName };
}
