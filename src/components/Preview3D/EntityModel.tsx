import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import {
  useSelectWinner,
  useSelectPack,
  useSelectPacksDir,
  useSelectAllAssets,
} from "@state/selectors";
import {
  loadEntityModel,
  getEntityInfoFromAssetId,
  isEntityTexture,
  jemToThreeJS,
} from "@lib/emf";
import { resolveEntityCompositeSchema } from "@lib/entityComposite";
import { loadPackTexture, loadVanillaTexture } from "@lib/three/textureLoader";
import { useStore } from "@state/store";
import { getEntityVersionVariants } from "@lib/tauri";
import {
  createAnimationEngine,
  type AnimationEngine as AnimationEngineType,
} from "@lib/emf/animation/AnimationEngine";
import {
  getAvailableAnimationPresetIdsForAnimationLayers,
  getAvailableAnimationTriggerIdsForAnimationLayers,
  getAvailablePoseToggleIdsForAnimationLayers,
} from "@lib/emf/animation";
import type { AnimationLayer } from "@lib/emf/jemLoader";
import { JEMInspectorV2 } from "@lib/emf/JEMInspectorV2";

interface Props {
  assetId: string;
  positionOffset?: [number, number, number];
}

/**
 * Component for rendering entity models (chests, shulker boxes, mobs, etc.)
 *
 * Uses EMF (Entity Model Features) JEM format for entity geometry.
 * Supports custom pack models with vanilla fallback.
 */
