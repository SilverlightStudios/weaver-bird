/**
 * Procedural geometry generator for decorated pots
 *
 * Minecraft decorated pots are entities with a special trapezoid/vase shape.
 * Since they don't have traditional block model elements, we generate the
 * geometry procedurally.
 *
 * Structure:
 * - Base (wider bottom part)
 * - Middle (main body with patterns)
 * - Neck (narrower top part)
 * - Top opening
 */
import * as THREE from "three";

const MINECRAFT_UNIT = 16;

/**
 * Create a decorated pot geometry
 * Returns a Group containing the pot mesh with proper UV mapping for textures
 */
export function createDecoratedPotGeometry(
  textureLoader: (textureId: string) => Promise<THREE.Texture | null>,
): Promise<THREE.Group> {
  return createSimplePotGeometry(textureLoader);
}

/**
 * Create a simplified decorated pot geometry as a terracotta-colored pot
 * This is used when textures are not available or as a fallback
 */
async function createSimplePotGeometry(
  textureLoader: (textureId: string) => Promise<THREE.Texture | null>,
): Promise<THREE.Group> {
  const group = new THREE.Group();

  // Decorated pot dimensions (in Minecraft units, then converted to Three.js)
  // The pot is roughly 10x16x10 in Minecraft coordinates
  const bottomWidth = 10 / MINECRAFT_UNIT; // 0.625
  const topWidth = 8 / MINECRAFT_UNIT; // 0.5
  const height = 16 / MINECRAFT_UNIT; // 1.0
  const baseHeight = 4 / MINECRAFT_UNIT; // 0.25
  const neckHeight = 3 / MINECRAFT_UNIT; // 0.1875

  // Load terracotta texture for the pot
  const terracottaTexture = await textureLoader("minecraft:block/terracotta");

  // Create material
  const potMaterial = new THREE.MeshStandardMaterial({
    map: terracottaTexture || undefined,
    color: terracottaTexture ? 0xffffff : 0x9a5539, // Terracotta color as fallback
    roughness: 0.8,
    metalness: 0.1,
  });

  if (terracottaTexture) {
    terracottaTexture.magFilter = THREE.NearestFilter;
    terracottaTexture.minFilter = THREE.NearestFilter;
    terracottaTexture.wrapS = THREE.RepeatWrapping;
    terracottaTexture.wrapT = THREE.RepeatWrapping;
  }

  // Create pot using CylinderGeometry approximation
  // We'll create multiple segments to approximate the pot shape

  // Base (bottom cylinder)
  const baseGeometry = new THREE.CylinderGeometry(
    bottomWidth / 2, // radiusTop
    bottomWidth / 2, // radiusBottom
    baseHeight, // height
    16, // radialSegments
    1, // heightSegments
    false // openEnded
  );
  const baseMesh = new THREE.Mesh(baseGeometry, potMaterial);
  baseMesh.position.y = baseHeight / 2 - 0.5; // Position at bottom
  group.add(baseMesh);

  // Middle body (main pot body - tapered)
  const bodyHeight = height - baseHeight - neckHeight;
  const bodyGeometry = new THREE.CylinderGeometry(
    topWidth / 2, // radiusTop (narrower)
    bottomWidth / 2, // radiusBottom (wider)
    bodyHeight, // height
    16, // radialSegments
    4, // heightSegments for smoother taper
    false // openEnded
  );
  const bodyMesh = new THREE.Mesh(bodyGeometry, potMaterial);
  bodyMesh.position.y = baseHeight + bodyHeight / 2 - 0.5;
  group.add(bodyMesh);

  // Neck (top rim)
  const neckGeometry = new THREE.CylinderGeometry(
    topWidth / 2, // radiusTop
    topWidth / 2, // radiusBottom
    neckHeight, // height
    16, // radialSegments
    1, // heightSegments
    true // openEnded (open top)
  );
  const neckMesh = new THREE.Mesh(neckGeometry, potMaterial);
  neckMesh.position.y = height - neckHeight / 2 - 0.5;
  group.add(neckMesh);

  // Enable shadows
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  neckMesh.castShadow = true;
  neckMesh.receiveShadow = true;

  return group;
}

/**
 * Check if an asset ID is a decorated pot
 */
export function isDecoratedPot(assetId: string): boolean {
  return assetId.includes("decorated_pot");
}
