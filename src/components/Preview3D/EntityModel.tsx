import { useEffect, useState, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import {
  useSelectWinner,
  useSelectPack,
  useSelectPacksInOrder,
  useSelectPacksDir,
} from "@state/selectors";
import {
  loadEntityModel,
  getEntityInfoFromAssetId,
  isEntityTexture,
  jemToThreeJS,
} from "@lib/emf";
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Animation state
  const animationEngineRef = useRef<AnimationEngineType | null>(null);
  const [animationLayers, setAnimationLayers] = useState<
    AnimationLayer[] | undefined
  >(undefined);

  // JEM Inspector state
  const jemInspectorRef = useRef<JEMInspectorV2 | null>(null);
  const [parsedJemData, setParsedJemData] = useState<any>(null);

  // Get the winning pack for this entity texture
  const storeWinnerPackId = useSelectWinner(assetId);
  const storeWinnerPack = useSelectPack(storeWinnerPackId || "");
  const vanillaPack = useSelectPack("minecraft:vanilla");
  const packsDir = useSelectPacksDir();
  const packsInOrder = useSelectPacksInOrder();

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
  const setAvailableAnimationPresets = useStore(
    (state) => state.setAvailableAnimationPresets,
  );
  const setAvailableAnimationTriggers = useStore(
    (state) => state.setAvailableAnimationTriggers,
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

      try {
        console.log("=== [EntityModel] Starting Entity Model Load ===");
        console.log("[EntityModel] Entity variant:", entityType);
        console.log("[EntityModel] Parent entity:", parentEntity);

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

        const modelCandidates = packsInOrder.filter(
          (p) => p && p.id !== "minecraft:vanilla",
        );

        for (const pack of modelCandidates) {
          const attempt = await loadEntityModel(
            entityType!,
            pack.path,
            pack.is_zip,
            targetMinecraftVersion,
            entityVersionVariants,
            parentEntity,
            pack.pack_format,
            selectedEntityVariant,
          );
          if (attempt) {
            parsedModel = attempt;
            modelPack = {
              id: pack.id,
              path: pack.path,
              is_zip: pack.is_zip,
              pack_format: pack.pack_format,
            };
            break;
          }
        }

        if (!parsedModel) {
          parsedModel = await loadEntityModel(
            entityType!,
            undefined,
            undefined,
            targetMinecraftVersion,
            entityVersionVariants,
            parentEntity,
            undefined,
            selectedEntityVariant,
          );
          modelPack = null;
        }

        if (!parsedModel) {
          // No custom entity model found - this is normal for packs without OptiFine CEM
          console.log(
            `[EntityModel] No custom JEM model found for ${entityType}`,
          );
          console.log(
            "[EntityModel] Entity models require OptiFine CEM files (assets/minecraft/optifine/cem/*.jem)",
          );
          setError(`No custom entity model available for ${entityType}`);
          setAvailableAnimationPresets(null);
          setAvailableAnimationTriggers(null);
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
        const texturePath = assetId.replace(/^minecraft:/, "");
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

        // Store animation layers from parsed model
        if (parsedModel.animations && parsedModel.animations.length > 0) {
          console.log(
            `[EntityModel] Found ${parsedModel.animations.length} animation layers`,
          );
          setAnimationLayers(parsedModel.animations);
          setAvailableAnimationPresets(
            getAvailableAnimationPresetIdsForAnimationLayers(parsedModel.animations),
          );
          setAvailableAnimationTriggers(
            getAvailableAnimationTriggerIdsForAnimationLayers(parsedModel.animations),
          );
        } else {
          setAnimationLayers(undefined);
          setAvailableAnimationPresets(null);
          setAvailableAnimationTriggers(
            getAvailableAnimationTriggerIdsForAnimationLayers(undefined),
          );
        }

        // Store parsed JEM data for inspector
        setParsedJemData(parsedModel);

        setEntityGroup(group);
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
        setLoading(false);
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
        entityGroup.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry?.dispose();
            if (Array.isArray(obj.material)) {
              obj.material.forEach((mat) => mat.dispose());
            } else {
              obj.material?.dispose();
            }
          }
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    assetId,
    resolvedPackId,
    resolvedPack,
    packsDir,
    packsInOrder,
    targetMinecraftVersion,
    entityVersionVariants,
    selectedEntityVariant,
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

    // Set initial preset if one is selected
    if (animationPreset) {
      engine.setPreset(animationPreset, animationPlaying);
    }
    engine.setSpeed(animationSpeed);
    engine.setHeadOrientation(entityHeadYaw, entityHeadPitch);

    return () => {
      console.log("[EntityModel] Cleaning up animation engine");
      animationEngineRef.current?.reset();
      animationEngineRef.current = null;
    };
    // Only recreate engine when model changes, not when animation settings change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityGroup, animationLayers]);

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
