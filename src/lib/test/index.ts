/**
 * Test utilities for development and debugging
 *
 * These utilities are primarily meant for use in development mode
 * via the browser console.
 */

export {
  testAllBlocks,
  testBlocksStopOnError,
  testBlocksByPattern,
  getUniqueBlockStateIds,
  exportTestReport,
  runBlockTestAndReport as runTestAndReport,
  exportErrorsAsJson,
  type TestResult,
  type TestSummary,
  type TestOptions,
} from './testAllBlocks';
