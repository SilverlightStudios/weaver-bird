/**
 * Converts parsed JEM entity models to Three.js geometry
 *
 * Handles the JEM format with:
 * - Hierarchical part structure with submodels
 * - OptiFine-style coordinate system (invertAxis)
 * - Box UV mapping from texture offsets
 */
import * as THREE from "three";
import type { ParsedEntityModel, ParsedModelPart, ParsedBox } from "@lib/emf";

const MINECRAFT_UNIT = 16; // Minecraft uses 16 pixels per block unit

/**
 * Convert a parsed entity model to a Three.js Group
 *
 * @param model - The parsed entity model
 * @param texture - The loaded texture for the entity
 * @returns Three.js Group containing the entity geometry
 */
export function parsedEntityModelToThreeJs(
  model: ParsedEntityModel,
  texture: THREE.Texture | null,
): THREE.Group {
  console.log("=== [entityModelConverter] Converting Parsed Entity Model to Three.js ===");
  console.log("[entityModelConverter] Entity type:", model.entityType);
  console.log("[entityModelConverter] Texture size:", model.textureSize);
  console.log("[entityModelConverter] Parts count:", model.parts.length);

  const group = new THREE.Group();

  // Configure texture for pixel-perfect rendering
  if (texture) {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
  }

  // Convert each part to Three.js geometry
  for (const part of model.parts) {
    const partGroup = convertPart(part, model.textureSize, texture);
    group.add(partGroup);
  }

  // Position the model - JEM uses inverted Y, so we need to adjust
  // Entity models typically sit on the ground plane
  group.position.set(0, 0, 0);

  console.log(`[entityModelConverter] ✓ Conversion complete. Group has ${countMeshes(group)} meshes`);
  console.log("================================================================");

  return group;
}

/**
 * Convert a model part (and its children) to Three.js geometry
 */
function convertPart(
  part: ParsedModelPart,
  textureSize: [number, number],
  texture: THREE.Texture | null,
): THREE.Group {
  const partGroup = new THREE.Group();
  partGroup.name = part.name;

  console.log(`[entityModelConverter] Converting part: ${part.name}`);
  console.log(`[entityModelConverter] - Translate: [${part.translate.join(", ")}]`);
  console.log(`[entityModelConverter] - Rotate: [${part.rotate.join(", ")}]`);
  console.log(`[entityModelConverter] - Boxes: ${part.boxes.length}`);

  // Convert each box in this part
  for (let i = 0; i < part.boxes.length; i++) {
    const box = part.boxes[i];
    const mesh = createBoxMesh(box, textureSize, texture);
    if (mesh) {
      partGroup.add(mesh);
    }
  }

  // Convert children (submodels)
  for (const child of part.children) {
    const childGroup = convertPart(child, textureSize, texture);
    partGroup.add(childGroup);
  }

  // Apply transformations
  // JEM uses inverted axes (invertAxis: "xy"), so we need to flip Y and potentially X
  const [tx, ty, tz] = part.translate;

  // Apply translation (convert from pixels to block units)
  // JEM coordinates are inverted on Y axis
  partGroup.position.set(
    tx / MINECRAFT_UNIT,
    -ty / MINECRAFT_UNIT, // Invert Y
    tz / MINECRAFT_UNIT,
  );

  // Apply rotation (degrees to radians)
  // JEM rotations are also inverted
  const [rx, ry, rz] = part.rotate;
  partGroup.rotation.set(
    THREE.MathUtils.degToRad(-rx), // Invert X rotation
    THREE.MathUtils.degToRad(-ry), // Invert Y rotation
    THREE.MathUtils.degToRad(rz),
  );

  // Apply scale
  if (part.scale !== 1.0) {
    partGroup.scale.setScalar(part.scale);
  }

  return partGroup;
}

/**
 * Create a Three.js mesh for a single box
 */
