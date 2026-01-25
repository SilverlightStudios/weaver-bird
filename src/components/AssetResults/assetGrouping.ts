import { isInventoryVariant } from "@lib/assetUtils";
import { assetGroupingWorker } from "@lib/assetGroupingWorker";
import { assetMatchesQuery } from "@lib/searchUtils";
import {
  categorizeVariants,
  pickVariant,
  selectIdWithSmartMatching,
  selectDisplayIdWithSmartMatching,
  applySpecialCaseOverrides,
  calculateVariantCount,
} from "./assetGroupingHelpers";

export interface GroupedAsset {
  id: string;
  displayId: string;
  name: string;
  variantCount: number;
  allVariants: string[];
}

interface Asset {
  id: string;
  labels: string[];
}

export async function groupAndFilterAssets(
  assets: Asset[],
  searchQuery: string,
  getWinningPackForAsset: (assetId: string) => string | undefined,
): Promise<GroupedAsset[]> {
  const assetIds = assets.map((a) => a.id);
  const labelsById = new Map(assets.map((asset) => [asset.id, asset.labels]));

  const groups = await assetGroupingWorker.groupAssets(assetIds);

  const grassBlockGroups = groups.filter((g) =>
    g.baseId.includes("grass_block"),
  );
  if (grassBlockGroups.length > 0) {
    console.log(
      "[AssetResults] Grass block groups BEFORE search filtering:",
      grassBlockGroups,
    );
  }

  const queryFilteredGroups = searchQuery
    ? groups.filter((group) =>
        group.variantIds.some((variantId) => {
          const labels = labelsById.get(variantId) ?? [];
          return assetMatchesQuery(variantId, labels, searchQuery);
        }),
      )
    : groups;

  const grassBlockFiltered = queryFilteredGroups.filter((g) =>
    g.baseId.includes("grass_block"),
  );
  if (grassBlockFiltered.length > 0) {
    console.log(
      "[AssetResults] Grass block groups AFTER search filtering:",
      grassBlockFiltered,
    );
  }

  return queryFilteredGroups.map((group) => {
    const { blockVariants, itemVariants, otherVariants } =
      categorizeVariants(group.variantIds);

    const baseBlockPath =
      group.baseId.startsWith("block/") ? group.baseId : undefined;
    const baseItemPath = baseBlockPath
      ? `item/${baseBlockPath.slice("block/".length)}`
      : group.baseId.startsWith("item/")
        ? group.baseId
        : undefined;

    const blockPrimaryId = pickVariant(blockVariants, baseBlockPath);
    const itemPrimaryId = pickVariant(itemVariants, baseItemPath);

    const selectionId = selectIdWithSmartMatching(
      searchQuery,
      group,
      blockVariants,
      itemVariants,
      blockPrimaryId,
      itemPrimaryId,
    );

    const inventoryVariant = group.variantIds.find((id) =>
      isInventoryVariant(id),
    );

    let displayId = selectDisplayIdWithSmartMatching(
      searchQuery,
      group,
      blockVariants,
      itemVariants,
      otherVariants,
      itemPrimaryId,
      inventoryVariant,
      selectionId,
    );

    displayId = applySpecialCaseOverrides(displayId, group);

    const variantCount = calculateVariantCount(
      blockPrimaryId,
      blockVariants,
      group.variantIds,
      getWinningPackForAsset,
    );

    return {
      id: selectionId,
      displayId,
      name: group.displayName,
      variantCount,
      allVariants: [...blockVariants, ...itemVariants, ...otherVariants],
    };
  });
}
