import { useEffect, useState, useCallback, useRef } from "react";
import type * as THREE from "three";
import { resolveBlockState } from "@lib/tauri/blockModels";
import { createTextureLoader } from "@lib/three/textureLoader";
import { getBlockStateIdFromAssetId, getVariantNumber } from "@lib/assetUtils";
import {
  resolveModelAssetId,
  mergeAndCleanProps,
  resolveWallVariant,
  applyVariantOverride,
} from "./modelUtils";
import {
  determineTintType,
  logBlockModelError,
  extractErrorMessage,
} from "./loadModelHelpers";
import { createPlaceholderGroup, cleanupBlockGroup, loadAndConvertModels } from "./utils";

interface LoaderConfig {
  normalizedAssetId: string;
  assetId: string;
  isPotted: boolean;
  showPot: boolean;
  blockProps: Record<string, string>;
  seed: number;
  resolvedPackId: string | undefined;
  resolvedPack: { path: string; is_zip: boolean } | null;
  packsDirPath: string | undefined;
  biomeColor?: { r: number; g: number; b: number } | null;
  onTintDetected?: (info: { hasTint: boolean; tintType?: "grass" | "foliage" }) => void;
}

export function useBlockModelLoader(
  config: LoaderConfig,
  biomeColorKey: string | null,
  blockPropsKey: string,
) {
  const [blockGroup, setBlockGroup] = useState<THREE.Group | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Use ref to track current blockGroup for cleanup without triggering re-renders
  const blockGroupRef = useRef<THREE.Group | null>(null);

  const {
    normalizedAssetId,
    assetId,
    isPotted,
    showPot,
    blockProps,
    seed,
    resolvedPackId,
    resolvedPack,
    packsDirPath,
    biomeColor,
    onTintDetected,
  } = config;

  // Keep ref in sync with state
  useEffect(() => {
    blockGroupRef.current = blockGroup;
  }, [blockGroup]);

  const createPlaceholder = useCallback(() => {
    try {
      const group = createPlaceholderGroup();
      setBlockGroup(group);
      setLoading(false);
    } catch (err) {
      console.error("[BlockModel] Error creating placeholder:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, []);

  useEffect(() => {
    console.log(
      `[BlockModel.useEffect.loadModel] asset=${normalizedAssetId} pack=${resolvedPackId}`,
    );

    if (!resolvedPackId || !resolvedPack || !packsDirPath) {
      createPlaceholder();
      return;
    }

    const packsDirPathStr: string = packsDirPath;
    const packId: string = resolvedPackId;
    let cancelled = false;

    async function loadModel() {
      setLoading(true);
      setError(null);

      try {
        console.log(
          `[BlockModel.loadModel] starting: asset=${assetId} pack=${packId} potted=${isPotted}`,
        );

        const modelAssetId = resolveModelAssetId(normalizedAssetId, isPotted, showPot);
        const cleanedProps = mergeAndCleanProps(modelAssetId, assetId, blockProps);
        const mergedProps = { ...cleanedProps, wall: blockProps.wall };
        const blockStateAssetId = resolveWallVariant(
          getBlockStateIdFromAssetId(modelAssetId),
          mergedProps,
        );

        const resolution = await resolveBlockState(
          packId,
          blockStateAssetId,
          packsDirPathStr,
          Object.keys(cleanedProps).length > 0 ? cleanedProps : undefined,
          seed,
        );

        console.log(
          `[BlockModel.loadModel] blockstate resolved: models=${resolution.models.length}`,
        );

        if (cancelled) return;

        const variantNumber = getVariantNumber(assetId);
        resolution.models = applyVariantOverride(resolution.models, variantNumber);

        const textureLoader = createTextureLoader(
          resolvedPack.path,
          resolvedPack.is_zip,
          variantNumber,
        );

        const { parentGroup, hasTintindex } = await loadAndConvertModels(
          resolution.models,
          packId,
          packsDirPathStr,
          textureLoader,
          biomeColor,
          blockStateAssetId,
          cleanedProps,
          () => cancelled,
        );

        if (onTintDetected) {
          const tintInfo = determineTintType(assetId, hasTintindex);
          onTintDetected(tintInfo);
        }

        if (cancelled) return;

        parentGroup.position.y = 0.5;
        setBlockGroup(parentGroup);
        setLoading(false);
        console.log(`[BlockModel.loadModel] complete`);
      } catch (err) {
        logBlockModelError(err);
        if (!cancelled) {
          setError(extractErrorMessage(err));
          setLoading(false);
          createPlaceholder();
        }
      }
    }

    void loadModel();

    return () => {
      cancelled = true;
      // Use ref to get current blockGroup at cleanup time
      const currentGroup = blockGroupRef.current;
      if (currentGroup) {
        cleanupBlockGroup(currentGroup);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    assetId,
    normalizedAssetId,
    resolvedPackId,
    packsDirPath,
    biomeColorKey,
    showPot,
    isPotted,
    blockPropsKey,
    seed,
    createPlaceholder,
    // Intentionally omitted to prevent infinite loops:
    // - blockGroup: tracked via ref
    // - resolvedPack: changes tracked via resolvedPackId
    // - biomeColor: changes tracked via biomeColorKey
    // - blockProps: changes tracked via blockPropsKey
    // - onTintDetected: assumed stable
  ]);

  return { blockGroup, error, loading };
}
