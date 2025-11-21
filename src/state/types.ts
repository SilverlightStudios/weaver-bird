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
  foliageColormapUrl?: string; // Resolved URL of active foliage colormap
  selectedGrassColor?: { r: number; g: number; b: number }; // Sampled grass color at coordinates
  selectedFoliageColor?: { r: number; g: number; b: number }; // Sampled foliage color at coordinates
  selectedBiomeId?: string; // Biome ID if coordinates match a biome, null otherwise
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
