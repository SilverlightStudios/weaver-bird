/**
 * Hook that consolidates all state used by the MainRoute component.
 * Combines local React state and Zustand store selectors.
 */
import { useState, useMemo, useEffect } from "react";
import type { ItemDisplayMode } from "@lib/itemDisplayModes";
import { getBlockItemPair } from "@lib/assetUtils";
import {
  useStore,
  useSelectPacksInOrder,
  useSelectPaginatedAssets,
  useSelectAllAssets,
  useSelectUIState,
  useSelectProvidersWithWinner,
  useSelectPackOrder,
  useSelectDisabledPacks,
  useSelectDisabledPackIds,
  useSelectSetSearchQuery,
  useSelectSetSelectedAsset,
  useSelectSetPackOrder,
  useSelectSetDisabledPackOrder,
  useSelectSetOverride,
  useSelectIngestPacks,
  useSelectSetPackFormats,
  useSelectIngestAssets,
  useSelectIngestAllProviders,
  useSelectOverridesRecord,
  useSelectSelectedLauncher,
  useSelectAvailableLaunchers,
  useSelectSetSelectedLauncher,
  useSelectSetAvailableLaunchers,
  useSelectSetCurrentPage,
  useSelectDisablePack,
  useSelectEnablePack,
} from "@state";
import type { PackMeta } from "@state";

import { useVanillaProgress } from "./useVanillaProgress";
import { usePagination } from "./usePagination";
import { useAutoHideMessage } from "./useAutoHideMessage";
import { useBiomeColors } from "./useBiomeColors";

