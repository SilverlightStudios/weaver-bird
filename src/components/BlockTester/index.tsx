/**
 * BlockTester - Automated testing component for all blocks
 *
 * This component systematically tests each block in the resource pack
 * to verify they can be rendered in the 3D scene without errors.
 */
import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { resolveBlockState, loadModelJson } from '@lib/tauri/blockModels';
import { getBlockStateIdFromAssetId } from '@lib/assetUtils';

interface TestResult {
  blockId: string;
  assetId: string;
  status: 'pending' | 'testing' | 'success' | 'error' | 'excluded';
  error?: string;
  modelCount?: number;
  duration?: number;
}

interface BlockTesterProps {
  packsDir: string;
  packId: string;
  onComplete?: (results: TestResult[]) => void;
  autoStart?: boolean;
}

// Blocks to exclude from testing (known unsupported types)
const EXCLUDED_BLOCKS = new Set([
  // Add any blocks that should be skipped
]);

export function BlockTester({ packsDir, packId, onComplete, autoStart = false }: BlockTesterProps) {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [summary, setSummary] = useState({ total: 0, success: 0, error: 0, excluded: 0 });
  const [blockList, setBlockList] = useState<string[]>([]);

  // Fetch block list on mount
  useEffect(() => {
    async function fetchBlocks() {
      try {
        // Get all blockstate files from the packs directory
        const scanResult = await invoke<{
          packs: Array<{ id: string; path: string; is_zip: boolean }>;
          assets: Array<{ id: string }>;
        }>('scan_packs_folder', { packsDir });

        // Filter to only block assets
        const blocks = scanResult.assets
          .filter(a => a.id.includes(':block/'))
          .map(a => a.id);

        // Group by base block name to avoid testing variants multiple times
        const uniqueBlocks = [...new Set(blocks.map(id => {
          const blockstateId = getBlockStateIdFromAssetId(id);
          return blockstateId;
        }))];

        console.log(`[BlockTester] Found ${uniqueBlocks.length} unique blocks to test`);
        setBlockList(uniqueBlocks);

        // Initialize results
        const initialResults: TestResult[] = uniqueBlocks.map(blockId => ({
          blockId,
          assetId: blockId,
          status: EXCLUDED_BLOCKS.has(blockId.replace('minecraft:block/', '')) ? 'excluded' : 'pending',
        }));
        setResults(initialResults);

        if (autoStart) {
          startTesting(initialResults, uniqueBlocks);
        }
      } catch (err) {
        console.error('[BlockTester] Failed to fetch blocks:', err);
      }
    }

    fetchBlocks();
  }, [packsDir, autoStart]);

  const startTesting = useCallback(async (testResults?: TestResult[], blocks?: string[]) => {
    const resultsToUse = testResults || results;
    const blocksToUse = blocks || blockList;

    if (blocksToUse.length === 0) {
      console.log('[BlockTester] No blocks to test');
      return;
    }

    setIsRunning(true);
    setCurrentIndex(0);

    const updatedResults = [...resultsToUse];
    let successCount = 0;
    let errorCount = 0;
    let excludedCount = 0;

    for (let i = 0; i < blocksToUse.length; i++) {
      const blockId = blocksToUse[i];
      const result = updatedResults[i];

      if (result.status === 'excluded') {
        excludedCount++;
        continue;
      }

      setCurrentIndex(i);
      updatedResults[i] = { ...result, status: 'testing' };
      setResults([...updatedResults]);

      const startTime = Date.now();

      try {
        // Step 1: Resolve blockstate to get models
        console.log(`[BlockTester] Testing: ${blockId}`);
        const resolution = await resolveBlockState(packId, blockId, packsDir);

        // Step 2: Load each model to verify it works
        for (const model of resolution.models) {
          await loadModelJson(packId, model.modelId, packsDir);
        }

        const duration = Date.now() - startTime;
        updatedResults[i] = {
          ...result,
          status: 'success',
          modelCount: resolution.models.length,
          duration,
        };
        successCount++;
        console.log(`[BlockTester] ✓ ${blockId} (${resolution.models.length} models, ${duration}ms)`);
      } catch (err) {
        const duration = Date.now() - startTime;
        const errorMessage = err instanceof Error ? err.message : String(err);
        updatedResults[i] = {
          ...result,
          status: 'error',
          error: errorMessage,
          duration,
        };
        errorCount++;
        console.error(`[BlockTester] ✗ ${blockId}: ${errorMessage}`);

        // Stop on first error to allow fixing
        setResults([...updatedResults]);
        setIsRunning(false);
        setSummary({
          total: blocksToUse.length,
          success: successCount,
          error: errorCount,
          excluded: excludedCount
        });

        if (onComplete) {
          onComplete(updatedResults);
        }
        return;
      }

      setResults([...updatedResults]);
    }

    setIsRunning(false);
    setSummary({
      total: blocksToUse.length,
      success: successCount,
      error: errorCount,
      excluded: excludedCount
    });

    if (onComplete) {
      onComplete(updatedResults);
    }
  }, [results, blockList, packId, packsDir, onComplete]);

  const getFirstError = () => {
    return results.find(r => r.status === 'error');
  };

  const errorResult = getFirstError();

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', maxHeight: '80vh', overflow: 'auto' }}>
      <h2>Block Tester</h2>

      <div style={{ marginBottom: '20px' }}>
        <strong>Pack:</strong> {packId}<br />
        <strong>Directory:</strong> {packsDir}<br />
        <strong>Total Blocks:</strong> {blockList.length}
      </div>

      {!isRunning && blockList.length > 0 && (
        <button
          onClick={() => startTesting()}
          style={{ padding: '10px 20px', marginBottom: '20px', cursor: 'pointer' }}
        >
          {results.some(r => r.status === 'error') ? 'Continue Testing' : 'Start Testing'}
        </button>
      )}

      {isRunning && (
        <div style={{ marginBottom: '20px' }}>
          <strong>Testing:</strong> {currentIndex + 1} / {blockList.length}
          <br />
          <strong>Current:</strong> {blockList[currentIndex]}
        </div>
      )}

      <div style={{ marginBottom: '20px', padding: '10px', background: '#f0f0f0' }}>
        <strong>Summary:</strong><br />
        Total: {summary.total} |
        Success: <span style={{ color: 'green' }}>{summary.success}</span> |
        Error: <span style={{ color: 'red' }}>{summary.error}</span> |
        Excluded: <span style={{ color: 'gray' }}>{summary.excluded}</span>
      </div>

      {errorResult && (
        <div style={{
          marginBottom: '20px',
          padding: '15px',
          background: '#ffebee',
          border: '1px solid #f44336',
          borderRadius: '4px'
        }}>
          <strong style={{ color: '#c62828' }}>First Error:</strong><br />
          <strong>Block:</strong> {errorResult.blockId}<br />
          <strong>Error:</strong> {errorResult.error}
        </div>
      )}

      <div style={{ maxHeight: '400px', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '5px', borderBottom: '1px solid #ccc' }}>#</th>
              <th style={{ textAlign: 'left', padding: '5px', borderBottom: '1px solid #ccc' }}>Block</th>
              <th style={{ textAlign: 'left', padding: '5px', borderBottom: '1px solid #ccc' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '5px', borderBottom: '1px solid #ccc' }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result, index) => (
              <tr key={result.blockId} style={{
                background: result.status === 'error' ? '#ffebee' :
                           result.status === 'success' ? '#e8f5e9' :
                           result.status === 'testing' ? '#fff3e0' : 'transparent'
              }}>
                <td style={{ padding: '5px' }}>{index + 1}</td>
                <td style={{ padding: '5px' }}>{result.blockId.replace('minecraft:block/', '')}</td>
                <td style={{ padding: '5px' }}>
                  {result.status === 'success' && '✓'}
                  {result.status === 'error' && '✗'}
                  {result.status === 'testing' && '⏳'}
                  {result.status === 'pending' && '○'}
                  {result.status === 'excluded' && '⊘'}
                </td>
                <td style={{ padding: '5px', fontSize: '12px' }}>
                  {result.status === 'success' && `${result.modelCount} models, ${result.duration}ms`}
                  {result.status === 'error' && result.error}
                  {result.status === 'excluded' && 'Excluded'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default BlockTester;
