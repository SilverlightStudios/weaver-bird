/**
 * Typed Tauri v2 command helpers
 *
 * Modern Tauri v2 pattern with structured error handling
 */

import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { OverrideWirePayload, ScanResult } from "@state";
import { normalizeAssetId } from "@lib/assetUtils";

/**
 * Structured error response from Tauri backend
 *
 * Provides error code, message, and optional details for better error handling
 */
export interface AppError {
  code:
    | "VALIDATION_ERROR"
    | "IO_ERROR"
    | "SCAN_ERROR"
    | "BUILD_ERROR"
    | "INTERNAL_ERROR";
  message: string;
  details?: string;
}

/**
 * Check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const obj = error as Record<string, unknown>;
  return (
    "code" in obj &&
    "message" in obj &&
    typeof obj.code === "string" &&
    typeof obj.message === "string"
  );
}

/**
 * Format error for display to user
 */
export function formatError(error: unknown): string {
  if (isAppError(error)) {
    if (error.details) {
      return `${error.message} (${error.details})`;
    }
    return error.message;
  }
  return String(error);
}

/**
 * Scan a resource packs folder for all packs and assets
 */
export async function scanPacksFolder(path: string): Promise<ScanResult> {
  return invoke<ScanResult>("scan_packs_folder", { packsDir: path });
}

/**
 * Build the Weaver Nest output pack
 */
export async function buildWeaverNest(request: {
  packsDir: string;
  packOrder: string[];
  overrides: Record<string, OverrideWirePayload>;
  outputDir: string;
}): Promise<string> {
  return invoke<string>("build_weaver_nest", request);
}

/**
 * Get the default Minecraft resourcepacks directory
 */
export async function getDefaultPacksDir(): Promise<string> {
  return invoke<string>("get_default_packs_dir");
}

/**
 * Open a folder browser dialog
 */
export async function openFolderDialog(
  defaultPath?: string,
): Promise<string | null> {
  try {
    return await open({
      directory: true,
      defaultPath,
    });
  } catch (error) {
    console.error("Failed to open folder dialog:", error);
    return null;
  }
}

/**
 * Initialize vanilla textures (extract from Minecraft JAR if needed)
 * Should be called on app startup
 */
export async function initializeVanillaTextures(): Promise<string> {
  return invoke<string>("initialize_vanilla_textures");
}

function addUnderscoreBeforeDigits(assetId: string): string {
  const colonIndex = assetId.indexOf(":");
  const namespace = colonIndex >= 0 ? assetId.slice(0, colonIndex) : "";
  const path = colonIndex >= 0 ? assetId.slice(colonIndex + 1) : assetId;
  const updatedPath = path.replace(/([a-zA-Z])(\d+)/g, "$1_$2");
  return colonIndex >= 0 ? `${namespace}:${updatedPath}` : updatedPath;
}

function buildTextureAssetIdCandidates(assetId: string): string[] {
  const candidates: string[] = [];
  const pushCandidate = (id: string) => {
    if (id && !candidates.includes(id)) {
      candidates.push(id);
    }
  };

  pushCandidate(assetId);

  const normalized = normalizeAssetId(assetId);
  pushCandidate(normalized);
  pushCandidate(addUnderscoreBeforeDigits(normalized));

  return candidates;
}

