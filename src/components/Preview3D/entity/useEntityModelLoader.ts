/**
 * Hook for loading entity models (JEM/JPM) from resource packs
 */
import { useEffect, useState } from "react";
import * as THREE from "three";
import { useStore } from "@state/store";
import type { ParsedEntityModel, ParsedPart, ParsedBox } from "@lib/emf";
import { loadPackTexture, loadVanillaTexture } from "@lib/three/textureLoader";
import { getEntityVersionVariants } from "@lib/tauri";
import type { AnimationLayer } from "@lib/emf/jemLoader";
import type { PackInfo } from "./types";
import { buildVersionFolderCandidates, normalizeJemTextureId, disposeGroupAll } from "./helpers";
import {
  buildModelPackCandidates,
  searchPacksForModel,
  loadVanillaFallbackModel,
  setModelLoadError,
  resolveCemEntity,
} from "./entityModelLoaderHelpers";
import { loadTexturesAndConvert } from "./modelConversionHelpers";

interface EntityInfo {
  variant: string;
  parent: string | null;
}

interface LoaderDependencies {
  assetId: string;
  baseTextureAssetId: string;
  textureAssetId: string;
  resolvedEntityInfo: EntityInfo | null;
  partTextureOverrides: Record<string, string> | null;
  cemEntityOverride: { entityType: string; parentEntity?: string | null } | null;
  resolvedPack: { path: string; is_zip: boolean } | undefined;
  resolvedPackId: string | undefined;
  packsDir: string | undefined;
  packOrder: string[];
  packsById: Record<string, { path: string; is_zip: boolean; pack_format?: number }>;
  disabledPackIds: string[];
  selectedEntityVariant: string | null;
}

interface LoaderResult {
  entityGroup: THREE.Group | null;
  cemSourcePack: PackInfo | null;
  packAnimationLayers: AnimationLayer[] | undefined;
  parsedJemData: ParsedEntityModel | null;
  currentEntityId: string | undefined;
  loading: boolean;
  error: string | null;
}

