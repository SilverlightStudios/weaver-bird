import { useStore } from "@state/store";
import {
  normalizeAssetId,
  getBlockStateIdFromAssetId,
  extractBlockStateProperties,
  isBlockTexture,
} from "@lib/assetUtils";
import {
  resolveBlockState,
  loadModelJson,
  type ResolutionResult,
  type BlockModel,
} from "@lib/tauri/blockModels";
import { getWinnerPackId, sleep } from "./test-utils";
import { createErrorResult, createSuccessResult, handleError } from "./testHelpers";

export interface TestResult {
  assetId: string;
  success: boolean;
  error?: string;
  errorCode?: string;
  errorDetails?: unknown;
  duration: number;
  modelCount?: number;
  elementCount?: number;
  blockStateId?: string;
  packId?: string;
  isEntity?: boolean;
  entityType?: string;
}

export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  results: TestResult[];
  failedAssets: TestResult[];
  errorCategories: Record<string, TestResult[]>;
}

export interface TestOptions {
  stopOnError?: boolean;
  blocksOnly?: boolean;
  entitiesOnly?: boolean;
  includeEntities?: boolean;
  limit?: number;
  filter?: string | RegExp;
  delayMs?: number;
  skipPatterns?: string[];
  verbose?: boolean;
}

/**
 * Load all models and count elements
 */
async function loadModelsAndCountElements(
  models: ResolutionResult['models'],
  packId: string,
  packsDir: string,
  assetId: string,
  start: number,
): Promise<{ totalElements: number } | TestResult> {
  let totalElements = 0;
  for (const resolvedModel of models) {
    let model: BlockModel;
    try {
      model = await loadModelJson(packId, resolvedModel.modelId, packsDir);
    } catch (err) {
      const { message, code } = handleError(err);
      return createErrorResult(
        assetId,
        start,
        `Failed to load model ${resolvedModel.modelId}: ${message}`,
        code ?? "MODEL_LOAD_ERROR",
        err,
      );
    }

    if (model.elements) {
      totalElements += model.elements.length;
    }
  }
  return { totalElements };
}

/**
 * Test a single block asset
 */
export async function testBlockAsset(assetId: string, verbose: boolean = false): Promise<TestResult> {
  const start = Date.now();
  const result: TestResult = {
    assetId,
    success: false,
    duration: 0,
  };

  try {
    const state = useStore.getState();
    const {packsDir} = state;

    if (!packsDir) {
      return createErrorResult(assetId, start, "No packs directory configured", "NO_PACKS_DIR");
    }

    const packId = getWinnerPackId(assetId);
    if (!packId) {
      return createErrorResult(assetId, start, "No provider pack found for asset", "NO_PROVIDER");
    }

    result.packId = packId;
    const normalizedId = normalizeAssetId(assetId);
    const inferredProps = extractBlockStateProperties(normalizedId);
    const blockStateId = getBlockStateIdFromAssetId(normalizedId);
    result.blockStateId = blockStateId;

    if (verbose) {
      console.log(`  Asset: ${assetId}`);
      console.log(`  Normalized: ${normalizedId}`);
      console.log(`  BlockState ID: ${blockStateId}`);
      console.log(`  Pack: ${packId}`);
      console.log(`  Props:`, inferredProps);
    }

    let resolution: ResolutionResult;
    try {
      resolution = await resolveBlockState(
        packId,
        blockStateId,
        packsDir,
        Object.keys(inferredProps).length > 0 ? inferredProps : undefined,
        0
      );
    } catch (err) {
      const { message, code } = handleError(err);
      return createErrorResult(assetId, start, message, code ?? "BLOCKSTATE_RESOLUTION_ERROR", err);
    }

    if (!resolution.models || resolution.models.length === 0) {
      return createErrorResult(assetId, start, "No models resolved from blockstate", "NO_MODELS");
    }

    result.modelCount = resolution.models.length;

    const loadResult = await loadModelsAndCountElements(resolution.models, packId, packsDir, assetId, start);
    if ('totalElements' in loadResult) {
      result.elementCount = loadResult.totalElements;
    } else {
      return loadResult;
    }

    const totalElements = result.elementCount;

    if (totalElements === 0) {
      return createErrorResult(assetId, start, "Model has no elements", "NO_ELEMENTS");
    }

    return createSuccessResult(assetId, start, result.packId!, result.blockStateId!, result.modelCount!, totalElements);

  } catch (err) {
    const { message } = handleError(err);
    return createErrorResult(assetId, start, message, "UNKNOWN_ERROR", err);
  }
}

/**
 * Log test result for a single asset
 */
