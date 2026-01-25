import {
    assetIdToTexturePath,
    getColormapTypeFromAssetId,
    getColormapVariantLabel,
    isBiomeColormapAsset,
} from "@lib/assetUtils";
import type { BiomeData } from "@/components/BiomeColorCard/biomeData";
import type { ColormapSourceOption } from "./types";

/**
 * Samples RGB color from imageData at given coordinates
 */
export function sampleColor(
    imageData: ImageData | null,
    x: number,
    y: number,
): { r: number; g: number; b: number } | null {
    if (!imageData) return null;
    const index = (y * imageData.width + x) * 4;
    return {
        r: imageData.data[index],
        g: imageData.data[index + 1],
        b: imageData.data[index + 2],
    };
}

/**
 * Groups biome hotspots by coordinate to deduplicate overlapping positions
 */
export function groupHotspotsByCoordinate(
    biomesWithCoords: Array<BiomeData & { x: number; y: number }>,
): Array<{
    coordKey: string;
    x: number;
    y: number;
    biomes: Array<BiomeData & { x: number; y: number }>;
}> {
    const map = new Map<
        string,
        Array<BiomeData & { x: number; y: number }>
    >();

    biomesWithCoords.forEach((biome) => {
        const key = `${biome.x},${biome.y}`;
        const existing = map.get(key);
        if (existing) {
            existing.push(biome);
        } else {
            map.set(key, [biome]);
        }
    });

    return Array.from(map.entries()).map(([coordKey, biomes]) => ({
        coordKey,
        x: biomes[0].x,
        y: biomes[0].y,
        biomes,
    }));
}

/**
 * Builds list of available colormap source options from assets and packs
 */
export function buildSourceOptions(
    assets: Record<string, { id: string }>,
    providersByAsset: Record<string, string[]>,
    packs: Record<string, { name: string }>,
    packOrder: string[],
    disabledPackIds: string[],
    assetId: string,
    resolvedType: "grass" | "foliage",
): ColormapSourceOption[] {
    const options: ColormapSourceOption[] = [];
    const seen = new Set<string>();
    const orderLookup = new Map<string, number>();
    packOrder.forEach((id, index) => orderLookup.set(id, index));
    const disabledSet = new Set(disabledPackIds);

    // Filter to only colormap assets of the correct type
    const colormapAssets = Object.values(assets).filter(
        (asset) =>
            isBiomeColormapAsset(asset.id) &&
            getColormapTypeFromAssetId(asset.id) === resolvedType,
    );

    colormapAssets.forEach((asset) => {
        const variantLabel = getColormapVariantLabel(asset.id);
        const providers = (providersByAsset[asset.id] ?? []).filter(
            (packId) => !disabledSet.has(packId),
        );

        providers.forEach((packId) => {
            const packName = packs[packId]?.name ?? packId;
            const id = `${asset.id}::${packId}`;
            if (seen.has(id)) return;
            seen.add(id);

            const priority = orderLookup.get(packId);
            options.push({
                id,
                assetId: asset.id,
                packId,
                packName,
                label: variantLabel ? `${packName} (${variantLabel})` : packName,
                variantLabel,
                relativePath: assetIdToTexturePath(asset.id),
                order: priority ?? Number.MAX_SAFE_INTEGER,
            });
        });
    });

    // Add vanilla fallback if not present
    if (
        !options.some(
            (option) =>
                option.packId === "minecraft:vanilla" && option.assetId === assetId,
        )
    ) {
        options.push({
            id: `${assetId}::minecraft:vanilla`,
            assetId,
            packId: "minecraft:vanilla",
            packName: "Minecraft (Vanilla)",
            label: "Minecraft (Vanilla)",
            variantLabel: null,
            relativePath: assetIdToTexturePath(assetId),
            order: Number.MAX_SAFE_INTEGER / 2,
        });
    }

    return options.sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        if (!!a.variantLabel !== !!b.variantLabel) {
            return a.variantLabel ? 1 : -1;
        }
        return a.label.localeCompare(b.label);
    });
}

/**
 * Selects the active colormap source based on winner pack and overrides
 */
export function selectActiveSource(
    sourceOptions: ColormapSourceOption[],
    assetId: string,
    winnerPackId: string | undefined,
    overrideVariantPath: string | undefined,
): ColormapSourceOption | null {
    if (!sourceOptions.length) return null;
    if (!winnerPackId) {
        return sourceOptions[0];
    }

    if (overrideVariantPath) {
        const variantMatch = sourceOptions.find(
            (option) =>
                option.packId === winnerPackId &&
                option.relativePath === overrideVariantPath,
        );
        if (variantMatch) {
            return variantMatch;
        }
    }

    const directMatch = sourceOptions.find(
        (option) => option.packId === winnerPackId && option.assetId === assetId,
    );
    if (directMatch) {
        return directMatch;
    }

    return (
        sourceOptions.find((option) => option.packId === winnerPackId) ??
        sourceOptions[0]
    );
}
