/**
 * EntityModel - Renders entity models (chests, shulker boxes, mobs, etc.)
 * Uses EMF (Entity Model Features) JEM format for entity geometry.
 */
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useStore } from "@state/store";
import { useSelectWinner, useSelectPack, useSelectPacksDir, useSelectAllAssets } from "@state/selectors";
import { getEntityInfoFromAssetId, getEntityTextureAssetId, isEntityTexture } from "@lib/emf";
import { resolveEntityCompositeSchema } from "@lib/entityComposite";
import type { AnimationEngine as AnimationEngineType } from "@lib/emf/animation/AnimationEngine";
import { JEMInspectorV2 } from "@lib/emf/JEMInspectorV2";
import type { EntityModelProps } from "./types";
import { useEntityModelLoader } from "./useEntityModelLoader";
import { useEntityAnimation } from "./useEntityAnimation";
import { useEntityLayers } from "./useEntityLayers";
import { applyVanillaKeyframeAnimation, applyBoneVisibilityOverrides, syncOverlayLayers } from "./helpers";

function EntityModel({ assetId, positionOffset = [0, 0, 0], entityTypeOverride, parentEntityOverride }: EntityModelProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Store selectors
  const storeWinnerPackId = useSelectWinner(assetId);
  const storeWinnerPack = useSelectPack(storeWinnerPackId ?? "");
  const vanillaPack = useSelectPack("minecraft:vanilla");
  const packsDir = useSelectPacksDir();
  const allAssets = useSelectAllAssets();
  const packOrder = useStore((state) => state.packOrder);
  const packsById = useStore((state) => state.packs);
  const disabledPackIds = useStore((state) => state.disabledPackIds);
  const selectedEntityVariant = useStore((state) => state.entityVariant);
  const entityFeatureStateByAssetId = useStore((state) => state.entityFeatureStateByAssetId);
  const jemDebugMode = useStore((state) => state.jemDebugMode);
  const animationPlaying = useStore((state) => state.animationPlaying);
  const animationSpeed = useStore((state) => state.animationSpeed);

  const resolvedPackId = storeWinnerPackId ?? (vanillaPack ? "minecraft:vanilla" : undefined);
  const resolvedPack = storeWinnerPackId ? storeWinnerPack : vanillaPack;

  // Entity feature schema resolution
  const allAssetIds = useMemo(() => allAssets.map((a) => a.id), [allAssets]);
  const entityFeatureSchema = useMemo(() => resolveEntityCompositeSchema(assetId, allAssetIds), [assetId, allAssetIds]);
  const entityFeatureState = entityFeatureSchema ? entityFeatureStateByAssetId[entityFeatureSchema.baseAssetId] : undefined;
  const entityFeatureStateView = useMemo(() => ({
    toggles: entityFeatureState?.toggles ?? {},
    selects: entityFeatureState?.selects ?? {},
  }), [entityFeatureState]);

  const baseTextureAssetId = useMemo(() => {
    if (!entityFeatureSchema?.getBaseTextureAssetId) return assetId;
    try { return entityFeatureSchema.getBaseTextureAssetId(entityFeatureStateView); }
    catch { return assetId; }
  }, [assetId, entityFeatureSchema, entityFeatureStateView]);

  const resolvedEntityInfo = useMemo(() =>
    entityTypeOverride
      ? { variant: entityTypeOverride, parent: parentEntityOverride ?? null }
      : getEntityInfoFromAssetId(baseTextureAssetId),
  [entityTypeOverride, parentEntityOverride, baseTextureAssetId]);

  const textureAssetId = useMemo(() => getEntityTextureAssetId(baseTextureAssetId), [baseTextureAssetId]);

  const partTextureOverrides = useMemo(() => {
    if (!entityFeatureSchema?.getPartTextureOverrides) return null;
    try { return entityFeatureSchema.getPartTextureOverrides(entityFeatureStateView); }
    catch { return null; }
  }, [entityFeatureSchema, entityFeatureStateView]);

  const cemEntityOverride = useMemo(() => {
    if (!entityFeatureSchema?.getCemEntityType) return null;
    try { return entityFeatureSchema.getCemEntityType(entityFeatureStateView); }
    catch { return null; }
  }, [entityFeatureSchema, entityFeatureStateView]);

  const featureBoneInputOverrides = useMemo(() => {
    if (!entityFeatureSchema?.getBoneInputOverrides) return null;
    try { return entityFeatureSchema.getBoneInputOverrides(entityFeatureStateView); }
    catch { return null; }
  }, [entityFeatureSchema, entityFeatureStateView]);

  const entityStateOverrides = useMemo(() => {
    if (!entityFeatureSchema?.getEntityStateOverrides) return null;
    try { return entityFeatureSchema.getEntityStateOverrides(entityFeatureStateView); }
    catch { return null; }
  }, [entityFeatureSchema, entityFeatureStateView]);

  const boneRenderOverrides = useMemo(() => {
    if (!entityFeatureSchema?.getBoneRenderOverrides) return null;
    try { return entityFeatureSchema.getBoneRenderOverrides(entityFeatureStateView); }
    catch { return null; }
  }, [entityFeatureSchema, entityFeatureStateView]);

  const activeEntityLayers = useMemo(() => {
    if (!entityFeatureSchema) return [];
    return entityFeatureSchema.getActiveLayers(entityFeatureStateView);
  }, [entityFeatureSchema, entityFeatureStateView]);

  // Model loading
  const { entityGroup, cemSourcePack, packAnimationLayers, parsedJemData, currentEntityId, loading, error } = useEntityModelLoader({
    assetId, baseTextureAssetId, textureAssetId, resolvedEntityInfo, partTextureOverrides,
    cemEntityOverride, resolvedPack, resolvedPackId, packsDir, packOrder, packsById,
    disabledPackIds, selectedEntityVariant,
  });

  // Animation
  const { animationEngineRef, baseBoneMapRef, vanillaAnimationRef, vanillaAnimationTimeRef } = useEntityAnimation({
    assetId, entityGroup, currentEntityId, packAnimationLayers, featureBoneInputOverrides, entityStateOverrides,
  });

  // Feature layers
  const {
    layerGroups, loadedLayerIds, overlayBoneMapsRef,
    overlayAnimatedBonesRef, layerBoneAliasMapsRef,
    layerBoneRenderOverridesRef, layerBonePositionOffsetsRef,
    layerBoneScaleMultipliersRef, energySwirlMaterialsRef, layerGroupsRef,
  } = useEntityLayers({
    entityGroup, cemSourcePack, activeEntityLayers, resolvedEntityInfo, cemEntityOverride, packsDir,
    baseBoneMap: baseBoneMapRef.current,
  });

  // Overlay animation engines
  const overlayEnginesRef = useRef<Record<string, AnimationEngineType>>({});
  const jemInspectorRef = useRef<JEMInspectorV2 | null>(null);
  const tmpWorldCopyParentInvRef = useRef(new THREE.Matrix4());
  const tmpWorldCopyLocalRef = useRef(new THREE.Matrix4());
  const tmpRotatedOffsetRef = useRef(new THREE.Vector3());
  const tmpOverlayPosOffsetRef = useRef(new THREE.Vector3());
  const tmpOverlayScaleRef = useRef(new THREE.Vector3());

  // Effective bone render overrides (includes layer replacements)
  const effectiveBoneRenderOverrides = useMemo(() => {
    const loadedSet = new Set(loadedLayerIds);
    let overlayOverrides: Partial<Record<string, { visible?: boolean }>> | null = null;
    if (activeEntityLayers.length > 0 && loadedSet.size > 0) {
      for (const layer of activeEntityLayers) {
        if (!layer.replacesBaseBones || !loadedSet.has(layer.id)) continue;
        overlayOverrides ??= {};
        for (const boneName of layer.replacesBaseBones) {
          overlayOverrides[boneName] = { visible: false };
        }
      }
    }
    if (!boneRenderOverrides) return overlayOverrides;
    if (!overlayOverrides) return boneRenderOverrides;
    return { ...boneRenderOverrides, ...overlayOverrides };
  }, [activeEntityLayers, boneRenderOverrides, loadedLayerIds]);

  // JEM Inspector
  useEffect(() => {
    if (jemInspectorRef.current) { jemInspectorRef.current.dispose(); jemInspectorRef.current = null; }
    if (jemDebugMode && entityGroup && parsedJemData && groupRef.current) {
      let scene: THREE.Scene | null = null;
      groupRef.current.traverseAncestors((ancestor) => { if (ancestor instanceof THREE.Scene) scene = ancestor; });
      if (scene) {
        jemInspectorRef.current = new JEMInspectorV2({ scene, jemData: parsedJemData, rootGroup: entityGroup });
      }
    }
    return () => { jemInspectorRef.current?.dispose(); jemInspectorRef.current = null; };
  }, [jemDebugMode, entityGroup, parsedJemData]);

  // Animation frame
  useFrame((_, delta) => {
    const engine = animationEngineRef.current;
    if (!engine || jemDebugMode) return;

    if (entityStateOverrides) engine.updateEntityState(entityStateOverrides);

    // Handle vanilla keyframe animations
    const vanillaAnim = vanillaAnimationRef.current;
    if (vanillaAnim?.parts && animationPlaying) {
      const scaledDelta = delta * animationSpeed;
      vanillaAnimationTimeRef.current += scaledDelta;
      const duration = vanillaAnim.duration / 20;
      let normalizedTime = (vanillaAnimationTimeRef.current % duration) / duration;
      if (!vanillaAnim.looping && vanillaAnimationTimeRef.current >= duration) {
        normalizedTime = 1.0;
      }
      applyVanillaKeyframeAnimation(vanillaAnim, baseBoneMapRef.current, normalizedTime);
    } else {
      engine.tick(delta);
    }

    // Tick overlay engines
    const baseState = engine.getEntityState();
    const overlayState = entityStateOverrides ? { ...baseState, ...entityStateOverrides } : baseState;
    for (const overlayEngine of Object.values(overlayEnginesRef.current)) {
      overlayEngine.tickWithExternalState(delta, overlayState);
    }

    // Apply bone visibility overrides
    if (effectiveBoneRenderOverrides) {
      applyBoneVisibilityOverrides(baseBoneMapRef.current, effectiveBoneRenderOverrides);
    }

    // Sync overlay layers to base pose
    if (!entityGroup) return;
    entityGroup.updateMatrixWorld(true);
    syncOverlayLayers({
      entityGroup,
      baseBoneMap: baseBoneMapRef.current,
      overlayBoneMaps: overlayBoneMapsRef.current,
      energySwirlMaterials: energySwirlMaterialsRef.current,
      layerBoneRenderOverrides: layerBoneRenderOverridesRef.current,
      layerBoneAliasMaps: layerBoneAliasMapsRef.current,
      layerBonePositionOffsets: layerBonePositionOffsetsRef.current,
      layerBoneScaleMultipliers: layerBoneScaleMultipliersRef.current,
      overlayAnimatedBones: overlayAnimatedBonesRef.current,
      layerGroups: layerGroupsRef.current,
      tmpWorldCopyParentInv: tmpWorldCopyParentInvRef.current,
      tmpWorldCopyLocal: tmpWorldCopyLocalRef.current,
      tmpOverlayPosOffset: tmpOverlayPosOffsetRef.current,
      tmpOverlayScale: tmpOverlayScaleRef.current,
    });
  });

  console.log("[EntityModel] Render check:", {
    assetId,
    error,
    loading,
    hasEntityGroup: !!entityGroup,
    layerGroupsCount: layerGroups.length,
  });

  if (error && !entityGroup) {
    console.log("[EntityModel] Returning null: has error and no group");
    return null;
  }
  if (loading || !entityGroup) {
    console.log("[EntityModel] Returning null: loading=" + loading + ", hasGroup=" + !!entityGroup);
    return null;
  }

  console.log("[EntityModel] ✓ Rendering entity group!");
  return (
    <group ref={groupRef} position={positionOffset}>
      <primitive object={entityGroup} />
      {layerGroups.map((layer) => <primitive key={layer.id} object={layer.group} />)}
    </group>
  );
}

export default EntityModel;
export { isEntityTexture as isEntityAsset };
