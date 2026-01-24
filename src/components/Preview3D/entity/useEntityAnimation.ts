/**
 * Hook for managing entity animation engine and synchronization
 */
import { useEffect, useMemo, useRef } from "react";
import type * as THREE from "three";
import { useStore } from "@state/store";
import { getEntityInfoFromAssetId } from "@lib/emf";
import { createAnimationEngine, type AnimationEngine as AnimationEngineType } from "@lib/emf/animation/AnimationEngine";
import {
  getAvailableAnimationPresetIdsForAnimationLayers,
  getAvailableAnimationTriggerIdsForAnimationLayers,
  getAvailablePoseToggleIdsForAnimationLayers,
} from "@lib/emf/animation";
import { getVanillaAnimation, getVanillaAnimationTrigger, VANILLA_ANIMATIONS, type VanillaAnimation } from "@constants/animations";
import type { AnimationLayer } from "@lib/emf/jemLoader";
import { areAnimationLayersStatic, buildBoneMap } from "./helpers";

// Helper functions for animation configuration
function extractEntityId(assetId: string): string | undefined {
  const normalized = assetId.toLowerCase();
  const entityMatch = normalized.match(/entity\/([^/]+)/);
  const blockMatch = normalized.match(/block\/([^/]+)/);
  return entityMatch?.[1] ?? blockMatch?.[1];
}

function isUsingVanillaAnimations(
  animationLayers: AnimationLayer[] | undefined,
  entityId: string | undefined
): boolean {
  return !!(
    animationLayers &&
    animationLayers.length > 0 &&
    entityId &&
    VANILLA_ANIMATIONS[entityId as keyof typeof VANILLA_ANIMATIONS]
  );
}

function computeAvailablePresets(
  animationLayers: AnimationLayer[] | undefined,
  isBanner: boolean,
  usingVanillaAnimations: boolean
): string[] | null {
  const discovered = getAvailableAnimationPresetIdsForAnimationLayers(animationLayers);
  if (usingVanillaAnimations) return ["idle"];
  if (discovered) return discovered;
  return isBanner ? ["idle"] : null;
}

function computeAvailableTriggers(
  animationLayers: AnimationLayer[] | undefined,
  vanillaTrigger: string | undefined
): string[] | null {
  const packTriggers = getAvailableAnimationTriggerIdsForAnimationLayers(animationLayers) ?? [];

  if (vanillaTrigger === "interact") {
    const allTriggers = [...packTriggers];
    if (!allTriggers.includes("trigger.interact")) {
      allTriggers.push("trigger.interact");
    }
    return allTriggers.length > 0 ? allTriggers : null;
  }

  return packTriggers.length > 0 ? packTriggers : null;
}

interface AnimationDependencies {
  assetId: string;
  entityGroup: THREE.Group | null;
  currentEntityId: string | undefined;
  packAnimationLayers: AnimationLayer[] | undefined;
  featureBoneInputOverrides: Record<string, Record<string, unknown>> | null;
  entityStateOverrides: Record<string, unknown> | null;
}

interface AnimationResult {
  animationEngineRef: React.MutableRefObject<AnimationEngineType | null>;
  animationLayers: AnimationLayer[] | undefined;
  baseBoneMapRef: React.MutableRefObject<Map<string, THREE.Object3D>>;
  vanillaAnimationRef: React.MutableRefObject<VanillaAnimation | null>;
  vanillaAnimationTimeRef: React.MutableRefObject<number>;
}

