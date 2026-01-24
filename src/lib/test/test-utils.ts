import { useStore } from "@state/store";
import { getVariantGroupKey } from "@lib/assetUtils";
import type { TestResult, TestSummary } from "./test-core";

/**
 * Get the winner pack ID for an asset from the store
 */
export function getWinnerPackId(assetId: string): string | undefined {
  const state = useStore.getState();
  const disabledSet = new Set(state.disabledPackIds || []);

  const override = state.overrides[assetId];
  if (override && !disabledSet.has(override.packId)) {
    return override.packId;
  }

  const providers = (state.providersByAsset[assetId] ?? []).filter(
    (packId) => !disabledSet.has(packId),
  );
  if (providers.length === 0) {
    const variantGroupKey = getVariantGroupKey(assetId);
    const baseAssetId = assetId.startsWith("minecraft:")
      ? `minecraft:block/${variantGroupKey}`
      : variantGroupKey;
    const baseProviders = (state.providersByAsset[baseAssetId] ?? []).filter(
      (packId) => !disabledSet.has(packId),
    );
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
 * Sleep utility for delays between tests
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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
        lines.push(`- \`${result.assetId}\` -> \`${result.blockStateId ?? 'unknown'}\`: ${result.error}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
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

/**
 * Run all block tests and generate a compact error report for fixing
 */
export async function runTestAndReport(
  testFn: () => Promise<TestSummary>
): Promise<string> {
  console.log('Running all block tests...\n');

  const summary = await testFn();

  if (summary.failed === 0) {
    const msg = `All ${summary.passed} blocks passed!`;
    console.log(msg);
    return msg;
  }

  const lines: string[] = [
    '## Block Test Error Report',
    '',
    `Total: ${summary.total} | Passed: ${summary.passed} | Failed: ${summary.failed}`,
    '',
  ];

  const errorsByMessage: Record<string, TestResult[]> = {};
  for (const result of summary.failedAssets) {
    const key = result.error ?? 'Unknown error';
    if (!errorsByMessage[key]) {
      errorsByMessage[key] = [];
    }
    errorsByMessage[key].push(result);
  }

  const sortedErrors = Object.entries(errorsByMessage)
    .sort((a, b) => b[1].length - a[1].length);

  for (const [errorMsg, results] of sortedErrors) {
    lines.push(`### ${errorMsg} (${results.length} assets)`);
    lines.push('');
    lines.push('| Asset ID | Converted BlockState ID |');
    lines.push('|----------|------------------------|');
    for (const result of results) {
      lines.push(`| \`${result.assetId}\` | \`${result.blockStateId ?? 'N/A'}\` |`);
    }
    lines.push('');
  }

  const report = lines.join('\n');

  console.log(`\n${'='.repeat(60)}`);
  console.log('COPY THE REPORT BELOW:');
  console.log(`${'='.repeat(60)}\n`);
  console.log(report);
  console.log(`\n${'='.repeat(60)}`);

  return report;
}
