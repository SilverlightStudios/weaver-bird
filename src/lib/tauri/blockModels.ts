import { invoke } from "@tauri-apps/api/core";
import { applySchemaEnhancements } from "./blockModelsUtils";

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

  applySchemaEnhancements(schema, blockId);

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
    stateProps: stateProps ?? null,
    seed: seed ?? null,
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
