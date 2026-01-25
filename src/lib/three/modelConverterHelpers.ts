import * as THREE from "three";
import type { BlockModel, ModelElement, ResolvedModel } from "@lib/tauri/blockModels";

const MINECRAFT_UNIT = 16;

// Helper function for logging model info
export function logModelInfo(model: BlockModel): void {
  console.log("[modelConverter] Model parent:", model.parent ?? "none");
  console.log(
    "[modelConverter] Model textures:",
    model.textures ? Object.keys(model.textures).length : 0,
    "keys",
  );
  if (model.textures) {
    console.log("[modelConverter] Texture keys:", Object.keys(model.textures));
    console.log(
      "[modelConverter] Texture values:",
      JSON.stringify(model.textures, null, 2),
    );
  }
  console.log("[modelConverter] Model elements:", model.elements?.length ?? 0);
}

// Helper function to create orange placeholder cube
export function createPlaceholderCube(): THREE.Group {
  console.warn("[modelConverter] Creating orange placeholder (no elements)");
  const group = new THREE.Group();
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({
    color: 0xff6b00, // Orange to indicate missing model
    roughness: 0.8,
    metalness: 0.2,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = 0.5;
  group.add(mesh);
  return group;
}

// Helper function to apply blockstate rotations
export function applyBlockstateRotations(group: THREE.Group, resolvedModel: ResolvedModel): void {
  console.log("[modelConverter] Applying blockstate rotations:");
  console.log(`[modelConverter] - X rotation: ${resolvedModel.rotX}°`);
  console.log(`[modelConverter] - Y rotation: ${resolvedModel.rotY}°`);
  console.log(`[modelConverter] - Z rotation: ${resolvedModel.rotZ}°`);
  console.log(`[modelConverter] - UV Lock: ${resolvedModel.uvlock}`);

  // Apply rotations in order: X, Y, Z (Minecraft order)
  if (resolvedModel.rotX !== 0) {
    group.rotateX(THREE.MathUtils.degToRad(resolvedModel.rotX));
  }
  if (resolvedModel.rotY !== 0) {
    group.rotateY(THREE.MathUtils.degToRad(resolvedModel.rotY));
  }
  if (resolvedModel.rotZ !== 0) {
    group.rotateZ(THREE.MathUtils.degToRad(resolvedModel.rotZ));
  }

  if (resolvedModel.uvlock) {
    console.log(
      "[modelConverter] Note: uvlock is set but not yet fully implemented",
    );
  }
}

// Helper function to convert model elements to meshes
export async function convertElementsToMeshes(
  elements: ModelElement[],
  resolvedTextures: Record<string, string>,
  textureLoader: (textureId: string) => Promise<THREE.Texture | null>,
  biomeColor: { r: number; g: number; b: number } | null | undefined,
  blockId: string | undefined,
  blockProps: Record<string, string> | undefined,
  group: THREE.Group,
  createElementMesh: (
    element: ModelElement,
    resolvedTextures: Record<string, string>,
    textureLoader: (textureId: string) => Promise<THREE.Texture | null>,
    biomeColor?: { r: number; g: number; b: number } | null,
    blockId?: string,
    blockProps?: Record<string, string>,
  ) => Promise<THREE.Mesh | null>,
): Promise<void> {
  console.log(
    `[modelConverter] Converting ${elements.length} element(s) to meshes...`,
  );
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    try {
      console.log(
        `[modelConverter] → Element ${i + 1}/${elements.length}`,
      );
      const mesh = await createElementMesh(
        element,
        resolvedTextures,
        textureLoader,
        biomeColor,
        blockId,
        blockProps,
      );
      if (mesh) {
        group.add(mesh);
        console.log(`[modelConverter] ✓ Element ${i + 1} added to group`);
      } else {
        console.warn(`[modelConverter] ✗ Element ${i + 1} returned null mesh`);
      }
    } catch (err) {
      console.error(
        `[modelConverter] ✗ Failed to create element ${i + 1}:`,
        err,
      );
    }
  }
}

/**
 * Apply Minecraft rotation to a Three.js mesh
 *
 * Minecraft rotations are around a specific origin point and can have
 * rescaling for 45-degree angles
 */
export function applyRotation(
  mesh: THREE.Mesh,
  rotation: { origin: [number, number, number]; axis: "x" | "y" | "z"; angle: number; rescale?: boolean },
  _elementCenter: [number, number, number],
): void {
  // Minecraft rotations are around a specific origin point
  const [originX, originY, originZ] = rotation.origin;
  // Apply the same -0.5 offset to the rotation origin to match our centering
  const origin = new THREE.Vector3(
    originX / MINECRAFT_UNIT - 0.5,
    originY / MINECRAFT_UNIT - 0.5,
    originZ / MINECRAFT_UNIT - 0.5,
  );

  // Convert angle to radians
  const angleRad = THREE.MathUtils.degToRad(rotation.angle);

  // Determine rotation axis
  const axis = new THREE.Vector3(
    rotation.axis === "x" ? 1 : 0,
    rotation.axis === "y" ? 1 : 0,
    rotation.axis === "z" ? 1 : 0,
  );

  console.log(
    `[modelConverter] Applying rotation: ${rotation.angle}° around ${rotation.axis} axis`,
  );

  // Rotate around the specified origin
  mesh.position.sub(origin);
  mesh.position.applyAxisAngle(axis, angleRad);
  mesh.position.add(origin);
  mesh.rotateOnAxis(axis, angleRad);

  // Apply rescaling if specified (for 45° rotations)
  // Rescale only scales in the plane perpendicular to the rotation axis
  // For Y-axis rotation: scale X and Z, but not Y
  // For X-axis rotation: scale Y and Z, but not X
  // For Z-axis rotation: scale X and Y, but not Z
  if (rotation.rescale && Math.abs(rotation.angle % 45) < 0.01) {
    const scale = Math.sqrt(2);
    console.log(
      `[modelConverter] Applying rescale: ${scale} perpendicular to ${rotation.axis} axis`,
    );

    if (rotation.axis === "x") {
      mesh.scale.y *= scale;
      mesh.scale.z *= scale;
    } else if (rotation.axis === "y") {
      mesh.scale.x *= scale;
      mesh.scale.z *= scale;
    } else if (rotation.axis === "z") {
      mesh.scale.x *= scale;
      mesh.scale.y *= scale;
    }
  }
}

/**
 * Resolve all texture variables in the model
 * e.g., "#all" -> "minecraft:block/dirt"
 */
export function resolveAllTextures(
  textures: Record<string, string>,
): Record<string, string> {
  const resolved: Record<string, string> = {};

  for (const [key, value] of Object.entries(textures)) {
    let currentValue = value;
    const visited = new Set<string>();

    // Follow the chain of references
    while (currentValue.startsWith("#")) {
      const varName = currentValue.substring(1);

      // Prevent infinite loops
      if (visited.has(varName)) {
        console.warn(`[modelConverter] Circular texture reference: ${varName}`);
        break;
      }
      visited.add(varName);

      const nextValue = textures[varName];
      if (!nextValue) {
        console.warn(
          `[modelConverter] Unresolved texture variable: #${varName}`,
        );
        break;
      }

      currentValue = nextValue;
    }

    resolved[key] = currentValue;
  }

  return resolved;
}
