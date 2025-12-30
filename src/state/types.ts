/**
 * Type definitions for Weaverbird state management
 */

export type PackId = string;
export type AssetId = string;

/**
 * Metadata for a resource pack
 */
export interface PackMeta {
  id: PackId;
  name: string;
  path: string;
  size: number;
  is_zip: boolean;
  description?: string;
  icon_data?: string; // Base64-encoded PNG
  pack_format?: number; // Pack format version from pack.mcmeta
}

/**
 * Record of an asset (block, mob, UI element, etc.)
 */
export interface AssetRecord {
  id: AssetId;
  labels: string[];
  files: string[];
}

/**
 * Information about which packs provide an asset
 */
export interface Provider {
  packId: PackId;
  fileMap: Record<string, true>;
}

/**
 * Override entry that "pencils" an asset to a specific pack
 */
export interface OverrideEntry {
  packId: PackId;
  penciled: true;
  variantPath?: string;
}

export interface OverrideWirePayload {
  packId: PackId;
  variantPath?: string;
}

/**
 * Normalized entities state
 */
export interface EntitiesState {
  packs: Record<PackId, PackMeta>;
  packOrder: PackId[];
  disabledPackIds: PackId[];
  assets: Record<AssetId, AssetRecord>;
  providersByAsset: Record<AssetId, PackId[]>;
  overrides: Record<AssetId, OverrideEntry | undefined>;
  packFormats: Record<string, number>; // Maps pack ID to pack format version
}

/**
 * Launcher information
 */
export interface LauncherInfo {
  launcher_type: string;
  name: string;
  minecraft_dir: string;
  found: boolean;
  icon: string;
  icon_path?: string;
}

/**
 * Canvas rendering mode
 */
export type CanvasRenderMode = "3D" | "2D" | "Item";

export type EntityAnimationVariant = "pack" | "vanilla";

/**
 * UI/interaction state
 */
export interface UIState {
  selectedAssetId?: AssetId;
  searchQuery: string;
  progress?: {
    phase: string;
    completed: number;
    total: number;
    bytes?: number;
  };
  outputDir?: string;
  packFormat: number;
  packsDir?: string;
  selectedLauncher?: LauncherInfo;
  availableLaunchers: LauncherInfo[];
  currentPage: number;
  itemsPerPage: number;

  // Colormap State - Centralized colormap management
  colormapCoordinates?: { x: number; y: number }; // Current position on colormap (0-255, 0-255)
  grassColormapUrl?: string; // Resolved URL of active grass colormap
  grassColormapPackId?: string; // Pack ID that provides the grass colormap
  foliageColormapUrl?: string; // Resolved URL of active foliage colormap
  foliageColormapPackId?: string; // Pack ID that provides the foliage colormap
  selectedGrassColor?: { r: number; g: number; b: number }; // Sampled grass color at coordinates
  selectedFoliageColor?: { r: number; g: number; b: number }; // Sampled foliage color at coordinates
  selectedBiomeId?: string; // Biome ID if coordinates match a biome, null otherwise

  // Canvas rendering mode
  canvasRenderMode: CanvasRenderMode; // Current canvas rendering mode (3D, 2D, or Item)

  // Canvas-specific settings
  canvas3DShowGrid: boolean; // Show floor grid in 3D canvas
  canvas2DShowPixelGrid: boolean; // Show pixel grid in 2D canvas
  canvas2DShowUVWrap: boolean; // Show UV wrap overlay for entity textures in 2D canvas
  canvasItemShowGrid: boolean; // Show grid in item canvas
  canvasItemRotate: boolean; // Enable rotation animation in item canvas
  canvasItemHover: boolean; // Enable hover animation in item canvas

  // 3D block display settings
  showPot?: boolean; // Show pot for potted plants (default: true)

  // Sign text settings
  signText?: string[]; // Array of 4 lines of text for signs (default: ["", "", "", ""])

  // Entity variant selection (like blockstate properties but for entity model variants)
  entityVariant?: string; // Selected entity variant (e.g., "ceiling_middle" for hanging signs)

  // Entity model compatibility settings
  useLegacyCEM: boolean; // Use legacy CEM files for entities with compatibility issues (default: true)
  targetMinecraftVersion: string | null; // Target Minecraft version for compatibility (null = use current vanilla version)
  entityVersionVariants: Record<string, string[]>; // Map of entity ID -> available version folders

  // Entity animation settings
  animationPreset: string | null; // Active animation preset ID (null = no animation)
  animationPlaying: boolean; // Whether animation is currently playing
  animationSpeed: number; // Animation playback speed multiplier (0.1 - 3.0)
  entityHeadYaw: number; // Entity head yaw for manual control (degrees)
  entityHeadPitch: number; // Entity head pitch for manual control (degrees)
  availableAnimationPresets: string[] | null; // Presets relevant to current model (null = show all)

  // Entity animation triggers (one-shot overlays)
  availableAnimationTriggers: string[] | null; // Triggers relevant to current model (null = show none)
  animationTriggerRequestId: string | null; // Trigger to play (engine consumes)
  animationTriggerRequestNonce: number; // Monotonic counter to re-trigger same ID

  // Entity pose toggles (persistent overlays)
  availablePoseToggles: string[] | null; // Pose toggles relevant to current model (null = show none)
  activePoseToggles: Record<string, boolean>; // Active pose toggle IDs

  // Entity feature layers (multi-part entities / overlays)
  entityFeatureStateByAssetId: Record<
    AssetId,
    {
      toggles: Record<string, boolean>;
      selects: Record<string, string>;
    }
  >;

  // Entity animation source selection (per entity texture asset)
  entityAnimationVariantByAssetId: Record<AssetId, EntityAnimationVariant>;

  // Debug mode
  jemDebugMode: boolean; // Enable JEM model inspector for debugging entity models
}

/**
 * Complete application state
 */
export interface AppState extends EntitiesState, UIState {}

/**
 * Result from backend pack scanning
 */
export interface ScanResult {
  packs: PackMeta[];
  assets: AssetRecord[];
  providers: Record<AssetId, PackId[]>;
}
