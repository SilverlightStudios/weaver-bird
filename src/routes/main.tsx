/**
 * Main Route Component - Weaverbird Resource Pack Manager
 *
 * PERFORMANCE OPTIMIZATIONS:
 * -------------------------
 * This component implements several performance optimizations to ensure smooth UI
 * even when managing 100+ resource packs:
 *
 * 1. React 18 Transitions - Wraps colormap updates in startTransition()
 * 2. Debounced Pack Reordering - 150ms debounce on pack order changes
 * 3. RequestIdleCallback for Color Sampling - Defers to browser idle time
 * 4. Selective Subscriptions - Components only subscribe to colors they use
 */
import { useRef } from "react";
import s from "./main.module.scss";

import { Settings } from "@components/Settings";
import { MinecraftLocations } from "@components/Settings/components/MinecraftLocations";
import { VanillaTextureVersion } from "@components/Settings/components/VanillaTextureVersion";
import { TargetVersion } from "@components/Settings/components/TargetVersion";
import { CanvasTypeSelector } from "@components/CanvasTypeSelector";
import { BlockyTabs } from "@/ui/components/blocky-tabs/BlockyTabs";

import { CanvasRenderer } from "./main/components/CanvasRenderer";
import { MainHeader } from "./main/components/MainHeader";
import { MainFooter } from "./main/components/MainFooter";
import { useBlockyTabsConfig } from "./main/hooks/useBlockyTabsConfig";
import { getCanvasDisabledStates } from "./main/utils/canvasDisabledStates";

import { useMainRouteState } from "./hooks/useMainRouteState";
import { useMainRouteEffects } from "./hooks/useMainRouteEffects";
import { useMainRouteHandlers } from "./hooks/useMainRouteHandlers";
import { useVanillaTextureProgress } from "./hooks/useVanillaTextureProgress";
import { useAssetSelectionEffects } from "./hooks/useAssetSelectionEffects";
import { useColormapManager } from "./hooks/useColormapManager";
import { useColormapResampler } from "./hooks/useColormapResampler";

