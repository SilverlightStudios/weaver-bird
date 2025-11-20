/**
 * Block colors utilities for managing Minecraft's BlockColors registry.
 *
 * This module provides functionality to fetch, parse, and cache block tinting
 * information from Fabric Yarn's source code.
 */

export {
  fetchBlockColors,
  clearBlockColorsCache,
  getBlockTintType,
  type BlockColorRegistry,
  type ParsedTintEntry,
} from "./fetchBlockColors";

export {
  yarnVersionMap,
  DEFAULT_MC_VERSION,
  getYarnTag,
  getSupportedVersions,
} from "./yarnVersions";
