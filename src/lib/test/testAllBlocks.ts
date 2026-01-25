/**
 * Test utility for batch testing 3D previewer block rendering
 *
 * Usage (in browser console):
 *   import { testAllBlocks, testBlocksStopOnError } from './src/lib/test/testAllBlocks';
 *   await testBlocksStopOnError();
 *   await testAllBlocks();
 */

import { useStore } from "@state/store";
import { isBlockTexture, isEntityTexture } from "@lib/assetUtils";
import { testBlockAsset, runTests, getUniqueBlockStateIds, type TestOptions, type TestSummary } from "./test-core";
import { testEntityAsset } from "./test-entities";
import { exportTestReport, exportErrorsAsJson, runTestAndReport } from "./test-utils";

export type { TestResult, TestSummary, TestOptions } from "./test-core";

/**
 * Test all block assets
 */
export async function testAllBlocks(options: TestOptions = {}): Promise<TestSummary> {
  const {
    blocksOnly = true,
    entitiesOnly = false,
    includeEntities = false,
    limit,
    filter,
    skipPatterns = [],
  } = options;

  const state = useStore.getState();
  let assetIds = Object.keys(state.assets);

  if (entitiesOnly) {
    assetIds = assetIds.filter(id => isEntityTexture(id));
  } else if (includeEntities) {
    assetIds = assetIds.filter(id => isBlockTexture(id) || isEntityTexture(id));
  } else if (blocksOnly) {
    assetIds = assetIds.filter(id => isBlockTexture(id));
  }

  if (filter) {
    const regex = filter instanceof RegExp ? filter : new RegExp(filter, 'i');
    assetIds = assetIds.filter(id => regex.test(id));
  }

  if (skipPatterns.length > 0) {
    assetIds = assetIds.filter(id =>
      !skipPatterns.some(pattern => id.includes(pattern))
    );
  }

  if (limit && limit > 0) {
    assetIds = assetIds.slice(0, limit);
  }

  assetIds.sort();

  const testFn = (assetId: string, verbose: boolean) =>
    isEntityTexture(assetId)
      ? testEntityAsset(assetId, verbose)
      : testBlockAsset(assetId, verbose);

  return runTests(assetIds, testFn, options);
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
 * Run all block tests and generate a compact error report
 */
async function runBlockTestAndReport(options: TestOptions = {}): Promise<string> {
  return runTestAndReport(() => testAllBlocks({
    ...options,
    stopOnError: false,
    verbose: false
  }));
}

export { getUniqueBlockStateIds, exportTestReport, exportErrorsAsJson, runBlockTestAndReport };

if (typeof window !== 'undefined') {
  (window as { testAllBlocks: typeof testAllBlocks }).testAllBlocks = testAllBlocks;
  (window as { testBlocksStopOnError: typeof testBlocksStopOnError }).testBlocksStopOnError = testBlocksStopOnError;
  (window as { testEntities: typeof testEntities }).testEntities = testEntities;
  (window as { testAll: typeof testAll }).testAll = testAll;
  (window as { testBlocksByPattern: typeof testBlocksByPattern }).testBlocksByPattern = testBlocksByPattern;
  (window as { getUniqueBlockStateIds: typeof getUniqueBlockStateIds }).getUniqueBlockStateIds = getUniqueBlockStateIds;
  (window as { exportTestReport: typeof exportTestReport }).exportTestReport = exportTestReport;
  (window as { runTestAndReport: typeof runBlockTestAndReport }).runTestAndReport = runBlockTestAndReport;
  (window as { exportErrorsAsJson: typeof exportErrorsAsJson }).exportErrorsAsJson = exportErrorsAsJson;
}
