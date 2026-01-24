/**
 * Initial state for Weaverbird store
 */
import type { AppState } from "./types";
import { POSE_TOGGLES } from "@lib/emf/animation";

export const POSE_GROUP_BY_ID: Record<string, string | undefined> = Object.fromEntries(
  POSE_TOGGLES.map((p) => [p.id, p.exclusiveGroup] as const),
);

export const initialState: AppState = {
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
