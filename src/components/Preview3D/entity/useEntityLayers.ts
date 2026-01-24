/**
 * Hook for building entity feature layers (overlays, textures, etc.)
 */
import { useEffect, useState, useRef } from "react";
import type * as THREE from "three";
import { useStore } from "@state/store";
import { loadEntityModel, jemToThreeJS, type ParsedEntityModel, type ParsedPart } from "@lib/emf";
import { loadPackTexture, loadVanillaTexture } from "@lib/three/textureLoader";
import type { EntityLayerDefinition } from "@lib/entityComposite";
import type { AnimationLayer } from "@lib/emf/jemLoader";
import type { LayerGroupEntry, PackInfo } from "./types";
import { buildVersionFolderCandidates, normalizeJemTextureId, disposeGroupMaterials, disposeGroupAll, collectAnimatedBones, buildBoneMap } from "./helpers";
import { applyOverlayMaterials, collectEnergySwirlMaterials } from "./entityLayerMaterials";
import { cloneGroupWithTexture } from "./entityLayerCloning";
import { shouldSkipLayer, storeLayerMetadata } from "./entityLayerMetadata";

// Helper types for layer building state
interface LayerMetadata {
  overrides: Record<string, Partial<Record<string, { visible?: boolean }>> | null>;
  aliasMaps: Record<string, Record<string, string> | null>;
  positionOffsets: Record<string, Record<string, { x: number; y: number; z: number }> | null>;
  scaleMultipliers: Record<string, Record<string, { x: number; y: number; z: number }> | null>;
  animations: Record<string, AnimationLayer[] | null>;
  animationEntityIds: Record<string, string | undefined>;
  animatedBones: Record<string, Set<string>>;
}

async function processCloneTextureLayer(
  layer: EntityLayerDefinition,
  entityGroup: THREE.Group,
  tex: THREE.Texture | null,
  metadata: LayerMetadata,
  energySwirlMaterials: THREE.Material[]
): Promise<LayerGroupEntry> {
  const g = cloneGroupWithTexture(entityGroup, tex, layer);
  g.position.copy(entityGroup.position);
  g.rotation.copy(entityGroup.rotation);
  g.scale.copy(entityGroup.scale);
  storeLayerMetadata(layer, metadata.overrides, metadata.aliasMaps, metadata.positionOffsets, metadata.scaleMultipliers, metadata.animations, metadata.animationEntityIds, metadata.animatedBones);
  collectEnergySwirlMaterials(g, energySwirlMaterials);
  return { id: layer.id, group: g, dispose: "materials" };
}

async function processCemModelLayer(
  layer: EntityLayerDefinition,
  overlayModel: ParsedEntityModel,
  entityGroup: THREE.Group,
  tex: THREE.Texture | null,
  textureMap: Record<string, THREE.Texture>,
  metadata: LayerMetadata,
  energySwirlMaterials: THREE.Material[]
): Promise<LayerGroupEntry> {
  const overlayEntityId = layer.cemEntityTypeCandidates?.[0];
  const g = jemToThreeJS(overlayModel, tex, textureMap, overlayEntityId);

  g.position.copy(entityGroup.position);
  g.rotation.copy(entityGroup.rotation);
  g.scale.copy(entityGroup.scale);

  applyOverlayMaterials(g, tex, layer);

  metadata.overrides[layer.id] = layer.boneRenderOverrides ?? null;
  metadata.aliasMaps[layer.id] = layer.boneAliasMap ?? null;
  metadata.positionOffsets[layer.id] = layer.bonePositionOffsets ?? null;
  metadata.scaleMultipliers[layer.id] = layer.boneScaleMultipliers ?? null;

  if (layer.syncToBasePose) {
    metadata.animations[layer.id] = null;
    metadata.animationEntityIds[layer.id] = undefined;
    metadata.animatedBones[layer.id] = new Set<string>();
  } else {
    metadata.animations[layer.id] = overlayModel.animations ?? null;
    metadata.animationEntityIds[layer.id] = overlayEntityId;
    metadata.animatedBones[layer.id] = collectAnimatedBones(overlayModel.animations);
  }
  collectEnergySwirlMaterials(g, energySwirlMaterials);

  return { id: layer.id, group: g, dispose: "all" };
}

interface LayersDependencies {
  entityGroup: THREE.Group | null;
  cemSourcePack: PackInfo | null;
  activeEntityLayers: EntityLayerDefinition[];
  resolvedEntityInfo: { variant: string; parent: string | null } | null;
  cemEntityOverride: { entityType: string; parentEntity?: string | null } | null;
  packsDir: string | undefined;
  baseBoneMap: Map<string, THREE.Object3D>;
}