export default function MainRoute() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const state = useMainRouteState();

  // Initialization effects
  useMainRouteEffects({
    setAvailableLaunchers: state.setAvailableLaunchers,
    setSelectedLauncher: state.setSelectedLauncher,
    setSettingsOpen: state.setSettingsOpen,
    setCurrentPage: state.setCurrentPage,
    searchQuery: state.uiState.searchQuery,
  });

  // Vanilla texture progress
  useVanillaTextureProgress(
    state.setVanillaProgress,
    state.setVanillaProgressVisible,
  );

  // Asset selection effects
  useAssetSelectionEffects(
    state.uiState.selectedAssetId,
    state.blockItemPair,
    state.setTintInfo,
    state.setBlockProps,
    state.setSeed,
    state.setItemDisplayMode,
    state.setViewingVariantId,
  );

  // Colormap management
  useColormapManager(
    state.allAssets,
    state.packOrder,
    state.packs,
    state.providersByAsset,
    state.colormapOverrides,
    state.disabledPackIds,
  );

  useColormapResampler(
    state.colormapCoordinates,
    state.grassColormapUrl,
    state.foliageColormapUrl,
  );

  // Event handlers
  const handlers = useMainRouteHandlers({
    packsDir: state.packsDir,
    packsLength: state.packs.length,
    setPacksDir: state.setPacksDir,
    setPacksDirInStore: state.setPacksDirInStore,
    setErrorMessage: state.setErrorMessage,
    setSuccessMessage: state.setSuccessMessage,
    setPackOrder: state.setPackOrder,
    setDisabledPackOrder: state.setDisabledPackOrder,
    setOverride: state.setOverride,
    ingestPacks: state.ingestPacks,
    setPackFormats: state.setPackFormats,
    ingestAssets: state.ingestAssets,
    ingestAllProviders: state.ingestAllProviders,
    setEntityVersionVariants: state.setEntityVersionVariants,
    setSelectedLauncher: state.setSelectedLauncher,
    disablePack: state.disablePack,
    enablePack: state.enablePack,
  });

  // BlockyTabs configuration
  const blockyTabsConfig = useBlockyTabsConfig({
    packListItems: state.packListItems,
    disabledPackListItems: state.disabledPackListItems,
    handleReorderPacks: handlers.handleReorderPacks,
    handleReorderDisabledPacks: handlers.handleReorderDisabledPacks,
    handleDisablePack: handlers.handleDisablePack,
    handleEnablePack: handlers.handleEnablePack,
    handleBrowsePacksFolder: handlers.handleBrowsePacksFolder,
    packsDir: state.packsDir,
    selectedLauncher: state.selectedLauncher,
    availableLaunchers: state.availableLaunchers,
    handleLauncherChange: handlers.handleLauncherChange,
    searchQuery: state.uiState.searchQuery,
    setSearchQuery: state.setSearchQuery,
    assetListItems: state.assetListItems,
    selectedAssetId: state.uiState.selectedAssetId,
    setSelectedAsset: state.setSelectedAsset,
    paginationInfo: state.paginationInfo,
    currentPage: state.currentPage,
    setCurrentPage: state.setCurrentPage,
    setPaginationInfo: state.setPaginationInfo,
    blockItemPair: state.blockItemPair,
    providers: state.providers,
    handleSelectProvider: handlers.handleSelectProvider,
    setBlockProps: state.setBlockProps,
    setSeed: state.setSeed,
    setParticleConditionOverrides: state.setParticleConditionOverrides,
    allAssets: state.allAssets,
    itemDisplayMode: state.itemDisplayMode,
    setItemDisplayMode: state.setItemDisplayMode,
    setViewingVariantId: state.setViewingVariantId,
  });

  return (
    <div className={s.container}>
      <MainHeader onOpenSettings={() => state.setSettingsOpen(true)} />

      <div className={s.mainContent}>
        <CanvasTypeSelector
          targetRef={canvasRef}
          {...getCanvasDisabledStates(
            state.uiState.selectedAssetId,
            state.blockItemPair,
          )}
        />

        <BlockyTabs
          initialTabs={blockyTabsConfig}
          showZones={false}
          fullscreen={true}
        >
          <CanvasRenderer
            ref={canvasRef}
            selectedAssetId={state.uiState.selectedAssetId}
            blockItemPair={state.blockItemPair}
            canvas2DTextureSource={state.canvas2DTextureSource}
            canvasRenderMode={state.canvasRenderMode}
            viewingVariantId={state.viewingVariantId}
            biomeColor={state.biomeColor}
            showPot={state.showPot}
            blockProps={state.blockProps}
            particleConditionOverrides={state.particleConditionOverrides}
            seed={state.seed}
            allAssetIds={state.allAssetIds}
            itemDisplayMode={state.itemDisplayMode}
            onTintDetected={state.setTintInfo}
          />
        </BlockyTabs>
      </div>

      <MainFooter
        vanillaProgress={state.vanillaProgress}
        vanillaProgressVisible={state.vanillaProgressVisible}
        progress={state.uiState.progress}
        outputDir={state.uiState.outputDir}
        packsDir={state.packsDir}
        packOrder={state.packOrder}
        overrides={state.overridesRecord}
        errorMessage={state.errorMessage}
        successMessage={state.successMessage}
        onClearStatus={() => {
          state.setErrorMessage("");
          state.setSuccessMessage("");
        }}
        onSuccess={() => {
          state.setErrorMessage("");
          state.setSuccessMessage("Weaver Nest built successfully!");
        }}
        onError={(error: string) => {
          state.setSuccessMessage("");
          state.setErrorMessage(error);
        }}
      />

      <Settings
        isOpen={state.settingsOpen}
        onClose={() => state.setSettingsOpen(false)}
        minecraftTab={<MinecraftLocations />}
        vanillaVersionTab={<VanillaTextureVersion />}
        targetVersionTab={<TargetVersion />}
      />
    </div>
  );
}
