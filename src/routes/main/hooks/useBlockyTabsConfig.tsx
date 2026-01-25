import { useMemo } from "react";
import type { TabItem, ZoneId } from "@/ui/components/blocky-tabs/types";
import { createResourcePacksTab } from "./useBlockyTabsConfig/resourcePacksTab";
import { createResourceCardsTab } from "./useBlockyTabsConfig/resourceCardsTab";
import { createBiomeColormapsTab } from "./useBlockyTabsConfig/biomeColormapsTab";
import { createBlockPropertiesTab } from "./useBlockyTabsConfig/blockPropertiesTab";
import { createCanvasSettingsTab } from "./useBlockyTabsConfig/canvasSettingsTab";
import type { PackMeta, AssetRecord } from "@state";
import type { LauncherInfo } from "@lib/tauri";
import type { ItemDisplayMode } from "@lib/itemDisplayModes";

interface UseBlockyTabsConfigProps {
  packListItems: Array<{
    id: string;
    name: string;
    size: number;
    description?: string;
    icon_data?: string;
  }>;
  disabledPackListItems: Array<{
    id: string;
    name: string;
    size: number;
    description?: string;
    icon_data?: string;
  }>;
  handleReorderPacks: (newOrder: string[]) => void;
  handleReorderDisabledPacks: (newOrder: string[]) => void;
  handleDisablePack: (packId: string, targetIndex?: number) => void;
  handleEnablePack: (packId: string, targetIndex?: number) => void;
  handleBrowsePacksFolder: () => Promise<void>;
  packsDir: string;
  selectedLauncher: LauncherInfo | undefined;
  availableLaunchers: LauncherInfo[];
  handleLauncherChange: (launcher: LauncherInfo) => Promise<void>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  assetListItems: AssetRecord[];
  selectedAssetId: string | undefined;
  setSelectedAsset: (assetId: string | undefined) => void;
  paginationInfo: {
    totalPages: number;
    hasPrevPage: boolean;
    hasNextPage: boolean;
  };
  currentPage: number;
  setCurrentPage: (page: number) => void;
  setPaginationInfo: (info: { totalPages: number; hasPrevPage: boolean; hasNextPage: boolean }) => void;
  blockItemPair: { blockId?: string; itemId?: string } | null;
  providers: Array<{ packId: string; packName: string; isWinner: boolean; isPenciled: boolean }>;
  handleSelectProvider: (packId: string) => void;
  setBlockProps: (props: Record<string, string>) => void;
  setSeed: (seed: number) => void;
  setParticleConditionOverrides: (overrides: Record<string, string>) => void;
  allAssets: AssetRecord[];
  itemDisplayMode: ItemDisplayMode;
  setItemDisplayMode: (mode: ItemDisplayMode) => void;
  setViewingVariantId: (id: string | undefined) => void;
}

export function useBlockyTabsConfig({
  packListItems,
  disabledPackListItems,
  handleReorderPacks,
  handleReorderDisabledPacks,
  handleDisablePack,
  handleEnablePack,
  handleBrowsePacksFolder,
  packsDir,
  selectedLauncher,
  availableLaunchers,
  handleLauncherChange,
  searchQuery,
  setSearchQuery,
  assetListItems,
  selectedAssetId,
  setSelectedAsset,
  paginationInfo,
  currentPage,
  setCurrentPage,
  setPaginationInfo,
  blockItemPair,
  providers,
  handleSelectProvider,
  setBlockProps,
  setSeed,
  setParticleConditionOverrides,
  allAssets,
  itemDisplayMode,
  setItemDisplayMode,
  setViewingVariantId,
}: UseBlockyTabsConfigProps): Record<ZoneId, TabItem[]> {
  return useMemo(
    () => ({
      left: [
        createResourcePacksTab({
          packListItems,
          disabledPackListItems,
          handleReorderPacks,
          handleReorderDisabledPacks,
          handleDisablePack,
          handleEnablePack,
          handleBrowsePacksFolder,
          packsDir,
          selectedLauncher,
          availableLaunchers,
          handleLauncherChange,
        }),
        createResourceCardsTab({
          searchQuery,
          setSearchQuery,
          assetListItems,
          selectedAssetId,
          setSelectedAsset,
          setPaginationInfo,
          paginationInfo,
          currentPage,
          setCurrentPage,
        }),
        createBiomeColormapsTab(),
      ],
      right: [
        createBlockPropertiesTab({
          blockItemPair,
          selectedAssetId,
          providers,
          handleSelectProvider,
          setBlockProps,
          setSeed,
          setParticleConditionOverrides,
          allAssets,
          setSelectedAsset,
          setViewingVariantId,
          itemDisplayMode,
          setItemDisplayMode,
        }),
        createCanvasSettingsTab(),
      ],
      top: [],
      bottom: [],
    }),
    [
      packListItems,
      disabledPackListItems,
      handleReorderPacks,
      handleReorderDisabledPacks,
      handleDisablePack,
      handleEnablePack,
      handleBrowsePacksFolder,
      packsDir,
      selectedLauncher,
      availableLaunchers,
      handleLauncherChange,
      searchQuery,
      setSearchQuery,
      assetListItems,
      selectedAssetId,
      setSelectedAsset,
      paginationInfo,
      currentPage,
      setCurrentPage,
      providers,
      handleSelectProvider,
      setBlockProps,
      setSeed,
      allAssets,
      itemDisplayMode,
      setItemDisplayMode,
      blockItemPair,
      setPaginationInfo,
      setParticleConditionOverrides,
      setViewingVariantId,
    ],
  );
}
