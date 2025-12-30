import { beautifyAssetName } from "@lib/assetUtils";
import type { AssetItem } from "./types";

/**
 * Determines if an asset needs grass tinting
 */
export function needsGrassTint(assetId: string): boolean {
    return (
        assetId.includes("grass") ||
        assetId.includes("fern") ||
        assetId.includes("tall_grass") ||
        assetId.includes("sugar_cane")
    );
}

/**
 * Determines if an asset needs foliage tinting
 */
export function needsFoliageTint(assetId: string): boolean {
    return (
        assetId.includes("leaves") ||
        assetId.includes("vine") ||
        assetId.includes("oak_leaves") ||
        assetId.includes("spruce_leaves") ||
        assetId.includes("birch_leaves") ||
        assetId.includes("jungle_leaves") ||
        assetId.includes("acacia_leaves") ||
        assetId.includes("dark_oak_leaves") ||
        assetId.includes("mangrove_leaves") ||
        assetId.includes("cherry_leaves")
    );
}

/**
 * Generates a display name for an asset with special handling for
 * paintings, pottery shards, and entity decorated pots
 */
export function generateDisplayName(asset: AssetItem): string {
    const baseName = asset.name || beautifyAssetName(asset.id);

    // Special handling for paintings: show "Painting - Name" instead of just "Painting"
    const path = asset.id.includes(":") ? asset.id.split(":")[1] : asset.id;
    if (path.startsWith("painting/")) {
        const paintingName = path.replace("painting/", "");
        const formattedPaintingName = paintingName
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
        return `Painting - ${formattedPaintingName}`;
    }

    // Special handling for pottery shards: show "Pottery Shard - Type" instead of just "Pottery Shard"
    if (path.startsWith("item/pottery_shard_")) {
        const shardType = path.replace("item/pottery_shard_", "");
        const formattedShardType = shardType
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
        return `Pottery Shard - ${formattedShardType}`;
    }

    // Special handling for entity decorated pot textures: show "Pattern - Decorated Pot"
    if (path.startsWith("entity/decorated_pot/")) {
        const patternName = path
            .replace("entity/decorated_pot/", "")
            .replace(/\.png$/, "")
            .replace(/_pottery_pattern$/, ""); // Remove "_pottery_pattern" suffix
        const formattedPatternName = patternName
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
        return `${formattedPatternName} - Decorated Pot`;
    }

    // Special handling for entity textures (signs, etc.)
    if (path.startsWith("entity/")) {
        // Remove entity/ prefix
        const entityPath = path.replace("entity/", "");

        if (entityPath === "banner_base" || entityPath.startsWith("banner/")) {
            return "Banner";
        }

        // Handle different entity types
        if (entityPath.startsWith("signs/")) {
            // signs/hanging/birch -> Birch Hanging Sign
            // signs/oak -> Oak Sign  
            const parts = entityPath.replace("signs/", "").split("/");
            let woodType = "";
            let signType = "Sign";

            if (parts.length === 2) {
                // hanging/birch or wall/oak
                signType = parts[0].charAt(0).toUpperCase() + parts[0].slice(1) + " Sign";
                woodType = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
            } else {
                // oak (regular standing sign)
                woodType = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
            }

            return `${woodType} ${signType}`;
        }

        // Generic entity handling:
        // - Prefer an explicit grouped name (e.g., "Boat", "Bed", "Cat") when provided.
        // - Otherwise fall back to the leaf name (e.g., "Oak", "Red").
        const entityName = entityPath
            .split("/").pop()! // Get last segment
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");

        if (asset.name && asset.name !== entityName) {
            return asset.name;
        }

        return entityName;
    }

    return baseName;
}

/**
 * Helper to get winning pack for an asset based on overrides and pack order
 */
export function getWinningPack(
    assetId: string,
    winners: Record<string, { packId: string } | undefined>,
    providersByAsset: Record<string, string[]>,
    packOrder: string[],
    disabledSet: Set<string>,
): string | undefined {
    // Check if asset is penciled to a specific pack
    const override = winners[assetId];
    if (override && !disabledSet.has(override.packId)) {
        return override.packId;
    }

    // Otherwise, get first provider in pack order
    const providers = (providersByAsset[assetId] ?? []).filter(
        (packId) => !disabledSet.has(packId),
    );
    if (providers.length === 0) return undefined;

    const sorted = [...providers].sort(
        (a, b) => packOrder.indexOf(a) - packOrder.indexOf(b),
    );
    return sorted[0];
}
