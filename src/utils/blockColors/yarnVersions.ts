/**
 * Mapping of Minecraft versions to their corresponding Fabric Yarn version tags.
 *
 * Yarn tags are used to fetch the correct BlockColors.java file from the Fabric Yarn repository.
 * Format: "mcVersion" -> "yarnTag"
 *
 * Find latest Yarn versions at: https://github.com/FabricMC/yarn/tags
 */
export const yarnVersionMap: Record<string, string> = {
  "1.21.4": "1.21.4+build.3",
  "1.21.3": "1.21.3+build.2",
  "1.21.1": "1.21.1+build.3",
  "1.21": "1.21+build.9",
  "1.20.6": "1.20.6+build.1",
  "1.20.5": "1.20.5+build.1",
  "1.20.4": "1.20.4+build.3",
  "1.20.3": "1.20.3+build.1",
  "1.20.2": "1.20.2+build.4",
  "1.20.1": "1.20.1+build.10",
  "1.20": "1.20+build.1",
  "1.19.4": "1.19.4+build.2",
  "1.19.3": "1.19.3+build.5",
  "1.19.2": "1.19.2+build.28",
  "1.19.1": "1.19.1+build.6",
  "1.19": "1.19+build.4",
};

/**
 * Default Minecraft version to use if none is specified.
 * This should be updated to the latest stable version.
 */
export const DEFAULT_MC_VERSION = "1.21.4";

/**
 * Get the Yarn tag for a given Minecraft version.
 * Returns undefined if the version is not supported.
 */
export function getYarnTag(mcVersion: string): string | undefined {
  return yarnVersionMap[mcVersion];
}

/**
 * Get all supported Minecraft versions.
 */
export function getSupportedVersions(): string[] {
  return Object.keys(yarnVersionMap);
}
