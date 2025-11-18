import { useCallback, useEffect, useMemo, useState } from "react";
import s from "./main.module.scss";

import PackList from "@components/PackList";
import SearchBar from "@components/SearchBar";
import AssetResults from "@components/AssetResults";
import Preview3D from "@components/Preview3D";
import OptionsPanel from "@components/OptionsPanel";
import TextureVariantSelector from "@components/TextureVariantSelector";
import SaveBar from "@components/SaveBar";
import OutputSettings from "@components/OutputSettings";
import Settings from "@components/Settings";
import MinecraftLocations from "@components/Settings/MinecraftLocations";
import Button from "@/ui/components/buttons/Button";

import {
  scanPacksFolder,
  formatError,
  openFolderDialog,
  initializeVanillaTextures,
  detectLaunchers,
  getLauncherResourcepacksDir,
} from "@lib/tauri";
import type { LauncherInfo } from "@lib/tauri";
import {
  useStore,
  useSelectPacksInOrder,
  useSelectFilteredAssets,
  useSelectAllAssets,
  useSelectUIState,
  useSelectProvidersWithWinner,
  useSelectPackOrder,
  useSelectSetSearchQuery,
  useSelectSetSelectedAsset,
  useSelectSetPackOrder,
  useSelectSetOverride,
  useSelectSetOutputDir,
  useSelectSetPackFormat,
  useSelectIngestPacks,
  useSelectIngestAssets,
  useSelectIngestAllProviders,
  useSelectOverridesRecord,
  useSelectSelectedLauncher,
  useSelectAvailableLaunchers,
  useSelectSetSelectedLauncher,
  useSelectSetAvailableLaunchers,
} from "@state";

// Get the setPacksDir action from store
const useSetPacksDir = () => useStore((state) => state.setPacksDir);
import type { PackMeta, AssetRecord } from "@state";

const MESSAGE_TIMEOUT_MS = 3000;

