/**
 * Zustand store action type definitions
 */
import type {
  AppState,
  PackId,
  AssetId,
  PackMeta,
  AssetRecord,
  EntityAnimationVariant,
} from "./types";

export interface StoreActions {
  // Pack management
  setPackOrder: (order: PackId[]) => void;
  ingestPacks: (packs: PackMeta[]) => void;
  disablePack: (packId: PackId, targetIndex?: number) => void;
  enablePack: (packId: PackId, targetIndex?: number) => void;
  setDisabledPackOrder: (order: PackId[]) => void;
  setPackFormats: (formats: Record<string, number>) => void;

  // Asset management
  ingestAssets: (assets: AssetRecord[]) => void;
  ingestProviders: (assetId: AssetId, providerIds: PackId[]) => void;
  ingestAllProviders: (providers: Record<AssetId, PackId[]>) => void;

  // Overrides (pencil functionality)
  setOverride: (
    assetId: AssetId,
    packId: PackId | undefined,
    options?: { variantPath?: string },
  ) => void;

  // UI state
  setOutputDir: (path: string) => void;
  setPackFormat: (format: number) => void;
  setSearchQuery: (query: string) => void;
  setSelectedAsset: (id: AssetId | undefined) => void;
  setProgress: (progress: AppState["progress"]) => void;
  setPacksDir: (path: string) => void;

  // Launcher management
  setSelectedLauncher: (launcher: AppState["selectedLauncher"]) => void;
  setAvailableLaunchers: (launchers: AppState["availableLaunchers"]) => void;

  // Pagination
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (itemsPerPage: number) => void;

  // Biome selection
  setSelectedBiomeId: (biomeId: string | undefined) => void;
  setSelectedFoliageColor: (
    color: { r: number; g: number; b: number } | undefined,
  ) => void;

  // Colormap state actions - NEW centralized colormap management
  setColormapCoordinates: (
    coords: { x: number; y: number } | undefined,
  ) => void;
  setGrassColormapUrl: (url: string | undefined) => void;
  setGrassColormapPackId: (packId: string | undefined) => void;
  setFoliageColormapUrl: (url: string | undefined) => void;
  setFoliageColormapPackId: (packId: string | undefined) => void;
  setSelectedGrassColor: (
    color: { r: number; g: number; b: number } | undefined,
  ) => void;

  // Canvas rendering mode
  setCanvasRenderMode: (mode: AppState["canvasRenderMode"]) => void;

  // Canvas settings
  setCanvas3DShowGrid: (show: boolean) => void;
  setCanvas2DShowPixelGrid: (show: boolean) => void;
  setCanvas2DShowUVWrap: (show: boolean) => void;
  setCanvas2DTextureSource: (source: AppState["canvas2DTextureSource"]) => void;
  setCanvasItemShowGrid: (show: boolean) => void;
  setCanvasItemRotate: (rotate: boolean) => void;
  setCanvasItemHover: (hover: boolean) => void;
  setCanvasItemAnimate: (animate: boolean) => void;
  setCanvasItemAnimationFrame: (frame: number) => void;
  setCanvasItemAnimationFrameCount: (count: number) => void;

  // 3D block display settings
  setShowPot: (show: boolean) => void;

  // Sign text settings
  setSignText: (text: string[]) => void;

  // Entity variant selection
  setEntityVariant: (variant: string | undefined) => void;

  // Entity model compatibility
  setUseLegacyCEM: (use: boolean) => void;
  setTargetMinecraftVersion: (version: string | null) => void;
  setEntityVersionVariants: (variants: Record<string, string[]>) => void;

  // Entity animation
  setAnimationPreset: (preset: string | null) => void;
  setAnimationPlaying: (playing: boolean) => void;
  setAnimationSpeed: (speed: number) => void;
  setEntityHeadYaw: (yaw: number) => void;
  setEntityHeadPitch: (pitch: number) => void;
  setEntitySwingDirection: (direction: number) => void;
  setAvailableAnimationPresets: (presets: string[] | null) => void;
  setAvailableAnimationTriggers: (triggers: string[] | null) => void;
  setAvailablePoseToggles: (toggles: string[] | null) => void;
  setAvailableBones: (bones: string[] | null) => void;
  setPoseToggleEnabled: (toggleId: string, enabled: boolean) => void;
  triggerAnimation: (triggerId: string) => void;

  // Entity feature layers
  setEntityFeatureToggle: (
    baseAssetId: AssetId,
    toggleId: string,
    enabled: boolean,
  ) => void;
  setEntityFeatureSelect: (
    baseAssetId: AssetId,
    selectId: string,
    value: string,
  ) => void;

  // Entity animation variant (pack vs vanilla)
  setEntityAnimationVariant: (
    assetId: AssetId,
    variant: EntityAnimationVariant,
  ) => void;

  // Debug mode
  setJemDebugMode: (enabled: boolean) => void;

  // Particle settings
  setShowBlockParticles: (show: boolean) => void;
  setShowEmissionPoints: (show: boolean) => void;
  setParticleQuality: (quality: "low" | "medium" | "high") => void;
  setParticleDataReady: (ready: boolean) => void;

  // Reset
  reset: () => void;
}
