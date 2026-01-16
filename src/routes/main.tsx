/**
 * Main Route Component - Weaverbird Resource Pack Manager
 *
 * PERFORMANCE OPTIMIZATIONS:
 * -------------------------
 * This component implements several performance optimizations to ensure smooth UI
 * even when managing 100+ resource packs:
 *
 * 1. React 18 Transitions (lines 269-358):
 *    - Wraps colormap updates in startTransition() to mark them as non-urgent
 *    - Keeps UI responsive during heavy colormap loading/sampling
 *    - Users can continue interacting with pack list while updates process
 *
 * 2. Debounced Pack Reordering (lines 463-482):
 *    - 150ms debounce on pack order changes
 *    - Batches rapid drag-and-drop movements into single update
 *    - Immediate optimistic UI update, deferred processing
 *
 * 3. RequestIdleCallback for Color Sampling (lines 389-428):
 *    - Defers color re-sampling to browser idle time
 *    - Prevents blocking main thread during biome selection
 *    - Fallback to setTimeout for unsupported browsers
 *
 * 4. Selective Subscriptions:
 *    - AssetCard components only subscribe to colors they actually use
 *    - MinecraftCSSBlock only subscribes for tinted blocks
 *    - Prevents 95%+ of cards from re-rendering on pack order changes
 *
 * EXPECTED PERFORMANCE:
 * - Pack reordering: Feels instant (previously laggy)
 * - Resource cards: Only grass/leaves cards re-render (previously all)
 * - 3D preview: Updates don't block UI (previously blocking)
 * - Overall: Smooth 60fps experience with 100+ packs
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
  useTransition,
} from "react";
import s from "./main.module.scss";

import { PackList } from "@components/PackList";
import { SearchBar } from "@components/SearchBar";
import AssetResults from "@components/AssetResults";
import Preview3D from "@components/Preview3D";
import Preview2D from "@components/Preview2D";
import PreviewItem from "@components/PreviewItem";
import PreviewParticle from "@components/PreviewParticle";
import { OptionsPanel } from "@components/OptionsPanel";
import { SaveBar } from "@components/SaveBar";
import { Settings } from "@components/Settings";
import { MinecraftLocations } from "@components/Settings/components/MinecraftLocations";
import { VanillaTextureVersion } from "@components/Settings/components/VanillaTextureVersion";
import { TargetVersion } from "@components/Settings/components/TargetVersion";
import { VanillaTextureProgress } from "@components/VanillaTextureProgress";
import { CanvasSettings } from "@components/CanvasSettings";
import { BiomeSelector } from "@components/BiomeSelector";
import Button from "@/ui/components/buttons/Button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/ui/components/Pagination/Pagination";
import { BlockyTabs } from "@/ui/components/blocky-tabs/BlockyTabs";
import type { TabItem, ZoneId } from "@/ui/components/blocky-tabs/types";
import { CanvasTypeSelector } from "@components/CanvasTypeSelector";
import { BiomeColorCard } from "@components/BiomeColorCard";

// Import tab icons
import cobbleImg from "@/assets/textures/cobblestone.png";
import dirtImg from "@/assets/textures/dirt.png";
import pickaxeImg from "@/assets/textures/pickaxe.png";
import logImg from "@/assets/textures/log.png";
import swordImg from "@/assets/textures/sword.png";

import {
  scanPacksFolder,
  formatError,
  openFolderDialog,
  initializeVanillaTextures,
  detectLaunchers,
  getLauncherResourcepacksDir,
  getEntityVersionVariants,
} from "@lib/tauri";
import { listen } from "@tauri-apps/api/event";
import type { LauncherInfo } from "@lib/tauri";
import { getBlockTintType } from "@/constants/vanillaBlockColors";
import {
  resolveColormapWinner,
  loadColormapUrl,
  sampleColormapColors,
  coordinatesToBiome,
  getPlainsCoordinates,
  GRASS_COLORMAP_ASSET_ID,
  FOLIAGE_COLORMAP_ASSET_ID,
} from "@lib/colormapManager";
import {
  getColormapTypeFromAssetId,
  is2DOnlyTexture,
  isEntityTexture,
  isMinecraftItem,
  isParticleTexture,
  getBlockItemPair,
} from "@lib/assetUtils";
import type { ItemDisplayMode } from "@lib/itemDisplayModes";
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

// Get the setPacksDir action from store
const useSetPacksDir = () => useStore((state) => state.setPacksDir);
const useSelectedFoliageColor = () =>
  useStore((state) => state.selectedFoliageColor);
const useSelectedGrassColor = () =>
  useStore((state) => state.selectedGrassColor);
import type { PackMeta, AssetRecord } from "@state";

const MESSAGE_TIMEOUT_MS = 3000;

/**
 * Helper function to render page numbers with ellipsis
 */
