import { useState, useEffect, useCallback } from "react";
import { useStore } from "@state/store";

export const useOptionsPanelState = (
  assetId: string | null | undefined,
  onBlockPropsChange?: (props: Record<string, string>) => void,
  onSeedChange?: (seed: number) => void,
) => {
  const [blockProps, setBlockProps] = useState<Record<string, string>>({});
  const [seed, setSeed] = useState(0);

  // Reset state when asset changes
  useEffect(() => {
    if (assetId) {
      setBlockProps({});
      setSeed(0);
      onBlockPropsChange?.({});
    }
  }, [assetId, onBlockPropsChange]);

  const handleBlockPropsChange = useCallback(
    (props: Record<string, string>) => {
      setBlockProps(props);
      onBlockPropsChange?.(props);

      // For bell blocks, update swing direction based on facing property
      if (assetId?.includes("bell") && props.facing) {
        const setSwingDirection = useStore.getState().setEntitySwingDirection;
        const directionMap: Record<string, number> = {
          north: 1,
          south: 0,
          east: 3,
          west: 2,
        };
        const swingDirection = directionMap[props.facing] ?? 3;
        setSwingDirection(swingDirection);
      }
    },
    [assetId, onBlockPropsChange],
  );

  const handleSeedChange = useCallback(
    (newSeed: number) => {
      setSeed(newSeed);
      onSeedChange?.(newSeed);
    },
    [onSeedChange],
  );

  return {
    blockProps,
    seed,
    handleBlockPropsChange,
    handleSeedChange,
  };
};
