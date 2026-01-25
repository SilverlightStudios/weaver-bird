import * as THREE from "three";
import type { ResourcePack } from "@/types/resourcePack";
import { blockModelToThreeJs } from "@lib/three/modelConverter";
import type { TextureLoader } from "@lib/three/textureLoader";
import {
  loadModelWithFallback,
  checkModelTint,
  applyPolygonOffset,
  assetIdToBlockId,
} from "./loadModelHelpers";

export function resolvePackForRendering(
  forcedPackId: string | undefined,
  forcedPackMeta: ResourcePack | undefined,
  storeWinnerPackId: string | null | undefined,
  storeWinnerPack: ResourcePack | undefined,
  vanillaPack: ResourcePack | undefined,
): ResourcePack | undefined {
  if (forcedPackId) {
    return forcedPackId === "minecraft:vanilla" ? vanillaPack : forcedPackMeta;
  }
  return storeWinnerPackId ? storeWinnerPack : vanillaPack;
}

export function createPlaceholderGroup(): THREE.Group {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({
    color: 0x8b4513,
    roughness: 0.8,
    metalness: 0.2,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = 0.5;

  const group = new THREE.Group();
  group.add(mesh);

  return group;
}

export function cleanupBlockGroup(blockGroup: THREE.Group | null): void {
  if (!blockGroup) return;

  blockGroup.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry?.dispose();
      if (Array.isArray(obj.material)) {
        obj.material.forEach((mat) => mat.dispose());
      } else {
        obj.material?.dispose();
      }
    }
  });
}

export async function loadAndConvertModels(
  models: Array<{ modelId: string }>,
  packId: string,
  packsDirPath: string,
  textureLoader: TextureLoader,
  biomeColor: { r: number; g: number; b: number } | null | undefined,
  blockStateAssetId: string,
  cleanedProps: Record<string, string>,
  checkCancellation: () => boolean,
): Promise<{
  parentGroup: THREE.Group;
  hasTintindex: boolean;
  tintIndices: Set<number>;
}> {
  const parentGroup = new THREE.Group();
  let hasTintindex = false;
  const tintIndices = new Set<number>();

  for (let i = 0; i < models.length; i++) {
    const resolvedModel = models[i];

    const renderModel = await loadModelWithFallback(
      packId,
      resolvedModel.modelId,
      packsDirPath,
    );

    const { hasTint: modelHasTint, tintIndices: modelTintIndices } =
      checkModelTint(renderModel);

    if (modelHasTint) {
      hasTintindex = true;
      modelTintIndices.forEach((idx) => tintIndices.add(idx));
    }

    if (checkCancellation()) {
      throw new Error("Cancelled");
    }

    console.log("[BlockModel] Passing biomeColor to converter:", biomeColor);

    const blockIdForLight = assetIdToBlockId(blockStateAssetId);

    const modelGroup = await blockModelToThreeJs(
      renderModel,
      textureLoader,
      biomeColor,
      resolvedModel,
      blockIdForLight,
      cleanedProps,
    );

    applyPolygonOffset(modelGroup, i, models.length);

    parentGroup.add(modelGroup);
  }

  return { parentGroup, hasTintindex, tintIndices };
}