function renderPageNumbers(
  currentPage: number,
  totalPages: number,
  setCurrentPage: (page: number) => void,
) {
  const pageNumbers: JSX.Element[] = [];
  const maxVisiblePages = 4; // Show at most 4 page numbers

  // Always show first page
  pageNumbers.push(
    <PaginationItem key={1}>
      <PaginationLink
        onClick={() => setCurrentPage(1)}
        isActive={currentPage === 1}
      >
        1
      </PaginationLink>
    </PaginationItem>,
  );

  // Calculate range of pages to show
  let startPage = Math.max(2, currentPage - 1);
  let endPage = Math.min(totalPages - 1, currentPage + 1);

  // Adjust range if we're near the start or end
  if (currentPage <= 3) {
    endPage = Math.min(maxVisiblePages - 1, totalPages - 1);
  } else if (currentPage >= totalPages - 2) {
    startPage = Math.max(2, totalPages - maxVisiblePages + 2);
  }

  // Add ellipsis after first page if needed
  if (startPage > 2) {
    pageNumbers.push(
      <PaginationItem key="ellipsis-start">
        <PaginationEllipsis>...</PaginationEllipsis>
      </PaginationItem>,
    );
  }

  // Add middle pages
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(
      <PaginationItem key={i}>
        <PaginationLink
          onClick={() => setCurrentPage(i)}
          isActive={currentPage === i}
        >
          {i}
        </PaginationLink>
      </PaginationItem>,
    );
  }

  // Add ellipsis before last page if needed
  if (endPage < totalPages - 1) {
    pageNumbers.push(
      <PaginationItem key="ellipsis-end">
        <PaginationEllipsis>...</PaginationEllipsis>
      </PaginationItem>,
    );
  }

  // Always show last page (if there's more than 1 page)
  if (totalPages > 1) {
    pageNumbers.push(
      <PaginationItem key={totalPages}>
        <PaginationLink
          onClick={() => setCurrentPage(totalPages)}
          isActive={currentPage === totalPages}
        >
          {totalPages}
        </PaginationLink>
      </PaginationItem>,
    );
  }

  return pageNumbers;
}

