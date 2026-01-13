import { invoke } from "@tauri-apps/api/core";

/**
 * Minecraft block model JSON structure
 */
export interface BlockModel {
  parent?: string;
  textures?: Record<string, string>;
  elements?: ModelElement[];
  ambientocclusion?: boolean;
}

/**
 * A cuboid element in a Minecraft model
 */
export interface ModelElement {
  from: [number, number, number];
  to: [number, number, number];
  rotation?: ElementRotation;
  faces: Record<string, ElementFace>;
  shade?: boolean;
}

/**
 * Rotation information for a model element
 */
export interface ElementRotation {
  origin: [number, number, number];
  axis: "x" | "y" | "z";
  angle: number;
  rescale?: boolean;
}

/**
 * A face of a model element
 */
export interface ElementFace {
  texture: string;
  uv?: [number, number, number, number];
  rotation?: number;
  cullface?: string;
  tintindex?: number;
}

/**
 * Schema for a block property (for UI generation)
 */
export interface BlockPropertySchema {
  name: string;
  type: "enum" | "boolean" | "int";
  values?: string[];
  min?: number;
  max?: number;
  default: string;
}

/**
 * Schema describing all possible states and properties of a block
 */
export interface BlockStateSchema {
  blockId: string;
  properties: BlockPropertySchema[];
  defaultState: Record<string, string>;
  variantsMap?: Record<string, number>;
}

/**
 * A resolved model with applied rotations
 */
export interface ResolvedModel {
  modelId: string;
  rotX: number;
  rotY: number;
  rotZ: number;
  uvlock: boolean;
}

/**
 * Result of resolving a blockstate to concrete models
 */
export interface ResolutionResult {
  blockId: string;
  stateProps: Record<string, string>;
  models: ResolvedModel[];
}

/**
 * Read a Minecraft block model JSON file from a resource pack
 *
 * @param packId - ID of the resource pack to read from
 * @param modelId - Model ID (e.g., "minecraft:block/dirt" or "block/dirt")
 * @param packsDir - Directory containing resource packs
 * @returns Fully resolved BlockModel with parent inheritance applied
 */
export async function readBlockModel(
  packId: string,
  modelId: string,
  packsDir: string,
): Promise<BlockModel> {
  return invoke<BlockModel>("read_block_model", {
    packId,
    modelId,
    packsDir,
  });
}

/**
 * Get the schema for a block's blockstate, describing all properties and valid values
 *
 * @param packId - ID of the resource pack to read from
 * @param blockId - Block ID (e.g., "minecraft:furnace")
 * @param packsDir - Directory containing resource packs
 * @returns Schema describing the block's properties and default state
 */
export async function getBlockStateSchema(
  packId: string,
  blockId: string,
  packsDir: string,
): Promise<BlockStateSchema> {
  const schema = await invoke<BlockStateSchema>("get_block_state_schema", {
    packId,
    blockId,
    packsDir,
  });

  // Special case: redstone_wire has a power property (0-15) that affects tint color
  // and particle spawning, but it's not in the blockstate JSON multipart conditions
  // The multipart only uses north/south/east/west for model selection
  if (
    blockId === "minecraft:block/redstone_wire" ||
    blockId === "minecraft:redstone_wire" ||
    blockId === "block/redstone_wire" ||
    blockId === "redstone_wire"
  ) {
    const hasPower = schema.properties.some((p) => p.name === "power");
    if (!hasPower) {
      schema.properties.push({
        name: "power",
        type: "int",
        min: 0,
        max: 15,
        default: "15",
      });
      schema.defaultState.power = "15";
    }
  }

  // Special case: redstone ore blocks have a "lit" property that controls light emission
  // and particle spawning, but it's not in the blockstate JSON (which has no variants)
  if (
    blockId === "minecraft:block/redstone_ore" ||
    blockId === "minecraft:redstone_ore" ||
    blockId === "block/redstone_ore" ||
    blockId === "redstone_ore" ||
    blockId === "minecraft:block/deepslate_redstone_ore" ||
    blockId === "minecraft:deepslate_redstone_ore" ||
    blockId === "block/deepslate_redstone_ore" ||
    blockId === "deepslate_redstone_ore"
  ) {
    const hasLit = schema.properties.some((p) => p.name === "lit");
    if (!hasLit) {
      schema.properties.push({
        name: "lit",
        type: "boolean",
        values: ["true", "false"],
        default: "false",
      });
      schema.defaultState.lit = "false";
    }
  }

  // Pattern-based: blocks with wall-mounted variants (torches, signs, banners, skulls)
  // We merge the floor and wall variants into one schema by adding two synthetic properties:
  // 1. "wall" boolean - toggles between floor variant (false) and wall variant (true)
  // 2. "facing" enum - direction for wall-mounted variant (only used when wall=true)
  //
  // This works for: torch, redstone_torch, soul_torch, signs, banners, skulls, etc.
  const normalizedBlockId = blockId.replace(/^(minecraft:)?(block\/)?/, "");
  const potentiallyWallMountable =
    normalizedBlockId.endsWith("_torch") ||
    normalizedBlockId === "torch" ||
    normalizedBlockId.endsWith("_sign") ||
    normalizedBlockId.endsWith("_banner") ||
    normalizedBlockId.endsWith("_skull") ||
    normalizedBlockId.endsWith("_head");

  if (potentiallyWallMountable) {
    const hasWall = schema.properties.some((p) => p.name === "wall");
    if (!hasWall) {
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
  }

  return schema;
}

/**
 * Resolve a blockstate to concrete models with transformations
 *
 * @param packId - ID of the resource pack to read from
 * @param blockId - Block ID (e.g., "minecraft:furnace")
 * @param packsDir - Directory containing resource packs
 * @param stateProps - Optional state properties (e.g., {facing: "north", lit: "true"})
 * @param seed - Optional seed for deterministic random selection
 * @returns Resolution result with models and transformations
 */
export async function resolveBlockState(
  packId: string,
  blockId: string,
  packsDir: string,
  stateProps?: Record<string, string>,
  seed?: number,
): Promise<ResolutionResult> {
  return invoke<ResolutionResult>("resolve_block_state", {
    packId,
    blockId,
    packsDir,
    stateProps: stateProps || null,
    seed: seed !== undefined ? seed : null,
  });
}

/**
 * Load a model JSON directly by model ID (after blockstate resolution)
 *
 * This is a simpler function that just loads the model JSON without going through
 * blockstate resolution. Use this after you've already resolved a blockstate to a model ID.
 *
 * @param packId - ID of the resource pack to read from
 * @param modelId - Model ID (e.g., "minecraft:block/acacia_log_horizontal")
 * @param packsDir - Directory containing resource packs
 * @returns BlockModel with parent inheritance applied
 */
export async function loadModelJson(
  packId: string,
  modelId: string,
  packsDir: string,
): Promise<BlockModel> {
  return invoke<BlockModel>("load_model_json", {
    packId,
    modelId,
    packsDir,
  });
}
