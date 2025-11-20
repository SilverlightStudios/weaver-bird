import { useEffect, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getVanillaTexturePath, getPackTexturePath } from "@lib/tauri";
import {
  resolveBlockState,
  loadModelJson,
  BlockModel,
} from "@lib/tauri/blockModels";
import { getBlockStateIdFromAssetId, normalizeAssetId } from "@lib/assetUtils";
import { useStore } from "@state/store";
import s from "./styles.module.scss";

interface MinecraftCSSBlockProps {
  /** Asset ID (texture ID like "minecraft:block/oak_planks") */
  assetId: string;
  /** ID of the winning pack for this asset */
  packId?: string;
  /** Alt text for accessibility */
  alt?: string;
  /** Size of the block in pixels (default 64) */
  size?: number;
  /** Callback when textures fail to load */
  onError?: () => void;
}

interface FaceTextures {
  top: string | null;
  left: string | null;
  right: string | null;
}

/**
 * Extracts the texture IDs for each visible face from a block model.
 * Returns the resolved texture IDs for top, left (front), and right (side) faces.
 */
function extractFaceTextures(model: BlockModel): {
  top: string | null;
  left: string | null;
  right: string | null;
} {
  const textures = model.textures || {};

  // Helper to resolve texture variables (e.g., "#all" -> actual texture ID)
  const resolveTexture = (ref: string | undefined): string | null => {
    if (!ref) return null;

    // If it's a variable reference, resolve it
    let resolved = ref;
    let iterations = 0;
    while (resolved.startsWith("#") && iterations < 10) {
      const varName = resolved.substring(1);
      resolved = textures[varName] || resolved;
      iterations++;
    }

    // If still a reference, couldn't resolve
    if (resolved.startsWith("#")) return null;

    return resolved;
  };

  // Priority order for each face type
  // Top face: up > top > end > all
  const topTexture = resolveTexture(textures.up) ||
    resolveTexture(textures.top) ||
    resolveTexture(textures.end) ||
    resolveTexture(textures.all) ||
    resolveTexture(textures.particle);

  // Left face (front): north > front > side > all
  const leftTexture = resolveTexture(textures.north) ||
    resolveTexture(textures.front) ||
    resolveTexture(textures.side) ||
    resolveTexture(textures.all) ||
    resolveTexture(textures.particle);

  // Right face (side): east > side > all
  const rightTexture = resolveTexture(textures.east) ||
    resolveTexture(textures.side) ||
    resolveTexture(textures.all) ||
    resolveTexture(textures.particle);

  return {
    top: topTexture,
    left: leftTexture,
    right: rightTexture,
  };
}

/**
 * Renders a Minecraft-style isometric block using CSS 3D transforms.
 * Loads block model data to determine correct textures for each face.
 */
export default function MinecraftCSSBlock({
  assetId,
  packId,
  alt = "Block",
  size = 64,
  onError,
}: MinecraftCSSBlockProps) {
  const [faceUrls, setFaceUrls] = useState<FaceTextures>({
    top: null,
    left: null,
    right: null,
  });
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  // Get pack info from store
  const packs = useStore((state) => state.packs);
  const packsDir = useStore((state) => state.packsDir);
  const pack = packId ? packs.find((p) => p.id === packId) : null;

  useEffect(() => {
    let mounted = true;

    const loadTextures = async () => {
      try {
        setLoading(true);
        const normalizedAssetId = normalizeAssetId(assetId);

        // Try to load block model data for intelligent face textures
        let faceTextureIds: { top: string | null; left: string | null; right: string | null } = {
          top: normalizedAssetId,
          left: normalizedAssetId,
          right: normalizedAssetId,
        };

        // Attempt to get block model for better texture mapping
        if (packsDir && packId) {
          try {
            const blockStateId = getBlockStateIdFromAssetId(normalizedAssetId);

            // Try to resolve the blockstate to get model info
            const resolution = await resolveBlockState(
              packId,
              blockStateId,
              packsDir,
            );

            if (resolution.models.length > 0) {
              const modelId = resolution.models[0].modelId;
              const model = await loadModelJson(packId, modelId, packsDir);

              // Extract face textures from the model
              const faces = extractFaceTextures(model);

              // Use extracted textures if available, otherwise fall back to asset ID
              faceTextureIds = {
                top: faces.top || normalizedAssetId,
                left: faces.left || normalizedAssetId,
                right: faces.right || normalizedAssetId,
              };
            }
          } catch (modelError) {
            // Failed to load model, fall back to using the same texture for all faces
            console.debug(
              `[MinecraftCSSBlock] Could not load block model for ${assetId}, using single texture`,
              modelError
            );
          }
        }

        // Load texture URLs for each face
        const loadTextureUrl = async (textureId: string): Promise<string> => {
          let texturePath: string;

          if (pack) {
            try {
              texturePath = await getPackTexturePath(
                pack.path,
                textureId,
                pack.is_zip,
              );
            } catch {
              // Fall back to vanilla
              texturePath = await getVanillaTexturePath(textureId);
            }
          } else {
            texturePath = await getVanillaTexturePath(textureId);
          }

          return convertFileSrc(texturePath);
        };

        // Load all face textures in parallel
        const [topUrl, leftUrl, rightUrl] = await Promise.all([
          loadTextureUrl(faceTextureIds.top!),
          loadTextureUrl(faceTextureIds.left!),
          loadTextureUrl(faceTextureIds.right!),
        ]);

        if (mounted) {
          setFaceUrls({
            top: topUrl,
            left: leftUrl,
            right: rightUrl,
          });
          setError(false);
          setLoading(false);
        }
      } catch (err) {
        console.warn(`[MinecraftCSSBlock] Failed to load textures for ${assetId}:`, err);
        if (mounted) {
          setError(true);
          setLoading(false);
          onError?.();
        }
      }
    };

    loadTextures();

    return () => {
      mounted = false;
    };
  }, [assetId, packId, pack, packsDir, onError]);

  // Calculate face size based on overall size
  const faceSize = Math.round(size * 0.7);

  if (loading) {
    return (
      <div
        className={s.blockContainer}
        style={{ width: size, height: size }}
      >
        <div className={s.loading} />
      </div>
    );
  }

  if (error || !faceUrls.top) {
    return null;
  }

  return (
    <div
      className={s.blockContainer}
      style={{
        width: size,
        height: size,
        '--face-size': `${faceSize}px`,
      } as React.CSSProperties}
    >
      <div className={s.block}>
        {/* Top face */}
        <div className={s.faceTop}>
          {faceUrls.top && (
            <img
              src={faceUrls.top}
              alt={`${alt} top`}
              onError={() => {
                setError(true);
                onError?.();
              }}
              draggable={false}
            />
          )}
        </div>

        {/* Left face (front) */}
        <div className={s.faceLeft}>
          {faceUrls.left && (
            <img
              src={faceUrls.left}
              alt={`${alt} left`}
              onError={() => {
                setError(true);
                onError?.();
              }}
              draggable={false}
            />
          )}
        </div>

        {/* Right face (side) */}
        <div className={s.faceRight}>
          {faceUrls.right && (
            <img
              src={faceUrls.right}
              alt={`${alt} right`}
              onError={() => {
                setError(true);
                onError?.();
              }}
              draggable={false}
            />
          )}
        </div>
      </div>
    </div>
  );
}
