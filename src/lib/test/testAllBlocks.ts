/**
 * Test utility for batch testing 3D previewer block rendering
 *
 * This script iterates through all block assets and attempts to resolve
 * their blockstate and load their models, logging any errors encountered.
 *
 * Usage (in browser console):
 *   import { testAllBlocks, testBlocksStopOnError } from './src/lib/test/testAllBlocks';
 *   await testBlocksStopOnError(); // Stop on first error
 *   await testAllBlocks();         // Run all tests and collect results
 *
 * Or from the app:
 *   window.testAllBlocks?.();
 */

import { useStore } from "@state/store";
import {
  normalizeAssetId,
  getBlockStateIdFromAssetId,
  extractBlockStateProperties,
  isBlockTexture,
  getVariantGroupKey,
} from "@lib/assetUtils";
import {
  resolveBlockState,
  loadModelJson,
  type ResolutionResult,
  type BlockModel,
} from "@lib/tauri/blockModels";
import {
  isEntityTexture,
  getEntityTypeFromAssetId,
  loadEntityModel,
} from "@lib/emf";

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
  /** Whether this is an entity texture (vs block) */
  isEntity?: boolean;
  /** Entity type if this is an entity */
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
  /** Stop on first error */
  stopOnError?: boolean;
  /** Only test block textures (skip items, colormaps, entities, etc.) */
  blocksOnly?: boolean;
  /** Only test entity textures */
  entitiesOnly?: boolean;
  /** Test both blocks and entities (overrides blocksOnly) */
  includeEntities?: boolean;
  /** Maximum number of assets to test (for debugging) */
  limit?: number;
  /** Filter assets by pattern */
  filter?: string | RegExp;
  /** Delay between tests in ms (to avoid overwhelming the UI) */
  delayMs?: number;
  /** Skip assets that start with these patterns */
  skipPatterns?: string[];
  /** Verbose logging */
  verbose?: boolean;
}

/**
 * Get the winner pack ID for an asset from the store
 */
function getWinnerPackId(assetId: string): string | undefined {
  const state = useStore.getState();

  // Check for override
  const override = state.overrides[assetId];
  if (override) {
    return override.packId;
  }

  // Get first provider in pack order
  const providers = state.providersByAsset[assetId] ?? [];
  if (providers.length === 0) {
    // Try base asset (for numbered variants)
    const variantGroupKey = getVariantGroupKey(assetId);
    const baseAssetId = assetId.startsWith("minecraft:")
      ? `minecraft:block/${variantGroupKey}`
      : variantGroupKey;
    const baseProviders = state.providersByAsset[baseAssetId] ?? [];
    if (baseProviders.length === 0) return undefined;

    const sorted = [...baseProviders].sort(
      (a, b) => state.packOrder.indexOf(a) - state.packOrder.indexOf(b)
    );
    return sorted[0];
  }

  const sorted = [...providers].sort(
    (a, b) => state.packOrder.indexOf(a) - state.packOrder.indexOf(b)
  );
  return sorted[0];
}

/**
 * Test a single asset
 */
