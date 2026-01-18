/**
 * Zustand store for Weaverbird application state
 * Uses immer for immutable updates and normalized entity structure
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  AppState,
  PackId,
  AssetId,
  PackMeta,
  AssetRecord,
  EntityAnimationVariant,
} from "./types";
import { clampAnimationSpeed } from "@lib/emf/animation/types";
import { POSE_TOGGLES } from "@lib/emf/animation";

interface StoreActions {
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

type WeaverbirdStore = AppState & StoreActions;

const POSE_GROUP_BY_ID: Record<string, string | undefined> = Object.fromEntries(
  POSE_TOGGLES.map((p) => [p.id, p.exclusiveGroup] as const),
);

const initialState: AppState = {
  // Entities
  packs: {},
  packOrder: [],
  disabledPackIds: [],
  assets: {},
  providersByAsset: {},
  overrides: {},
  packFormats: {},

  // UI
  selectedAssetId: undefined,
  searchQuery: "",
  progress: undefined,
  outputDir: undefined,
  packFormat: 48,
  packsDir: undefined,
  selectedLauncher: undefined,
  availableLaunchers: [],
  currentPage: 1,
  itemsPerPage: 50,

  // Colormap state - will be initialized by colormap manager
  colormapCoordinates: undefined, // Will be set to plains biome coords on init
  grassColormapUrl: undefined, // Will be resolved from top pack
  foliageColormapUrl: undefined, // Will be resolved from top pack
  selectedGrassColor: undefined, // Will be sampled from colormap
  selectedFoliageColor: undefined, // Will be sampled from colormap
  selectedBiomeId: "plains", // Default to plains biome

  // Canvas rendering mode
  canvasRenderMode: "3D", // Default to 3D view

  // Canvas settings
  canvas3DShowGrid: true, // Show floor grid by default in 3D
  canvas2DShowPixelGrid: false, // Hide pixel grid by default in 2D
  canvas2DShowUVWrap: false, // Hide UV wrap overlay by default in 2D
  canvas2DTextureSource: "block", // Default to block texture
  canvasItemShowGrid: true, // Show grid by default in item canvas
  canvasItemRotate: true, // Enable rotation by default
  canvasItemHover: true, // Enable hover by default
  canvasItemAnimate: true, // Animate item textures by default
  canvasItemAnimationFrame: -1, // Default to auto
  canvasItemAnimationFrameCount: 0,

  // 3D block display settings
  showPot: false, // Hide pot by default for potted plants

  // Sign text settings
  signText: ["", "", "", ""], // Default empty sign text

  // Entity variant selection
  entityVariant: undefined, // Default no variant selected (use base model)

  // Entity model compatibility
  useLegacyCEM: true, // Use legacy CEM by default for older packs
  targetMinecraftVersion: null, // Default to current vanilla version
  entityVersionVariants: {}, // Will be loaded when packs are scanned

  // Entity animation settings
  animationPreset: null, // No animation by default
  animationPlaying: false, // Not playing by default
  animationSpeed: 1.0, // Normal speed
  entityHeadYaw: 0, // Looking forward
  entityHeadPitch: 0, // Looking forward
  entitySwingDirection: 3, // Default WEST direction (swings on Z axis)
  availableAnimationPresets: null, // Show all presets by default
  availableAnimationTriggers: null, // No triggers by default
  availableBones: null, // Unknown bones by default
  animationTriggerRequestId: null,
  animationTriggerRequestNonce: 0,
  availablePoseToggles: null, // No pose toggles by default
  activePoseToggles: {},

  // Entity feature layers
  entityFeatureStateByAssetId: {},

  // Entity animation variant selection
  entityAnimationVariantByAssetId: {},

  // Debug mode
  jemDebugMode: false, // Debug mode disabled by default

  // Particle settings
  showBlockParticles: true, // Show block particles by default
  showEmissionPoints: false, // Hide emission point markers by default
  particleQuality: "medium", // Medium quality by default
  particleDataReady: false, // Will be set true when physics/emissions caches load
};

export const useStore = create<WeaverbirdStore>()(
  immer((set) => ({
    ...initialState,

    // Pack management
    setPackOrder: (order: PackId[]) => {
      set((state) => {
        const disabledSet = new Set(state.disabledPackIds);
        const seen = new Set<string>();
        state.packOrder = order.filter((id) => {
          if (disabledSet.has(id) || seen.has(id)) {
            return false;
          }
          seen.add(id);
          return true;
        });
      });
    },

    ingestPacks: (packs: PackMeta[]) => {
      set((state) => {
        for (const pack of packs) {
          state.packs[pack.id] = pack;
        }
      });
    },

    disablePack: (packId: PackId, targetIndex?: number) => {
      set((state) => {
        const currentIndex = state.packOrder.indexOf(packId);
        if (currentIndex === -1) {
          return;
        }

        state.packOrder.splice(currentIndex, 1);

        const existingDisabledIndex = state.disabledPackIds.indexOf(packId);
        if (existingDisabledIndex !== -1) {
          state.disabledPackIds.splice(existingDisabledIndex, 1);
        }

        const maxIndex = state.disabledPackIds.length;
        const insertAt =
          targetIndex === undefined
            ? maxIndex
            : Math.min(Math.max(targetIndex, 0), maxIndex);

        state.disabledPackIds.splice(insertAt, 0, packId);
      });
    },

    enablePack: (packId: PackId, targetIndex?: number) => {
      set((state) => {
        const disabledIndex = state.disabledPackIds.indexOf(packId);
        if (disabledIndex === -1) {
          return;
        }

        state.disabledPackIds.splice(disabledIndex, 1);

        const maxIndex = state.packOrder.length;
        const insertAt =
          targetIndex === undefined
            ? maxIndex
            : Math.min(Math.max(targetIndex, 0), maxIndex);

        state.packOrder.splice(insertAt, 0, packId);
      });
    },

    setDisabledPackOrder: (order: PackId[]) => {
      set((state) => {
        const disabledSet = new Set(state.disabledPackIds);
        const seen = new Set<string>();
        const filtered = order.filter((id) => {
          if (!disabledSet.has(id) || seen.has(id)) {
            return false;
          }
          seen.add(id);
          return true;
        });
        const remainder = state.disabledPackIds.filter((id) => !seen.has(id));
        state.disabledPackIds = [...filtered, ...remainder];
      });
    },

    setPackFormats: (formats: Record<string, number>) => {
      set((state) => {
        state.packFormats = formats;
      });
    },

    // Asset management
    ingestAssets: (assets: AssetRecord[]) => {
      set((state) => {
        for (const asset of assets) {
          state.assets[asset.id] = asset;
        }
      });
    },

    ingestProviders: (assetId: AssetId, providerIds: PackId[]) => {
      set((state) => {
        state.providersByAsset[assetId] = providerIds;
      });
    },

    // Batch ingest all providers at once (performance optimization)
    ingestAllProviders: (providers: Record<AssetId, PackId[]>) => {
      set((state) => {
        state.providersByAsset = providers;
      });
    },

    // Overrides
    setOverride: (
      assetId: AssetId,
      packId: PackId | undefined,
      options?: { variantPath?: string },
    ) => {
      set((state) => {
        if (packId === undefined) {
          state.overrides[assetId] = undefined;
        } else {
          state.overrides[assetId] = {
            packId,
            penciled: true,
            variantPath: options?.variantPath,
          };
        }
      });
    },

    // UI
    setOutputDir: (path: string) => {
      set((state) => {
        state.outputDir = path;
      });
    },

    setPackFormat: (format: number) => {
      set((state) => {
        state.packFormat = format;
      });
    },

    setSearchQuery: (query: string) => {
      set((state) => {
        state.searchQuery = query;
      });
    },

    setSelectedAsset: (id: AssetId | undefined) => {
      set((state) => {
        state.selectedAssetId = id;
      });
    },

    setProgress: (progress: AppState["progress"]) => {
      set((state) => {
        state.progress = progress;
      });
    },

    setPacksDir: (path: string) => {
      set((state) => {
        state.packsDir = path;
      });
    },

    setSelectedLauncher: (launcher: AppState["selectedLauncher"]) => {
      set((state) => {
        state.selectedLauncher = launcher;
      });
    },

    setAvailableLaunchers: (launchers: AppState["availableLaunchers"]) => {
      set((state) => {
        state.availableLaunchers = launchers;
      });
    },

    setCurrentPage: (page: number) => {
      set((state) => {
        state.currentPage = page;
      });
    },

    setItemsPerPage: (itemsPerPage: number) => {
      set((state) => {
        state.itemsPerPage = itemsPerPage;
      });
    },

    setSelectedBiomeId: (biomeId: string | undefined) => {
      set((state) => {
        state.selectedBiomeId = biomeId;
      });
    },

    setSelectedFoliageColor: (
      color: { r: number; g: number; b: number } | undefined,
    ) => {
      set((state) => {
        state.selectedFoliageColor = color;
      });
    },

    // NEW Colormap state actions
    setColormapCoordinates: (coords: { x: number; y: number } | undefined) => {
      set((state) => {
        state.colormapCoordinates = coords;
      });
    },

    setGrassColormapUrl: (url: string | undefined) => {
      set((state) => {
        state.grassColormapUrl = url;
      });
    },

    setGrassColormapPackId: (packId: string | undefined) => {
      set((state) => {
        state.grassColormapPackId = packId;
      });
    },

    setFoliageColormapUrl: (url: string | undefined) => {
      set((state) => {
        state.foliageColormapUrl = url;
      });
    },

    setFoliageColormapPackId: (packId: string | undefined) => {
      set((state) => {
        state.foliageColormapPackId = packId;
      });
    },

    setSelectedGrassColor: (
      color: { r: number; g: number; b: number } | undefined,
    ) => {
      console.log("[Store] setSelectedGrassColor called with:", color);
      set((state) => {
        state.selectedGrassColor = color;
      });
    },

    setCanvasRenderMode: (mode: AppState["canvasRenderMode"]) => {
      set((state) => {
        state.canvasRenderMode = mode;
      });
    },

    // Canvas settings
    setCanvas3DShowGrid: (show: boolean) => {
      set((state) => {
        state.canvas3DShowGrid = show;
      });
    },

    setCanvas2DShowPixelGrid: (show: boolean) => {
      set((state) => {
        state.canvas2DShowPixelGrid = show;
      });
    },

    setCanvas2DShowUVWrap: (show: boolean) => {
      set((state) => {
        state.canvas2DShowUVWrap = show;
      });
    },
    setCanvas2DTextureSource: (source: AppState["canvas2DTextureSource"]) => {
      set((state) => {
        state.canvas2DTextureSource = source;
      });
    },

    setCanvasItemShowGrid: (show: boolean) => {
      set((state) => {
        state.canvasItemShowGrid = show;
      });
    },

    setCanvasItemRotate: (rotate: boolean) => {
      set((state) => {
        state.canvasItemRotate = rotate;
      });
    },

    setCanvasItemHover: (hover: boolean) => {
      set((state) => {
        state.canvasItemHover = hover;
      });
    },
    setCanvasItemAnimate: (animate: boolean) => {
      set((state) => {
        state.canvasItemAnimate = animate;
      });
    },
    setCanvasItemAnimationFrame: (frame: number) => {
      set((state) => {
        state.canvasItemAnimationFrame = frame;
      });
    },
    setCanvasItemAnimationFrameCount: (count: number) => {
      set((state) => {
        state.canvasItemAnimationFrameCount = count;
      });
    },

    // 3D block display settings
    setShowPot: (show: boolean) => {
      set((state) => {
        state.showPot = show;
      });
    },

    // Sign text settings
    setSignText: (text: string[]) => {
      set((state) => {
        state.signText = text;
      });
    },

    // Entity variant selection
    setEntityVariant: (variant: string | undefined) => {
      set((state) => {
        state.entityVariant = variant;
      });
    },

    // Entity model compatibility
    setUseLegacyCEM: (use: boolean) => {
      set((state) => {
        state.useLegacyCEM = use;
      });
    },

    setTargetMinecraftVersion: (version: string | null) => {
      set((state) => {
        state.targetMinecraftVersion = version;
      });
    },

    setEntityVersionVariants: (variants: Record<string, string[]>) => {
      set((state) => {
        state.entityVersionVariants = variants;
      });
    },

    // Entity animation
    setAnimationPreset: (preset: string | null) => {
      set((state) => {
        state.animationPreset = preset;
        // Auto-play when preset is selected
        state.animationPlaying = preset !== null;
      });
    },

    setAnimationPlaying: (playing: boolean) => {
      set((state) => {
        state.animationPlaying = playing;
      });
    },

    setAnimationSpeed: (speed: number) => {
      set((state) => {
        state.animationSpeed = clampAnimationSpeed(speed);
      });
    },

    setEntityHeadYaw: (yaw: number) => {
      set((state) => {
        // Normalize to -180 to 180 range
        state.entityHeadYaw = ((yaw + 180) % 360) - 180;
      });
    },

    setEntityHeadPitch: (pitch: number) => {
      set((state) => {
        // Clamp pitch to -90 to 90 (can't look further than straight up/down)
        state.entityHeadPitch = Math.max(-90, Math.min(90, pitch));
      });
    },

    setEntitySwingDirection: (direction: number) => {
      set((state) => {
        // Clamp to valid range 0-3 (NORTH, SOUTH, EAST, WEST)
        state.entitySwingDirection = Math.max(0, Math.min(3, Math.floor(direction)));
      });
    },

    setAvailableAnimationPresets: (presets: string[] | null) => {
      set((state) => {
        state.availableAnimationPresets = presets;
      });
    },

    setAvailableAnimationTriggers: (triggers: string[] | null) => {
      set((state) => {
        state.availableAnimationTriggers = triggers;
      });
    },

    setAvailablePoseToggles: (toggles: string[] | null) => {
      set((state) => {
        state.availablePoseToggles = toggles;

        const allow = toggles ? new Set(toggles) : null;
        for (const key of Object.keys(state.activePoseToggles)) {
          if (allow && allow.has(key)) continue;
          delete state.activePoseToggles[key];
        }
      });
    },

    setAvailableBones: (bones: string[] | null) => {
      set((state) => {
        state.availableBones = bones;
      });
    },

    setPoseToggleEnabled: (toggleId: string, enabled: boolean) => {
      set((state) => {
        const available = state.availablePoseToggles;
        if (!available || !available.includes(toggleId)) return;
        const group = POSE_GROUP_BY_ID[toggleId];
        if (enabled && group) {
          for (const [id] of Object.entries(state.activePoseToggles)) {
            if (id !== toggleId && POSE_GROUP_BY_ID[id] === group) {
              delete state.activePoseToggles[id];
            }
          }
        }
        if (enabled) state.activePoseToggles[toggleId] = true;
        else delete state.activePoseToggles[toggleId];
      });
    },

    triggerAnimation: (triggerId: string) => {
      set((state) => {
        state.animationTriggerRequestId = triggerId;
        state.animationTriggerRequestNonce += 1;
      });
    },

    setEntityFeatureToggle: (baseAssetId, toggleId, enabled) => {
      set((state) => {
        state.entityFeatureStateByAssetId[baseAssetId] ??= {
          toggles: {},
          selects: {},
        };
        // Mutual exclusivity for equipment underlay toggles (player vs armor stand).
        // Keep this centralized so the UI doesn't need special casing.
        if (enabled && toggleId === "equipment.add_player") {
          state.entityFeatureStateByAssetId[baseAssetId].toggles[
            "equipment.add_armor_stand"
          ] = false;
        }
        if (enabled && toggleId === "equipment.add_armor_stand") {
          state.entityFeatureStateByAssetId[baseAssetId].toggles[
            "equipment.add_player"
          ] = false;
        }
        state.entityFeatureStateByAssetId[baseAssetId].toggles[toggleId] =
          enabled;
      });
    },

    setEntityFeatureSelect: (baseAssetId, selectId, value) => {
      set((state) => {
        state.entityFeatureStateByAssetId[baseAssetId] ??= {
          toggles: {},
          selects: {},
        };
        state.entityFeatureStateByAssetId[baseAssetId].selects[selectId] = value;
      });
    },

    setEntityAnimationVariant: (assetId, variant) => {
      set((state) => {
        state.entityAnimationVariantByAssetId[assetId] = variant;
      });
    },

    setJemDebugMode: (enabled: boolean) => {
      set((state) => {
        state.jemDebugMode = enabled;
      });
    },

    // Particle settings
    setShowBlockParticles: (show: boolean) => {
      set((state) => {
        state.showBlockParticles = show;
      });
    },

    setShowEmissionPoints: (show: boolean) => {
      set((state) => {
        state.showEmissionPoints = show;
      });
    },

    setParticleQuality: (quality: "low" | "medium" | "high") => {
      set((state) => {
        state.particleQuality = quality;
      });
    },

    setParticleDataReady: (ready: boolean) => {
      set((state) => {
        state.particleDataReady = ready;
      });
    },

    reset: () => {
      set(initialState);
    },
  })),
);

export type { WeaverbirdStore };
