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
  ElementFace,
  ElementRotation,
} from "@lib/tauri/blockModels";

const MINECRAFT_UNIT = 16; // Minecraft uses 16x16x16 units per block

/**
 * Convert a Minecraft block model to a Three.js Group
 *
 * @param model - The resolved block model JSON
 * @param textureLoader - Function to load textures (returns THREE.Texture or null)
 * @param biomeColor - Optional biome color for tinting
 * @param resolvedModel - Optional resolved model with rotations and uvlock
 * @returns Three.js Group containing all model elements
 */
export async function blockModelToThreeJs(
  model: BlockModel,
  textureLoader: (textureId: string) => Promise<THREE.Texture | null>,
  biomeColor?: { r: number; g: number; b: number } | null,
  resolvedModel?: ResolvedModel,
): Promise<THREE.Group> {
  console.log("=== [modelConverter] Converting Model to Three.js ===");
  const startTime = performance.now();
  const group = new THREE.Group();

  console.log("[modelConverter] Model parent:", model.parent || "none");
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
  console.log("[modelConverter] Model elements:", model.elements?.length || 0);
  if (!model.elements || model.elements.length === 0) {
    console.error("[modelConverter] ✗ CRITICAL: No elements in model!");
    console.error(
      "[modelConverter] This will cause an orange placeholder cube",
    );
    console.error(
      "[modelConverter] Full model data:",
      JSON.stringify(model, null, 2),
    );
  }

  if (!model.elements || model.elements.length === 0) {
    // TODO: Implement proper entity rendering for block entities like decorated pots
    // See ENTITY_RENDERING_ANALYSIS.md and implementation plan discussion
    //
    // Decorated pots are block entities that use entity-style rendering, not block models.
    // They need:
    // 1. A .jem (Java Entity Model) file defining the pot geometry (base, body, neck)
    // 2. Entity texture mapping from entity/decorated_pot/* folder
    // 3. Support for 4-sided pottery shard textures (north/south/east/west)
    // 4. Integration with existing EntityModel.tsx component
    //
    // Resources for creating JEM models:
    // - Blockbench: Export via CEM Template
    // - JsonEM mod: Dump vanilla models with dump_models=true
    // - EMF mod: Export examples to [MC_DIRECTORY]/emf/export/
    // - OptiFine docs: https://github.com/sp614x/optifine/blob/master/OptiFineDoc/doc/cem_model.txt
    //
    // For now, these will render as orange placeholders in 3D view.
    // MinecraftCSSBlock handles 2D rendering using the particle texture.

    console.warn("[modelConverter] Creating orange placeholder (no elements)");
    // Create a simple cube as fallback
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: 0xff6b00, // Orange to indicate missing model
      roughness: 0.8,
      metalness: 0.2,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 0.5;
    group.add(mesh);
    console.log("=================================================");
    return group;
  }

  // Resolve all texture variables first
  console.log("[modelConverter] Resolving texture variables...");
  const resolvedTextures = resolveAllTextures(model.textures || {});
  console.log(
    "[modelConverter] Resolved textures count:",
    Object.keys(resolvedTextures).length,
  );
  console.log(
    "[modelConverter] Resolved texture mapping:",
    JSON.stringify(resolvedTextures, null, 2),
  );

  // Convert each element to a mesh using simple BoxGeometry approach
  console.log(
    `[modelConverter] Converting ${model.elements.length} element(s) to meshes...`,
  );
  for (let i = 0; i < model.elements.length; i++) {
    const element = model.elements[i];
    try {
      console.log(
        `[modelConverter] → Element ${i + 1}/${model.elements.length}`,
      );
      const mesh = await createElementMesh(
        element,
        resolvedTextures,
        textureLoader,
        biomeColor,
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

  console.log(
    `[modelConverter] ✓ Conversion complete. Group has ${group.children.length} meshes`,
  );

  // Apply blockstate rotations if provided
  if (resolvedModel) {
    console.log("[modelConverter] Applying blockstate rotations:");
    console.log(`[modelConverter] - X rotation: ${resolvedModel.rotX}°`);
    console.log(`[modelConverter] - Y rotation: ${resolvedModel.rotY}°`);
    console.log(`[modelConverter] - Z rotation: ${resolvedModel.rotZ}°`);
    console.log(`[modelConverter] - UV Lock: ${resolvedModel.uvlock}`);

    // Apply rotations in order: X, Y, Z (Minecraft order)
    // Convert degrees to radians
    if (resolvedModel.rotX !== 0) {
      group.rotateX(THREE.MathUtils.degToRad(resolvedModel.rotX));
    }
    if (resolvedModel.rotY !== 0) {
      group.rotateY(THREE.MathUtils.degToRad(resolvedModel.rotY));
    }
    if (resolvedModel.rotZ !== 0) {
      group.rotateZ(THREE.MathUtils.degToRad(resolvedModel.rotZ));
    }

    // TODO: Implement uvlock if needed (rotates UV coordinates to compensate for model rotation)
    // For now, this is a placeholder - uvlock requires rotating UV coordinates in the opposite direction
    if (resolvedModel.uvlock) {
      console.log(
        "[modelConverter] Note: uvlock is set but not yet fully implemented",
      );
    }
  }

  const totalTime = performance.now() - startTime;
  console.log(`[modelConverter] Total conversion time: ${totalTime.toFixed(2)}ms`);
  console.log("=====================================================");
  return group;
}

/**
 * Resolve all texture variables in the model
 * e.g., "#all" -> "minecraft:block/dirt"
 */
function resolveAllTextures(
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

/**
 * Create a Three.js mesh from a Minecraft model element
 */
async function createElementMesh(
  element: ModelElement,
  textureVariables: Record<string, string>,
  textureLoader: (textureId: string) => Promise<THREE.Texture | null>,
  biomeColor?: { r: number; g: number; b: number } | null,
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

  // Apply custom UV coordinates if specified in faces
  applyCustomUVs(geometry, element.faces);

  // Load textures for each face
  const materials = await createFaceMaterials(
    element.faces,
    textureVariables,
    textureLoader,
    element.from,
    element.to,
    biomeColor,
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

/**
 * Apply custom UV coordinates to a box geometry
 *
 * Minecraft UV format: [x1, y1, x2, y2] where coords are 0-16
 * Three.js UV format: [0-1, 0-1] where (0,0) is bottom-left
 *
 * Three.js BoxGeometry has 6 faces, each face has 2 triangles (4 vertices)
 * Face order: [right, left, top, bottom, front, back]
 */
function applyCustomUVs(
  geometry: THREE.BoxGeometry,
  faces: Record<string, ElementFace>,
): void {
  const faceMapping: Record<string, number> = {
    east: 0, // right (+X)
    west: 1, // left (-X)
    up: 2, // top (+Y)
    down: 3, // bottom (-Y)
    south: 4, // front (+Z)
    north: 5, // back (-Z)
  };

  const uvAttr = geometry.attributes.uv;
  if (!uvAttr) return;

  for (const [faceName, faceData] of Object.entries(faces)) {
    if (!faceData.uv) continue; // No custom UV for this face

    const faceIndex = faceMapping[faceName];
    if (faceIndex === undefined) continue;

    const [x1, y1, x2, y2] = faceData.uv;

    // Convert Minecraft UV (0-16) to Three.js UV (0-1)
    // Minecraft UV coords: (0,0) is top-left, Y increases downward
    // Three.js UV coords: (0,0) is bottom-left, Y increases upward
    // So we need to flip the Y axis
    const u1 = x1 / 16;
    const u2 = x2 / 16;
    const v1 = 1 - y1 / 16; // Flip Y: Minecraft top becomes Three.js top
    const v2 = 1 - y2 / 16; // Flip Y: Minecraft bottom becomes Three.js bottom

    // Handle UV rotation (0, 90, 180, 270 degrees clockwise)
    const rotation = faceData.rotation || 0;

    console.log(
      `[modelConverter] UV ${faceName}: MC[${x1},${y1},${x2},${y2}] rot=${rotation}°`,
    );

    // BoxGeometry has 4 vertices per face
    // The uv attribute has uvAttr.count total vertices (24 for a box = 4 per face × 6 faces)
    const baseIndex = faceIndex * 4;

    // Vertex layout for each face (before rotation):
    // 2---3    (top edge, v2)
    // |   |
    // 0---1    (bottom edge, v1)

    // Apply rotation by rotating the UV coordinates
    // Rotation is clockwise in Minecraft
    let uvCoords: [number, number][];

    switch (rotation) {
      case 90:
        // Rotate 90° clockwise
        uvCoords = [
          [u1, v2], // 0: was top-left, now bottom-left
          [u1, v1], // 1: was bottom-left, now bottom-right
          [u2, v2], // 2: was top-right, now top-left
          [u2, v1], // 3: was bottom-right, now top-right
        ];
        break;
      case 180:
        // Rotate 180°: flip both axes
        uvCoords = [
          [u2, v2], // 0: was bottom-left, now top-right
          [u1, v2], // 1: was bottom-right, now top-left
          [u2, v1], // 2: was top-left, now bottom-right
          [u1, v1], // 3: was top-right, now bottom-left
        ];
        break;
      case 270:
        // Rotate 270° clockwise (or 90° counter-clockwise)
        uvCoords = [
          [u2, v1], // 0: was bottom-right, now bottom-left
          [u2, v2], // 1: was top-right, now bottom-right
          [u1, v1], // 2: was bottom-left, now top-left
          [u1, v2], // 3: was top-left, now top-right
        ];
        break;
      default: // 0 or undefined
        uvCoords = [
          [u1, v1], // 0: Bottom-left
          [u2, v1], // 1: Bottom-right
          [u1, v2], // 2: Top-left
          [u2, v2], // 3: Top-right
        ];
    }

    // Apply the UV coordinates to the vertices
    uvCoords.forEach((uv, index) => {
      uvAttr.setXY(baseIndex + index, uv[0], uv[1]);
    });
  }

  uvAttr.needsUpdate = true;
}

/**
 * Create materials for each face of a box
 *
 * Three.js BoxGeometry face order: [right, left, top, bottom, front, back]
 * Minecraft faces: east, west, up, down, south, north
 */
async function createFaceMaterials(
  faces: Record<string, ElementFace>,
  textureVariables: Record<string, string>,
  textureLoader: (textureId: string) => Promise<THREE.Texture | null>,
  _from: [number, number, number],
  _to: [number, number, number],
  biomeColor?: { r: number; g: number; b: number } | null,
): Promise<THREE.Material[]> {
  // Map Minecraft face names to Three.js box face indices
  const faceMapping: Record<string, number> = {
    east: 0, // right (+X)
    west: 1, // left (-X)
    up: 2, // top (+Y)
    down: 3, // bottom (-Y)
    south: 4, // front (+Z)
    north: 5, // back (-Z)
  };

  console.log(
    "[modelConverter] Creating materials for faces:",
    Object.keys(faces),
  );
  console.log(
    "[modelConverter] Available texture variables:",
    Object.keys(textureVariables),
  );

  // Create default materials for each of the 6 faces
  // Use transparent material for undefined faces instead of magenta
  const materials: THREE.Material[] = [];
  for (let i = 0; i < 6; i++) {
    materials.push(
      new THREE.MeshStandardMaterial({
        transparent: true,
        opacity: 0, // Invisible for undefined faces
        roughness: 0.8,
        metalness: 0.2,
      }),
    );
  }

  // Apply textures to faces that have them defined
  for (const [faceName, faceData] of Object.entries(faces)) {
    const faceIndex = faceMapping[faceName];
    if (faceIndex === undefined) {
      console.warn(`[modelConverter] ✗ Unknown face name: ${faceName}`);
      continue;
    }

    console.log(
      `[modelConverter] Processing face: ${faceName} (index ${faceIndex})`,
    );
    console.log(`[modelConverter] Face texture reference: ${faceData.texture}`);

    // Resolve texture variable (e.g., "#all" -> "minecraft:block/dirt")
    let textureId = faceData.texture;
    if (textureId.startsWith("#")) {
      const varName = textureId.substring(1);
      console.log(`[modelConverter] Resolving variable: #${varName}`);
      textureId = textureVariables[varName] || textureId;
      console.log(`[modelConverter] Resolved to: ${textureId}`);
    }

    // Skip if still a variable (couldn't resolve)
    if (textureId.startsWith("#")) {
      console.warn(
        `[modelConverter] ✗ Unresolved texture variable on ${faceName}: ${textureId}`,
      );
      continue;
    }

    console.log(
      `[modelConverter] → Loading texture for ${faceName}: ${textureId}`,
    );

    // Load the texture
    try {
      const texture = await textureLoader(textureId);
      if (texture) {
        console.log(
          `[modelConverter] ✓ Texture loaded successfully for ${faceName}`,
        );

        // Configure texture for Minecraft-style rendering
        texture.magFilter = THREE.NearestFilter; // Pixelated look
        texture.minFilter = THREE.NearestFilter;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;

        // Apply biome color tint if this face has tintindex and a color is provided
        let materialColor: THREE.Color | undefined = undefined;
        if (
          faceData.tintindex !== undefined &&
          faceData.tintindex !== null &&
          biomeColor
        ) {
          // Convert RGB (0-255) to Three.js color (0-1)
          materialColor = new THREE.Color(
            biomeColor.r / 255,
            biomeColor.g / 255,
            biomeColor.b / 255,
          );
          console.log(
            `[modelConverter] Applying biome tint to ${faceName}:`,
            materialColor,
          );
        }

        // Use MeshStandardMaterial to support shadows while keeping flat look
        materials[faceIndex] = new THREE.MeshStandardMaterial({
          map: texture,
          color: materialColor, // Tint color (white/undefined = no tint)
          transparent: true,
          alphaTest: 0.1, // Discard transparent pixels (including magenta if it has alpha)
          roughness: 0.8,
          metalness: 0.2,
          flatShading: false, // Keep smooth for correct texture appearance
        });
      } else {
        console.warn(
          `[modelConverter] ✗ Texture loader returned null for ${textureId}`,
        );
        // Use transparent material for missing textures
        materials[faceIndex] = new THREE.MeshStandardMaterial({
          transparent: true,
          opacity: 0,
          roughness: 0.8,
          metalness: 0.2,
        });
      }
    } catch (err) {
      console.error(
        `[modelConverter] ✗ Failed to load texture ${textureId}:`,
        err,
      );
      // Use transparent material for failed texture loads
      materials[faceIndex] = new THREE.MeshStandardMaterial({
        transparent: true,
        opacity: 0,
        roughness: 0.8,
        metalness: 0.2,
      });
    }
  }

  console.log(`[modelConverter] Materials created: ${materials.length} total`);
  return materials;
}

/**
 * Apply Minecraft rotation to a Three.js mesh
 *
 * Minecraft rotations are around a specific origin point and can have
 * rescaling for 45-degree angles
 */
function applyRotation(
  mesh: THREE.Mesh,
  rotation: ElementRotation,
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
  if (rotation.rescale && Math.abs(rotation.angle % 45) < 0.01) {
    const scale = Math.sqrt(2);
    console.log(`[modelConverter] Applying rescale: ${scale}`);
    mesh.scale.multiplyScalar(scale);
  }
}
