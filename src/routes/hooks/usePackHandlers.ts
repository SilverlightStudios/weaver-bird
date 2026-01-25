/**
 * Pack Handlers Hook
 *
 * Provides event handlers for pack management.
 */

import { useCallback, useRef, useEffect } from "react";

export function usePackHandlers(
  setPackOrder: (order: string[]) => void,
  setDisabledPackOrder: (order: string[]) => void,
) {
  const packOrderDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (packOrderDebounceRef.current) {
        clearTimeout(packOrderDebounceRef.current);
      }
    };
  }, []);

  const handleReorderPacks = useCallback(
    (newOrder: string[]) => {
      setPackOrder(newOrder);

      if (packOrderDebounceRef.current) {
        clearTimeout(packOrderDebounceRef.current);
      }

      packOrderDebounceRef.current = setTimeout(() => {
        console.log("[usePackHandlers] Debounced pack order change applied");
      }, 150);
    },
    [setPackOrder],
  );

  const handleReorderDisabledPacks = useCallback(
    (newOrder: string[]) => {
      setDisabledPackOrder(newOrder);
    },
    [setDisabledPackOrder],
  );

  return {
    handleReorderPacks,
    handleReorderDisabledPacks,
  };
}
