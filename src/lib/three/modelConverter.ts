/**
 * Converts Minecraft block models to Three.js geometry
 *
 * Minecraft uses a 16x16x16 coordinate system, while Three.js uses world units.
 * We scale down by 16 to make a block 1 unit in Three.js.
 *
 * References:
 * - https://minecraft.wiki/w/Model
 * - @xmcl/model implementation for Three.js conversion patterns
 */
import * as THREE from "three";
import type {
  BlockModel,
  ModelElement,
  ResolvedModel,
} from "@lib/tauri/blockModels";
import {
  logModelInfo,
  createPlaceholderCube,
  applyBlockstateRotations,
  convertElementsToMeshes,
  applyRotation,
  resolveAllTextures,
} from "./modelConverterHelpers";
import { applyCustomUVs } from "./modelConverterUVMapping";
import { createFaceMaterials } from "./modelConverterMaterials";

const MINECRAFT_UNIT = 16; // Minecraft uses 16x16x16 units per block

/**
 * Convert a Minecraft block model to a Three.js Group
 *
 * @param model - The resolved block model JSON
 * @param textureLoader - Function to load textures (returns THREE.Texture or null)
 * @param biomeColor - Optional biome color for tinting
 * @param resolvedModel - Optional resolved model with rotations and uvlock
 * @param blockId - Optional block ID for light emission calculation
 * @param blockProps - Optional blockstate properties for conditional light emission
 * @returns Three.js Group containing all model elements
 */
export async function blockModelToThreeJs(
  model: BlockModel,
  textureLoader: (textureId: string) => Promise<THREE.Texture | null>,
  biomeColor?: { r: number; g: number; b: number } | null,
  resolvedModel?: ResolvedModel,
  blockId?: string,
  blockProps?: Record<string, string>,
): Promise<THREE.Group> {
  console.log("=== [modelConverter] Converting Model to Three.js ===");
  const startTime = performance.now();
  const group = new THREE.Group();

  logModelInfo(model);

  if (!model.elements || model.elements.length === 0) {
    console.error("[modelConverter] ✗ CRITICAL: No elements in model!");
    console.error(
      "[modelConverter] This will cause an orange placeholder cube",
    );
    console.error(
      "[modelConverter] Full model data:",
      JSON.stringify(model, null, 2),
    );
    console.log("=================================================");
    return createPlaceholderCube();
  }

  // Resolve all texture variables first
  console.log("[modelConverter] Resolving texture variables...");
  const resolvedTextures = resolveAllTextures(model.textures ?? {});
  console.log(
    "[modelConverter] Resolved textures count:",
    Object.keys(resolvedTextures).length,
  );
  console.log(
    "[modelConverter] Resolved texture mapping:",
    JSON.stringify(resolvedTextures, null, 2),
  );

  // Convert each element to a mesh
  await convertElementsToMeshes(
    model.elements,
    resolvedTextures,
    textureLoader,
    biomeColor,
    blockId,
    blockProps,
    group,
    createElementMesh
  );

  console.log(
    `[modelConverter] ✓ Conversion complete. Group has ${group.children.length} meshes`,
  );

  // Apply blockstate rotations if provided
  if (resolvedModel) {
    applyBlockstateRotations(group, resolvedModel);
  }

  const totalTime = performance.now() - startTime;
  console.log(
    `[modelConverter] Total conversion time: ${totalTime.toFixed(2)}ms`,
  );
  console.log("=====================================================");
  return group;
}


/**
 * Create a Three.js mesh from a Minecraft model element
 */
async function createElementMesh(
  element: ModelElement,
  textureVariables: Record<string, string>,
  textureLoader: (textureId: string) => Promise<THREE.Texture | null>,
  biomeColor?: { r: number; g: number; b: number } | null,
  blockId?: string,
  blockProps?: Record<string, string>,
): Promise<THREE.Mesh | null> {
  const [x1, y1, z1] = element.from;
  const [x2, y2, z2] = element.to;

  console.log(
    `[modelConverter] Element bounds: from [${x1}, ${y1}, ${z1}] to [${x2}, ${y2}, ${z2}]`,
  );

  // Calculate size and position in Three.js units (0-1 scale)
  const width = (x2 - x1) / MINECRAFT_UNIT;
  const height = (y2 - y1) / MINECRAFT_UNIT;
  const depth = (z2 - z1) / MINECRAFT_UNIT;

  // Position is at the center of the box, offset by -0.5 to center the entire model at origin
  // Minecraft coords: 0-16, we want center at 0,0,0 so offset by -8 (-0.5 in our units)
  const centerX = (x1 + x2) / 2 / MINECRAFT_UNIT - 0.5;
  const centerY = (y1 + y2) / 2 / MINECRAFT_UNIT - 0.5;
  const centerZ = (z1 + z2) / 2 / MINECRAFT_UNIT - 0.5;

  console.log(
    `[modelConverter] Geometry size: ${width} x ${height} x ${depth}`,
  );
  console.log(
    `[modelConverter] Position: [${centerX}, ${centerY}, ${centerZ}]`,
  );

  // Create box geometry
  const geometry = new THREE.BoxGeometry(width, height, depth);

  // Apply UV coordinates (auto-generate if not specified, per Minecraft spec)
  applyCustomUVs(geometry, element.faces, element.from, element.to);

  // Load textures for each face
  const materials = await createFaceMaterials(
    element.faces,
    textureVariables,
    textureLoader,
    element.from,
    element.to,
    biomeColor,
    blockId,
    blockProps,
  );

  const mesh = new THREE.Mesh(geometry, materials);
  mesh.position.set(centerX, centerY, centerZ);

  // Enable shadow casting for soft shadows
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // Apply rotation if specified
  if (element.rotation) {
    applyRotation(mesh, element.rotation, [centerX, centerY, centerZ]);
  }

  return mesh;
}

