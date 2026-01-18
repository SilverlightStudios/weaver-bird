/**
 * React hook for fetching and managing Minecraft BlockColors registry data.
 */

import { useState, useEffect } from "react";
import {
  fetchBlockColors,
  type BlockColorRegistry,
} from "@/utils/blockColors/fetchBlockColors";

export interface UseBlockColorsResult {
  /** Loading state */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Block color registry data */
  data: BlockColorRegistry | null;
  /** Refetch the data */
  refetch: () => void;
}

/**
 * Hook to fetch and manage block colors registry for a Minecraft version.
 *
 * This hook:
 * - Automatically fetches block colors on mount
 * - Uses localStorage caching (7 day expiry)
 * - Provides loading and error states
 * - Allows manual refetch
 *
 * @param mcVersion - Minecraft version (e.g., "1.21.4")
 * @returns Object containing loading, error, data, and refetch function
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { loading, error, data } = useBlockColors("1.21.4");
 *
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *   if (!data) return null;
 *
 *   return <div>Found {data.entries.length} tint entries</div>;
 * }
 * ```
 */
export function useBlockColors(mcVersion: string): UseBlockColorsResult {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BlockColorRegistry | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState<number>(0);

  useEffect(() => {
    let mounted = true;

    const loadBlockColors = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log(`[useBlockColors] Fetching block colors for ${mcVersion}`);
        const registry = await fetchBlockColors(mcVersion);

        if (mounted) {
          setData(registry);
          setLoading(false);
          console.log(
            `[useBlockColors] Successfully loaded ${registry.entries.length} entries`,
          );
        }
      } catch (err) {
        console.error("[useBlockColors] Error fetching block colors:", err);

        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to fetch block colors",
          );
          setLoading(false);
        }
      }
    };

    void loadBlockColors();

    return () => {
      mounted = false;
    };
  }, [mcVersion, fetchTrigger]);

  const refetch = () => {
    setFetchTrigger((prev) => prev + 1);
  };

  return {
    loading,
    error,
    data,
    refetch,
  };
}