export function useEntityModelLoader(deps: LoaderDependencies): LoaderResult {
  const [entityGroup, setEntityGroup] = useState<THREE.Group | null>(null);
  const [cemSourcePack, setCemSourcePack] = useState<PackInfo | null>(null);
  const [packAnimationLayers, setPackAnimationLayers] = useState<AnimationLayer[] | undefined>(undefined);
  const [parsedJemData, setParsedJemData] = useState<ParsedEntityModel | null>(null);
  const [currentEntityId, setCurrentEntityId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetMinecraftVersion = useStore((state) => state.targetMinecraftVersion);
  const setAvailableAnimationPresets = useStore((state) => state.setAvailableAnimationPresets);
  const setAvailableAnimationTriggers = useStore((state) => state.setAvailableAnimationTriggers);
  const setAvailablePoseToggles = useStore((state) => state.setAvailablePoseToggles);

  const [entityVersionVariants, setEntityVersionVariants] = useState<Record<string, string[]>>({});

  // Load entity version variants
  useEffect(() => {
    if (!deps.packsDir) return;
    getEntityVersionVariants(deps.packsDir)
      .then(setEntityVersionVariants)
      .catch(() => setEntityVersionVariants({}));
  }, [deps.packsDir]);

  // Main model loading effect
  useEffect(() => {
    const entityInfo = deps.resolvedEntityInfo;
    if (!entityInfo) {
      setError("Unknown entity type");
      setAvailableAnimationPresets(null);
      setAvailableAnimationTriggers(null);
      createPlaceholder();
      return;
    }

    const { variant: entityType, parent: parentEntity } = entityInfo;
    let cancelled = false;

    async function loadModel() {
      setLoading(true);
      setError(null);
      setAvailableAnimationPresets(null);
      setAvailableAnimationTriggers(null);
      setPackAnimationLayers(undefined);

      try {
        const { cemEntityType, cemParentEntity } = resolveCemEntity(
          deps.cemEntityOverride,
          entityType,
          parentEntity,
        );

        // Search packs for JEM/JPM model
        const modelPackCandidates = buildModelPackCandidates(
          deps.packOrder,
          deps.disabledPackIds,
          deps.packsById,
        );

        let { parsedModel, modelPack } = await searchPacksForModel(
          modelPackCandidates,
          cemEntityType,
          targetMinecraftVersion,
          entityVersionVariants,
          cemParentEntity,
          deps.selectedEntityVariant,
        );

        if (!parsedModel) {
          parsedModel = await loadVanillaFallbackModel(
            cemEntityType,
            targetMinecraftVersion,
            entityVersionVariants,
            cemParentEntity,
            deps.selectedEntityVariant,
          );
          modelPack = null;
        }

        if (!parsedModel) {
          setModelLoadError(
            setError,
            setLoading,
            setAvailableAnimationPresets,
            setAvailableAnimationTriggers,
            setAvailablePoseToggles,
            setPackAnimationLayers,
            createPlaceholder,
            `No custom entity model available for ${cemEntityType}`,
          );
          return;
        }

        // Clone model if we need to apply texture overrides
        const modelForConversion = applyPartTextureOverrides(parsedModel, deps.partTextureOverrides);

        if (cancelled) return;

        // Load textures and convert to Three.js
        const texturePath = deps.textureAssetId.replace(/^minecraft:/, "");
        const versionFolders = buildVersionFolderCandidates(
          targetMinecraftVersion,
          entityVersionVariants[cemEntityType] ?? (cemParentEntity ? entityVersionVariants[cemParentEntity] : undefined),
        );

        const { group, packAnimationLayers: animLayers } = await loadTexturesAndConvert(
          modelForConversion,
          texturePath,
          cemEntityType,
          modelPack,
          deps.resolvedPack,
          deps.packsDir,
          versionFolders,
          loadTextureFromPacks,
          loadVanillaTexture,
          loadExtraTextures,
        );

        if (cancelled) return;

        setCurrentEntityId(cemEntityType);
        setPackAnimationLayers(animLayers);
        setParsedJemData(modelForConversion);
        setEntityGroup(group);
        setCemSourcePack(modelPack);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setModelLoadError(
            setError,
            setLoading,
            setAvailableAnimationPresets,
            setAvailableAnimationTriggers,
            setAvailablePoseToggles,
            setPackAnimationLayers,
            createPlaceholder,
            err instanceof Error ? err.message : "Unknown error",
          );
        }
      }
    }

    function createPlaceholder() {
      setAvailableAnimationPresets(null);
      setAvailableAnimationTriggers(null);
      setAvailablePoseToggles(null);

      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial({
        color: 0x888888, roughness: 0.8, metalness: 0.2, transparent: true, opacity: 0.5,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = 0.5;

      const group = new THREE.Group();
      group.add(mesh);

      setEntityGroup(group);
      setCemSourcePack(null);
      setLoading(false);
      setPackAnimationLayers(undefined);
    }

    void loadModel();

    return () => {
      cancelled = true;
      if (entityGroup) disposeGroupAll(entityGroup);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    deps.assetId, deps.baseTextureAssetId, deps.resolvedEntityInfo, deps.partTextureOverrides,
    deps.cemEntityOverride?.entityType, deps.cemEntityOverride?.parentEntity,
    deps.resolvedPackId, deps.resolvedPack, deps.packOrder, deps.packsById,
    deps.disabledPackIds, deps.packsDir, deps.selectedEntityVariant,
    targetMinecraftVersion, entityVersionVariants,
  ]);

  return { entityGroup, cemSourcePack, packAnimationLayers, parsedJemData, currentEntityId, loading, error };
}

function applyPartTextureOverrides(
  model: ParsedEntityModel,
  overrides: Record<string, string> | null,
): ParsedEntityModel {
  if (!overrides) return model;
  const clonePart = (p: ParsedPart): ParsedPart => ({
    ...p,
    boxes: Array.isArray(p.boxes) ? p.boxes.map((b: ParsedBox) => ({ ...b })) : [],
    children: Array.isArray(p.children) ? p.children.map(clonePart) : [],
  });
  const cloned: ParsedEntityModel = { ...model, parts: model.parts.map(clonePart) };
  const apply = (part: ParsedPart) => {
    const override = overrides[part.name];
    if (override) part.texturePath = override;
    if (part.children) part.children.forEach(apply);
  };
  cloned.parts.forEach(apply);
  return cloned;
}

async function loadTextureFromPacks(
  texturePath: string,
  resolvedPack: { path: string; is_zip: boolean } | undefined,
  modelPack: PackInfo | null,
  packsDir: string | undefined,
  versionFolders: string[],
): Promise<THREE.Texture | null> {
  let texture: THREE.Texture | null = null;
  if (resolvedPack && packsDir) {
    texture = await loadPackTexture(resolvedPack.path, `minecraft:${texturePath}`, resolvedPack.is_zip, versionFolders);
  }
  if (!texture && modelPack && packsDir) {
    texture = await loadPackTexture(modelPack.path, `minecraft:${texturePath}`, modelPack.is_zip, versionFolders);
  }
  return texture;
}

async function loadExtraTextures(
  model: ParsedEntityModel,
  modelPack: PackInfo | null,
  resolvedPack: { path: string; is_zip: boolean } | undefined,
  packsDir: string | undefined,
  versionFolders: string[],
): Promise<Record<string, THREE.Texture>> {
  const extraPaths = new Set<string>();
  const collect = (part: ParsedPart) => {
    if (part.texturePath) extraPaths.add(part.texturePath);
    if (part.children) part.children.forEach(collect);
  };
  model.parts.forEach(collect);
  extraPaths.delete(model.texturePath);
  extraPaths.delete("");

  const textureMap: Record<string, THREE.Texture> = {};
  for (const jemTexPath of extraPaths) {
    const texId = normalizeJemTextureId(jemTexPath);
    let tex: THREE.Texture | null = null;
    if (modelPack && packsDir) tex = await loadPackTexture(modelPack.path, texId, modelPack.is_zip, versionFolders);
    tex ??= (resolvedPack && packsDir) ? await loadPackTexture(resolvedPack.path, texId, resolvedPack.is_zip, versionFolders) : null;
    tex ??= await loadVanillaTexture(texId);
    if (tex) textureMap[jemTexPath] = tex;
  }
  return textureMap;
}