interface LayersResult {
  layerGroups: LayerGroupEntry[];
  loadedLayerIds: string[];
  overlayBoneMapsRef: React.MutableRefObject<Record<string, Map<string, THREE.Object3D>>>;
  overlayAnimationLayersRef: React.MutableRefObject<Record<string, AnimationLayer[] | null>>;
  overlayAnimationEntityIdsRef: React.MutableRefObject<Record<string, string | undefined>>;
  overlayAnimatedBonesRef: React.MutableRefObject<Record<string, Set<string>>>;
  layerBoneRenderOverridesRef: React.MutableRefObject<Record<string, Partial<Record<string, { visible?: boolean }>> | null>>;
  layerBoneAliasMapsRef: React.MutableRefObject<Record<string, Record<string, string> | null>>;
  layerBonePositionOffsetsRef: React.MutableRefObject<Record<string, Record<string, { x: number; y: number; z: number }> | null>>;
  layerBoneScaleMultipliersRef: React.MutableRefObject<Record<string, Record<string, { x: number; y: number; z: number }> | null>>;
  energySwirlMaterialsRef: React.MutableRefObject<THREE.Material[]>;
  layerGroupsRef: React.MutableRefObject<LayerGroupEntry[]>;
}

export function useEntityLayers(deps: LayersDependencies): LayersResult {
  const [layerGroups, setLayerGroups] = useState<LayerGroupEntry[]>([]);
  const [loadedLayerIds, setLoadedLayerIds] = useState<string[]>([]);

  const layerGroupsRef = useRef<LayerGroupEntry[]>([]);
  const overlayBoneMapsRef = useRef<Record<string, Map<string, THREE.Object3D>>>({});
  const overlayAnimationLayersRef = useRef<Record<string, AnimationLayer[] | null>>({});
  const overlayAnimationEntityIdsRef = useRef<Record<string, string | undefined>>({});
  const overlayAnimatedBonesRef = useRef<Record<string, Set<string>>>({});
  const layerBoneRenderOverridesRef = useRef<Record<string, Partial<Record<string, { visible?: boolean }>> | null>>({});
  const layerBoneAliasMapsRef = useRef<Record<string, Record<string, string> | null>>({});
  const layerBonePositionOffsetsRef = useRef<Record<string, Record<string, { x: number; y: number; z: number }> | null>>({});
  const layerBoneScaleMultipliersRef = useRef<Record<string, Record<string, { x: number; y: number; z: number }> | null>>({});
  const energySwirlMaterialsRef = useRef<THREE.Material[]>([]);

  const targetMinecraftVersion = useStore((state) => state.targetMinecraftVersion);
  const selectedEntityVariant = useStore((state) => state.entityVariant);
  const packOrder = useStore((state) => state.packOrder);
  const packsById = useStore((state) => state.packs);
  const disabledPackIds = useStore((state) => state.disabledPackIds);
  const providersByAsset = useStore((state) => state.providersByAsset);
  const overrides = useStore((state) => state.overrides);

  // Note: entityVersionVariants is managed by useEntityModelLoader; here we just need an empty default
  const entityVersionVariants: Record<string, string[]> = {};

  // Sync layerGroupsRef
  useEffect(() => { layerGroupsRef.current = layerGroups; }, [layerGroups]);

  // Update overlay bone maps when layer groups change
  useEffect(() => {
    const maps: Record<string, Map<string, THREE.Object3D>> = {};
    for (const layer of layerGroups) {
      maps[layer.id] = buildBoneMap(layer.group);
    }
    overlayBoneMapsRef.current = maps;
  }, [layerGroups]);

  // Build layers effect
  useEffect(() => {
    if (!deps.entityGroup || !deps.packsDir || deps.activeEntityLayers.length === 0) {
      cleanupAndReset();
      return;
    }

    let cancelled = false;

    const buildLayers = async () => {
      // Clean up previous layers
      for (const prev of layerGroupsRef.current) {
        if (prev.dispose === "materials") disposeGroupMaterials(prev.group);
        else disposeGroupAll(prev.group);
      }

      const built: LayerGroupEntry[] = [];
      const energySwirlMaterials: THREE.Material[] = [];
      const metadata: LayerMetadata = {
        overrides: {},
        aliasMaps: {},
        positionOffsets: {},
        scaleMultipliers: {},
        animations: {},
        animationEntityIds: {},
        animatedBones: {},
      };

      for (const layer of deps.activeEntityLayers) {
        if (shouldSkipLayer(layer, deps.baseBoneMap)) continue;

        const tex = await loadTextureByAssetId(layer.textureAssetId);
        if (cancelled) return;

        if (layer.kind === "cloneTexture") {
          const entry = await processCloneTextureLayer(layer, deps.entityGroup!, tex, metadata, energySwirlMaterials);
          built.push(entry);
          continue;
        }

        // Load CEM overlay model
        const overlayModel = await tryLoadCemOverlay(layer);
        if (cancelled) return;
        if (!overlayModel) continue;

        const textureMap = await loadModelExtraTextures(overlayModel);
        const entry = await processCemModelLayer(layer, overlayModel, deps.entityGroup!, tex, textureMap, metadata, energySwirlMaterials);
        built.push(entry);
      }

      if (!cancelled) {
        energySwirlMaterialsRef.current = energySwirlMaterials;
        layerBoneRenderOverridesRef.current = metadata.overrides;
        layerBoneAliasMapsRef.current = metadata.aliasMaps;
        layerBonePositionOffsetsRef.current = metadata.positionOffsets;
        layerBoneScaleMultipliersRef.current = metadata.scaleMultipliers;
        overlayAnimationLayersRef.current = metadata.animations;
        overlayAnimationEntityIdsRef.current = metadata.animationEntityIds;
        overlayAnimatedBonesRef.current = metadata.animatedBones;
        setLayerGroups(built);
        setLoadedLayerIds(built.map((l) => l.id));
      }
    };

    // Helper functions
    const disabledSet = new Set(disabledPackIds);

    const getWinnerPackId = (texAssetId: string): string | undefined => {
      const override = overrides[texAssetId];
      if (override && !disabledSet.has(override.packId)) return override.packId;
      const providers = (providersByAsset[texAssetId] ?? []).filter((id) => !disabledSet.has(id));
      if (providers.length === 0) return undefined;
      return [...providers].sort((a, b) => packOrder.indexOf(a) - packOrder.indexOf(b))[0];
    };

    const loadTextureByAssetId = async (texAssetId: string): Promise<THREE.Texture | null> => {
      const packId = getWinnerPackId(texAssetId);
      const pack = packId ? packsById[packId] : undefined;
      let tex: THREE.Texture | null = null;
      if (pack) {
        const baseEntityType = deps.cemEntityOverride?.entityType ?? deps.resolvedEntityInfo?.variant ?? "";
        const baseParentEntity = deps.cemEntityOverride?.parentEntity === undefined
          ? deps.resolvedEntityInfo?.parent
          : deps.cemEntityOverride?.parentEntity ?? null;
        const versionFolders = buildVersionFolderCandidates(
          targetMinecraftVersion,
          entityVersionVariants[baseEntityType] ?? (baseParentEntity ? entityVersionVariants[baseParentEntity] : undefined),
        );
        tex = await loadPackTexture(pack.path, texAssetId, pack.is_zip, versionFolders);
      }
      return tex ?? await loadVanillaTexture(texAssetId);
    };

    const tryLoadCemOverlay = async (layer: EntityLayerDefinition): Promise<ParsedEntityModel | null> => {
      if (layer.kind !== "cemModel") return null;
      const candidates = layer.cemEntityTypeCandidates;
      const allowVanilla = layer.allowVanillaFallback !== false || !deps.cemSourcePack || deps.cemSourcePack.id === "minecraft:vanilla";

      for (const cemEntityType of candidates) {
        if (deps.cemSourcePack) {
          const attempt = await loadEntityModel(
            cemEntityType, deps.cemSourcePack.path, deps.cemSourcePack.is_zip,
            targetMinecraftVersion, entityVersionVariants, null,
            deps.cemSourcePack.pack_format, selectedEntityVariant,
          );
          if (attempt) return attempt;
        }
        if (allowVanilla) {
          const vanillaAttempt = await loadEntityModel(
            cemEntityType, undefined, undefined, targetMinecraftVersion,
            entityVersionVariants, null, undefined, selectedEntityVariant,
          );
          if (vanillaAttempt) return vanillaAttempt;
        }
      }
      return null;
    };

    const loadModelExtraTextures = async (model: ParsedEntityModel): Promise<Record<string, THREE.Texture>> => {
      const paths = new Set<string>();
      const collect = (part: ParsedPart) => {
        if (part.texturePath) paths.add(part.texturePath);
        if (part.children) part.children.forEach(collect);
      };
      model.parts.forEach(collect);
      paths.delete(model.texturePath);
      paths.delete("");

      const textureMap: Record<string, THREE.Texture> = {};
      for (const jemTexPath of paths) {
        const texId = normalizeJemTextureId(jemTexPath);
        const extra = await loadTextureByAssetId(texId);
        if (extra) textureMap[jemTexPath] = extra;
      }
      return textureMap;
    };

    void buildLayers();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps.activeEntityLayers, deps.entityGroup, deps.cemSourcePack, deps.packsDir]);

  function cleanupAndReset() {
    setLayerGroups([]);
    setLoadedLayerIds([]);
    energySwirlMaterialsRef.current = [];
    overlayAnimationLayersRef.current = {};
    overlayAnimationEntityIdsRef.current = {};
    overlayAnimatedBonesRef.current = {};
  }

  return {
    layerGroups, loadedLayerIds,
    overlayBoneMapsRef, overlayAnimationLayersRef, overlayAnimationEntityIdsRef,
    overlayAnimatedBonesRef, layerBoneRenderOverridesRef, layerBoneAliasMapsRef,
    layerBonePositionOffsetsRef, layerBoneScaleMultipliersRef, energySwirlMaterialsRef,
    layerGroupsRef,
  };
}

