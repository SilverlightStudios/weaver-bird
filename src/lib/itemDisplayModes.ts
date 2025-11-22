/**
 * Item Display Modes - Defines how Minecraft items can be rendered
 *
 * This system allows for future expansion to support all the ways
 * items can be displayed in Minecraft:
 * - Dropped on ground (spinning)
 * - Held in hand (left/right)
 * - Worn on head
 * - In item frame
 * - In GUI (inventory slot)
 * - etc.
 */

export type ItemDisplayMode =
  | "ground"      // Item dropped on ground (default, with optional rotation)
  | "gui"         // Flat inventory icon view
  | "hand_left"   // Held in left hand (first person)
  | "hand_right"  // Held in right hand (first person)
  | "head"        // Worn on head
  | "item_frame"  // Displayed in item frame
  | "ground_fixed"; // On ground but not rotating

export interface ItemDisplayConfig {
  mode: ItemDisplayMode;
  rotate: boolean; // Whether to animate rotation (for ground mode)
}

export const DEFAULT_ITEM_DISPLAY: ItemDisplayConfig = {
  mode: "ground",
  rotate: true,
};

/**
 * Get the display name for an item display mode
 */
export function getDisplayModeName(mode: ItemDisplayMode): string {
  switch (mode) {
    case "ground":
      return "Dropped (Ground)";
    case "ground_fixed":
      return "Ground (Fixed)";
    case "gui":
      return "GUI / Inventory";
    case "hand_left":
      return "Left Hand";
    case "hand_right":
      return "Right Hand";
    case "head":
      return "Head Slot";
    case "item_frame":
      return "Item Frame";
    default:
      return "Unknown";
  }
}

/**
 * Check if a display mode supports rotation animation
 */
export function supportsRotation(mode: ItemDisplayMode): boolean {
  return mode === "ground";
}
