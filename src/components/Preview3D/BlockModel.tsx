import { useEffect, useState, useRef } from "react";
import * as THREE from "three";
import {
  useSelectWinner,
  useSelectPack,
  useSelectPacksDir,
} from "@state/selectors";
import {
  loadModelJson,
  resolveBlockState,
  type ElementFace,
} from "@lib/tauri/blockModels";
import { blockModelToThreeJs } from "@lib/three/modelConverter";
import { createTextureLoader } from "@lib/three/textureLoader";
import {
  normalizeAssetId,
  getVariantNumber,
  getPlantNameFromPotted,
  getBlockStateIdFromAssetId,
  extractBlockStateProperties,
  applyNaturalBlockStateDefaults,
  getVariantGroupKey,
  isPottedPlant,
  getPottedAssetId,
} from "@lib/assetUtils";
import { getBlockTintType } from "@/constants/vanillaBlockColors";

interface Props {
  assetId: string;
  biomeColor?: { r: number; g: number; b: number } | null;
  onTintDetected?: (info: {
    hasTint: boolean;
    tintType?: "grass" | "foliage";
  }) => void;
  showPot?: boolean;
  isPotted?: boolean;
  blockProps?: Record<string, string>;
  seed?: number;
  forcedPackId?: string;
  positionOffset?: [number, number, number];
}

