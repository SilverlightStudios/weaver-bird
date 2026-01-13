/**
 * Web Worker for Asset Variant Grouping
 *
 * Handles CPU-intensive asset grouping and name beautification processing.
 * Runs off the main thread to keep UI responsive during pagination and search.
 *
 * Expected performance gain: ~30-50ms saved per operation
 */

import {
  groupAssetsForCards,
  type AssetGroup,
} from "@/lib/utils/assetGrouping";

// Define message types for type safety
export interface WorkerRequest {
  id: string;
  assetIds: string[];
}

export type { AssetGroup };

export interface WorkerResponse {
  id: string;
  groups: AssetGroup[];
}

// Worker message handler
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, assetIds } = event.data;

  try {
    // Do the heavy work - group assets and compute display names
    const groups = groupAssetsForCards(assetIds);

    // Send result back to main thread
    const response: WorkerResponse = { id, groups };
    self.postMessage(response);
  } catch (error) {
    console.error("[AssetGroupingWorker] Error:", error);
    // Send empty result on error
    self.postMessage({ id, groups: [] });
  }
};
