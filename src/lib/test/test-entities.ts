import { useStore } from "@state/store";
import {
  isEntityTexture,
  getEntityTypeFromAssetId,
  loadEntityModel,
} from "@lib/emf";
import type { TestResult } from "./test-core";
import { testBlockAsset } from "./test-core";

/**
 * Test a single entity asset
 */
export async function testEntityAsset(assetId: string, verbose: boolean = false): Promise<TestResult> {
  const start = Date.now();
  const result: TestResult = {
    assetId,
    success: false,
    duration: 0,
    isEntity: true,
  };

  try {
    const state = useStore.getState();
    const {packsDir} = state;

    if (!packsDir) {
      result.error = "No packs directory configured";
      result.errorCode = "NO_PACKS_DIR";
      result.duration = Date.now() - start;
      return result;
    }

    const entityType = getEntityTypeFromAssetId(assetId);
    result.entityType = entityType ?? undefined;

    if (verbose) {
      console.log(`  Asset: ${assetId}`);
      console.log(`  Entity type: ${entityType ?? 'unknown'}`);
    }

    const parsedModel = await loadEntityModel(entityType ?? 'unknown');

    if (!parsedModel) {
      result.error = `No model definition for entity type: ${entityType ?? 'unknown'}`;
      result.errorCode = "NO_ENTITY_MODEL";
      result.duration = Date.now() - start;
      return result;
    }

    result.modelCount = parsedModel.parts.length;

    let totalBoxes = 0;
    type ModelPart = typeof parsedModel.parts[0];
    function countBoxes(parts: ModelPart[]) {
      for (const part of parts) {
        totalBoxes += part.boxes.length;
        if (part.children.length > 0) {
          countBoxes(part.children);
        }
      }
    }
    countBoxes(parsedModel.parts);
    result.elementCount = totalBoxes;

    if (totalBoxes === 0) {
      result.error = "Entity model has no boxes";
      result.errorCode = "NO_ELEMENTS";
      result.duration = Date.now() - start;
      return result;
    }

    result.success = true;
    result.duration = Date.now() - start;
    return result;

  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
    result.errorCode = "UNKNOWN_ERROR";
    result.errorDetails = err;
    result.duration = Date.now() - start;
    return result;
  }
}

/**
 * Determine appropriate test function based on asset type
 */
export function getTestFunction(assetId: string): (assetId: string, verbose: boolean) => Promise<TestResult> {
  const isEntity = isEntityTexture(assetId);
  return isEntity ? testEntityAsset : testBlockAsset;
}
