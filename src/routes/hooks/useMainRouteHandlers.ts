/**
 * Hook that consolidates all event handlers for the MainRoute component.
 */
import { useCallback } from "react";
import { useStore } from "@state";
import type { PackMeta, AssetRecord } from "@state";
import type { LauncherInfo } from "@lib/tauri";
import { browsePacksFolder } from "../handlers/browsePacksFolder";
import { handleLauncherChangeLogic } from "../handlers/launcherChange";
import { usePackHandlers } from "./usePackHandlers";

interface UseMainRouteHandlersProps {
  packsDir: string;
  packsLength: number;
  setPacksDir: (dir: string) => void;
  setPacksDirInStore: (dir: string) => void;
  setErrorMessage: (msg: string | undefined) => void;
  setSuccessMessage: (msg: string) => void;
  setPackOrder: (order: string[]) => void;
  setDisabledPackOrder: (order: string[]) => void;
  setOverride: (assetId: string, packId: string | undefined) => void;
  ingestPacks: (packs: PackMeta[]) => void;
  setPackFormats: (formats: Record<string, number>) => void;
  ingestAssets: (assets: AssetRecord[]) => void;
  ingestAllProviders: (providers: Record<string, string[]>) => void;
  setEntityVersionVariants: (variants: Record<string, string[]>) => void;
  setSelectedLauncher: (launcher: LauncherInfo | undefined) => void;
  disablePack: (packId: string, targetIndex?: number) => void;
  enablePack: (packId: string, targetIndex?: number) => void;
}

export function useMainRouteHandlers({
  packsDir,
  packsLength,
  setPacksDir,
  setPacksDirInStore,
  setErrorMessage,
  setSuccessMessage,
  setPackOrder,
  setDisabledPackOrder,
  setOverride,
  ingestPacks,
  setPackFormats,
  ingestAssets,
  ingestAllProviders,
  setEntityVersionVariants,
  setSelectedLauncher,
  disablePack,
  enablePack,
}: UseMainRouteHandlersProps) {
  // Pack reordering handlers
  const { handleReorderPacks, handleReorderDisabledPacks } = usePackHandlers(
    setPackOrder,
    setDisabledPackOrder,
  );

  const handleDisablePack = useCallback(
    (packId: string, targetIndex?: number) => {
      disablePack(packId, targetIndex);
    },
    [disablePack],
  );

  const handleEnablePack = useCallback(
    (packId: string, targetIndex?: number) => {
      enablePack(packId, targetIndex);
    },
    [enablePack],
  );

  const handleSelectProvider = useCallback(
    (packId: string) => {
      const currentSelectedAssetId = useStore.getState().selectedAssetId;
      if (currentSelectedAssetId) {
        setOverride(currentSelectedAssetId, packId);
      }
    },
    [setOverride],
  );

  const handleBrowsePacksFolder = useCallback(async () => {
    await browsePacksFolder({
      setPacksDir,
      setPacksDirInStore,
      setErrorMessage,
      setSuccessMessage,
      ingestPacks,
      setPackFormats,
      // Cast to the generic types expected by the handler
      ingestAssets: ingestAssets as (assets: unknown[]) => void,
      ingestAllProviders: ingestAllProviders as (providers: unknown) => void,
      setEntityVersionVariants,
      setPackOrder,
    });
  }, [
    setPacksDir,
    setPacksDirInStore,
    setErrorMessage,
    setSuccessMessage,
    ingestPacks,
    setPackFormats,
    ingestAssets,
    ingestAllProviders,
    setEntityVersionVariants,
    setPackOrder,
  ]);

  const handleLauncherChange = useCallback(
    async (launcher: LauncherInfo) => {
      await handleLauncherChangeLogic({
        launcher,
        packsDir,
        packsLength,
        setSelectedLauncher: setSelectedLauncher as (
          launcher: LauncherInfo,
        ) => void,
        setPacksDir,
        setPacksDirInStore,
        setErrorMessage,
        setSuccessMessage,
        ingestPacks,
        setPackFormats,
        // Cast to the generic types expected by the handler
        ingestAssets: ingestAssets as (assets: unknown[]) => void,
        ingestAllProviders: ingestAllProviders as (providers: unknown) => void,
        setEntityVersionVariants,
        setPackOrder,
      });
    },
    [
      packsDir,
      packsLength,
      setSelectedLauncher,
      setPacksDir,
      setPacksDirInStore,
      setErrorMessage,
      setSuccessMessage,
      ingestPacks,
      setPackFormats,
      ingestAssets,
      ingestAllProviders,
      setEntityVersionVariants,
      setPackOrder,
    ],
  );

  return {
    handleReorderPacks,
    handleReorderDisabledPacks,
    handleDisablePack,
    handleEnablePack,
    handleSelectProvider,
    handleBrowsePacksFolder,
    handleLauncherChange,
  };
}