function createBoxMesh(
  box: ParsedBox,
  textureSize: [number, number],
  texture: THREE.Texture | null,
): THREE.Mesh | null {
  const [x, y, z] = box.position;
  const [width, height, depth] = box.size;

  // Calculate size in Three.js units
  const w = width / MINECRAFT_UNIT;
  const h = height / MINECRAFT_UNIT;
  const d = depth / MINECRAFT_UNIT;

  console.log(`[entityModelConverter] Creating box: pos [${x}, ${y}, ${z}], size [${width}, ${height}, ${depth}]`);

  // Create box geometry
  const geometry = new THREE.BoxGeometry(w, h, d);

  // Apply UV coordinates
  applyJEMUVs(geometry, box.uv, textureSize, box.mirror);

  // Create material
  let material: THREE.Material;
  if (texture) {
    material = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.1,
      roughness: 0.8,
      metalness: 0.2,
    });
  } else {
    // Fallback material when texture is missing
    material = new THREE.MeshStandardMaterial({
      color: 0x8b4513, // Brown placeholder
      roughness: 0.8,
      metalness: 0.2,
    });
  }

  const mesh = new THREE.Mesh(geometry, material);

  // Position the mesh
  // JEM coordinates are the corner of the box, need to offset to center
  // Also invert Y axis
  const centerX = (x + width / 2) / MINECRAFT_UNIT;
  const centerY = -(y + height / 2) / MINECRAFT_UNIT; // Invert Y
  const centerZ = (z + depth / 2) / MINECRAFT_UNIT;
  mesh.position.set(centerX, centerY, centerZ);

  // Enable shadows
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

/**
 * Apply JEM UV coordinates to box geometry
 *
 * JEM UVs are specified as [u1, v1, u2, v2] in texture pixels
 */
function applyJEMUVs(
  geometry: THREE.BoxGeometry,
  uv: ParsedBox['uv'],
  textureSize: [number, number],
  mirror: boolean,
): void {
  const [texWidth, texHeight] = textureSize;

  const uvAttr = geometry.attributes.uv;
  if (!uvAttr) return;

  // Map face names to Three.js box face indices
  // Three.js order: [right(+X), left(-X), top(+Y), bottom(-Y), front(+Z), back(-Z)]
  const faceConfigs: { name: keyof typeof uv; index: number }[] = [
    { name: "east", index: 0 },   // right face (+X)
    { name: "west", index: 1 },   // left face (-X)
    { name: "up", index: 2 },     // top face (+Y)
    { name: "down", index: 3 },   // bottom face (-Y)
    { name: "south", index: 4 },  // front face (+Z)
    { name: "north", index: 5 },  // back face (-Z)
  ];

  for (const config of faceConfigs) {
    const faceUV = uv[config.name];
    if (!faceUV || faceUV.every(v => v === 0)) continue;

    const [u1, v1, u2, v2] = faceUV;

    // Convert pixel coordinates to 0-1 UV space
    // Entity textures have (0,0) at top-left, Three.js at bottom-left
    let uvU1 = u1 / texWidth;
    const uvV1 = 1 - v1 / texHeight; // Top of face
    let uvU2 = u2 / texWidth;
    const uvV2 = 1 - v2 / texHeight; // Bottom of face

    // Handle mirroring
    if (mirror) {
      [uvU1, uvU2] = [uvU2, uvU1];
    }

    // Set UV coordinates for the 4 vertices of this face
    const baseIndex = config.index * 4;

    // Three.js BoxGeometry vertex layout per face:
    // 2---3  (uvV1 - top)
    // |   |
    // 0---1  (uvV2 - bottom)
    uvAttr.setXY(baseIndex + 0, uvU1, uvV2); // Bottom-left
    uvAttr.setXY(baseIndex + 1, uvU2, uvV2); // Bottom-right
    uvAttr.setXY(baseIndex + 2, uvU1, uvV1); // Top-left
    uvAttr.setXY(baseIndex + 3, uvU2, uvV1); // Top-right
  }

  uvAttr.needsUpdate = true;
}

/**
 * Count total meshes in a group (for debugging)
 */
function countMeshes(group: THREE.Group): number {
  let count = 0;
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      count++;
    }
  });
  return count;
}

// Legacy export for backward compatibility with old entity model format
export { parsedEntityModelToThreeJs as entityModelToThreeJs };