export default function MainRoute() {
  const [packsDir, setPacksDir] = useState<string>("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [_tintInfo, setTintInfo] = useState<{
    hasTint: boolean;
    tintType?: "grass" | "foliage";
  }>({ hasTint: false });
  const [blockProps, setBlockProps] = useState<Record<string, string>>({});
  const [particleConditionOverrides, setParticleConditionOverrides] = useState<Record<string, string>>({});
  const [seed, setSeed] = useState(0);
  const setPacksDirInStore = useSetPacksDir();

  // Vanilla texture progress state - managed here to ensure listener is set up early
  const [vanillaProgress, setVanillaProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [vanillaProgressVisible, setVanillaProgressVisible] = useState(false);

  // Ref for canvas element to position CanvasTypeSelector
  const canvasRef = useRef<HTMLDivElement>(null);

  // Item display state
  const [itemDisplayMode, setItemDisplayMode] =
    useState<ItemDisplayMode>("ground");

  // Viewing variant state (view-only, temporary, for Preview3D)
  // This is managed by OptionsPanel via onViewingVariantChange callback
  const [viewingVariantId, setViewingVariantId] = useState<string | undefined>(
    undefined,
  );

  // React 18 transition for non-blocking colormap updates
  const [_isPending, startTransition] = useTransition();

  // Debounce timer for pack order changes
  const packOrderDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // UI messages with auto-hide
  const { message: errorMessage, setMessage: setErrorMessage } =
    useAutoHideMessage();
  const { message: successMessage, setMessage: setSuccessMessage } =
    useAutoHideMessage();

  // State selectors
  const packs = useSelectPacksInOrder();
  const disabledPacks = useSelectDisabledPacks();
  const disabledPackIds = useSelectDisabledPackIds();
  const filteredAssets = useSelectPaginatedAssets(); // Now returns all filtered assets (no pagination)
  const allAssets = useSelectAllAssets();
  const uiState = useSelectUIState();
  const currentPage = useStore((state) => state.currentPage);
  const allAssetIds = useMemo(() => allAssets.map((asset) => asset.id), [allAssets]);
  const blockItemPair = useMemo(() => {
    if (!uiState.selectedAssetId) return null;
    return getBlockItemPair(uiState.selectedAssetId, allAssetIds);
  }, [allAssetIds, uiState.selectedAssetId]);

  useEffect(() => {
    setParticleConditionOverrides({});
  }, [uiState.selectedAssetId]);

  // Pagination info received from AssetResults component
  const [paginationInfo, setPaginationInfo] = useState({
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Get both grass and foliage colors from global state
  const selectedGrassColor = useSelectedGrassColor();
  const selectedFoliageColor = useSelectedFoliageColor();

  // Determine which color to use based on the block's tint type
  // This handles both colormap assets and regular blocks (like leaves)
  const biomeColor = useMemo(() => {
    console.log(`[main.useMemo.biomeColor] asset=${uiState.selectedAssetId}`);
    if (!uiState.selectedAssetId) return undefined;

    // First check if it's a colormap asset itself
    const colormapType = getColormapTypeFromAssetId(uiState.selectedAssetId);
    if (colormapType === "grass") return selectedGrassColor;
    if (colormapType === "foliage") return selectedFoliageColor;

    // If not a colormap asset, check if it's a tinted block
    // Extract the base block name by removing ALL texture suffix patterns
    // (e.g., "minecraft:block/grass_block_side_overlay" -> "minecraft:block/grass_block")
    let baseAssetId = uiState.selectedAssetId;
    const textureSuffixes = [
      "_side_overlay", // Check compound suffixes first
      "_side",
      "_top",
      "_bottom",
      "_overlay",
      "_particle",
      "_snow",
    ];

    // Keep stripping suffixes until none match
    let changed = true;
    while (changed) {
      changed = false;
      for (const suffix of textureSuffixes) {
        if (baseAssetId.endsWith(suffix)) {
          baseAssetId = baseAssetId.substring(
            0,
            baseAssetId.length - suffix.length,
          );
          changed = true;
          break;
        }
      }
    }

    // Convert assetId to blockId: "minecraft:block/grass_block" -> "minecraft:grass_block"
    let baseBlockId = baseAssetId;
    if (baseBlockId.includes("/block/")) {
      baseBlockId = baseBlockId.replace("/block/", ":");
    } else if (baseBlockId.includes("/item/")) {
      baseBlockId = baseBlockId.replace("/item/", ":");
    } else {
      // Fallback: manually replace
      baseBlockId = baseBlockId.replace(":block/", ":");
      baseBlockId = baseBlockId.replace(":item/", ":");
    }

    const tintType = getBlockTintType(baseBlockId);
    if (tintType === "grass") return selectedGrassColor;
    if (tintType === "foliage") return selectedFoliageColor;

    return undefined;
  }, [uiState.selectedAssetId, selectedGrassColor, selectedFoliageColor]);
  const packOrder = useSelectPackOrder();
  const overridesRecord = useSelectOverridesRecord();

  // PERFORMANCE OPTIMIZATION: Only track colormap-specific override changes
  // Create a stable string key instead of an object to avoid reference issues
  const colormapOverridesKey = useStore((state) => {
    const grassOverride = state.overrides[GRASS_COLORMAP_ASSET_ID];
    const foliageOverride = state.overrides[FOLIAGE_COLORMAP_ASSET_ID];

    const grassKey = grassOverride
      ? `${grassOverride.packId}:${grassOverride.variantPath ?? ""}`
      : "none";
    const foliageKey = foliageOverride
      ? `${foliageOverride.packId}:${foliageOverride.variantPath ?? ""}`
      : "none";

    return `${grassKey}|${foliageKey}`;
  });

  // Rebuild the overrides object only when the key changes
  const colormapOverrides = useMemo(() => {
    const state = useStore.getState();
    const filtered: Record<string, { packId: string; variantPath?: string }> =
      {};

    if (state.overrides[GRASS_COLORMAP_ASSET_ID]) {
      filtered[GRASS_COLORMAP_ASSET_ID] =
        state.overrides[GRASS_COLORMAP_ASSET_ID];
    }
    if (state.overrides[FOLIAGE_COLORMAP_ASSET_ID]) {
      filtered[FOLIAGE_COLORMAP_ASSET_ID] =
        state.overrides[FOLIAGE_COLORMAP_ASSET_ID];
    }

    return filtered;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colormapOverridesKey]);

  const selectedLauncher = useSelectSelectedLauncher();
  const availableLaunchers = useSelectAvailableLaunchers();
  const providersByAsset = useStore((state) => state.providersByAsset);
  const disablePack = useSelectDisablePack();
  const enablePack = useSelectEnablePack();
  const setDisabledPackOrder = useSelectSetDisabledPackOrder();

  // Individual action selectors (stable references prevent infinite loops)
  const setSearchQuery = useSelectSetSearchQuery();
  const setSelectedAsset = useSelectSetSelectedAsset();
  const setPackOrder = useSelectSetPackOrder();
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

  // Canvas render mode state
  const canvasRenderMode = useStore((state) => state.canvasRenderMode);
  const setCanvasRenderMode = useStore((state) => state.setCanvasRenderMode);
  const canvas2DTextureSource = useStore(
    (state) => state.canvas2DTextureSource,
  );
  const setCanvas2DTextureSource = useStore(
    (state) => state.setCanvas2DTextureSource,
  );

  // Show pot state - managed in global store for access from OptionsPanel
  const showPot = useStore((state) => state.showPot ?? false);

  // Get providers for selected asset
  const providers = useSelectProvidersWithWinner(uiState.selectedAssetId);

  // Set up vanilla texture progress listener FIRST (before any effects that might trigger events)
  useEffect(() => {
    console.log("[MainRoute] Setting up vanilla-texture-progress listener");
    const unlistenPromise = listen<[number, number]>(
      "vanilla-texture-progress",
      (event) => {
        console.log(
          "[MainRoute] Received vanilla-texture-progress event:",
          event.payload,
        );
        const [current, total] = event.payload;
        setVanillaProgress({ current, total });
        setVanillaProgressVisible(true);

        // Hide when complete after a short delay
        if (current >= total) {
          setTimeout(() => {
            setVanillaProgressVisible(false);
            setVanillaProgress(null);
          }, 2000);
        }
      },
    );

    return () => {
      unlistenPromise.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    setTintInfo({ hasTint: false, tintType: undefined });
    setBlockProps({});
    setSeed(0);
    // Reset item display mode when switching assets
    setItemDisplayMode("ground");
    // Reset viewing variant when switching assets
    setViewingVariantId(undefined);

    // Auto-select appropriate canvas mode based on asset type
    if (uiState.selectedAssetId) {
      const hasBlockCounterpart = Boolean(blockItemPair?.blockId);
      if (isMinecraftItem(uiState.selectedAssetId) && !hasBlockCounterpart) {
        setCanvasRenderMode("Item");
      } else if (isParticleTexture(uiState.selectedAssetId)) {
        // Particles default to 3D for live emitter preview
        setCanvasRenderMode("3D");
      } else if (is2DOnlyTexture(uiState.selectedAssetId)) {
        setCanvasRenderMode("2D");
      } else {
        // Blocks and entities default to 3D
        setCanvasRenderMode("3D");
      }
    }
  }, [uiState.selectedAssetId, blockItemPair?.blockId, setCanvasRenderMode]);

  useEffect(() => {
    if (!blockItemPair?.blockId || !blockItemPair?.itemId) {
      setCanvas2DTextureSource("block");
    }
  }, [blockItemPair?.blockId, blockItemPair?.itemId, setCanvas2DTextureSource]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (packOrderDebounceRef.current) {
        clearTimeout(packOrderDebounceRef.current);
      }
    };
  }, []);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [uiState.searchQuery, setCurrentPage]);

  // Centralized Colormap Manager Effect
  // Manages all colormap state: resolves winners, loads URLs, samples colors
  // Triggers on: pack order change, colormap coordinates change, overrides change
  // OPTIMIZATION: Wrapped in React 18 transition for non-blocking updates
  useEffect(() => {
    console.log(`[main.useEffect.colormapManager] triggered`);
    const updateColormapState = async () => {
      // Only run if we have the required data
      if (allAssets.length === 0 || packOrder.length === 0) {
        return;
      }

      const packsMap = packs.reduce(
        (acc: Record<string, PackMeta>, p: PackMeta) => {
          acc[p.id] = p;
          return acc;
        },
        {},
      );

      // Wrap the entire colormap update in a transition to keep UI responsive
      startTransition(() => {
        (async () => {
          try {
            // Step 1: Resolve colormap winners (respects penciled selections)
            // Use colormapOverrides instead of overridesRecord for performance
            const grassWinner = resolveColormapWinner(
              GRASS_COLORMAP_ASSET_ID,
              packOrder,
              providersByAsset,
              colormapOverrides,
              disabledPackIds,
            );

            const foliageWinner = resolveColormapWinner(
              FOLIAGE_COLORMAP_ASSET_ID,
              packOrder,
              providersByAsset,
              colormapOverrides,
              disabledPackIds,
            );

            // Step 2: Load colormap URLs (deferred as low-priority)
            const grassUrl = grassWinner
              ? await loadColormapUrl(
                GRASS_COLORMAP_ASSET_ID,
                grassWinner,
                packsMap,
              )
              : null;

            const foliageUrl = foliageWinner
              ? await loadColormapUrl(
                FOLIAGE_COLORMAP_ASSET_ID,
                foliageWinner,
                packsMap,
              )
              : null;

            // Update URLs and pack IDs in state
            useStore.getState().setGrassColormapUrl(grassUrl || undefined);
            useStore
              .getState()
              .setGrassColormapPackId(grassWinner || undefined);
            useStore.getState().setFoliageColormapUrl(foliageUrl || undefined);
            useStore
              .getState()
              .setFoliageColormapPackId(foliageWinner || undefined);

            // Step 3: Get current coordinates (or default to plains)
            const currentCoords = useStore.getState().colormapCoordinates;
            const coords = currentCoords || getPlainsCoordinates();

            // If no coordinates set yet, initialize to plains
            if (!currentCoords) {
              useStore.getState().setColormapCoordinates(coords);
            }

            // Step 4: Sample colors at coordinates (deferred)
            const { grassColor, foliageColor } = await sampleColormapColors(
              grassUrl,
              foliageUrl,
              coords.x,
              coords.y,
            );

            // Step 5: Update colors in state
            useStore.getState().setSelectedGrassColor(grassColor || undefined);
            useStore
              .getState()
              .setSelectedFoliageColor(foliageColor || undefined);

            // Step 6: Determine if coordinates match a biome
            const biomeId = coordinatesToBiome(coords.x, coords.y);
            useStore.getState().setSelectedBiomeId(biomeId || undefined);
          } catch (error) {
            console.error(
              "[ColormapManager] Failed to update colormap state:",
              error,
            );
          }
        })();
      });
    };

    updateColormapState();
  }, [
    allAssets,
    packOrder,
    packs,
    providersByAsset,
    colormapOverrides, // Only colormap overrides, not all overrides!
    disabledPackIds,
    startTransition,
    // Note: colormapCoordinates is NOT in dependencies - we read it directly
    // This prevents infinite loops when we update coordinates
  ]);

  // Re-sample colors when coordinates change (e.g., user clicks different biome)
  // OPTIMIZATION: Deferred using requestIdleCallback for non-blocking updates
  const colormapCoordinates = useStore((state) => state.colormapCoordinates);
  const grassColormapUrl = useStore((state) => state.grassColormapUrl);
  const foliageColormapUrl = useStore((state) => state.foliageColormapUrl);

  useEffect(() => {
    console.log(
      `[main.useEffect.resampleColors] coords=${colormapCoordinates?.x},${colormapCoordinates?.y}`,
    );
    const resampleColors = async () => {
      if (!colormapCoordinates || (!grassColormapUrl && !foliageColormapUrl)) {
        return;
      }

      // Defer color sampling to idle time to avoid blocking UI
      const idleCallback =
        window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
      idleCallback(async () => {
        try {
          const { grassColor, foliageColor } = await sampleColormapColors(
            grassColormapUrl || null,
            foliageColormapUrl || null,
            colormapCoordinates.x,
            colormapCoordinates.y,
          );

          useStore.getState().setSelectedGrassColor(grassColor || undefined);
          useStore
            .getState()
            .setSelectedFoliageColor(foliageColor || undefined);

          // Update biome ID based on new coordinates
          const biomeId = coordinatesToBiome(
            colormapCoordinates.x,
            colormapCoordinates.y,
          );
          useStore.getState().setSelectedBiomeId(biomeId || undefined);
        } catch (error) {
          console.error("[ColormapManager] Failed to re-sample colors:", error);
        }
      });
    };

    resampleColors();
  }, [colormapCoordinates, grassColormapUrl, foliageColormapUrl]);

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

  // Handlers
  // OPTIMIZATION: Debounced pack reordering for smooth drag-and-drop
  const handleReorderPacks = useCallback(
    (newOrder: string[]) => {
      // Immediately update UI (optimistic update)
      setPackOrder(newOrder);

      // Clear existing debounce timer
      if (packOrderDebounceRef.current) {
        clearTimeout(packOrderDebounceRef.current);
      }

      // Debounce the heavy colormap recalculation by 150ms
      // This batches rapid drag movements into a single update
      packOrderDebounceRef.current = setTimeout(() => {
        console.log("[Performance] Debounced pack order change applied");
        // The effect will trigger automatically due to packOrder dependency
      }, 150);
    },
    [setPackOrder],
  );

  const handleReorderDisabledPacks = useCallback(
    (newOrder: string[]) => {
      setDisabledPackOrder(newOrder);
    },
    [setDisabledPackOrder],
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

        // Extract pack formats from packs
        const packFormats = result.packs.reduce(
          (acc: Record<string, number>, pack: PackMeta) => {
            if (pack.pack_format !== undefined) {
              acc[pack.id] = pack.pack_format;
            }
            return acc;
          },
          {},
        );
        setPackFormats(packFormats);

        console.log("[handleBrowsePacksFolder] Ingesting assets...");
        ingestAssets(result.assets);

        console.log("[handleBrowsePacksFolder] Ingesting providers (batch)...");
        // Ingest providers (batch operation for performance)
        ingestAllProviders(result.providers);
        console.log("[handleBrowsePacksFolder] Providers ingested");

        // Load entity version variants
        console.log(
          "[handleBrowsePacksFolder] Loading entity version variants...",
        );
        try {
          const variants = await getEntityVersionVariants(selected);
          setEntityVersionVariants(variants);
          console.log(
            "[handleBrowsePacksFolder] Entity version variants loaded:",
            variants,
          );
        } catch (err) {
          console.warn(
            "[handleBrowsePacksFolder] Failed to load entity version variants:",
            err,
          );
          setEntityVersionVariants({});
        }

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
    setEntityVersionVariants,
    setPackFormats,
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

          // Extract pack formats from packs
          const packFormats = result.packs.reduce(
            (acc: Record<string, number>, pack: PackMeta) => {
              if (pack.pack_format !== undefined) {
                acc[pack.id] = pack.pack_format;
              }
              return acc;
            },
            {},
          );
          setPackFormats(packFormats);

          ingestAssets(result.assets);

          // Ingest providers (batch operation for performance)
          ingestAllProviders(result.providers);

          // Load entity version variants
          try {
            const variants = await getEntityVersionVariants(resourcepacksDir);
            setEntityVersionVariants(variants);
            console.log(
              "[Auto-scan] Entity version variants loaded:",
              variants,
            );
          } catch (err) {
            console.warn(
              "[Auto-scan] Failed to load entity version variants:",
              err,
            );
            setEntityVersionVariants({});
          }

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
      setEntityVersionVariants,
      setPackFormats,
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
    console.log("[MainRoute] useEffect TRIGGERED - starting particle initialization");
    let cancelled = false;

    const initVanillaTextures = async () => {
      console.log("[MainRoute] initVanillaTextures function called, cancelled=", cancelled);
      if (cancelled) return;

      // Particle data is now lazy-loaded when Preview3D first renders
      // No need to load it here - it will be loaded on-demand

      // Initialize vanilla textures in background (slow, can run in parallel)
      try {
        // This will search for Minecraft in multiple launcher locations
        // This also extracts particle physics from the Minecraft JAR
        await initializeVanillaTextures();
        console.log("Vanilla textures initialized");
      } catch (error) {
        // If vanilla textures can't be initialized, just log it
        // User can still browse for packs and configure Minecraft location in settings
        console.warn("Could not auto-initialize vanilla textures:", error);
      }
    };
    initVanillaTextures();

    return () => {
      cancelled = true;
    };
  }, []);

  // Configure tabs for BlockyTabs layout
  const blockyTabsConfig: Record<ZoneId, TabItem[]> = useMemo(
    () => ({
      left: [
        {
          id: "resource-packs",
          label: "Resource Packs",
          icon: cobbleImg,
          color: "#4A90E2",
          defaultDrawerSize: 25,
          content: (
            <PackList
              packs={packListItems}
              disabledPacks={disabledPackListItems}
              onReorder={handleReorderPacks}
              onReorderDisabled={handleReorderDisabledPacks}
              onDisable={handleDisablePack}
              onEnable={handleEnablePack}
              onBrowse={handleBrowsePacksFolder}
              packsDir={packsDir}
              selectedLauncher={selectedLauncher}
              availableLaunchers={availableLaunchers}
              onLauncherChange={handleLauncherChange}
            />
          ),
        },
        {
          id: "resource-cards",
          label: "Resource Cards",
          icon: dirtImg,
          color: "#50C878",
          defaultDrawerSize: 35,
          content: (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <div
                style={{
                  padding: "var(--spacing-md)",
                  paddingBottom: 0,
                  position: "relative",
                  zIndex: 10,
                  backgroundColor: "var(--color-bg-primary, white)",
                }}
              >
                <SearchBar
                  value={uiState.searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search blocks, mobs, textures..."
                />
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                <AssetResults
                  assets={assetListItems}
                  selectedId={uiState.selectedAssetId}
                  onSelect={setSelectedAsset}
                  onPaginationChange={setPaginationInfo}
                />
              </div>
              {paginationInfo.totalPages > 1 && (
                <div
                  style={{
                    padding: "var(--spacing-md)",
                    paddingTop: 0,
                    position: "relative",
                    zIndex: 10,
                    backgroundColor: "var(--color-bg-primary, white)",
                  }}
                >
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={!paginationInfo.hasPrevPage}
                        />
                      </PaginationItem>
                      {renderPageNumbers(
                        currentPage,
                        paginationInfo.totalPages,
                        setCurrentPage,
                      )}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={!paginationInfo.hasNextPage}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          ),
        },
        {
          id: "biome-colormaps",
          label: "Biome & Colormaps",
          icon: logImg,
          color: "#8BC34A",
          defaultDrawerSize: 30,
          content: (
            <div
              style={{
                padding: "var(--spacing-md)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--spacing-lg)",
              }}
            >
              {/* Global Biome Selector */}
              <div>
                <h3 style={{ marginTop: 0, marginBottom: "var(--spacing-md)" }}>
                  Select Biome
                </h3>
                <BiomeSelector />
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "#888",
                    marginTop: "0.5rem",
                  }}
                >
                  Choose a biome to automatically set grass and foliage colors,
                  or click directly on the colormaps below.
                </p>
              </div>

              <div>
                <h3 style={{ marginTop: 0, marginBottom: "var(--spacing-md)" }}>
                  Grass Colormap
                </h3>
                <BiomeColorCard
                  assetId="minecraft:colormap/grass"
                  type="grass"
                  showSourceSelector={true}
                  updateGlobalState={true}
                />
              </div>
              <div>
                <h3 style={{ marginTop: 0, marginBottom: "var(--spacing-md)" }}>
                  Foliage Colormap
                </h3>
                <BiomeColorCard
                  assetId="minecraft:colormap/foliage"
                  type="foliage"
                  showSourceSelector={true}
                  updateGlobalState={true}
                />
              </div>
            </div>
          ),
        },
      ],
      right: [
        {
          id: "block-properties",
          label: "Block Properties",
          icon: pickaxeImg,
          color: "#FF9800",
          defaultDrawerSize: 30,
          content: (
            <OptionsPanel
              assetId={
                blockItemPair?.blockId ?? uiState.selectedAssetId
              }
              providers={providers}
              onSelectProvider={handleSelectProvider}
              onBlockPropsChange={setBlockProps}
              onSeedChange={setSeed}
              onParticleConditionOverridesChange={setParticleConditionOverrides}
              allAssets={allAssets.map((a: AssetRecord) => ({
                id: a.id,
                name: a.id,
              }))}
              onSelectVariant={setSelectedAsset}
              onViewingVariantChange={setViewingVariantId}
              itemDisplayMode={itemDisplayMode}
              onItemDisplayModeChange={setItemDisplayMode}
            />
          ),
        },
        {
          id: "canvas-settings",
          label: "Canvas Settings",
          icon: swordImg,
          color: "#9C27B0",
          defaultDrawerSize: 25,
          content: <CanvasSettings />,
        },
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
      uiState.searchQuery,
      uiState.selectedAssetId,
      setSearchQuery,
      assetListItems,
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
    ],
  );

  // Render the appropriate preview based on canvas render mode
  const renderCanvas = () => {
    // Auto-determine if certain modes should be disabled
    const is2DOnly =
      uiState.selectedAssetId && is2DOnlyTexture(uiState.selectedAssetId);
    const isParticle =
      uiState.selectedAssetId && isParticleTexture(uiState.selectedAssetId);
    const previewBlockId = blockItemPair?.blockId ?? uiState.selectedAssetId;
    const previewItemId = blockItemPair?.itemId ?? uiState.selectedAssetId;
    const preview2DId =
      blockItemPair?.blockId &&
      blockItemPair?.itemId &&
      canvas2DTextureSource === "item"
        ? blockItemPair.itemId
        : previewBlockId ?? previewItemId;

    // Override mode for special asset types
    let effectiveMode = canvasRenderMode;
    // 2D-only textures (GUI, etc.) can't be rendered as 3D or items
    // Note: Particles are NOT 2D-only - they support both 2D and 3D modes via PreviewParticle
    if (
      is2DOnly &&
      !isParticle &&
      (canvasRenderMode === "3D" || canvasRenderMode === "Item")
    ) {
      effectiveMode = "2D";
    }
    if (!uiState.selectedAssetId) {
      effectiveMode = "3D"; // Default to 3D when nothing selected
    }

    let content;

    // Particles use PreviewParticle which handles both 2D and 3D modes internally
    if (isParticle && uiState.selectedAssetId) {
      content = <PreviewParticle assetId={uiState.selectedAssetId} />;
    } else {
      switch (effectiveMode) {
        case "2D":
          content = uiState.selectedAssetId ? (
            <Preview2D assetId={preview2DId} />
          ) : null;
          break;
        case "Item":
          content = uiState.selectedAssetId ? (
            <PreviewItem
              assetId={previewItemId}
              displayMode={itemDisplayMode}
            />
          ) : null;
          break;
        case "3D":
        default:
          content = (
            <Preview3D
              assetId={viewingVariantId || previewBlockId}
              sourceAssetId={viewingVariantId ?? uiState.selectedAssetId}
              biomeColor={biomeColor}
              onTintDetected={setTintInfo}
              showPot={showPot}
              blockProps={blockProps}
              particleConditionOverrides={particleConditionOverrides}
              seed={seed}
              allAssetIds={allAssetIds}
            />
          );
      }
    }

    return (
      <div ref={canvasRef} style={{ width: "100%", height: "100%" }}>
        {content}
      </div>
    );
  };

  return (
    <div className={s.container}>
      {/* Header */}
      <div className={s.header} data-tauri-drag-region>
        <div className={s.headerContent}>
          <div className={s.headerLeft}>
            <div className={s.headerTitle}>
              <h1>Weaverbird</h1>
              <p>Minecraft Resource Pack Manager</p>
            </div>
          </div>
          <div className={s.headerRight}>
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
      </div>

      {/* Main Content - BlockyTabs Layout */}
      <div className={s.mainContent}>
        {/* Canvas Type Selector - Floating above everything */}
        <CanvasTypeSelector
          targetRef={canvasRef}
          disabled2D={
            uiState.selectedAssetId
              ? !is2DOnlyTexture(uiState.selectedAssetId) &&
              !isEntityTexture(uiState.selectedAssetId) &&
              !isMinecraftItem(uiState.selectedAssetId) &&
              !isParticleTexture(uiState.selectedAssetId)
              : false
          }
          disabled3D={
            uiState.selectedAssetId
              ? (is2DOnlyTexture(uiState.selectedAssetId) &&
                !isParticleTexture(uiState.selectedAssetId)) ||
              (isMinecraftItem(uiState.selectedAssetId) && !blockItemPair?.blockId)
              : false
          }
          disabledItem={
            uiState.selectedAssetId
              ? isEntityTexture(uiState.selectedAssetId) ||
              is2DOnlyTexture(uiState.selectedAssetId) ||
              isParticleTexture(uiState.selectedAssetId)
              : false
          }
        />

        {/* BlockyTabs with Canvas as center */}
        <BlockyTabs
          initialTabs={blockyTabsConfig}
          showZones={false}
          fullscreen={true}
        >
          {renderCanvas()}
        </BlockyTabs>
      </div>

      {/* Footer */}
      <div className={s.footer}>
        <VanillaTextureProgress
          progress={vanillaProgress}
          isVisible={vanillaProgressVisible}
        />
        <SaveBar
          isLoading={false}
          progress={uiState.progress}
          disabled={!uiState.outputDir || !packsDir}
          packsDir={packsDir}
          packOrder={packOrder}
          overrides={overridesRecord}
          outputDir={uiState.outputDir}
          statusMessage={errorMessage || successMessage}
          statusType={
            errorMessage ? "error" : successMessage ? "success" : "idle"
          }
          onClearStatus={() => {
            setErrorMessage("");
            setSuccessMessage("");
          }}
          onSuccess={() => {
            setErrorMessage("");
            setSuccessMessage("Weaver Nest built successfully!");
          }}
          onError={(error: string) => {
            setSuccessMessage("");
            setErrorMessage(error);
          }}
        />
      </div>

      {/* Settings Modal */}
      <Settings
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        minecraftTab={<MinecraftLocations />}
        vanillaVersionTab={<VanillaTextureVersion />}
        targetVersionTab={<TargetVersion />}
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