function BlockModel({
  assetId,
  biomeColor,
  onTintDetected,
  showPot = true,
  isPotted = false,
  blockProps = {},
  seed = 0,
  forcedPackId,
  positionOffset = [0, 0, 0],
}: Props) {
  // Normalize asset ID immediately to fix trailing underscores from malformed packs
  const normalizedAssetId = normalizeAssetId(assetId);

  const groupRef = useRef<THREE.Group>(null);
  const [blockGroup, setBlockGroup] = useState<THREE.Group | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Get the winning pack using the ORIGINAL asset ID (state stores original IDs)
  // but we'll use the normalized ID when loading models
  const storeWinnerPackId = useSelectWinner(assetId);

  // For numbered variants (e.g., "acacia_planks1"), also check the base asset
  // since providers might only be registered for base assets
  const variantGroupKey = getVariantGroupKey(assetId);
  const baseAssetId = assetId.startsWith("minecraft:")
    ? `minecraft:block/${variantGroupKey}`
    : variantGroupKey;
  const baseWinnerPackId = useSelectWinner(baseAssetId);

  // Use the variant's winner if available, otherwise fall back to base asset's winner
  const effectiveWinnerPackId = storeWinnerPackId || baseWinnerPackId;

  const storeWinnerPack = useSelectPack(effectiveWinnerPackId || "");
  const forcedPackMeta = useSelectPack(forcedPackId || "");
  const vanillaPack = useSelectPack("minecraft:vanilla");

  const resolvedPackId =
    forcedPackId ??
    effectiveWinnerPackId ??
    (vanillaPack ? "minecraft:vanilla" : undefined);
  const resolvedPack = forcedPackId
    ? forcedPackId === "minecraft:vanilla"
      ? vanillaPack
      : forcedPackMeta
    : storeWinnerPackId
      ? storeWinnerPack
      : vanillaPack;
  const packsDir = useSelectPacksDir();

  // Create stable string representation of biomeColor for dependency comparison
  const biomeColorKey = biomeColor
    ? `${biomeColor.r},${biomeColor.g},${biomeColor.b}`
    : null;
  const blockPropsKey = JSON.stringify(blockProps);

  useEffect(() => {
    console.log(
      `[BlockModel.useEffect.deps] asset=${normalizedAssetId} pack=${resolvedPackId} biomeColor=${biomeColorKey}`,
    );
  }, [
    assetId,
    normalizedAssetId,
    resolvedPackId,
    resolvedPack,
    packsDir,
    biomeColorKey,
  ]);

  // Load the real block model
  useEffect(() => {
    console.log(
      `[BlockModel.useEffect.loadModel] asset=${normalizedAssetId} pack=${resolvedPackId}`,
    );

    // Need all dependencies to load
    if (!resolvedPackId || !resolvedPack || !packsDir) {
      createPlaceholder();
      return;
    }

    // TypeScript guard: these are guaranteed to be defined here
    const packsDirPath: string = packsDir;
    const packId: string = resolvedPackId;

    let cancelled = false;

    async function loadModel() {
      setLoading(true);
      setError(null);

      try {
        console.log(
          `[BlockModel.loadModel] starting: asset=${assetId} pack=${packId} potted=${isPotted}`,
        );

        // For potted plants, decide whether to load the potted model or just the plant
        let modelAssetId = normalizedAssetId;
        const isAlreadyPotted = isPottedPlant(normalizedAssetId);

        if (isPotted && !showPot) {
          // If showPot is false, load just the plant without the pot
          if (isAlreadyPotted) {
            const plantName = getPlantNameFromPotted(normalizedAssetId);
            if (plantName) {
              modelAssetId = plantName;
            }
          }
          // If not already potted, just use the original asset
        } else if (isPotted && showPot) {
          // If showPot is true, load the full potted model
          if (isAlreadyPotted) {
            // Already a potted asset, use as-is
          } else {
            // Convert plant to potted version (e.g., oak_sapling -> potted_oak_sapling)
            modelAssetId = getPottedAssetId(normalizedAssetId);
          }
        }

        // Resolve blockstate -> models with transformations

        // Extract inferred properties from asset ID (e.g., _on -> powered=true)
        const inferredProps = extractBlockStateProperties(modelAssetId);

        // Merge user-provided props with inferred props (user props take precedence)
        let mergedProps = { ...inferredProps, ...blockProps };

        // Apply natural defaults (e.g. axis=y instead of x)
        mergedProps = applyNaturalBlockStateDefaults(mergedProps, assetId);

        const blockStateAssetId = getBlockStateIdFromAssetId(modelAssetId);

        const resolution = await resolveBlockState(
          packId,
          blockStateAssetId,
          packsDirPath,
          Object.keys(mergedProps).length > 0 ? mergedProps : undefined,
          seed,
        );

        console.log(
          `[BlockModel.loadModel] blockstate resolved: models=${resolution.models.length}`,
        );

        if (cancelled) {
          return;
        }

        // Override model variant number if specified in assetId
        // Allows viewing different texture variants (e.g., allium3) without changing global state
        const variantNumber = getVariantNumber(assetId);
        if (variantNumber !== null) {
          resolution.models = resolution.models.map((model) => ({
            ...model,
            modelId: model.modelId.replace(/\d+$/, variantNumber.toString()),
          }));
        }

        // Create texture loader for this pack
        const textureLoader = createTextureLoader(
          resolvedPack.path,
          resolvedPack.is_zip,
          variantNumber,
        );

        // Create parent group to hold all resolved models
        const parentGroup = new THREE.Group();
        let hasTintindex = false;
        const tintIndices = new Set<number>();

        // Load and convert each resolved model
        for (let i = 0; i < resolution.models.length; i++) {
          const resolvedModel = resolution.models[i];

          // Load the actual model JSON directly by model ID
          const model = await loadModelJson(
            packId,
            resolvedModel.modelId,
            packsDirPath,
          );

          // Check if this model has tintindex
          let modelHasTint = false;
          model.elements?.forEach((element) => {
            const faces = element.faces ?? {};
            Object.values<ElementFace>(faces).forEach((face) => {
              if (face.tintindex !== undefined && face.tintindex !== null) {
                modelHasTint = true;
                tintIndices.add(Number(face.tintindex));
              }
            });
          });

          if (modelHasTint) {
            hasTintindex = true;
          }

          if (cancelled) {
            return;
          }

          // Convert to Three.js geometry

          console.log(
            "[BlockModel] Passing biomeColor to converter:",
            biomeColor,
          );
          const modelGroup = await blockModelToThreeJs(
            model,
            textureLoader,
            biomeColor,
            resolvedModel, // Pass resolved model for rotations and uvlock
          );

          // Apply polygon offset to prevent Z-fighting in multipart models
          // Each subsequent model gets a slightly higher offset
          if (resolution.models.length > 1) {
            modelGroup.traverse((obj) => {
              if (obj instanceof THREE.Mesh && obj.material) {
                const materials = Array.isArray(obj.material)
                  ? obj.material
                  : [obj.material];
                materials.forEach((mat) => {
                  if (mat instanceof THREE.MeshStandardMaterial) {
                    mat.polygonOffset = true;
                    mat.polygonOffsetFactor = -i * 0.1;
                    mat.polygonOffsetUnits = -i * 0.1;
                  }
                });
              }
            });
          }

          parentGroup.add(modelGroup);
        }

        if (onTintDetected) {
          // Determine tint type from vanilla block colors registry
          // Convert assetId to blockId: "minecraft:block/oak_leaves" -> "minecraft:oak_leaves"
          let blockId = normalizeAssetId(assetId);
          if (blockId.includes("/block/")) {
            blockId = blockId.replace("/block/", ":");
          } else if (blockId.includes("/item/")) {
            blockId = blockId.replace("/item/", ":");
          }

          // Check registry for this block's tint type
          const registryTintType = hasTintindex
            ? getBlockTintType(blockId)
            : undefined;

          // Only report grass/foliage (we don't handle water/special in renderer yet)
          const tintType =
            registryTintType === "grass" || registryTintType === "foliage"
              ? registryTintType
              : undefined;

          onTintDetected({ hasTint: hasTintindex, tintType });
        }

        if (cancelled) {
          return;
        }

        // Position the model - center at ground level
        parentGroup.position.y = 0.5;

        setBlockGroup(parentGroup);
        setLoading(false);
        console.log(`[BlockModel.loadModel] complete`);
      } catch (err) {
        console.error("=== [BlockModel] Model Load FAILED ===");
        console.error(
          "[BlockModel] Error type:",
          err instanceof Error ? err.constructor.name : typeof err,
        );
        console.error(
          "[BlockModel] Error message:",
          err instanceof Error ? err.message : String(err),
        );
        console.error("[BlockModel] Full error:", err);

        // Try to extract more details from the error object
        if (typeof err === "object" && err !== null) {
          console.error(
            "[BlockModel] Error details:",
            JSON.stringify(err, null, 2),
          );
          if ("code" in err)
            console.error("[BlockModel] Error code:", err.code);
          if ("message" in err)
            console.error("[BlockModel] Error message field:", err.message);
          if ("details" in err)
            console.error("[BlockModel] Error details field:", err.details);
        }

        console.error("========================================");
        if (!cancelled) {
          const errorMessage =
            err instanceof Error
              ? err.message
              : typeof err === "object" && err !== null && "message" in err
                ? String(err.message)
                : "Unknown error";
          setError(errorMessage);
          setLoading(false);
          // Show placeholder on error
          createPlaceholder();
        }
      }
    }

    function createPlaceholder() {
      try {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({
          color: 0x8b4513, // Brown placeholder
          roughness: 0.8,
          metalness: 0.2,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = 0.5;

        const group = new THREE.Group();
        group.add(mesh);

        setBlockGroup(group);
        setLoading(false);
      } catch (err) {
        console.error("[BlockModel] Error creating placeholder:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    }

    loadModel();

    return () => {
      cancelled = true;

      // Clean up on unmount or dependency change
      if (blockGroup) {
        blockGroup.traverse((obj) => {
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
    assetId, // Include original assetId to detect variant changes
    normalizedAssetId,
    resolvedPackId,
    resolvedPack,
    packsDir,
    biomeColorKey,
    showPot,
    isPotted,
    blockPropsKey,
    seed,
  ]);

  // No rotation - keep block aligned with shadow
  // useFrame((state) => {
  //   if (groupRef.current) {
  //     groupRef.current.rotation.y =
  //       Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
  //   }
  // });

  if (error) {
    console.error("[BlockModel] Rendering error state:", error);
    // Still render the placeholder even on error - don't crash!
    if (!blockGroup) {
      return null;
    }
  }

  if (loading || !blockGroup) {
    return null;
  }

  // Wrap in try-catch to prevent any rendering errors from crashing the Canvas
  try {
    return (
      <group ref={groupRef} position={positionOffset}>
        <primitive object={blockGroup} />
      </group>
    );
  } catch (err) {
    console.error("[BlockModel] Error rendering group:", err);
    return null;
  }
}

export default BlockModel;
