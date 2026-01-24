/**
 * Type predicate functions for checking asset categories
 */

/** Check if an asset is a block texture */
export function isBlockTexture(assetId: string): boolean {
  return assetId.includes(":block/");
}

/** Check if an asset is an item texture */
export function isItemTexture(assetId: string): boolean {
  return assetId.includes(":item/");
}

/** Check if an asset is a biome colormap (grass/foliage) */
export function isBiomeColormapAsset(assetId: string): boolean {
  return assetId.includes(":colormap/");
}

/** 2D-only texture path prefixes */
const TWO_D_ONLY_PATHS = [
  "gui/",
  "particle/",
  "painting/",
  "mob_effect/",
  "font/",
  "misc/",
  "entity/",
  "map/",
  "models/",
  "environment/",
  "effect/",
] as const;

/**
 * Check if an asset is a 2D-only texture (GUI, particle, etc.)
 * These textures should be displayed as flat 2D sprites, not as 3D objects
 *
 * NOTE: Items are NOT included here - they use PreviewItem for 3D dropped item rendering
 * NOTE: Entity textures are NOT included here - they use PreviewEntity with 2D/3D toggle
 */
export function is2DOnlyTexture(assetId: string): boolean {
  const path = assetId.includes(":") ? assetId.split(":")[1] : assetId;

  // Entity textures have their own universal preview component
  if (path.startsWith("entity/")) {
    return false;
  }

  return TWO_D_ONLY_PATHS.some((prefix) => path.startsWith(prefix));
}

/** Cross-shaped plants that render poorly in isometric CSS view */
const CROSS_SHAPED_PLANTS = new Set([
  "seagrass",
  "tall_seagrass",
  "tall_seagrass_top",
  "tall_seagrass_bottom",
  "kelp",
  "kelp_plant",
]);

/**
 * Check if a block should use 2D item texture for resource card thumbnail
 * These blocks have 3D models but look better as 2D items in small previews
 */
export function shouldUseItemTextureForCard(assetId: string): boolean {
  const path = assetId.includes(":") ? assetId.split(":")[1] : assetId;
  const blockName = path.split("/").pop()?.replace(/\.png$/i, "") ?? "";
  return CROSS_SHAPED_PLANTS.has(blockName);
}

/**
 * Check if an asset is an entity texture (any entity)
 * Entity textures are rendered with a 2D/3D toggle preview using the universal entity renderer
 *
 * Includes: chests, shulker boxes, mobs, decorated pots, beds, signs, etc.
 */
export function isEntityTexture(assetId: string): boolean {
  const path = assetId.includes(":") ? assetId.split(":")[1] : assetId;
  return path.startsWith("entity/");
}

/**
 * Check if an asset is an entity decorated pot texture
 * @deprecated Use isEntityTexture() instead - kept for backward compatibility
 */
export function isEntityDecoratedPot(assetId: string): boolean {
  const path = assetId.includes(":") ? assetId.split(":")[1] : assetId;
  return path.startsWith("entity/decorated_pot/");
}

/**
 * Check if an asset is a Minecraft item texture
 * Items are rendered as 3D dropped items (not flat 2D sprites)
 */
export function isMinecraftItem(assetId: string): boolean {
  return assetId.includes(":item/");
}

/**
 * Check if an asset is a sign texture
 * Returns true for both regular signs and hanging signs
 */
export function isSignTexture(assetId: string): boolean {
  const path = assetId.includes(":") ? assetId.split(":")[1] : assetId;

  // Check for GUI sign textures
  if (path.startsWith("gui/signs/") || path.startsWith("gui/hanging_signs/")) {
    return true;
  }

  // Check for block sign textures
  if (path.startsWith("block/")) {
    return /_sign$|_hanging_sign$/.test(path);
  }

  return false;
}

/** Check if an asset is a hanging sign specifically */
export function isHangingSign(assetId: string): boolean {
  const path = assetId.includes(":") ? assetId.split(":")[1] : assetId;
  return (
    path.includes("_hanging_sign") || path.startsWith("gui/hanging_signs/")
  );
}

/**
 * Get the texture category from an asset ID
 * Returns the category path (e.g., "gui", "particle", "block", "item")
 */
export function getTextureCategory(assetId: string): string | null {
  const path = assetId.includes(":") ? assetId.split(":")[1] : assetId;
  const firstSlash = path.indexOf("/");
  return firstSlash === -1 ? null : path.substring(0, firstSlash);
}

/** Check if an asset is a particle texture */
export function isParticleTexture(assetId: string): boolean {
  const path = assetId.includes(":") ? assetId.split(":")[1] : assetId;
  return path.startsWith("particle/");
}

/** Check if an asset is a potted plant */
export function isPottedPlant(assetId: string): boolean {
  const path = assetId.replace(/^[^:]*:/, "");
  return path.includes("potted") || path.includes("_pot");
}

/** Check if an asset ID represents an inventory texture variant */
export function isInventoryVariant(assetId: string): boolean {
  return /_inventory\d*$/.test(assetId);
}
