/**
 * Utility functions for block state schema special cases
 */

import type { BlockStateSchema } from "./blockModels";

/**
 * Check if block ID matches redstone wire
 */
function isRedstoneWire(blockId: string): boolean {
  return (
    blockId === "minecraft:block/redstone_wire" ||
    blockId === "minecraft:redstone_wire" ||
    blockId === "block/redstone_wire" ||
    blockId === "redstone_wire"
  );
}

/**
 * Check if block ID matches redstone ore blocks
 */
function isRedstoneOre(blockId: string): boolean {
  return (
    blockId === "minecraft:block/redstone_ore" ||
    blockId === "minecraft:redstone_ore" ||
    blockId === "block/redstone_ore" ||
    blockId === "redstone_ore" ||
    blockId === "minecraft:block/deepslate_redstone_ore" ||
    blockId === "minecraft:deepslate_redstone_ore" ||
    blockId === "block/deepslate_redstone_ore" ||
    blockId === "deepslate_redstone_ore"
  );
}

/**
 * Check if block is potentially wall-mountable (torches, signs, banners, skulls)
 */
function isWallMountable(blockId: string): boolean {
  const normalizedBlockId = blockId.replace(/^(minecraft:)?(block\/)?/, "");
  return (
    normalizedBlockId.endsWith("_torch") ||
    normalizedBlockId === "torch" ||
    normalizedBlockId.endsWith("_sign") ||
    normalizedBlockId.endsWith("_banner") ||
    normalizedBlockId.endsWith("_skull") ||
    normalizedBlockId.endsWith("_head")
  );
}

/**
 * Add power property to redstone wire schema
 */
export function addRedstonePowerProperty(schema: BlockStateSchema): void {
  const hasPower = schema.properties.some((p) => p.name === "power");
  if (hasPower) return;

  schema.properties.push({
    name: "power",
    type: "int",
    min: 0,
    max: 15,
    default: "15",
  });
  schema.defaultState.power = "15";
}

/**
 * Add lit property to redstone ore schema
 */
export function addRedstoneLitProperty(schema: BlockStateSchema): void {
  const hasLit = schema.properties.some((p) => p.name === "lit");
  if (hasLit) return;

  schema.properties.push({
    name: "lit",
    type: "boolean",
    values: ["true", "false"],
    default: "false",
  });
  schema.defaultState.lit = "false";
}

/**
 * Add wall-mounting properties (wall + facing) to schema
 */
export function addWallMountingProperties(schema: BlockStateSchema): void {
  const hasWall = schema.properties.some((p) => p.name === "wall");
  if (hasWall) return;

  // Add "wall" boolean property to toggle floor/wall variant
  schema.properties.push({
    name: "wall",
    type: "boolean",
    values: ["true", "false"],
    default: "false", // Default to floor variant
  });
  schema.defaultState.wall = "false";

  // Add "facing" property for wall-mounted direction
  // This is only relevant when wall=true, but we add it to the schema
  // The UI should disable this when wall=false
  schema.properties.push({
    name: "facing",
    type: "enum",
    values: ["north", "south", "east", "west"],
    default: "south", // Default direction when wall-mounted
  });
  schema.defaultState.facing = "south";
}

/**
 * Apply all special case schema enhancements
 */
export function applySchemaEnhancements(
  schema: BlockStateSchema,
  blockId: string,
): void {
  // Special case: redstone_wire power property
  if (isRedstoneWire(blockId)) {
    addRedstonePowerProperty(schema);
  }

  // Special case: redstone ore lit property
  if (isRedstoneOre(blockId)) {
    addRedstoneLitProperty(schema);
  }

  // Pattern-based: wall-mounted blocks
  if (isWallMountable(blockId)) {
    addWallMountingProperties(schema);
  }
}