async function resolveTexturePath(
  assetId: string,
  resolver: (candidateId: string) => Promise<string>,
): Promise<string> {
  const candidates = buildTextureAssetIdCandidates(assetId);
  let lastError: unknown = null;

  for (const candidateId of candidates) {
    try {
      return await resolver(candidateId);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error(`Texture not found for ${assetId}`);
}

/**
 * Get the file path to a vanilla texture
 * @param assetId - Asset ID like "minecraft:block/stone"
 * @returns Absolute path to the texture PNG file
 */
export async function getVanillaTexturePath(assetId: string): Promise<string> {
  return resolveTexturePath(assetId, (candidateId) =>
    invoke<string>("get_vanilla_texture_path", { assetId: candidateId }),
  );
}

/**
 * Check if Minecraft is installed at the default location
 * @returns true if Minecraft installation found
 */
export async function checkMinecraftInstalled(): Promise<boolean> {
  return invoke<boolean>("check_minecraft_installed");
}

/**
 * Get suggested Minecraft installation paths for the current platform
 * @returns Array of likely Minecraft installation paths
 */
export async function getSuggestedMinecraftPaths(): Promise<string[]> {
  return invoke<string[]>("get_suggested_minecraft_paths");
}

/**
 * Initialize vanilla textures from a custom Minecraft directory
 * @param minecraftDir - Path to the .minecraft directory
 * @returns Path to the vanilla textures cache directory
 */
export async function initializeVanillaTexturesFromCustomDir(
  minecraftDir: string,
): Promise<string> {
  return invoke<string>("initialize_vanilla_textures_from_custom_dir", {
    minecraftDir,
  });
}

/**
 * List all available Minecraft versions
 * @returns Array of available Minecraft versions
 */
export async function listAvailableMinecraftVersions(): Promise<
  MinecraftVersion[]
> {
  return invoke<MinecraftVersion[]>("list_available_minecraft_versions");
}

/**
 * Get the currently cached vanilla texture version
 * @returns Version string or null if no cache exists
 */
export async function getCachedVanillaVersion(): Promise<string | null> {
  return invoke<string | null>("get_cached_vanilla_version");
}

/**
 * Set the vanilla texture version to use
 * @param version - Version identifier (e.g., "1.21.4")
 * @returns Path to vanilla textures cache
 */
export async function setVanillaTextureVersion(
  version: string,
): Promise<string> {
  return invoke<string>("set_vanilla_texture_version", { version });
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
 * Information about a Minecraft version
 */
export interface MinecraftVersion {
  version: string;
  jar_path: string;
  modified_time: number;
}

/**
 * Detect all Minecraft launchers on the system
 * @returns Array of detected launchers
 */
export async function detectLaunchers(): Promise<LauncherInfo[]> {
  return invoke<LauncherInfo[]>("detect_launchers");
}

/**
 * Identify a launcher from a directory path
 * @param path - Directory path to identify
 * @returns Launcher information
 */
export async function identifyLauncher(path: string): Promise<LauncherInfo> {
  return invoke<LauncherInfo>("identify_launcher", { path });
}

/**
 * Get the resourcepacks directory for a launcher
 * @param launcherInfo - Launcher information
 * @returns Path to the resourcepacks directory
 */
export async function getLauncherResourcepacksDir(
  launcherInfo: LauncherInfo,
): Promise<string> {
  return invoke<string>("get_launcher_resourcepacks_dir", { launcherInfo });
}

/**
 * Get the full path to a texture file from a resource pack
 * @param packPath - Base path to the resource pack
 * @param assetId - Asset ID (e.g., "minecraft:block/stone")
 * @param isZip - Whether the pack is a ZIP file
 * @returns Full path to the texture file
 */
export async function getPackTexturePath(
  packPath: string,
  assetId: string,
  isZip: boolean,
  versionFolders?: string[] | null,
): Promise<string> {
  return resolveTexturePath(assetId, (candidateId) =>
    invoke<string>("get_pack_texture_path", {
      packPath,
      assetId: candidateId,
      isZip,
      ...(versionFolders && versionFolders.length > 0
        ? { versionFolders }
        : {}),
    }),
  );
}

/**
 * Get all entities that have version variants in JEM files
 * Scans all packs for JEM files in version-specific folders
 *
 * @param packsDir - Resource packs directory to scan
 * @returns Map of entity ID -> list of version folders (e.g., {"cow": ["21.4", "21.5"]})
 */
export async function getEntityVersionVariants(
  packsDir: string,
): Promise<Record<string, string[]>> {
  return invoke<Record<string, string[]>>("get_entity_version_variants", {
    packsDir,
  });
}

/**
 * Particle texture mapping from Minecraft
 */
export interface ParticleTextureMapping {
  textures: string[];
}

/**
 * Particle data extracted from Minecraft JAR
 */
export interface ParticleData {
  version: string;
  particles: Record<string, ParticleTextureMapping>;
}

/**
 * Get particle texture mappings for the currently cached Minecraft version
 *
 * Extracts particle definition JSONs from Minecraft JAR if not already cached.
 * This data is extracted on-demand from the user's installation, NOT bundled.
 *
 * @returns Particle data with particle type -> texture mappings, or null if not cached
 */
export async function getParticleData(): Promise<ParticleData | null> {
  return invoke<ParticleData | null>("get_particle_data");
}

/**
 * Get particle texture mappings for a specific Minecraft version
 *
 * @param version - Minecraft version string (e.g., "1.21.4")
 * @returns Particle data with particle type -> texture mappings
 */
export async function getParticleDataForVersion(
  version: string,
): Promise<ParticleData> {
  return invoke<ParticleData>("get_particle_data_for_version", { version });
}

/**
 * Extracted particle physics values from Minecraft source
 */
export interface ExtractedParticlePhysics {
  /** Lifetime range in game ticks [min, max] (20 ticks = 1 second) */
  lifetime?: [number, number] | null;
  /** Gravity value (negative = rises, positive = falls) */
  gravity?: number | null;
  /** Initial size (quad size) */
  size?: number | null;
  /** Size scale multiplier applied via `Particle.scale(...)` or constructor scale params */
  scale?: number | null;
  /** Whether the particle has physics (collision) */
  has_physics?: boolean | null;
  /** Initial alpha/opacity */
  alpha?: number | null;
  /** Friction/drag coefficient */
  friction?: number | null;
  /** Velocity multipliers applied in the particle constructor (per-axis) */
  velocity_multiplier?: [number, number, number] | null;
  /** Constant velocity added in the particle constructor (per-axis) */
  velocity_add?: [number, number, number] | null;
  /** Random velocity added in the particle constructor (per-axis), as rand(-0.5..0.5) * value */
  velocity_jitter?: [number, number, number] | null;
  /** Base RGB color (0..1) assigned in the particle constructor */
  color?: [number, number, number] | null;
  /** BaseAshSmokeParticle grayscale color scale (random.nextFloat() * color_scale) */
  color_scale?: number | null;
  /** BaseAshSmokeParticle base lifetime parameter (used in its lifetime formula) */
  lifetime_base?: number | null;
  /** If true, animation frames map to lifetime/age (SpriteSet.get(age, lifetime)) */
  lifetime_animation?: boolean | null;
  /** High-level behavior identifier (e.g., "particle", "rising", "ash_smoke", "flame") */
  behavior?: string | null;
  /** Velocity delta applied each tick [dx, dy, dz] */
  tick_velocity_delta?: [number, number, number] | null;
  /** Particles spawned by this particle during tick() */
  spawns_particles?: SpawnedParticle[] | null;
  /** Whether this particle skips friction (overrides tick() without calling super) */
  skips_friction?: boolean | null;
  /** Whether this particle uses static random texture (picks one texture and keeps it) */
  uses_static_texture?: boolean | null;
}

export interface SpawnedParticle {
  particle_id: string;
  probability_expr?: string | null;
  count_expr?: string | null;
}

/**
 * All extracted physics data for a Minecraft version
 */
export interface ExtractedPhysicsData {
  schema_version?: number;
  version: string;
  particles: Record<string, ExtractedParticlePhysics>;
}

/**
 * Get cached particle physics data for the current Minecraft version
 *
 * Returns physics data if already cached, otherwise returns null.
 * Use `extractParticlePhysics` to extract and cache physics data.
 *
 * @returns Cached physics data or null
 */
export async function getParticlePhysics(): Promise<ExtractedPhysicsData | null> {
  return invoke<ExtractedPhysicsData | null>("get_particle_physics");
}

/**
 * Check if particle physics data is cached for a version
 *
 * @param version - Minecraft version string
 * @returns true if physics data is cached
 */
export async function isParticlePhysicsCached(version: string): Promise<boolean> {
  return invoke<boolean>("is_particle_physics_cached", { version });
}

/**
 * Extract particle physics from Minecraft source code
 *
 * Downloads Mojang mappings, sets up CFR decompiler, and extracts physics
 * values from decompiled particle classes. Results are cached per-version.
 *
 * This is an expensive operation - call sparingly and show a loading indicator.
 *
 * @param version - Minecraft version string (e.g., "1.21.4")
 * @returns Extracted physics data
 */
export async function extractParticlePhysics(
  version: string,
): Promise<ExtractedPhysicsData> {
  return invoke<ExtractedPhysicsData>("extract_particle_physics", { version });
}

// ============================================================================
// BLOCK PARTICLE EMISSIONS
// ============================================================================

/**
 * A single particle emission from a block
 */
export interface ExtractedBlockEmission {
  /** Particle type ID (e.g., "FLAME", "SMOKE") */
  particleId: string;
  /** Optional ParticleOptions payload for particles that require parameters (e.g., dust color/scale) */
  options?: {
    /** Discriminator for how to interpret the options (e.g., "dust") */
    kind: string;
    /** Optional RGB color (0..1) */
    color?: [number, number, number] | null;
    /** Optional scale multiplier */
    scale?: number | null;
  } | null;
  /** Block state condition if any (e.g., "LIT", "POWERED") */
  condition?: string;
  /** Position offset expressions [x, y, z] */
  positionExpr?: [string, string, string];
  /** Velocity expressions [vx, vy, vz] */
  velocityExpr?: [string, string, string];
  /** Emission probability expression (e.g., "$3.nextInt(5) == 0") */
  probabilityExpr?: string;
  /** Particle count expression (e.g., "$3.nextInt(1) + 1") */
  countExpr?: string;
  /** Optional loop count expression when a for-loop index appears in expressions */
  loopCountExpr?: string;
  /** Loop index variable token (e.g., "$7") when used in expressions */
  loopIndexVar?: string;
  /** If true, particle always renders (even when reduced particles option is enabled) */
  alwaysVisible?: boolean;
  /** Which method this emission comes from (determines call rate):
   * - "animateTick": ~2% per tick (random block sampling)
   * - "particleTick": 100% per tick (called every tick)
   */
  emissionSource?: string;
}

/**
 * All emissions for a block
 */
export interface BlockEmissionData {
  /** The block class name */
  className: string;
  /** List of particle emissions */
  emissions: ExtractedBlockEmission[];
}

/**
 * All extracted block emissions for a Minecraft version
 */
export interface ExtractedBlockEmissions {
  schema_version?: number;
  version: string;
  blocks: Record<string, BlockEmissionData>;
  entities?: Record<string, BlockEmissionData>;
}

/**
 * Get cached block particle emissions for the current Minecraft version
 *
 * Returns emissions data if already cached, otherwise returns null.
 * Use `extractBlockEmissions` to extract and cache emissions data.
 *
 * @returns Cached emissions data or null
 */
export async function getBlockEmissions(): Promise<ExtractedBlockEmissions | null> {
  return invoke<ExtractedBlockEmissions | null>("get_block_emissions");
}

/**
 * Check if block emissions data is cached for a version
 *
 * @param version - Minecraft version string
 * @returns true if emissions data is cached
 */
export async function isBlockEmissionsCached(version: string): Promise<boolean> {
  return invoke<boolean>("is_block_emissions_cached", { version });
}

/**
 * Extract block particle emissions from Minecraft source code
 *
 * Downloads Mojang mappings, sets up CFR decompiler, and extracts particle
 * emissions from decompiled block classes. Results are cached per-version.
 *
 * This is an expensive operation - call sparingly and show a loading indicator.
 *
 * @param version - Minecraft version string (e.g., "1.21.4")
 * @returns Extracted block emissions data
 */
export async function extractBlockEmissions(
  version: string,
): Promise<ExtractedBlockEmissions> {
  return invoke<ExtractedBlockEmissions>("extract_block_emissions", { version });
}

/**
 * Generate TypeScript particle data file from cached extractions
 *
 * This reads the cached particle physics and block emissions data and generates
 * a TypeScript file at `src/constants/particles/generated.ts` that the frontend
 * can import directly.
 *
 * @returns Success message with version and path
 */
export async function generateParticleTypescript(): Promise<string> {
  return invoke<string>("generate_particle_typescript");
}
