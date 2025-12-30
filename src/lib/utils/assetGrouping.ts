/**
 * Shared Asset Grouping Logic
 *
 * Used by both the main thread (sync fallback) and Web Worker.
 */

import {
    beautifyAssetName,
    getVariantGroupKey,
    isNumberedVariant,
} from "../assetUtils";
import { allLeavesInSet, CAT_SKIN_IDS, DYE_COLOR_IDS, WOOD_TYPE_IDS } from "../entityVariants";

export interface AssetGroup {
    baseId: string; // The primary/base asset ID (without number suffix)
    variantIds: string[]; // All variants including the base
    displayName: string; // Pre-computed beautified name
}

function stripNamespace(assetId: string): string {
    const idx = assetId.indexOf(":");
    return idx >= 0 ? assetId.slice(idx + 1) : assetId;
}

function getEntityDirAndLeaf(path: string): { dir: string; leaf: string } | null {
    if (!path.startsWith("entity/")) return null;
    const rest = path.slice("entity/".length);
    const parts = rest.split("/");
    if (parts.length !== 2) return null;
    const dir = parts[0] ?? "";
    const leaf = parts[1] ?? "";
    if (!dir || !leaf) return null;
    return { dir, leaf };
}

function getEntityAliasGroupKey(path: string): string | null {
    // Banners have two canonical "base" texture IDs depending on version:
    // - entity/banner/base
    // - entity/banner_base
    // Group them into a single resource card.
    if (path === "entity/banner_base" || path.startsWith("entity/banner/")) {
        return "entity/banner";
    }
    // Fox textures encode multiple states in a single folder (snow/sleep).
    // Group them into a single resource card.
    if (path.startsWith("entity/fox/")) {
        return "entity/fox";
    }
    // Llama fur colors are stored as multiple textures in `entity/llama/*`
    // (creamy/white/etc). Group them into a single resource card.
    if (path.startsWith("entity/llama/")) {
        return "entity/llama";
    }
    // Horses store multiple coat textures inside the `entity/horse/` folder,
    // alongside *other* entities (donkey/mule). Only group the `horse_*` coats.
    if (path.startsWith("entity/horse/horse_")) {
        return "entity/horse";
    }
    // Decorated pots have many texture variants in a dedicated directory
    // (pottery pattern masks). Group them into a single resource card.
    if (path.startsWith("entity/decorated_pot/")) {
        return "entity/decorated_pot";
    }
    return null;
}

function isEntityVariantLeaf(dir: string, leaf: string): boolean {
    return (
        leaf === dir ||
        leaf.startsWith(`${dir}_`) ||
        leaf.endsWith(`_${dir}`)
    );
}

function isEntityVariantDirectory(dir: string, leaves: string[]): boolean {
    if (leaves.length < 2) return false;

    // "Pure" <dir>_* or *_<dir> directories (axolotl/frog/shulker/etc).
    if (leaves.every((leaf) => isEntityVariantLeaf(dir, leaf))) return true;

    // Dye/wood "material" directories (beds, boats, etc).
    if (allLeavesInSet(leaves, DYE_COLOR_IDS)) return true;
    if (allLeavesInSet(leaves, WOOD_TYPE_IDS)) return true;

    // Cat skins use leaf-only names in `entity/cat/<skin>`.
    if (dir === "cat" && allLeavesInSet(leaves, CAT_SKIN_IDS)) return true;

    return false;
}

/**
 * Group assets by their variant group key
 * Returns an array of asset groups with pre-computed display names
 */
export function groupAssetsByVariant(assetIds: string[]): AssetGroup[] {
    const groups = new Map<string, string[]>();

    // ---------------------------------------------------------------------
    // Entity variant "directories"
    //
    // Some entities store multiple base skins in a single directory, where
    // every filename is a variant of the same entity:
    //   - entity/axolotl/axolotl_blue, axolotl_lucy, ...
    //   - entity/frog/temperate_frog, warm_frog, ...
    //
    // This detection is intentionally conservative: we only treat a directory
    // as a variant-family when *all* direct child textures match the
    // "<dir>_*" or "*_<dir>" convention (or equal "<dir>").
    // ---------------------------------------------------------------------
    const entityDirToLeaves = new Map<string, string[]>();
    for (const assetId of assetIds) {
        const path = stripNamespace(assetId).replace(/\.png$/i, "");
        const entity = getEntityDirAndLeaf(path);
        if (!entity) continue;
        const list = entityDirToLeaves.get(entity.dir) ?? [];
        list.push(entity.leaf);
        entityDirToLeaves.set(entity.dir, list);
    }

    const entityVariantDirs = new Set<string>();
    for (const [dir, leaves] of entityDirToLeaves.entries()) {
        if (isEntityVariantDirectory(dir, leaves)) {
            entityVariantDirs.add(dir);
        }
    }

    // Group all assets by their variant group key
    for (const assetId of assetIds) {
        const path = stripNamespace(assetId).replace(/\.png$/i, "");
        const entity = getEntityDirAndLeaf(path);
        const entityAliasGroupKey = getEntityAliasGroupKey(path);

        const groupKey =
            entityAliasGroupKey ??
            ((entity && entityVariantDirs.has(entity.dir))
                ? `entity/${entity.dir}`
                : getVariantGroupKey(assetId));

        const existing = groups.get(groupKey) || [];
        existing.push(assetId);
        groups.set(groupKey, existing);
    }

    // Convert to array of AssetGroup objects
    const result: AssetGroup[] = [];
    for (const [baseId, variantIds] of groups.entries()) {
        // Sort variants: base first (no number), then by number
        const sorted = variantIds.sort((a, b) => {
            const structuralPriority = (id: string) => {
                if (/_bottom|_lower|_foot/.test(id)) return 0;
                if (/_top|_upper|_head/.test(id)) return 1;
                return 0;
            };

            const aStructural = structuralPriority(a);
            const bStructural = structuralPriority(b);
            if (aStructural !== bStructural) {
                return aStructural - bStructural;
            }

            const aIsNumbered = isNumberedVariant(a);
            const bIsNumbered = isNumberedVariant(b);

            if (!aIsNumbered && bIsNumbered) return -1;
            if (aIsNumbered && !bIsNumbered) return 1;

            // Both are numbered, sort numerically
            const aNum = parseInt(a.match(/(\d+)$/)?.[1] || "0");
            const bNum = parseInt(b.match(/(\d+)$/)?.[1] || "0");
            if (aNum !== bNum) return aNum - bNum;

            // Stable fallback for non-numbered or equal-number variants
            return a.localeCompare(b);
        });

        // Pre-compute the display name for the base ID
        const displayName = beautifyAssetName(baseId);

        result.push({ baseId, variantIds: sorted, displayName });
    }

    return result;
}
