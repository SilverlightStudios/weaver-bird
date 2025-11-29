import { useEffect, useState, useRef } from "react";
import * as THREE from "three";
import {
  useSelectWinner,
  useSelectPack,
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

  // Get the winning pack for this entity texture
  const storeWinnerPackId = useSelectWinner(assetId);
  const storeWinnerPack = useSelectPack(storeWinnerPackId || "");
  const vanillaPack = useSelectPack("minecraft:vanilla");
  const packsDir = useSelectPacksDir();

  // Get target version from store
  const targetMinecraftVersion = useStore(
    (state) => state.targetMinecraftVersion,
  );

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
      createPlaceholder();
      return;
    }

    const { variant: entityType, parent: parentEntity } = entityInfo;

    let cancelled = false;

    async function loadModel() {
      setLoading(true);
      setError(null);

      try {
        console.log("=== [EntityModel] Starting Entity Model Load ===");
        console.log("[EntityModel] Entity variant:", entityType);
        console.log("[EntityModel] Parent entity:", parentEntity);

        // Load the entity model definition (from pack or vanilla)
        const parsedModel = await loadEntityModel(
          entityType!,
          resolvedPack?.path,
          resolvedPack?.is_zip,
          targetMinecraftVersion,
          entityVersionVariants,
          parentEntity,
          resolvedPack?.pack_format,
        );

        if (!parsedModel) {
          // No custom entity model found - this is normal for packs without OptiFine CEM
          console.log(
            `[EntityModel] No custom JEM model found for ${entityType} in ${resolvedPackId}`,
          );
          console.log(
            "[EntityModel] Entity models require OptiFine CEM files (assets/minecraft/optifine/cem/*.jem)",
          );
          setError(`No custom entity model available for ${entityType}`);
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

        // Convert parsed entity model to Three.js using new loader
        console.log("[EntityModel] Converting model to Three.js...");
        const group = jemToThreeJS(parsedModel, texture);

        if (cancelled) {
          console.log(
            "[EntityModel] Load cancelled after conversion, aborting",
          );
          return;
        }

        // Position the model - entity models sit on the ground plane
        group.position.y = 0;

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
    targetMinecraftVersion,
    entityVersionVariants,
  ]);

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