async function testAsset(assetId: string, verbose: boolean = false): Promise<TestResult> {
  const start = Date.now();
  const result: TestResult = {
    assetId,
    success: false,
    duration: 0,
  };

  try {
    const state = useStore.getState();
    const packsDir = state.packsDir;

    if (!packsDir) {
      result.error = "No packs directory configured";
      result.errorCode = "NO_PACKS_DIR";
      result.duration = Date.now() - start;
      return result;
    }

    // Get winner pack
    const packId = getWinnerPackId(assetId);
    if (!packId) {
      result.error = "No provider pack found for asset";
      result.errorCode = "NO_PROVIDER";
      result.duration = Date.now() - start;
      return result;
    }

    result.packId = packId;

    // Normalize asset ID
    const normalizedId = normalizeAssetId(assetId);

    // Extract block state properties from asset ID
    const inferredProps = extractBlockStateProperties(normalizedId);

    // Get blockstate ID
    const blockStateId = getBlockStateIdFromAssetId(normalizedId);
    result.blockStateId = blockStateId;

    if (verbose) {
      console.log(`  Asset: ${assetId}`);
      console.log(`  Normalized: ${normalizedId}`);
      console.log(`  BlockState ID: ${blockStateId}`);
      console.log(`  Pack: ${packId}`);
      console.log(`  Props:`, inferredProps);
    }

    // Resolve blockstate
    let resolution: ResolutionResult;
    try {
      resolution = await resolveBlockState(
        packId,
        blockStateId,
        packsDir,
        Object.keys(inferredProps).length > 0 ? inferredProps : undefined,
        0 // seed
      );
    } catch (err) {
      // Extract error details from Tauri error
      const errorObj = err as { code?: string; message?: string; details?: unknown };
      result.error = errorObj.message || String(err);
      result.errorCode = errorObj.code || "BLOCKSTATE_RESOLUTION_ERROR";
      result.errorDetails = err;
      result.duration = Date.now() - start;
      return result;
    }

    // Check if models were resolved
    if (!resolution.models || resolution.models.length === 0) {
      result.error = "No models resolved from blockstate";
      result.errorCode = "NO_MODELS";
      result.duration = Date.now() - start;
      return result;
    }

    result.modelCount = resolution.models.length;

    // Load first model to verify it exists
    let totalElements = 0;
    for (const resolvedModel of resolution.models) {
      let model: BlockModel;
      try {
        model = await loadModelJson(
          packId,
          resolvedModel.modelId,
          packsDir
        );
      } catch (err) {
        const errorObj = err as { code?: string; message?: string; details?: unknown };
        result.error = `Failed to load model ${resolvedModel.modelId}: ${errorObj.message || String(err)}`;
        result.errorCode = errorObj.code || "MODEL_LOAD_ERROR";
        result.errorDetails = err;
        result.duration = Date.now() - start;
        return result;
      }

      // Check if model has elements
      if (model.elements) {
        totalElements += model.elements.length;
      }
    }

    result.elementCount = totalElements;

    if (totalElements === 0) {
      result.error = "Model has no elements";
      result.errorCode = "NO_ELEMENTS";
      result.duration = Date.now() - start;
      return result;
    }

    // Success!
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
 * Test a single entity asset
 */
async function testEntityAsset(assetId: string, verbose: boolean = false): Promise<TestResult> {
  const start = Date.now();
  const result: TestResult = {
    assetId,
    success: false,
    duration: 0,
    isEntity: true,
  };

  try {
    const state = useStore.getState();
    const packsDir = state.packsDir;

    if (!packsDir) {
      result.error = "No packs directory configured";
      result.errorCode = "NO_PACKS_DIR";
      result.duration = Date.now() - start;
      return result;
    }

    // Get entity type from asset ID
    const entityType = getEntityTypeFromAssetId(assetId);
    result.entityType = entityType || undefined;

    if (verbose) {
      console.log(`  Asset: ${assetId}`);
      console.log(`  Entity type: ${entityType || 'unknown'}`);
    }

    // Try to load the entity model
    const parsedModel = await loadEntityModel(entityType || 'unknown');

    if (!parsedModel) {
      result.error = `No model definition for entity type: ${entityType || 'unknown'}`;
      result.errorCode = "NO_ENTITY_MODEL";
      result.duration = Date.now() - start;
      return result;
    }

    // Count parts as "models"
    result.modelCount = parsedModel.parts.length;

    // Count total boxes as "elements"
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

    // Success!
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
 * Sleep utility for delays between tests
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test all block assets
 */
export async function testAllBlocks(options: TestOptions = {}): Promise<TestSummary> {
  const {
    stopOnError = false,
    blocksOnly = true,
    entitiesOnly = false,
    includeEntities = false,
    limit,
    filter,
    delayMs = 0,
    skipPatterns = [],
    verbose = false,
  } = options;

  const state = useStore.getState();
  const start = Date.now();

  // Get all asset IDs
  let assetIds = Object.keys(state.assets);

  // Filter based on asset type
  if (entitiesOnly) {
    // Only test entities
    assetIds = assetIds.filter(id => isEntityTexture(id));
  } else if (includeEntities) {
    // Test both blocks and entities
    assetIds = assetIds.filter(id => isBlockTexture(id) || isEntityTexture(id));
  } else if (blocksOnly) {
    // Only test blocks (default)
    assetIds = assetIds.filter(id => isBlockTexture(id));
  }

  // Apply filter pattern
  if (filter) {
    const regex = filter instanceof RegExp ? filter : new RegExp(filter, 'i');
    assetIds = assetIds.filter(id => regex.test(id));
  }

  // Apply skip patterns
  if (skipPatterns.length > 0) {
    assetIds = assetIds.filter(id =>
      !skipPatterns.some(pattern => id.includes(pattern))
    );
  }

  // Apply limit
  if (limit && limit > 0) {
    assetIds = assetIds.slice(0, limit);
  }

  // Sort for consistent ordering
  assetIds.sort();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`3D Previewer Block Test - Starting`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Total assets to test: ${assetIds.length}`);
  console.log(`Stop on error: ${stopOnError}`);
  console.log(`${'='.repeat(60)}\n`);

  const results: TestResult[] = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < assetIds.length; i++) {
    const assetId = assetIds[i];
    const progress = `[${i + 1}/${assetIds.length}]`;

    if (verbose) {
      console.log(`\n${progress} Testing: ${assetId}`);
    }

    // Use appropriate test function based on asset type
    const isEntity = isEntityTexture(assetId);
    const result = isEntity
      ? await testEntityAsset(assetId, verbose)
      : await testAsset(assetId, verbose);
    results.push(result);

    if (result.success) {
      passed++;
      if (!verbose) {
        console.log(`${progress} PASS: ${assetId} (${result.duration}ms, ${result.modelCount} models, ${result.elementCount} elements)`);
      } else {
        console.log(`  PASS (${result.duration}ms, ${result.modelCount} models, ${result.elementCount} elements)`);
      }
    } else {
      failed++;
      console.error(`${progress} FAIL: ${assetId}`);
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

      if (stopOnError) {
        console.error(`\n${'!'.repeat(60)}`);
        console.error(`STOPPING: First error encountered`);
        console.error(`${'!'.repeat(60)}\n`);
        skipped = assetIds.length - i - 1;
        break;
      }
    }

    // Add delay between tests if specified
    if (delayMs > 0) {
      await sleep(delayMs);
    }
  }

  const duration = Date.now() - start;

  // Categorize errors
  const errorCategories: Record<string, TestResult[]> = {};
  const failedAssets = results.filter(r => !r.success);

  for (const result of failedAssets) {
    const category = result.errorCode || "UNKNOWN";
    if (!errorCategories[category]) {
      errorCategories[category] = [];
    }
    errorCategories[category].push(result);
  }

  // Print summary
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
 * Convenience function to test blocks and stop on first error
 */
export async function testBlocksStopOnError(
  options: Omit<TestOptions, 'stopOnError'> = {}
): Promise<TestSummary> {
  return testAllBlocks({ ...options, stopOnError: true });
}

/**
 * Test only entity textures
 */
export async function testEntities(
  options: Omit<TestOptions, 'entitiesOnly' | 'blocksOnly'> = {}
): Promise<TestSummary> {
  return testAllBlocks({ ...options, entitiesOnly: true, blocksOnly: false });
}

/**
 * Test both blocks and entities
 */
export async function testAll(
  options: Omit<TestOptions, 'includeEntities' | 'blocksOnly'> = {}
): Promise<TestSummary> {
  return testAllBlocks({ ...options, includeEntities: true, blocksOnly: false });
}

/**
 * Test a specific subset of blocks by pattern
 */
export async function testBlocksByPattern(
  pattern: string | RegExp,
  options: Omit<TestOptions, 'filter'> = {}
): Promise<TestSummary> {
  return testAllBlocks({ ...options, filter: pattern });
}

/**
 * Get a list of unique blockstate IDs that would be tested
 * Useful for understanding what will be tested
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

/**
 * Export a report of test results
 */
export function exportTestReport(summary: TestSummary): string {
  const lines: string[] = [
    '# 3D Previewer Block Test Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Summary',
    '',
    `- Total: ${summary.total}`,
    `- Passed: ${summary.passed}`,
    `- Failed: ${summary.failed}`,
    `- Skipped: ${summary.skipped}`,
    `- Duration: ${(summary.duration / 1000).toFixed(2)}s`,
    '',
  ];

  if (Object.keys(summary.errorCategories).length > 0) {
    lines.push('## Errors by Category', '');
    for (const [category, results] of Object.entries(summary.errorCategories)) {
      lines.push(`### ${category} (${results.length})`);
      lines.push('');
      for (const result of results) {
        lines.push(`- \`${result.assetId}\` -> \`${result.blockStateId || 'unknown'}\`: ${result.error}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Run all block tests and generate a compact error report for fixing
 * This is the main function to use - just run it and copy the output
 */
export async function runTestAndReport(options: TestOptions = {}): Promise<string> {
  console.log('Running all block tests...\n');

  const summary = await testAllBlocks({
    ...options,
    stopOnError: false,
    verbose: false
  });

  if (summary.failed === 0) {
    const msg = `All ${summary.passed} blocks passed!`;
    console.log(msg);
    return msg;
  }

  // Generate compact report grouped by error pattern
  const lines: string[] = [
    '## Block Test Error Report',
    '',
    `Total: ${summary.total} | Passed: ${summary.passed} | Failed: ${summary.failed}`,
    '',
  ];

  // Group errors by the actual error message to find patterns
  const errorsByMessage: Record<string, TestResult[]> = {};
  for (const result of summary.failedAssets) {
    const key = result.error || 'Unknown error';
    if (!errorsByMessage[key]) {
      errorsByMessage[key] = [];
    }
    errorsByMessage[key].push(result);
  }

  // Sort by count (most common first)
  const sortedErrors = Object.entries(errorsByMessage)
    .sort((a, b) => b[1].length - a[1].length);

  for (const [errorMsg, results] of sortedErrors) {
    lines.push(`### ${errorMsg} (${results.length} assets)`);
    lines.push('');
    lines.push('| Asset ID | Converted BlockState ID |');
    lines.push('|----------|------------------------|');
    for (const result of results) {
      lines.push(`| \`${result.assetId}\` | \`${result.blockStateId || 'N/A'}\` |`);
    }
    lines.push('');
  }

  const report = lines.join('\n');

  // Also log to console for easy copying
  console.log(`\n${'='.repeat(60)}`);
  console.log('COPY THE REPORT BELOW:');
  console.log(`${'='.repeat(60)}\n`);
  console.log(report);
  console.log(`\n${'='.repeat(60)}`);

  return report;
}

/**
 * Generate a JSON export of errors for programmatic analysis
 */
export function exportErrorsAsJson(summary: TestSummary): string {
  const errors = summary.failedAssets.map(result => ({
    assetId: result.assetId,
    blockStateId: result.blockStateId,
    error: result.error,
    errorCode: result.errorCode,
  }));

  return JSON.stringify(errors, null, 2);
}

// Export to window for easy console access
if (typeof window !== 'undefined') {
  (window as unknown as { testAllBlocks: typeof testAllBlocks }).testAllBlocks = testAllBlocks;
  (window as unknown as { testBlocksStopOnError: typeof testBlocksStopOnError }).testBlocksStopOnError = testBlocksStopOnError;
  (window as unknown as { testEntities: typeof testEntities }).testEntities = testEntities;
  (window as unknown as { testAll: typeof testAll }).testAll = testAll;
  (window as unknown as { testBlocksByPattern: typeof testBlocksByPattern }).testBlocksByPattern = testBlocksByPattern;
  (window as unknown as { getUniqueBlockStateIds: typeof getUniqueBlockStateIds }).getUniqueBlockStateIds = getUniqueBlockStateIds;
  (window as unknown as { exportTestReport: typeof exportTestReport }).exportTestReport = exportTestReport;
  (window as unknown as { runTestAndReport: typeof runTestAndReport }).runTestAndReport = runTestAndReport;
  (window as unknown as { exportErrorsAsJson: typeof exportErrorsAsJson }).exportErrorsAsJson = exportErrorsAsJson;
}