function EntityModel({ assetId, positionOffset = [0, 0, 0] }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const [entityGroup, setEntityGroup] = useState<THREE.Group | null>(null);
  const [layerGroups, setLayerGroups] = useState<
    Array<{ id: string; group: THREE.Group; dispose: "materials" | "all" }>
  >([]);
  const [cemSourcePack, setCemSourcePack] = useState<
    | { id: string; path: string; is_zip: boolean; pack_format?: number }
    | null
  >(null);
  const layerGroupsRef = useRef<
    Array<{ id: string; group: THREE.Group; dispose: "materials" | "all" }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Animation state
  const animationEngineRef = useRef<AnimationEngineType | null>(null);
  const [animationLayers, setAnimationLayers] = useState<
    AnimationLayer[] | undefined
  >(undefined);
  const [packAnimationLayers, setPackAnimationLayers] = useState<
    AnimationLayer[] | undefined
  >(undefined);
  const baseBoneMapRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const overlayBoneMapsRef = useRef<Record<string, Map<string, THREE.Object3D>>>(
    {},
  );

  // JEM Inspector state
  const jemInspectorRef = useRef<JEMInspectorV2 | null>(null);
  const [parsedJemData, setParsedJemData] = useState<any>(null);

  // Get the winning pack for this entity texture
  const storeWinnerPackId = useSelectWinner(assetId);
  const storeWinnerPack = useSelectPack(storeWinnerPackId || "");
  const vanillaPack = useSelectPack("minecraft:vanilla");
  const packsDir = useSelectPacksDir();

  // Get target version from store
  const targetMinecraftVersion = useStore(
    (state) => state.targetMinecraftVersion,
  );

  // Get selected entity variant from store
  const selectedEntityVariant = useStore((state) => state.entityVariant);

  // Get animation state from store
  const animationPreset = useStore((state) => state.animationPreset);
  const animationPlaying = useStore((state) => state.animationPlaying);
  const animationSpeed = useStore((state) => state.animationSpeed);
  const entityHeadYaw = useStore((state) => state.entityHeadYaw);
  const entityHeadPitch = useStore((state) => state.entityHeadPitch);
  const activePoseToggles = useStore((state) => state.activePoseToggles);
  const setAvailableAnimationPresets = useStore(
    (state) => state.setAvailableAnimationPresets,
  );
  const setAvailableAnimationTriggers = useStore(
    (state) => state.setAvailableAnimationTriggers,
  );
  const setAvailablePoseToggles = useStore(
    (state) => state.setAvailablePoseToggles,
  );

  const entityAnimationVariant = useStore(
    (state) => state.entityAnimationVariantByAssetId[assetId] ?? "pack",
  );

  const animationTriggerRequestId = useStore(
    (state) => state.animationTriggerRequestId,
  );
  const animationTriggerRequestNonce = useStore(
    (state) => state.animationTriggerRequestNonce,
  );

  // Get debug mode state
  const jemDebugMode = useStore((state) => state.jemDebugMode);

  // State for entity version variants
  const [entityVersionVariants, setEntityVersionVariants] = useState<
    Record<string, string[]>
  >({});

  const resolvedPackId =
    storeWinnerPackId ?? (vanillaPack ? "minecraft:vanilla" : undefined);
  const resolvedPack = storeWinnerPackId ? storeWinnerPack : vanillaPack;

  const allAssets = useSelectAllAssets();
  const entityFeatureStateByAssetId = useStore(
    (state) => state.entityFeatureStateByAssetId,
  );
  const packOrder = useStore((state) => state.packOrder);
  const providersByAsset = useStore((state) => state.providersByAsset);
  const overrides = useStore((state) => state.overrides);
  const disabledPackIds = useStore((state) => state.disabledPackIds);
  const packsById = useStore((state) => state.packs);

  useEffect(() => {
    layerGroupsRef.current = layerGroups;
  }, [layerGroups]);

  const disposeGroupMaterials = (group: THREE.Group) => {
    group.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (Array.isArray(obj.material)) obj.material.forEach((mat) => mat.dispose());
      else obj.material?.dispose();
    });
  };

  const disposeGroupAll = (group: THREE.Group) => {
    group.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      obj.geometry?.dispose();
      if (Array.isArray(obj.material)) obj.material.forEach((mat) => mat.dispose());
      else obj.material?.dispose();
    });
  };

  const allAssetIds = useMemo(() => allAssets.map((a) => a.id), [allAssets]);
  const entityFeatureSchema = useMemo(
    () => resolveEntityCompositeSchema(assetId, allAssetIds),
    [assetId, allAssetIds],
  );
  const entityFeatureState = entityFeatureSchema
    ? entityFeatureStateByAssetId[entityFeatureSchema.baseAssetId]
    : undefined;
  const entityFeatureStateView = useMemo(
    () => ({
      toggles: entityFeatureState?.toggles ?? {},
      selects: entityFeatureState?.selects ?? {},
    }),
    [entityFeatureState],
  );
  const baseTextureAssetId = useMemo(() => {
    if (!entityFeatureSchema?.getBaseTextureAssetId) return assetId;
    try {
      return entityFeatureSchema.getBaseTextureAssetId(entityFeatureStateView);
    } catch {
      return assetId;
    }
  }, [assetId, entityFeatureSchema, entityFeatureStateView]);
  const featureBoneInputOverrides = useMemo(() => {
    if (!entityFeatureSchema?.getBoneInputOverrides) return null;
    try {
      return entityFeatureSchema.getBoneInputOverrides(entityFeatureStateView);
    } catch {
      return null;
    }
  }, [entityFeatureSchema, entityFeatureStateView]);
  const cemEntityOverride = useMemo(() => {
    if (!entityFeatureSchema?.getCemEntityType) return null;
    try {
      return entityFeatureSchema.getCemEntityType(entityFeatureStateView);
    } catch {
      return null;
    }
  }, [entityFeatureSchema, entityFeatureStateView]);
  const rootTransformOverride = useMemo(() => {
    if (!entityFeatureSchema?.getRootTransform) return null;
    try {
      return entityFeatureSchema.getRootTransform(entityFeatureStateView);
    } catch {
      return null;
    }
  }, [entityFeatureSchema, entityFeatureStateView]);
  const boneRenderOverrides = useMemo(() => {
    if (!entityFeatureSchema?.getBoneRenderOverrides) return null;
    try {
      return entityFeatureSchema.getBoneRenderOverrides(entityFeatureStateView);
    } catch {
      return null;
    }
  }, [entityFeatureSchema, entityFeatureStateView]);
  const activeEntityLayers = useMemo(() => {
    if (!entityFeatureSchema) return [];
    return entityFeatureSchema.getActiveLayers({
      toggles: entityFeatureStateView.toggles,
      selects: entityFeatureStateView.selects,
    });
  }, [entityFeatureSchema, entityFeatureStateView]);

  // Load entity version variants when packs directory changes
  useEffect(() => {
    if (!packsDir) return;

    async function loadVariants() {
      try {
        const variants = await getEntityVersionVariants(packsDir!);
        setEntityVersionVariants(variants);
        console.log("[EntityModel] Loaded entity version variants:", variants);
      } catch (error) {
        console.warn(
          "[EntityModel] Failed to load entity version variants:",
          error,
        );
        setEntityVersionVariants({});
      }
    }

    loadVariants();
  }, [packsDir]);

  useEffect(() => {
    console.log("=== [EntityModel] Dependencies Updated ===");
    console.log("[EntityModel] Asset ID:", assetId);
    console.log("[EntityModel] Winner Pack ID:", resolvedPackId);
    console.log("[EntityModel] Packs Dir:", packsDir);
    console.log("[EntityModel] Target Version:", targetMinecraftVersion);
    console.log("==========================================");
  }, [assetId, resolvedPackId, packsDir, targetMinecraftVersion]);

  // Load the entity model
  useEffect(() => {
    console.log("[EntityModel] === Entity Model Load Effect Triggered ===");
    console.log("[EntityModel] Asset ID:", assetId);

    // Get entity info from asset ID (variant + parent for fallback)
    const entityInfo = getEntityInfoFromAssetId(assetId);
    if (!entityInfo) {
      console.warn("[EntityModel] Unknown entity type for:", assetId);
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
        console.log("=== [EntityModel] Starting Entity Model Load ===");
        const cemEntityType = cemEntityOverride?.entityType ?? entityType!;
        const cemParentEntity =
          cemEntityOverride?.parentEntity === undefined
            ? parentEntity
            : cemEntityOverride?.parentEntity ?? null;

        console.log("[EntityModel] Entity variant:", cemEntityType);
        console.log("[EntityModel] Parent entity:", cemParentEntity);

        // Load the entity model definition. Model packs are not necessarily the
        // same as the "winner" texture pack (Fresh Animations often ships only
        // CEM files), so search packs in priority order for a matching JEM/JPM.
        let parsedModel:
          | (Awaited<ReturnType<typeof loadEntityModel>> & {
              jemSource?: string;
              usedLegacyJem?: boolean;
            })
          | null = null;
        let modelPack:
          | { id: string; path: string; is_zip: boolean; pack_format?: number }
          | null = null;

        // Load model/animations from the selected (winning) pack variant only.
        // This avoids accidentally mixing geometry from one pack with animations
        // from another (e.g. Fresh Animations leaking into the vanilla variant).
        if (resolvedPack && resolvedPackId !== "minecraft:vanilla") {
          const attempt = await loadEntityModel(
            cemEntityType,
            resolvedPack.path,
            resolvedPack.is_zip,
            targetMinecraftVersion,
            entityVersionVariants,
            cemParentEntity,
            resolvedPack.pack_format,
            selectedEntityVariant,
          );
          if (attempt) {
            parsedModel = attempt;
            modelPack = {
              id: resolvedPackId!,
              path: resolvedPack.path,
              is_zip: resolvedPack.is_zip,
              pack_format: resolvedPack.pack_format,
            };
          }
        }

        if (!parsedModel) {
          parsedModel = await loadEntityModel(
            cemEntityType,
            undefined,
            undefined,
            targetMinecraftVersion,
            entityVersionVariants,
            cemParentEntity,
            undefined,
            selectedEntityVariant,
          );
          modelPack = null;
        }

        if (!parsedModel) {
          // No custom entity model found - this is normal for packs without OptiFine CEM
          console.log(
            `[EntityModel] No custom JEM model found for ${cemEntityType}`,
          );
          console.log(
            "[EntityModel] Entity models require OptiFine CEM files (assets/minecraft/optifine/cem/*.jem)",
          );
          setError(`No custom entity model available for ${cemEntityType}`);
          setAvailableAnimationPresets(null);
          setAvailableAnimationTriggers(null);
          setAvailablePoseToggles(null);
          createPlaceholder();
          return;
        }

        console.log("[EntityModel] Model loaded successfully");
        console.log("[EntityModel] Texture path:", parsedModel.texturePath);

        if (cancelled) {
          console.log("[EntityModel] Load cancelled, aborting");
          return;
        }

        // Extract the texture path from the asset ID
        // e.g., "minecraft:entity/chest/normal" -> "entity/chest/normal"
        const texturePath = baseTextureAssetId.replace(/^minecraft:/, "");
        console.log("[EntityModel] Loading texture:", texturePath);

        // Load the texture
        let texture: THREE.Texture | null = null;

        if (resolvedPack && packsDir) {
          console.log("[EntityModel] Loading from pack:", resolvedPackId);
          texture = await loadPackTexture(
            resolvedPack.path,
            `minecraft:${texturePath}`,
            resolvedPack.is_zip,
          );
        }

        // Try the model pack as a secondary texture source (model packs may
        // include auxiliary textures referenced by the JEM).
        if (!texture && modelPack && packsDir) {
          texture = await loadPackTexture(
            modelPack.path,
            `minecraft:${texturePath}`,
            modelPack.is_zip,
          );
        }

        // Fallback to vanilla if pack texture not found
        if (!texture) {
          console.log("[EntityModel] Falling back to vanilla texture");
          texture = await loadVanillaTexture(`minecraft:${texturePath}`);
        }

        if (cancelled) {
          console.log("[EntityModel] Load cancelled, aborting");
          return;
        }

        if (!texture) {
          console.warn(
            "[EntityModel] Failed to load texture, using placeholder",
          );
        }

        // Load any additional textures referenced by parts
        const extraTexturePaths = new Set<string>();
        const collectTextures = (part: any) => {
          if (part.texturePath) extraTexturePaths.add(part.texturePath);
          if (part.children) part.children.forEach(collectTextures);
        };
        parsedModel.parts.forEach(collectTextures);
        extraTexturePaths.delete(parsedModel.texturePath);
        extraTexturePaths.delete("");

        const normalizeJemTextureId = (jemTex: string): string => {
          let namespace = "minecraft";
          let path = jemTex.replace(/\\/g, "/");
          if (path.includes(":")) {
            const split = path.split(":");
            namespace = split[0] || namespace;
            path = split.slice(1).join(":");
          }
          if (path.startsWith("textures/")) {
            path = path.slice("textures/".length);
          }
          path = path.replace(/\.png$/i, "");
          return `${namespace}:${path}`;
        };

        const textureMap: Record<string, THREE.Texture> = {};
        for (const jemTexPath of extraTexturePaths) {
          const texId = normalizeJemTextureId(jemTexPath);
          let extraTex: THREE.Texture | null = null;

          if (modelPack && packsDir) {
            extraTex = await loadPackTexture(
              modelPack.path,
              texId,
              modelPack.is_zip,
            );
          }
          if (!extraTex && resolvedPack && packsDir) {
            extraTex = await loadPackTexture(
              resolvedPack.path,
              texId,
              resolvedPack.is_zip,
            );
          }
          if (!extraTex) {
            extraTex = await loadVanillaTexture(texId);
          }
          if (extraTex) textureMap[jemTexPath] = extraTex;
        }

        // Convert parsed entity model to Three.js using new loader
        console.log("[EntityModel] Converting model to Three.js...");
        const group = jemToThreeJS(parsedModel, texture, textureMap);

        if (cancelled) {
          console.log(
            "[EntityModel] Load cancelled after conversion, aborting",
          );
          return;
        }

        // Position the model - entity models sit on the ground plane
        group.position.y = 0;

        // Store pack-provided animation layers (variant selection decides whether
        // they are applied).
        if (parsedModel.animations && parsedModel.animations.length > 0) {
          console.log(
            `[EntityModel] Found ${parsedModel.animations.length} animation layers`,
          );
          setPackAnimationLayers(parsedModel.animations);
        } else {
          setPackAnimationLayers(undefined);
        }

        // Store parsed JEM data for inspector
        setParsedJemData(parsedModel);

        setEntityGroup(group);
        setCemSourcePack(modelPack);
        setLayerGroups([]);
        setLoading(false);
        console.log("=== [EntityModel] Entity Model Load Complete ===");
      } catch (err) {
        console.error("=== [EntityModel] Entity Model Load FAILED ===");
        console.error("[EntityModel] Error:", err);
        console.error("=============================================");
        if (!cancelled) {
          const errorMessage =
            err instanceof Error ? err.message : "Unknown error";
          setError(errorMessage);
          setLoading(false);
          setAvailableAnimationPresets(null);
          setAvailableAnimationTriggers(null);
          setAvailablePoseToggles(null);
          setPackAnimationLayers(undefined);
          createPlaceholder();
        }
      }
    }

    function createPlaceholder() {
      console.log("[EntityModel] Creating placeholder for entity:", assetId);
      console.log(
        "[EntityModel] Tip: Add OptiFine CEM files to resource pack to see custom entity models",
      );

      try {
        setAvailableAnimationPresets(null);
        setAvailableAnimationTriggers(null);
        setAvailablePoseToggles(null);
        // Create a simple cube placeholder to indicate entity position
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({
          color: 0x888888, // Gray placeholder
          roughness: 0.8,
          metalness: 0.2,
          transparent: true,
          opacity: 0.5,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = 0.5;

        const group = new THREE.Group();
        group.add(mesh);

        setEntityGroup(group);
        setCemSourcePack(null);
        setLayerGroups([]);
        setLoading(false);
        setPackAnimationLayers(undefined);
      } catch (err) {
        console.error("[EntityModel] Error creating placeholder:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    }

    loadModel();

    return () => {
      console.log("[EntityModel] Cleanup function called");
      cancelled = true;

      // Clean up on unmount or dependency change
      if (entityGroup) {
        disposeGroupAll(entityGroup);
      }
      for (const layer of layerGroupsRef.current) {
        if (layer.dispose === "materials") disposeGroupMaterials(layer.group);
        else disposeGroupAll(layer.group);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    assetId,
    baseTextureAssetId,
    cemEntityOverride?.entityType,
    cemEntityOverride?.parentEntity,
    resolvedPackId,
    resolvedPack,
    packsDir,
    targetMinecraftVersion,
    entityVersionVariants,
    selectedEntityVariant,
  ]);

  const rootTransformBaseRef = useRef<{
    position: THREE.Vector3;
    rotation: THREE.Euler;
    scale: THREE.Vector3;
  } | null>(null);

  useEffect(() => {
    if (!entityGroup) {
      rootTransformBaseRef.current = null;
      return;
    }
    rootTransformBaseRef.current = {
      position: entityGroup.position.clone(),
      rotation: entityGroup.rotation.clone(),
      scale: entityGroup.scale.clone(),
    };
  }, [entityGroup]);

  useEffect(() => {
    if (!entityGroup) return;
    const base = rootTransformBaseRef.current;
    if (!base) return;

    entityGroup.position.copy(base.position);
    entityGroup.rotation.copy(base.rotation);
    entityGroup.scale.copy(base.scale);

    const t = rootTransformOverride;
    if (t?.position) {
      entityGroup.position.x += t.position.x;
      entityGroup.position.y += t.position.y;
      entityGroup.position.z += t.position.z;
    }
    if (t?.rotation) {
      entityGroup.rotation.x += t.rotation.x;
      entityGroup.rotation.y += t.rotation.y;
      entityGroup.rotation.z += t.rotation.z;
    }
    if (t?.scale) {
      entityGroup.scale.x *= t.scale.x;
      entityGroup.scale.y *= t.scale.y;
      entityGroup.scale.z *= t.scale.z;
    }
    entityGroup.updateMatrixWorld(true);
  }, [entityGroup, rootTransformOverride]);

  // Apply selected animation variant (pack vs vanilla) without reloading geometry.
  useEffect(() => {
    const effectiveLayers =
      entityAnimationVariant === "vanilla" ? undefined : packAnimationLayers;
    setAnimationLayers(effectiveLayers);
    const info = getEntityInfoFromAssetId(assetId);
    const isBanner = info?.variant === "banner";
    const discovered = getAvailableAnimationPresetIdsForAnimationLayers(effectiveLayers);
    setAvailableAnimationPresets(discovered ?? (isBanner ? ["idle"] : null));
    setAvailableAnimationTriggers(
      getAvailableAnimationTriggerIdsForAnimationLayers(effectiveLayers),
    );
    setAvailablePoseToggles(
      getAvailablePoseToggleIdsForAnimationLayers(effectiveLayers),
    );
  }, [
    entityAnimationVariant,
    packAnimationLayers,
    setAvailableAnimationPresets,
    setAvailableAnimationTriggers,
    setAvailablePoseToggles,
    assetId,
  ]);

  useEffect(() => {
    const map = new Map<string, THREE.Object3D>();
    if (entityGroup) {
      entityGroup.traverse((obj) => {
        if (obj instanceof THREE.Group && obj.name && obj.name !== "jem_entity") {
          map.set(obj.name, obj);
        }
      });
    }
    baseBoneMapRef.current = map;
  }, [entityGroup]);

  useEffect(() => {
    const maps: Record<string, Map<string, THREE.Object3D>> = {};
    for (const layer of layerGroups) {
      const map = new Map<string, THREE.Object3D>();
      layer.group.traverse((obj) => {
        if (obj instanceof THREE.Group && obj.name && obj.name !== "jem_entity") {
          map.set(obj.name, obj);
        }
      });
      maps[layer.id] = map;
    }
    overlayBoneMapsRef.current = maps;
  }, [layerGroups]);

  // Build/refresh entity feature layers when the base model or feature state changes.
  useEffect(() => {
    if (!entityGroup || !packsDir || !entityFeatureSchema) {
      setLayerGroups([]);
      return;
    }

    if (activeEntityLayers.length === 0) {
      setLayerGroups([]);
      return;
    }

    let cancelled = false;

    const disabledSet = new Set(disabledPackIds);
    const getWinnerPackId = (texAssetId: string): string | undefined => {
      const override = overrides[texAssetId];
      if (override && !disabledSet.has(override.packId)) return override.packId;
      const providers = (providersByAsset[texAssetId] ?? []).filter(
        (id) => !disabledSet.has(id),
      );
      if (providers.length === 0) return undefined;
      const sorted = [...providers].sort(
        (a, b) => packOrder.indexOf(a) - packOrder.indexOf(b),
      );
      return sorted[0];
    };

    const loadTextureByAssetId = async (
      texAssetId: string,
    ): Promise<THREE.Texture | null> => {
      const packId = getWinnerPackId(texAssetId);
      const pack = packId ? packsById[packId] : undefined;

      let tex: THREE.Texture | null = null;
      if (pack) {
        tex = await loadPackTexture(pack.path, texAssetId, pack.is_zip);
      }
      if (!tex) {
        tex = await loadVanillaTexture(texAssetId);
      }
      return tex;
    };

    const normalizeJemTextureId = (jemTex: string): string => {
      let namespace = "minecraft";
      let path = jemTex.replace(/\\/g, "/");
      if (path.includes(":")) {
        const split = path.split(":");
        namespace = split[0] || namespace;
        path = split.slice(1).join(":");
      }
      if (path.startsWith("textures/")) {
        path = path.slice("textures/".length);
      }
      path = path.replace(/\.png$/i, "");
      return `${namespace}:${path}`;
    };

    const makeOverlayMaterial = (
      tex: THREE.Texture | null,
      layer: (typeof activeEntityLayers)[number],
      side: THREE.Side = THREE.FrontSide,
    ): THREE.Material => {
      if (tex) {
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        tex.colorSpace = THREE.SRGBColorSpace;
      }

      const opacity = layer.opacity ?? 1;
      const blending =
        layer.blend === "additive" ? THREE.AdditiveBlending : THREE.NormalBlending;
      const isAdditive = layer.blend === "additive";

      const mode = layer.materialMode ?? { kind: "default" as const };

      if (mode.kind === "emissive") {
        const mat = new THREE.MeshBasicMaterial({
          map: tex ?? undefined,
          transparent: true,
          alphaTest: 0.1,
          opacity,
          blending,
          depthWrite: false,
          depthTest: true,
          toneMapped: false,
          side,
        });
        return mat;
      }

      const color =
        mode.kind === "tint"
          ? new THREE.Color(mode.color.r, mode.color.g, mode.color.b).convertSRGBToLinear()
          : new THREE.Color(1, 1, 1);

      const mat = new THREE.MeshStandardMaterial({
        map: tex ?? undefined,
        // Prefer cutout rendering for layer textures to avoid transparent sorting
        // artifacts when stacking multiple entity groups.
        transparent: isAdditive || opacity < 1,
        opacity,
        blending,
        depthWrite: !isAdditive && opacity >= 1,
        depthTest: true,
        alphaTest: 0.1,
        color,
        emissive:
          isAdditive
            ? new THREE.Color(1, 1, 1)
            : new THREE.Color(0, 0, 0),
        emissiveIntensity: isAdditive ? 0.7 : 0,
        side,
      });
      mat.polygonOffset = true;
      // Use a small, stable polygon offset to avoid z-fighting without pulling
      // the layer "in front" of unrelated geometry.
      const offset = 1 + layer.zIndex / 1000;
      mat.polygonOffsetFactor = -offset;
      mat.polygonOffsetUnits = -offset;
      return mat;
    };

    const cloneGroupWithTexture = (
      base: THREE.Group,
      tex: THREE.Texture | null,
      layer: (typeof activeEntityLayers)[number],
    ) => {
      const clone = base.clone(true);
      clone.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return;
        const prior = obj.material;
        const side = Array.isArray(prior)
          ? prior[0]?.side ?? THREE.FrontSide
          : prior?.side ?? THREE.FrontSide;
        obj.material = makeOverlayMaterial(tex, layer, side);
      });
      return clone;
    };

    const tryLoadCemOverlay = async (
      candidates: string[],
    ): Promise<ReturnType<typeof loadEntityModel> | null> => {
      for (const cemEntityType of candidates) {
        if (cemSourcePack) {
          const attempt = await loadEntityModel(
            cemEntityType,
            cemSourcePack.path,
            cemSourcePack.is_zip,
            targetMinecraftVersion,
            entityVersionVariants,
            null,
            cemSourcePack.pack_format,
            selectedEntityVariant,
          );
          if (attempt) return attempt;
        }

        const vanillaAttempt = await loadEntityModel(
          cemEntityType,
          undefined,
          undefined,
          targetMinecraftVersion,
          entityVersionVariants,
          null,
          undefined,
          selectedEntityVariant,
        );
        if (vanillaAttempt) return vanillaAttempt;
      }

      return null;
    };

    const buildLayers = async () => {
      for (const prev of layerGroupsRef.current) {
        if (prev.dispose === "materials") disposeGroupMaterials(prev.group);
        else disposeGroupAll(prev.group);
      }

      const built: Array<{
        id: string;
        group: THREE.Group;
        dispose: "materials" | "all";
      }> = [];

      for (const layer of activeEntityLayers) {
        const tex = await loadTextureByAssetId(layer.textureAssetId);
        if (cancelled) return;

        if (layer.kind === "cloneTexture") {
          const g = cloneGroupWithTexture(entityGroup, tex, layer);
          g.position.copy(entityGroup.position);
          g.rotation.copy(entityGroup.rotation);
          g.scale.copy(entityGroup.scale);
          built.push({ id: layer.id, group: g, dispose: "materials" });
          continue;
        }

        const overlayModel = await tryLoadCemOverlay(layer.cemEntityTypeCandidates);
        if (cancelled) return;
        if (!overlayModel) continue;

        const extraTexturePaths = new Set<string>();
        const collectTextures = (part: any) => {
          if (part.texturePath) extraTexturePaths.add(part.texturePath);
          if (part.children) part.children.forEach(collectTextures);
        };
        overlayModel.parts.forEach(collectTextures);
        extraTexturePaths.delete(overlayModel.texturePath);
        extraTexturePaths.delete("");

        const textureMap: Record<string, THREE.Texture> = {};
        for (const jemTexPath of extraTexturePaths) {
          const texId = normalizeJemTextureId(jemTexPath);
          const extra = await loadTextureByAssetId(texId);
          if (extra) textureMap[jemTexPath] = extra;
        }

        const g = jemToThreeJS(overlayModel, tex, textureMap);
        g.position.copy(entityGroup.position);
        g.rotation.copy(entityGroup.rotation);
        g.scale.copy(entityGroup.scale);
        g.traverse((obj) => {
          if (!(obj instanceof THREE.Mesh)) return;
          const prior = obj.material;
          const side = Array.isArray(prior)
            ? prior[0]?.side ?? THREE.FrontSide
            : prior?.side ?? THREE.FrontSide;
          obj.material = makeOverlayMaterial(tex, layer, side);
          if (Array.isArray(prior)) prior.forEach((m) => m.dispose());
          else prior?.dispose();
        });
        built.push({ id: layer.id, group: g, dispose: "all" });
      }

      if (!cancelled) setLayerGroups(built);
    };

    buildLayers();

    return () => {
      cancelled = true;
    };
  }, [
    activeEntityLayers,
    disabledPackIds,
    entityFeatureSchema,
    cemSourcePack,
    entityGroup,
    entityVersionVariants,
    overrides,
    packOrder,
    packsById,
    packsDir,
    providersByAsset,
    selectedEntityVariant,
    targetMinecraftVersion,
  ]);

  // Create animation engine when entity group or animation layers change
  useEffect(() => {
    if (!entityGroup) {
      animationEngineRef.current = null;
      return;
    }

	    console.log("[EntityModel] Creating animation engine");
	    const engine = createAnimationEngine(entityGroup, animationLayers);
	    animationEngineRef.current = engine;
	    engine.setFeatureBoneInputOverrides?.(featureBoneInputOverrides);

    // Set initial preset if one is selected
    if (animationPreset) {
      engine.setPreset(animationPreset, animationPlaying);
    }
    engine.setSpeed(animationSpeed);
    engine.setHeadOrientation(entityHeadYaw, entityHeadPitch);
    engine.setPoseToggles(
      Object.entries(activePoseToggles)
        .filter(([, enabled]) => enabled)
        .map(([id]) => id),
    );

    // Ensure the very first render after loading reflects the same transforms
    // we use during playback (some rigs need a tick(0) to align correctly even
    // when no preset is selected).
    engine.tick(0);

    return () => {
      console.log("[EntityModel] Cleaning up animation engine");
      animationEngineRef.current?.reset();
      animationEngineRef.current = null;
    };
    // Only recreate engine when model changes, not when animation settings change
    // eslint-disable-next-line react-hooks/exhaustive-deps
	  }, [entityGroup, animationLayers]);

	  useEffect(() => {
	    const engine = animationEngineRef.current;
	    if (!engine) return;
	    engine.setFeatureBoneInputOverrides?.(featureBoneInputOverrides);
	  }, [featureBoneInputOverrides]);

  // Sync animation preset changes to engine
  useEffect(() => {
    const engine = animationEngineRef.current;
    if (!engine) return;

    engine.setPreset(animationPreset, animationPlaying);
  }, [animationPreset, animationPlaying]);

  // Sync trigger requests (one-shot overlays)
  useEffect(() => {
    const engine = animationEngineRef.current;
    if (!engine) return;
    if (!animationTriggerRequestId) return;
    engine.playTrigger(animationTriggerRequestId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationTriggerRequestNonce]);

  // Sync animation speed changes to engine
  useEffect(() => {
    const engine = animationEngineRef.current;
    if (!engine) return;

    engine.setSpeed(animationSpeed);
  }, [animationSpeed]);

  // Sync head orientation changes to engine
  useEffect(() => {
    const engine = animationEngineRef.current;
    if (!engine) return;

    engine.setHeadOrientation(entityHeadYaw, entityHeadPitch);
  }, [entityHeadYaw, entityHeadPitch]);

  // Sync pose toggles (persistent overlays)
  useEffect(() => {
    const engine = animationEngineRef.current;
    if (!engine) return;

    const active = Object.entries(activePoseToggles)
      .filter(([, enabled]) => enabled)
      .map(([id]) => id);
    engine.setPoseToggles(active);
  }, [activePoseToggles]);

  // Create/destroy JEM inspector based on debug mode
  useEffect(() => {
    // Clean up existing inspector
    if (jemInspectorRef.current) {
      jemInspectorRef.current.dispose();
      jemInspectorRef.current = null;
    }

    // Create new inspector if debug mode is enabled and we have data
    if (jemDebugMode && entityGroup && parsedJemData && groupRef.current) {
      console.log("[EntityModel] Creating JEM inspector");

      // Get the Three.js scene from the group
      let scene: THREE.Scene | null = null;
      groupRef.current.traverseAncestors((ancestor) => {
        if (ancestor instanceof THREE.Scene) {
          scene = ancestor;
        }
      });

      if (scene) {
        jemInspectorRef.current = new JEMInspectorV2({
          scene: scene,
          jemData: parsedJemData,
          rootGroup: entityGroup,
        });
      } else {
        console.warn("[EntityModel] Could not find Scene for JEM inspector");
      }
    }

    return () => {
      if (jemInspectorRef.current) {
        jemInspectorRef.current.dispose();
        jemInspectorRef.current = null;
      }
    };
  }, [jemDebugMode, entityGroup, parsedJemData]);

  // Animation frame update
  useFrame((_, delta) => {
    const engine = animationEngineRef.current;
    if (!engine) return;

    // Don't tick animations when debug mode is active
    // (manual transform adjustments would be overridden)
    if (jemDebugMode) return;

    // Tick the animation engine
    engine.tick(delta);

    const applyBoneVisibilityOverrides = () => {
      if (!boneRenderOverrides) return;
      const baseBones = baseBoneMapRef.current;
      for (const [boneName, props] of Object.entries(boneRenderOverrides)) {
        if (!props) continue;
        const obj = baseBones.get(boneName);
        if (!obj) continue;
        if (typeof props.visible === "boolean") obj.visible = props.visible;
      }
    };

    // Apply schema-driven visibility overrides after tick() (which may reset bones).
    applyBoneVisibilityOverrides();

    // Sync overlay layers to the base pose (single engine drives all layers).
    if (!entityGroup) return;
    const baseBones = baseBoneMapRef.current;
    const overlayMaps = overlayBoneMapsRef.current;
    for (const layer of layerGroupsRef.current) {
      layer.group.position.copy(entityGroup.position);
      layer.group.rotation.copy(entityGroup.rotation);
      layer.group.scale.copy(entityGroup.scale);

      const overlayBones = overlayMaps[layer.id];
      if (!overlayBones) continue;

      for (const [name, dst] of overlayBones) {
        const src = baseBones.get(name);
        if (!src) continue;
        dst.position.copy(src.position);
        dst.rotation.copy(src.rotation);
        dst.scale.copy(src.scale);
        dst.visible = src.visible;
      }
      layer.group.updateMatrixWorld(true);
    }
  });

  if (error) {
    console.error("[EntityModel] Rendering error state:", error);
    if (!entityGroup) {
      return null;
    }
  }

  if (loading || !entityGroup) {
    console.log("[EntityModel] Waiting for model to load...");
    return null;
  }

  console.log("[EntityModel] Rendering entity group");

  try {
    return (
      <group ref={groupRef} position={positionOffset}>
        <primitive object={entityGroup} />
        {layerGroups.map((layer) => (
          <primitive key={layer.id} object={layer.group} />
        ))}
      </group>
    );
  } catch (err) {
    console.error("[EntityModel] Error rendering group:", err);
    return null;
  }
}

export default EntityModel;

/**
 * Check if an asset ID is an entity texture (routes to EntityModel instead of BlockModel)
 */
export { isEntityTexture as isEntityAsset };
