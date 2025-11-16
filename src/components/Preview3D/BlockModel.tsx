import { useEffect, useState, useRef } from "react";
import * as THREE from "three";
import {
  useSelectWinner,
  useSelectPack,
  useSelectPacksDir,
} from "@state/selectors";
import { loadModelJson, resolveBlockState } from "@lib/tauri/blockModels";
import { blockModelToThreeJs } from "@lib/three/modelConverter";
import { createTextureLoader } from "@lib/three/textureLoader";
import {
  normalizeAssetId,
  getVariantNumber,
  getPlantNameFromPotted,
} from "@lib/assetUtils";

interface Props {
  assetId: string;
  biomeColor?: { r: number; g: number; b: number } | null;
  onTintDetected?: (hasTint: boolean) => void;
  showPot?: boolean;
  isPotted?: boolean;
  blockProps?: Record<string, string>;
  seed?: number;
}

function BlockModel({
  assetId,
  biomeColor,
  onTintDetected,
  showPot = true,
  isPotted = false,
  blockProps = {},
  seed = 0,
}: Props) {
  // Normalize asset ID immediately to fix trailing underscores from malformed packs
  const normalizedAssetId = normalizeAssetId(assetId);

  const groupRef = useRef<THREE.Group>(null);
  const [blockGroup, setBlockGroup] = useState<THREE.Group | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Get the winning pack using the ORIGINAL asset ID (state stores original IDs)
  // but we'll use the normalized ID when loading models
  const winnerPackId = useSelectWinner(assetId);
  const winnerPack = useSelectPack(winnerPackId || "");
  const packsDir = useSelectPacksDir();

  // Create stable string representation of biomeColor for dependency comparison
  const biomeColorKey = biomeColor
    ? `${biomeColor.r},${biomeColor.g},${biomeColor.b}`
    : null;

  useEffect(() => {
    console.log("=== [BlockModel] Dependencies Updated ===");
    console.log("[BlockModel] Original Asset ID:", assetId);
    console.log("[BlockModel] Normalized Asset ID:", normalizedAssetId);
    console.log("[BlockModel] Winner Pack ID:", winnerPackId);
    console.log("[BlockModel] Winner Pack:", winnerPack);
    console.log("[BlockModel] Packs Dir:", packsDir);
    console.log("===========================================");
  }, [assetId, normalizedAssetId, winnerPackId, packsDir]);

  // Load the real block model
  useEffect(() => {
    console.log("[BlockModel] === Model Load Effect Triggered ===");
    console.log("[BlockModel] Asset ID:", assetId);
    console.log("[BlockModel] Winner Pack ID:", winnerPackId);

    // Clean up previous model first
    if (blockGroup) {
      console.log("[BlockModel] Cleaning up previous model");
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
      setBlockGroup(null);
    }

    // Need all dependencies to load
    if (!winnerPackId || !winnerPack || !packsDir) {
      console.log("[BlockModel] Missing required data, showing placeholder");
      createPlaceholder();
      return;
    }

    // TypeScript guard: these are guaranteed to be defined here
    const packsDirPath: string = packsDir;
    const packId: string = winnerPackId;

    let cancelled = false;

    async function loadModel() {
      setLoading(true);
      setError(null);

      try {
        console.log("=== [BlockModel] Starting Model Load ===");
        console.log("[BlockModel] Asset ID:", assetId);
        console.log("[BlockModel] Is Potted:", isPotted);
        console.log("[BlockModel] Show Pot:", showPot);
        console.log("[BlockModel] Pack ID:", packId);
        console.log("[BlockModel] Pack Path:", winnerPack.path);
        console.log("[BlockModel] Pack is_zip:", winnerPack.is_zip);
        console.log("[BlockModel] Packs Dir:", packsDirPath);

        // For potted plants, decide whether to load the potted model or just the plant
        let modelAssetId = normalizedAssetId;
        if (isPotted && !showPot) {
          // If showPot is false, load just the plant without the pot
          const plantName = getPlantNameFromPotted(normalizedAssetId);
          if (plantName) {
            modelAssetId = plantName;
            console.log(
              "[BlockModel] Loading plant without pot:",
              modelAssetId,
            );
          }
        } else if (isPotted && showPot) {
          // If showPot is true, load the full potted model (includes both pot and plant)
          console.log("[BlockModel] Loading full potted model:", modelAssetId);
        }

        // Resolve blockstate -> models with transformations
        console.log("[BlockModel] Calling resolveBlockState Tauri command...");
        console.log("[BlockModel] Block props:", blockProps);
        console.log("[BlockModel] Seed:", seed);

        const resolution = await resolveBlockState(
          packId,
          modelAssetId,
          packsDirPath,
          Object.keys(blockProps).length > 0 ? blockProps : undefined,
          seed,
        );

        console.log("[BlockModel] Blockstate resolved successfully!");
        console.log(
          "[BlockModel] Resolution result:",
          JSON.stringify(resolution, null, 2),
        );
        console.log("[BlockModel] Number of models:", resolution.models.length);
        console.log("[BlockModel] State props:", resolution.stateProps);

        if (cancelled) {
          console.log("[BlockModel] Load cancelled, aborting");
          return;
        }

        // Extract variant number for ETF-style variant texture loading
        const variantNumber = getVariantNumber(assetId);
        console.log("[BlockModel] Variant number:", variantNumber);

        // Create texture loader for this pack
        console.log("[BlockModel] Creating texture loader...");
        const textureLoader = createTextureLoader(
          winnerPack.path,
          winnerPack.is_zip,
          variantNumber,
        );

        // Create parent group to hold all resolved models
        const parentGroup = new THREE.Group();
        let hasTintindex = false;

        // Load and convert each resolved model
        for (const resolvedModel of resolution.models) {
          console.log("[BlockModel] Loading model:", resolvedModel.modelId);
          console.log(
            "[BlockModel] Rotations - X:",
            resolvedModel.rotX,
            "Y:",
            resolvedModel.rotY,
            "Z:",
            resolvedModel.rotZ,
          );
          console.log("[BlockModel] UV Lock:", resolvedModel.uvlock);

          // Load the actual model JSON directly by model ID
          const model = await loadModelJson(
            packId,
            resolvedModel.modelId,
            packsDirPath,
          );
          console.log("[BlockModel] Model loaded:", resolvedModel.modelId);

          // Check if this model has tintindex
          const modelHasTint =
            model.elements?.some((element) =>
              Object.values(element.faces || {}).some(
                (face: any) =>
                  face.tintindex !== undefined && face.tintindex !== null,
              ),
            ) || false;

          if (modelHasTint) {
            hasTintindex = true;
          }

          if (cancelled) {
            console.log("[BlockModel] Load cancelled, aborting");
            return;
          }

          // Convert to Three.js geometry
          console.log("[BlockModel] Converting model to Three.js...");
          const modelGroup = await blockModelToThreeJs(
            model,
            textureLoader,
            biomeColor,
            resolvedModel, // Pass resolved model for rotations and uvlock
          );

          console.log("[BlockModel] Model converted successfully");
          parentGroup.add(modelGroup);
        }

        console.log(
          "[BlockModel] All models loaded. Has tintindex:",
          hasTintindex,
        );
        if (onTintDetected) {
          onTintDetected(hasTintindex);
        }

        if (cancelled) {
          console.log("[BlockModel] Load cancelled after conversion, aborting");
          return;
        }

        // Position the model - center at ground level
        parentGroup.position.y = 0.5;

        setBlockGroup(parentGroup);
        setLoading(false);
        console.log("=== [BlockModel] Model Load Complete ===");
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
      console.log("[BlockModel] Creating placeholder cube for:", assetId);

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
      console.log("[BlockModel] Cleanup function called");
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    normalizedAssetId,
    winnerPackId,
    packsDir,
    biomeColorKey,
    showPot,
    isPotted,
    JSON.stringify(blockProps),
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
      console.log("[BlockModel] No blockGroup due to error, returning null");
      return null;
    }
  }

  if (loading || !blockGroup) {
    console.log("[BlockModel] Waiting for model to load...");
    return null;
  }

  console.log("[BlockModel] Rendering model group");

  // Wrap in try-catch to prevent any rendering errors from crashing the Canvas
  try {
    return (
      <group ref={groupRef}>
        <primitive object={blockGroup} />
      </group>
    );
  } catch (err) {
    console.error("[BlockModel] Error rendering group:", err);
    return null;
  }
}

export default BlockModel;