export function useMainRouteState() {
  // Local state
  const [packsDir, setPacksDir] = useState<string>("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tintInfo, setTintInfo] = useState<{
    hasTint: boolean;
    tintType?: "grass" | "foliage";
  }>({ hasTint: false });
  const [blockProps, setBlockProps] = useState<Record<string, string>>({});
  const [particleConditionOverrides, setParticleConditionOverrides] = useState<
    Record<string, string>
  >({});
  const [seed, setSeed] = useState(0);
  const [itemDisplayMode, setItemDisplayMode] =
    useState<ItemDisplayMode>("ground");
  const [viewingVariantId, setViewingVariantId] = useState<string | undefined>(
    undefined,
  );

  const setPacksDirInStore = useStore((state) => state.setPacksDir);

  // Extracted hooks
  const {
    vanillaProgress,
    setVanillaProgress,
    vanillaProgressVisible,
    setVanillaProgressVisible,
  } = useVanillaProgress();
  const { paginationInfo, setPaginationInfo } = usePagination();
  const { message: errorMessage, setMessage: setErrorMessage } =
    useAutoHideMessage();
  const { message: successMessage, setMessage: setSuccessMessage } =
    useAutoHideMessage();

  // Store selectors - data
  const packs = useSelectPacksInOrder();
  const disabledPacks = useSelectDisabledPacks();
  const disabledPackIds = useSelectDisabledPackIds();
  const filteredAssets = useSelectPaginatedAssets();
  const allAssets = useSelectAllAssets();
  const uiState = useSelectUIState();
  const currentPage = useStore((state) => state.currentPage);
  const packOrder = useSelectPackOrder();
  const overridesRecord = useSelectOverridesRecord();
  const selectedLauncher = useSelectSelectedLauncher();
  const availableLaunchers = useSelectAvailableLaunchers();
  const providersByAsset = useStore((state) => state.providersByAsset);
  const canvasRenderMode = useStore((state) => state.canvasRenderMode);
  const canvas2DTextureSource = useStore((state) => state.canvas2DTextureSource);
  const showPot = useStore((state) => state.showPot ?? false);
  const grassColormapUrl = useStore((state) => state.grassColormapUrl);
  const foliageColormapUrl = useStore((state) => state.foliageColormapUrl);
  const colormapCoordinates = useStore((state) => state.colormapCoordinates);

  // Store selectors - actions
  const disablePack = useSelectDisablePack();
  const enablePack = useSelectEnablePack();
  const setSearchQuery = useSelectSetSearchQuery();
  const setSelectedAsset = useSelectSetSelectedAsset();
  const setPackOrder = useSelectSetPackOrder();
  const setDisabledPackOrder = useSelectSetDisabledPackOrder();
  const setOverride = useSelectSetOverride();
  const ingestPacks = useSelectIngestPacks();
  const setPackFormats = useSelectSetPackFormats();
  const ingestAssets = useSelectIngestAssets();
  const ingestAllProviders = useSelectIngestAllProviders();
  const setSelectedLauncher = useSelectSetSelectedLauncher();
  const setAvailableLaunchers = useSelectSetAvailableLaunchers();
  const setCurrentPage = useSelectSetCurrentPage();
  const setEntityVersionVariants = useStore(
    (state) => state.setEntityVersionVariants,
  );

  // Biome colors
  const { biomeColor, colormapOverrides } = useBiomeColors(
    uiState.selectedAssetId,
  );

  // Derived state
  const allAssetIds = useMemo(
    () => allAssets.map((asset) => asset.id),
    [allAssets],
  );

  const blockItemPair = useMemo(() => {
    if (!uiState.selectedAssetId) return null;
    return getBlockItemPair(uiState.selectedAssetId, allAssetIds);
  }, [allAssetIds, uiState.selectedAssetId]);

  const providers = useSelectProvidersWithWinner(uiState.selectedAssetId);

  // Reset particle condition overrides when asset changes
  useEffect(() => {
    setParticleConditionOverrides({});
  }, [uiState.selectedAssetId]);

  // Memoized pack list items
  const packListItems = useMemo(
    () =>
      packs.map((p: PackMeta) => ({
        id: p.id,
        name: p.name,
        size: p.size,
        description: p.description,
        icon_data: p.icon_data,
      })),
    [packs],
  );

  const disabledPackListItems = useMemo(
    () =>
      disabledPacks.map((p: PackMeta) => ({
        id: p.id,
        name: p.name,
        size: p.size,
        description: p.description,
        icon_data: p.icon_data,
      })),
    [disabledPacks],
  );

  const assetListItems = useMemo(
    () => filteredAssets.assets,
    [filteredAssets.assets],
  );

  return {
    // Local state
    packsDir,
    setPacksDir,
    settingsOpen,
    setSettingsOpen,
    tintInfo,
    setTintInfo,
    blockProps,
    setBlockProps,
    particleConditionOverrides,
    setParticleConditionOverrides,
    seed,
    setSeed,
    itemDisplayMode,
    setItemDisplayMode,
    viewingVariantId,
    setViewingVariantId,
    setPacksDirInStore,

    // Vanilla progress
    vanillaProgress,
    setVanillaProgress,
    vanillaProgressVisible,
    setVanillaProgressVisible,

    // Pagination
    paginationInfo,
    setPaginationInfo,

    // Messages
    errorMessage,
    setErrorMessage,
    successMessage,
    setSuccessMessage,

    // Store data
    packs,
    disabledPacks,
    disabledPackIds,
    allAssets,
    uiState,
    currentPage,
    packOrder,
    overridesRecord,
    selectedLauncher,
    availableLaunchers,
    providersByAsset,
    canvasRenderMode,
    canvas2DTextureSource,
    showPot,
    grassColormapUrl,
    foliageColormapUrl,
    colormapCoordinates,

    // Store actions
    disablePack,
    enablePack,
    setSearchQuery,
    setSelectedAsset,
    setPackOrder,
    setDisabledPackOrder,
    setOverride,
    ingestPacks,
    setPackFormats,
    ingestAssets,
    ingestAllProviders,
    setSelectedLauncher,
    setAvailableLaunchers,
    setCurrentPage,
    setEntityVersionVariants,

    // Biome colors
    biomeColor,
    colormapOverrides,

    // Derived state
    allAssetIds,
    blockItemPair,
    providers,
    packListItems,
    disabledPackListItems,
    assetListItems,
  };
}