function logTestResult(result: TestResult, progress: string, verbose: boolean): void {
  if (result.success) {
    if (!verbose) {
      console.log(`${progress} PASS: ${result.assetId} (${result.duration}ms, ${result.modelCount} models, ${result.elementCount} elements)`);
    } else {
      console.log(`  PASS (${result.duration}ms, ${result.modelCount} models, ${result.elementCount} elements)`);
    }
  } else {
    console.error(`${progress} FAIL: ${result.assetId}`);
    console.error(`  Error: ${result.error}`);
    if (result.errorCode) {
      console.error(`  Code: ${result.errorCode}`);
    }
    if (result.blockStateId) {
      console.error(`  BlockState ID: ${result.blockStateId}`);
    }
    if (result.packId) {
      console.error(`  Pack: ${result.packId}`);
    }
    if (verbose && result.errorDetails) {
      console.error(`  Details:`, result.errorDetails);
    }
  }
}

/**
 * Categorize failed tests by error code
 */
function categorizeErrors(failedAssets: TestResult[]): Record<string, TestResult[]> {
  const errorCategories: Record<string, TestResult[]> = {};
  for (const result of failedAssets) {
    const category = result.errorCode ?? "UNKNOWN";
    if (!errorCategories[category]) {
      errorCategories[category] = [];
    }
    errorCategories[category].push(result);
  }
  return errorCategories;
}

/**
 * Execute tests for all assets
 */
async function executeTests(
  assetIds: string[],
  testFn: (assetId: string, verbose: boolean) => Promise<TestResult>,
  options: { stopOnError: boolean; delayMs: number; verbose: boolean },
): Promise<{ results: TestResult[]; passed: number; failed: number; skipped: number }> {
  const results: TestResult[] = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < assetIds.length; i++) {
    const assetId = assetIds[i];
    const progress = `[${i + 1}/${assetIds.length}]`;

    if (options.verbose) {
      console.log(`\n${progress} Testing: ${assetId}`);
    }

    const result = await testFn(assetId, options.verbose);
    results.push(result);

    if (result.success) {
      passed++;
    } else {
      failed++;
    }

    logTestResult(result, progress, options.verbose);

    if (!result.success && options.stopOnError) {
      console.error(`\n${'!'.repeat(60)}`);
      console.error(`STOPPING: First error encountered`);
      console.error(`${'!'.repeat(60)}\n`);
      skipped = assetIds.length - i - 1;
      break;
    }

    if (options.delayMs > 0) {
      await sleep(options.delayMs);
    }
  }

  return { results, passed, failed, skipped };
}

/**
 * Run tests on a collection of assets
 */
export async function runTests(
  assetIds: string[],
  testFn: (assetId: string, verbose: boolean) => Promise<TestResult>,
  options: TestOptions = {}
): Promise<TestSummary> {
  const {
    stopOnError = false,
    delayMs = 0,
    verbose = false,
  } = options;

  const start = Date.now();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`3D Previewer Block Test - Starting`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Total assets to test: ${assetIds.length}`);
  console.log(`Stop on error: ${stopOnError}`);
  console.log(`${'='.repeat(60)}\n`);

  const { results, passed, failed, skipped } = await executeTests(assetIds, testFn, {
    stopOnError,
    delayMs,
    verbose,
  });

  const duration = Date.now() - start;
  const failedAssets = results.filter(r => !r.success);
  const errorCategories = categorizeErrors(failedAssets);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST SUMMARY`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Total:   ${results.length}`);
  console.log(`Passed:  ${passed}`);
  console.log(`Failed:  ${failed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);

  if (Object.keys(errorCategories).length > 0) {
    console.log(`\nErrors by category:`);
    for (const [category, categoryResults] of Object.entries(errorCategories)) {
      console.log(`  ${category}: ${categoryResults.length}`);
    }
  }

  if (failedAssets.length > 0 && failedAssets.length <= 20) {
    console.log(`\nFailed assets:`);
    for (const result of failedAssets) {
      console.log(`  - ${result.assetId}: ${result.error}`);
    }
  } else if (failedAssets.length > 20) {
    console.log(`\nFirst 20 failed assets:`);
    for (const result of failedAssets.slice(0, 20)) {
      console.log(`  - ${result.assetId}: ${result.error}`);
    }
    console.log(`  ... and ${failedAssets.length - 20} more`);
  }

  console.log(`${'='.repeat(60)}\n`);

  return {
    total: results.length,
    passed,
    failed,
    skipped,
    duration,
    results,
    failedAssets,
    errorCategories,
  };
}

/**
 * Get a list of unique blockstate IDs that would be tested
 */
export function getUniqueBlockStateIds(): string[] {
  const state = useStore.getState();
  const assetIds = Object.keys(state.assets).filter(id => isBlockTexture(id));

  const blockStateIds = new Set<string>();
  for (const assetId of assetIds) {
    const normalized = normalizeAssetId(assetId);
    const blockStateId = getBlockStateIdFromAssetId(normalized);
    blockStateIds.add(blockStateId);
  }

  return Array.from(blockStateIds).sort();
}
