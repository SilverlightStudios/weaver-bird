import { DYE_COLORS } from "./entityComposite/dyeColors";

export const DYE_COLOR_IDS = new Set(DYE_COLORS.map((c) => c.id));

/**
 * Vanilla wood types used in "material variant" entity textures (boats, etc).
 *
 * This intentionally includes newer woods so grouping keeps working across
 * Minecraft versions when the assets are present.
 */
export const WOOD_TYPE_IDS = new Set([
  "oak",
  "spruce",
  "birch",
  "jungle",
  "acacia",
  "dark_oak",
  "mangrove",
  "cherry",
  "bamboo",
  "pale_oak",
]);

/**
 * Vanilla cat skins live in `textures/entity/cat/*.png` and are referenced by
 * leaf name (no `cat_` prefix).
 */
export const CAT_SKIN_IDS = new Set([
  "black",
  "british_shorthair",
  "calico",
  "jellie",
  "ocelot",
  "persian",
  "ragdoll",
  "red",
  "siamese",
  "tabby",
  "white",
  "all_black",
]);

export function allLeavesInSet(leaves: string[], allowed: Set<string>): boolean {
  return leaves.every((leaf) => allowed.has(leaf));
}

