import { useSelectWinner, useSelectPack, useSelectPacksDir } from "@state/selectors";
import { getVariantGroupKey } from "@lib/assetUtils";
import { resolvePackForRendering } from "./utils";

export function usePackResolution(assetId: string, forcedPackId?: string) {
  // Get the winning pack using the ORIGINAL asset ID (state stores original IDs)
  const storeWinnerPackId = useSelectWinner(assetId);

  // For numbered variants (e.g., "acacia_planks1"), also check the base asset
  const variantGroupKey = getVariantGroupKey(assetId);
  const baseAssetId = assetId.startsWith("minecraft:")
    ? `minecraft:block/${variantGroupKey}`
    : variantGroupKey;
  const baseWinnerPackId = useSelectWinner(baseAssetId);

  // Use the variant's winner if available, otherwise fall back to base asset's winner
  const effectiveWinnerPackId = storeWinnerPackId ?? baseWinnerPackId;

  const storeWinnerPack = useSelectPack(effectiveWinnerPackId ?? "");
  const forcedPackMeta = useSelectPack(forcedPackId ?? "");
  const vanillaPack = useSelectPack("minecraft:vanilla");
  const packsDirPath = useSelectPacksDir();

  const resolvedPackId =
    forcedPackId ?? effectiveWinnerPackId ?? (vanillaPack ? "minecraft:vanilla" : undefined);

  const resolvedPack = resolvePackForRendering(
    forcedPackId,
    forcedPackMeta,
    storeWinnerPackId,
    storeWinnerPack,
    vanillaPack,
  );

  return {
    resolvedPackId,
    resolvedPack,
    packsDirPath,
  };
}
