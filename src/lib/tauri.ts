/**
 * Typed Tauri v2 command helpers
 *
 * Modern Tauri v2 pattern with structured error handling
 */

import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { OverrideWirePayload, ScanResult } from "@state";

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

/**
 * Get the file path to a vanilla texture
 * @param assetId - Asset ID like "minecraft:block/stone"
 * @returns Absolute path to the texture PNG file
 */
export async function getVanillaTexturePath(assetId: string): Promise<string> {
  return invoke<string>("get_vanilla_texture_path", { assetId });
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
): Promise<string> {
  return invoke<string>("get_pack_texture_path", { packPath, assetId, isZip });
}