export default function MainRoute() {
  const [packsDir, setPacksDir] = useState<string>("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showPot, setShowPot] = useState(true);
  const [tintInfo, setTintInfo] = useState<{
    hasTint: boolean;
    tintType?: "grass" | "foliage";
  }>({ hasTint: false });
  const [foliagePreviewBlock, setFoliagePreviewBlock] = useState(
    "minecraft:block/oak_leaves",
  );
  const [biomeColor, setBiomeColor] = useState<{
    r: number;
    g: number;
    b: number;
  } | null>(null);
  const [blockProps, setBlockProps] = useState<Record<string, string>>({});
  const [seed, setSeed] = useState(0);
  const setPacksDirInStore = useSetPacksDir();

  // UI messages with auto-hide
  const { message: errorMessage, setMessage: setErrorMessage } =
    useAutoHideMessage();
  const { message: successMessage, setMessage: setSuccessMessage } =
    useAutoHideMessage();

  // State selectors
  const packs = useSelectPacksInOrder();
  const filteredAssets = useSelectFilteredAssets();
  const allAssets = useSelectAllAssets();
  const uiState = useSelectUIState();
  const packOrder = useSelectPackOrder();
  const overridesRecord = useSelectOverridesRecord();
  const selectedLauncher = useSelectSelectedLauncher();
  const availableLaunchers = useSelectAvailableLaunchers();

  // Individual action selectors (stable references prevent infinite loops)
  const setSearchQuery = useSelectSetSearchQuery();
  const setSelectedAsset = useSelectSetSelectedAsset();
  const setPackOrder = useSelectSetPackOrder();
  const setOverride = useSelectSetOverride();
  const setOutputDir = useSelectSetOutputDir();
  const setPackFormat = useSelectSetPackFormat();
  const ingestPacks = useSelectIngestPacks();
  const ingestAssets = useSelectIngestAssets();
  const ingestAllProviders = useSelectIngestAllProviders();
  const setSelectedLauncher = useSelectSetSelectedLauncher();
  const setAvailableLaunchers = useSelectSetAvailableLaunchers();

  // Get providers for selected asset
  const providers = useSelectProvidersWithWinner(uiState.selectedAssetId);

  useEffect(() => {
    setTintInfo({ hasTint: false, tintType: undefined });
  }, [uiState.selectedAssetId]);

  // Memoize data transformations for components
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

  const assetListItems = useMemo(
    () =>
      filteredAssets.map((a: AssetRecord) => ({
        id: a.id,
        name: a.id,
      })),
    [filteredAssets],
  );

  // Handlers
  const handleReorderPacks = useCallback(
    (newOrder: string[]) => {
      setPackOrder(newOrder);
    },
    [setPackOrder],
  );

  const handleSelectProvider = useCallback(
    (packId: string) => {
      // Get current selected asset directly from store to avoid dependency on uiState object
      const currentSelectedAssetId = useStore.getState().selectedAssetId;
      if (currentSelectedAssetId) {
        setOverride(currentSelectedAssetId, packId);
      }
    },
    [setOverride],
  );

  const handleBrowsePacksFolder = useCallback(async () => {
    try {
      console.log("[handleBrowsePacksFolder] Opening folder dialog...");
      const selected = await openFolderDialog();
      if (selected) {
        console.log("[handleBrowsePacksFolder] Folder selected:", selected);
        setPacksDir(selected);
        setPacksDirInStore(selected); // Sync to Zustand store
        setErrorMessage(undefined);

        console.log("[handleBrowsePacksFolder] Scanning packs folder...");
        // Scan the selected folder
        const result = await scanPacksFolder(selected);
        console.log(
          "[handleBrowsePacksFolder] Scan complete. Packs:",
          result.packs.length,
          "Assets:",
          result.assets.length,
        );

        console.log("[handleBrowsePacksFolder] Ingesting packs...");
        ingestPacks(result.packs);
        console.log("[handleBrowsePacksFolder] Ingesting assets...");
        ingestAssets(result.assets);

        console.log("[handleBrowsePacksFolder] Ingesting providers (batch)...");
        // Ingest providers (batch operation for performance)
        ingestAllProviders(result.providers);
        console.log("[handleBrowsePacksFolder] Providers ingested");

        // Set pack order to scan order
        if (result.packs.length > 0) {
          console.log("[handleBrowsePacksFolder] Setting pack order...");
          setPackOrder(result.packs.map((p: PackMeta) => p.id));
        }

        console.log(
          "[handleBrowsePacksFolder] All done! Setting success message...",
        );
        setSuccessMessage(`Loaded ${result.packs.length} resource pack(s)`);
        console.log("[handleBrowsePacksFolder] Complete!");
      }
    } catch (error) {
      const msg = formatError(error);
      setErrorMessage(msg);
    }
  }, [
    ingestPacks,
    ingestAssets,
    ingestAllProviders,
    setPackOrder,
    setPacksDirInStore,
    setErrorMessage,
    setSuccessMessage,
  ]);

  const handleLauncherChange = useCallback(
    async (launcher: LauncherInfo) => {
      try {
        setSelectedLauncher(launcher);

        // Get the resourcepacks directory for this launcher
        const resourcepacksDir = await getLauncherResourcepacksDir(launcher);

        // Check if we should auto-switch to resourcepacks folder
        // Auto-switch if: current folder is empty, has no packs, or is not set
        const shouldAutoSwitch = !packsDir || packs.length === 0;

        if (shouldAutoSwitch) {
          setPacksDir(resourcepacksDir);
          setPacksDirInStore(resourcepacksDir); // Sync to Zustand store
          setErrorMessage(undefined);

          // Scan the resourcepacks folder
          const result = await scanPacksFolder(resourcepacksDir);
          ingestPacks(result.packs);
          ingestAssets(result.assets);

          // Ingest providers (batch operation for performance)
          ingestAllProviders(result.providers);

          // Set pack order to scan order
          if (result.packs.length > 0) {
            setPackOrder(result.packs.map((p: PackMeta) => p.id));
          }

          setSuccessMessage(
            `Switched to ${launcher.name} - Loaded ${result.packs.length} resource pack(s)`,
          );
        } else {
          setSuccessMessage(`Selected launcher: ${launcher.name}`);
        }
      } catch (error) {
        const msg = formatError(error);
        setErrorMessage(`Failed to switch launcher: ${msg}`);
      }
    },
    [
      packsDir,
      packs.length,
      setSelectedLauncher,
      ingestPacks,
      ingestAssets,
      ingestAllProviders,
      setPackOrder,
      setPacksDirInStore,
      setErrorMessage,
      setSuccessMessage,
    ],
  );

  // Detect launchers on startup
  useEffect(() => {
    const loadLaunchers = async () => {
      try {
        const launchers = await detectLaunchers();
        setAvailableLaunchers(launchers);

        // Auto-select the first found launcher
        const firstFound = launchers.find((l) => l.found);
        if (firstFound) {
          setSelectedLauncher(firstFound);
        }
      } catch (error) {
        console.warn("Failed to detect launchers:", error);
      }
    };
    loadLaunchers();
  }, [setAvailableLaunchers, setSelectedLauncher]);

  // Listen for menu events (macOS)
  useEffect(() => {
    import("@tauri-apps/api/event").then(({ listen }) => {
      listen("open-settings", () => {
        setSettingsOpen(true);
      });
    });
  }, []);

  // Initialize vanilla textures on startup (run once on mount)
  useEffect(() => {
    const initVanillaTextures = async () => {
      try {
        // Try to initialize vanilla textures automatically
        // This will search for Minecraft in multiple launcher locations
        await initializeVanillaTextures();
        console.log("Vanilla textures initialized");
      } catch (error) {
        // If vanilla textures can't be initialized, just log it
        // User can still browse for packs and configure Minecraft location in settings
        console.warn("Could not auto-initialize vanilla textures:", error);
      }
    };
    initVanillaTextures();
  }, []);

  return (
    <div className={s.container}>
      {/* Header */}
      <div className={s.header}>
        <div className={s.headerContent}>
          <div>
            <h1>Weaverbird</h1>
            <p>Minecraft Resource Pack Manager</p>
          </div>
          <Button
            className={s.settingsButton}
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
            variant="ghost"
            size="md"
          >
            ⚙️
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className={s.mainContent}>
        {/* Left: Pack List */}
        <div className={s.sidebar}>
          <PackList
            packs={packListItems}
            onReorder={handleReorderPacks}
            onBrowse={handleBrowsePacksFolder}
            packsDir={packsDir}
            selectedLauncher={selectedLauncher}
            availableLaunchers={availableLaunchers}
            onLauncherChange={handleLauncherChange}
          />
        </div>

        {/* Center: Search & Results */}
        <div className={s.center}>
          <div className={s.searchSection}>
            <SearchBar
              value={uiState.searchQuery}
              onChange={setSearchQuery}
              placeholder="Search blocks, mobs, textures..."
            />
          </div>

          <div className={s.resultsSection}>
            <AssetResults
              assets={assetListItems}
              selectedId={uiState.selectedAssetId}
              onSelect={setSelectedAsset}
            />
          </div>
        </div>

        {/* Right: Preview & Options */}
        <div className={s.rightPanel}>
          <div className={s.previewSection}>
            <Preview3D
              assetId={uiState.selectedAssetId}
              biomeColor={biomeColor}
              onTintDetected={setTintInfo}
              showPot={showPot}
              onShowPotChange={setShowPot}
              blockProps={blockProps}
              seed={seed}
              foliagePreviewBlock={foliagePreviewBlock}
            />
          </div>

          <div className={s.optionsSection}>
            <OptionsPanel
              assetId={uiState.selectedAssetId}
              biomeColor={biomeColor}
              onBiomeColorChange={setBiomeColor}
              providers={providers}
              onSelectProvider={handleSelectProvider}
              showPot={showPot}
              onShowPotChange={setShowPot}
              hasTintindex={tintInfo.hasTint}
              tintType={tintInfo.tintType}
              foliagePreviewBlock={foliagePreviewBlock}
              onFoliagePreviewBlockChange={setFoliagePreviewBlock}
              onBlockPropsChange={setBlockProps}
              onSeedChange={setSeed}
            />
          </div>

          {/* Texture Variant Selector - for different numbered variants of the same texture */}
          {uiState.selectedAssetId && (
            <TextureVariantSelector
              assetId={uiState.selectedAssetId}
              allAssets={allAssets.map((a: AssetRecord) => ({
                id: a.id,
                name: a.id,
              }))}
              onSelectVariant={setSelectedAsset}
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <div className={s.footer}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            padding: "0.5rem 0.75rem",
          }}
        >
          {errorMessage && (
            <div
              style={{
                color: "var(--color-danger)",
                fontSize: "var(--font-size-sm)",
              }}
            >
              Error: {errorMessage}
            </div>
          )}
          {successMessage && (
            <div
              style={{
                color: "var(--color-success)",
                fontSize: "var(--font-size-sm)",
              }}
            >
              Success: {successMessage}
            </div>
          )}

          <SaveBar
            isLoading={false}
            progress={uiState.progress}
            disabled={!uiState.outputDir || !packsDir}
            packsDir={packsDir}
            packOrder={packOrder}
            overrides={overridesRecord}
            outputDir={uiState.outputDir}
            onSuccess={() => {
              setSuccessMessage("Weaver Nest built successfully!");
            }}
            onError={(error: string) => {
              setErrorMessage(error);
            }}
          />
        </div>
      </div>

      {/* Settings Modal */}
      <Settings
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        minecraftTab={<MinecraftLocations />}
        outputTab={
          <OutputSettings
            outputDir={uiState.outputDir}
            packFormat={uiState.packFormat}
            onOutputDirChange={setOutputDir}
            onPackFormatChange={setPackFormat}
          />
        }
      />
    </div>
  );
}

/**
 * Custom hook for messages that auto-hide after a timeout
 */
function useAutoHideMessage(duration: number = MESSAGE_TIMEOUT_MS) {
  const [message, setMessageState] = useState<string | undefined>();

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessageState(undefined), duration);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [message, duration]);

  // Wrap setMessage in useCallback to provide stable reference
  const setMessage = useCallback((msg: string | undefined) => {
    setMessageState(msg);
  }, []);

  return {
    message,
    setMessage,
  };
}
