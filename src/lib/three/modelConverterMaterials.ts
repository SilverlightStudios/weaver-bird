import type * as THREE from "three";
import type { ElementFace } from "@lib/tauri/blockModels";
import {
  FACE_MAPPING,
  createDefaultMaterial,
  resolveTextureVariable,
  configureTexture,
  applyBiomeTint,
  getEmissiveBehavior,
  loadEmissiveMap,
  createEmissiveMapMaterial,
  createFullbrightMaterial,
  createStandardMaterial,
} from "./modelConverterMaterialsUtils";
import { getAnimationMaterial } from "./textureLoader";

/**
 * Process a single face and create its material
 */
async function processFace(
  faceName: string,
  faceData: ElementFace,
  textureVariables: Record<string, string>,
  textureLoader: (textureId: string) => Promise<THREE.Texture | null>,
  biomeColor?: { r: number; g: number; b: number } | null,
  blockId?: string,
  blockProps?: Record<string, string>,
): Promise<THREE.Material> {
  console.log(`[modelConverter] Processing face: ${faceName}`);
  console.log(`[modelConverter] Face texture reference: ${faceData.texture}`);

  // Resolve texture variable
  const textureId = resolveTextureVariable(faceData.texture, textureVariables);
  if (!textureId) {
    console.warn(
      `[modelConverter] ✗ Unresolved texture variable on ${faceName}: ${faceData.texture}`,
    );
    return createDefaultMaterial();
  }

  console.log(`[modelConverter] → Loading texture for ${faceName}: ${textureId}`);

  // Load texture
  try {
    const texture = await textureLoader(textureId);
    if (!texture) {
      console.warn(`[modelConverter] ✗ Texture loader returned null for ${textureId}`);
      return createDefaultMaterial();
    }

    console.log(`[modelConverter] ✓ Texture loaded successfully for ${faceName}`);
    configureTexture(texture);

    // Apply biome tint if needed
    const materialColor = applyBiomeTint(faceData, biomeColor);

    // Check for animated texture
    const animMaterial = getAnimationMaterial(texture);

    if (animMaterial) {
      if (materialColor) {
        console.warn(
          "[modelConverter] Color tinting not yet supported for interpolated animated textures",
        );
      }
      return animMaterial;
    }

    // Determine emissive behavior
    const { hasVisualEmissive, emitsLight } = getEmissiveBehavior(
      blockId,
      blockProps ?? {},
    );

    // Try loading emissive map
    const emissiveMap = await loadEmissiveMap(
      textureId,
      emitsLight,
      textureLoader,
      blockId,
    );

    // Create material based on emissive type
    if (emissiveMap) {
      console.log(
        `[modelConverter] Using MeshStandardMaterial with emissiveMap for ${blockId}`,
      );
      return createEmissiveMapMaterial(texture, emissiveMap, materialColor);
    }

    if (hasVisualEmissive || emitsLight) {
      console.log(
        `[modelConverter] Using MeshBasicMaterial (fullbright) for ${blockId} (visualEmissive=${hasVisualEmissive}, emitsLight=${emitsLight})`,
      );
      return createFullbrightMaterial(texture, materialColor);
    }

    console.log(
      `[modelConverter] Using MeshStandardMaterial (normal lighting) for ${blockId}`,
    );
    return createStandardMaterial(texture, materialColor);
  } catch (err) {
    console.error(`[modelConverter] ✗ Failed to load texture ${textureId}:`, err);
    return createDefaultMaterial();
  }
}

/**
 * Create materials for each face of a box
 *
 * Three.js BoxGeometry face order: [right, left, top, bottom, front, back]
 * Minecraft faces: east, west, up, down, south, north
 */
export async function createFaceMaterials(
  faces: Record<string, ElementFace>,
  textureVariables: Record<string, string>,
  textureLoader: (textureId: string) => Promise<THREE.Texture | null>,
  _from: [number, number, number],
  _to: [number, number, number],
  biomeColor?: { r: number; g: number; b: number } | null,
  blockId?: string,
  blockProps?: Record<string, string>,
): Promise<THREE.Material[]> {
  console.log("[modelConverter] Creating materials for faces:", Object.keys(faces));
  console.log("[modelConverter] Available texture variables:", Object.keys(textureVariables));

  // Create default materials for all 6 faces
  const materials: THREE.Material[] = Array.from({ length: 6 }, () => createDefaultMaterial());

  // Process each defined face
  for (const [faceName, faceData] of Object.entries(faces)) {
    const faceIndex = FACE_MAPPING[faceName];
    if (faceIndex === undefined) {
      console.warn(`[modelConverter] ✗ Unknown face name: ${faceName}`);
      continue;
    }

    console.log(`[modelConverter] Processing face: ${faceName} (index ${faceIndex})`);

    const material = await processFace(
      faceName,
      faceData,
      textureVariables,
      textureLoader,
      biomeColor,
      blockId,
      blockProps,
    );

    materials[faceIndex] = material;
  }

  console.log(`[modelConverter] Materials created: ${materials.length} total`);
  return materials;
}