export function useEntityAnimation(deps: AnimationDependencies): AnimationResult {
  const animationEngineRef = useRef<AnimationEngineType | null>(null);
  const baseBoneMapRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const vanillaAnimationRef = useRef<VanillaAnimation | null>(null);
  const vanillaAnimationTimeRef = useRef<number>(0);

  // Store selectors
  const entityAnimationVariant = useStore((state) => state.entityAnimationVariantByAssetId[deps.assetId] ?? "pack");
  const animationPreset = useStore((state) => state.animationPreset);
  const animationPlaying = useStore((state) => state.animationPlaying);
  const animationSpeed = useStore((state) => state.animationSpeed);
  const entityHeadYaw = useStore((state) => state.entityHeadYaw);
  const entityHeadPitch = useStore((state) => state.entityHeadPitch);
  const entitySwingDirection = useStore((state) => state.entitySwingDirection);
  const activePoseToggles = useStore((state) => state.activePoseToggles);
  const animationTriggerRequestId = useStore((state) => state.animationTriggerRequestId);
  const animationTriggerRequestNonce = useStore((state) => state.animationTriggerRequestNonce);

  const setAvailableAnimationPresets = useStore((state) => state.setAvailableAnimationPresets);
  const setAvailableAnimationTriggers = useStore((state) => state.setAvailableAnimationTriggers);
  const setAvailablePoseToggles = useStore((state) => state.setAvailablePoseToggles);
  const setAvailableBones = useStore((state) => state.setAvailableBones);

  // Compute effective animation layers (pack vs vanilla)
  const animationLayers = useMemo(() => {
    const effectiveLayers = entityAnimationVariant === "vanilla" ? undefined : deps.packAnimationLayers;
    const entityId = extractEntityId(deps.assetId);

    let finalLayers = effectiveLayers ? [...effectiveLayers] : [];
    const packLayersAreStatic = areAnimationLayersStatic(effectiveLayers);

    if (entityId) {
      const vanillaAnims = VANILLA_ANIMATIONS[entityId as keyof typeof VANILLA_ANIMATIONS];
      if (vanillaAnims && Array.isArray(vanillaAnims)) {
        const vanillaLayers = vanillaAnims as unknown as AnimationLayer[];
        if (finalLayers.length === 0) {
          finalLayers = vanillaLayers;
        } else if (packLayersAreStatic) {
          finalLayers = [...finalLayers, ...vanillaLayers];
        }
      }
    }

    return finalLayers;
  }, [entityAnimationVariant, deps.packAnimationLayers, deps.assetId]);

  // Vanilla keyframe animation detection
  const vanillaAnimationData = useMemo(() => {
    if (!animationPreset?.startsWith("vanilla:")) return null;
    const animName = animationPreset.replace("vanilla:", "");
    const entityId = extractEntityId(deps.assetId);
    return entityId ? getVanillaAnimation(entityId, animName) : null;
  }, [animationPreset, deps.assetId]);

  // Build bone map when entity group changes
  useEffect(() => {
    if (deps.entityGroup) {
      baseBoneMapRef.current = buildBoneMap(deps.entityGroup);
      const boneNames = Array.from(baseBoneMapRef.current.keys());
      setAvailableBones(boneNames.length > 0 ? boneNames : null);
    }
  }, [deps.entityGroup, setAvailableBones]);

  // Update available presets/triggers when animation layers change
  useEffect(() => {
    const info = getEntityInfoFromAssetId(deps.assetId);
    const isBanner = info?.variant === "banner";
    const entityId = extractEntityId(deps.assetId);
    const usingVanillaAnimations = isUsingVanillaAnimations(animationLayers, entityId);

    const availablePresets = computeAvailablePresets(animationLayers, isBanner, usingVanillaAnimations);
    setAvailableAnimationPresets(availablePresets);

    const vanillaTrigger = entityId ? getVanillaAnimationTrigger(entityId) : undefined;
    const availableTriggers = computeAvailableTriggers(animationLayers, vanillaTrigger);
    setAvailableAnimationTriggers(availableTriggers);

    setAvailablePoseToggles(getAvailablePoseToggleIdsForAnimationLayers(animationLayers));
  }, [animationLayers, deps.assetId, setAvailableAnimationPresets, setAvailableAnimationTriggers, setAvailablePoseToggles]);

  // Create animation engine
  useEffect(() => {
    if (!deps.entityGroup) {
      animationEngineRef.current = null;
      return;
    }

    const engine = createAnimationEngine(deps.entityGroup, animationLayers, deps.currentEntityId);
    animationEngineRef.current = engine;
    engine.setFeatureBoneInputOverrides?.(deps.featureBoneInputOverrides);

    if (animationPreset) engine.setPreset(animationPreset, animationPlaying);
    engine.setSpeed(animationSpeed);
    engine.setHeadOrientation(entityHeadYaw, entityHeadPitch);
    engine.setSwingDirection(entitySwingDirection);
    engine.setPoseToggles(Object.entries(activePoseToggles).filter(([, e]) => e).map(([id]) => id));
    if (deps.entityStateOverrides) engine.updateEntityState(deps.entityStateOverrides);
    engine.tick(0);

    return () => {
      animationEngineRef.current?.reset();
      animationEngineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps.entityGroup, animationLayers]);

  // Sync feature bone input overrides
  useEffect(() => {
    animationEngineRef.current?.setFeatureBoneInputOverrides?.(deps.featureBoneInputOverrides);
  }, [deps.featureBoneInputOverrides]);

  // Sync animation preset
  useEffect(() => {
    animationEngineRef.current?.setPreset(animationPreset, animationPlaying);
  }, [animationPreset, animationPlaying]);

  // Sync trigger requests
  useEffect(() => {
    if (animationTriggerRequestId) {
      animationEngineRef.current?.playTrigger(animationTriggerRequestId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationTriggerRequestNonce]);

  // Sync speed
  useEffect(() => {
    animationEngineRef.current?.setSpeed(animationSpeed);
  }, [animationSpeed]);

  // Sync head orientation
  useEffect(() => {
    animationEngineRef.current?.setHeadOrientation(entityHeadYaw, entityHeadPitch);
  }, [entityHeadYaw, entityHeadPitch]);

  // Sync swing direction
  useEffect(() => {
    animationEngineRef.current?.setSwingDirection(entitySwingDirection);
  }, [entitySwingDirection]);

  // Sync pose toggles
  useEffect(() => {
    const active = Object.entries(activePoseToggles).filter(([, e]) => e).map(([id]) => id);
    animationEngineRef.current?.setPoseToggles(active);
  }, [activePoseToggles]);

  // Update vanilla animation ref
  useEffect(() => {
    vanillaAnimationRef.current = vanillaAnimationData;
    vanillaAnimationTimeRef.current = 0;
  }, [vanillaAnimationData]);

  return {
    animationEngineRef,
    animationLayers,
    baseBoneMapRef,
    vanillaAnimationRef,
    vanillaAnimationTimeRef,
  };
}
