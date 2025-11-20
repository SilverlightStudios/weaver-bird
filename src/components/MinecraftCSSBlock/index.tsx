import { useEffect, useState, useMemo } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getVanillaTexturePath, getPackTexturePath } from "@lib/tauri";
import {
  resolveBlockState,
  loadModelJson,
  ModelElement,
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

// Represents a rendered face with all data needed for CSS
interface RenderedFace {
  type: "top" | "left" | "right";
  textureUrl: string;
  // Position in isometric space (pixels)
  x: number;
  y: number;
  z: number;
  // Size of the face (pixels)
  width: number;
  height: number;
  // UV coordinates for texture clipping (0-1)
  uv: { u1: number; v1: number; u2: number; v2: number };
  // Z-index for depth sorting
  zIndex: number;
  // Brightness for shading
  brightness: number;
}

// Represents a complete element with its faces
interface RenderedElement {
  faces: RenderedFace[];
}

/**
 * Resolves a texture variable reference to an actual texture ID
 */
function resolveTextureRef(
  ref: string,
  textures: Record<string, string>,
): string | null {
  if (!ref) return null;

  let resolved = ref;
  let iterations = 0;
  while (resolved.startsWith("#") && iterations < 10) {
    const varName = resolved.substring(1);
    resolved = textures[varName] || resolved;
    iterations++;
  }

  if (resolved.startsWith("#")) return null;
  return resolved;
}

/**
 * Converts Minecraft UV coordinates (0-16) to normalized (0-1)
 */
function normalizeUV(uv: [number, number, number, number] | undefined): {
  u1: number;
  v1: number;
  u2: number;
  v2: number;
} {
  if (!uv) {
    return { u1: 0, v1: 0, u2: 1, v2: 1 };
  }
  return {
    u1: uv[0] / 16,
    v1: uv[1] / 16,
    u2: uv[2] / 16,
    v2: uv[3] / 16,
  };
}

/**
 * Calculates face positions for true 3D isometric rendering
 * Returns pixel offsets from center for each face type
 *
 * With rotateX(-30deg) rotateY(-45deg) on the scene:
 * - Faces are positioned in 3D space and CSS handles the projection
 * - All positions are relative to element center
 */
function calculateFaceOffsets(
  element: { from: number[]; to: number[] },
  scale: number,
  blockCenter: { x: number; y: number; z: number },
): {
  top: { x: number; y: number; z: number };
  left: { x: number; y: number; z: number };
  right: { x: number; y: number; z: number };
} {
  const [x1, y1, z1] = element.from;
  const [x2, y2, z2] = element.to;

  // Element dimensions
  const width = x2 - x1;
  const height = y2 - y1;
  const depth = z2 - z1;

  // Element center relative to block center (8,8,8)
  const centerX = (x1 + x2) / 2 - blockCenter.x;
  const centerY = (y1 + y2) / 2 - blockCenter.y;
  const centerZ = (z1 + z2) / 2 - blockCenter.z;

  // For true 3D positioning, faces need to be offset by half their size
  // to position them at the edges of the block, not the center

  // Top face: at the top of the element (Y+ direction)
  const topX = centerX * scale;
  const topY = (centerY + height / 2) * scale;
  const topZ = centerZ * scale;

  // Left face (south): aligned to its local center, only needs Z push for depth
  const leftX = centerX * scale;
  const leftY = -centerY * scale;
  const leftZ = (centerZ + depth / 2) * scale;

  // Right face (east): offset right by half the depth (after rotateY 90deg)
  const rightX = (centerZ + depth / 2) * scale;
  const rightY = -centerY * scale;
  const rightZ = centerZ * scale;

  return {
    top: { x: topX, y: -topY, z: topZ },
    left: { x: leftX, y: leftY, z: leftZ },
    right: { x: rightX, y: rightY, z: rightZ },
  };
}

/**
 * Processes block model elements into renderable face data
 */
function processElements(
  elements: ModelElement[],
  textures: Record<string, string>,
  textureUrls: Map<string, string>,
  scale: number,
): RenderedElement[] {
  const renderedElements: RenderedElement[] = [];

  // Block center in Minecraft coordinates (0-16 space)
  const blockCenter = { x: 8, y: 8, z: 8 };

  for (const element of elements) {
    const faces: RenderedFace[] = [];
    const [x1, y1, z1] = element.from;
    const [x2, y2, z2] = element.to;

    // Element dimensions in Minecraft units
    const width = x2 - x1;
    const height = y2 - y1;
    const depth = z2 - z1;

    // Calculate face positions
    const offsets = calculateFaceOffsets(element, scale, blockCenter);

    // Z-index base for this element (higher Y = rendered on top)
    const centerY = (y1 + y2) / 2;

    // Process each visible face
    // Top face (up) - always visible from above
    if (element.faces.up) {
      const face = element.faces.up;
      const textureId = resolveTextureRef(face.texture, textures);
      const textureUrl = textureId ? textureUrls.get(textureId) : null;

      if (textureUrl) {
        faces.push({
          type: "top",
          textureUrl,
          x: offsets.top.x,
          y: offsets.top.y,
          z: offsets.top.z,
          width: width * scale,
          height: depth * scale,
          uv: normalizeUV(face.uv),
          zIndex: Math.round(centerY * 10 + 100),
          brightness: 1.0,
        });
      }
    }

    // South face (front-left in isometric view)
    if (element.faces.south) {
      const face = element.faces.south;
      const textureId = resolveTextureRef(face.texture, textures);
      const textureUrl = textureId ? textureUrls.get(textureId) : null;

      if (textureUrl) {
        faces.push({
          type: "left",
          textureUrl,
          x: offsets.left.x,
          y: offsets.left.y,
          z: offsets.left.z,
          width: width * scale,
          height: height * scale,
          uv: normalizeUV(face.uv),
          zIndex: Math.round(centerY * 10 + 50),
          brightness: 0.8,
        });
      }
    }

    // East face (front-right in isometric view)
    if (element.faces.east) {
      const face = element.faces.east;
      const textureId = resolveTextureRef(face.texture, textures);
      const textureUrl = textureId ? textureUrls.get(textureId) : null;

      if (textureUrl) {
        faces.push({
          type: "right",
          textureUrl,
          x: offsets.right.x,
          y: offsets.right.y,
          z: offsets.right.z,
          width: depth * scale,
          height: height * scale,
          uv: normalizeUV(face.uv),
          zIndex: Math.round(centerY * 10),
          brightness: 0.6,
        });
      }
    }

    if (faces.length > 0) {
      renderedElements.push({ faces });
    }
  }

  return renderedElements;
}

/**
 * Checks if a block model is suitable for 3D isometric rendering.
 * Returns false for cross-shaped models (plants, flowers), which should use 2D.
 */
function isSuitableFor3D(elements: ModelElement[]): boolean {
  if (elements.length === 0) return false;

  // Check if any element has the faces we need for isometric view
  let hasIsometricFaces = false;

  for (const element of elements) {
    const faces = element.faces;
    // We need at least up OR (south AND east) for a reasonable 3D render
    if (faces.up || (faces.south && faces.east)) {
      hasIsometricFaces = true;
      break;
    }
  }

  if (!hasIsometricFaces) return false;

  // Check for cross-shaped models (typically have diagonal rotated elements)
  // Cross models usually have elements rotated 45 degrees
  for (const element of elements) {
    if (element.rotation && Math.abs(element.rotation.angle) === 45) {
      return false;
    }
  }

  return true;
}

/**
 * Creates a default full-block element for simple blocks without elements array
 */
function createDefaultElement(
  textures: Record<string, string>,
): ModelElement[] {
  // Resolve default textures for each face
  const allTexture =
    textures.all || textures.particle || Object.values(textures)[0] || "";
  const topTexture = textures.up || textures.top || textures.end || allTexture;
  const southTexture =
    textures.south || textures.north || textures.side || allTexture;
  const eastTexture =
    textures.east || textures.west || textures.side || allTexture;

  return [
    {
      from: [0, 0, 0],
      to: [16, 16, 16],
      faces: {
        up: {
          texture: topTexture.startsWith("#")
            ? topTexture
            : `#${Object.keys(textures).find((k) => textures[k] === topTexture) || "all"}`,
        },
        south: {
          texture: southTexture.startsWith("#")
            ? southTexture
            : `#${Object.keys(textures).find((k) => textures[k] === southTexture) || "all"}`,
        },
        east: {
          texture: eastTexture.startsWith("#")
            ? eastTexture
            : `#${Object.keys(textures).find((k) => textures[k] === eastTexture) || "all"}`,
        },
      },
    },
  ];
}

/**
 * Renders a Minecraft-style isometric block using CSS transforms.
 * Parses block model elements for accurate complex block rendering.
 */
export default function MinecraftCSSBlock({
  assetId,
  packId,
  alt = "Block",
  size = 64,
  onError,
}: MinecraftCSSBlockProps) {
  const [renderedElements, setRenderedElements] = useState<RenderedElement[]>(
    [],
  );
  const [fallbackTextureUrl, setFallbackTextureUrl] = useState<string | null>(
    null,
  );
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  // Get pack info from store
  const packs = useStore((state) => state.packs);
  const packsDir = useStore((state) => state.packsDir);
  const pack = packId ? packs[packId] : null;

  // Scale factor: convert 16-unit Minecraft space to pixel size
  // 0.5 gives a good fill of the card while leaving padding for isometric projection
  const scale = useMemo(() => (size * 0.5) / 16, [size]);

  useEffect(() => {
    let mounted = true;

    const loadBlockData = async () => {
      try {
        setLoading(true);
        const normalizedAssetId = normalizeAssetId(assetId);

        // Load texture URL helper
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
              texturePath = await getVanillaTexturePath(textureId);
            }
          } else {
            texturePath = await getVanillaTexturePath(textureId);
          }

          return convertFileSrc(texturePath);
        };

        let elements: ModelElement[] = [];
        let textures: Record<string, string> = {};
        let textureUrls = new Map<string, string>();

        // Try to load block model data
        if (packsDir && packId) {
          try {
            const blockStateId = getBlockStateIdFromAssetId(normalizedAssetId);
            const resolution = await resolveBlockState(
              packId,
              blockStateId,
              packsDir,
            );

            if (resolution.models.length > 0) {
              const modelId = resolution.models[0].modelId;
              const model = await loadModelJson(packId, modelId, packsDir);

              textures = model.textures || {};
              elements = model.elements || createDefaultElement(textures);

              // Collect all unique texture IDs
              const textureIds = new Set<string>();
              for (const element of elements) {
                for (const face of Object.values(element.faces)) {
                  const textureId = resolveTextureRef(face.texture, textures);
                  if (textureId) {
                    textureIds.add(textureId);
                  }
                }
              }

              // Load all textures in parallel
              const loadPromises = Array.from(textureIds).map(async (id) => {
                const url = await loadTextureUrl(id);
                return [id, url] as [string, string];
              });

              const loadedTextures = await Promise.all(loadPromises);
              textureUrls = new Map(loadedTextures);

              // Check if this model is suitable for 3D rendering
              if (!isSuitableFor3D(elements)) {
                // Fall back to 2D texture for cross/plant models
                const fallbackTexture = await loadTextureUrl(normalizedAssetId);
                if (mounted) {
                  setFallbackTextureUrl(fallbackTexture);
                  setRenderedElements([]);
                  setError(false);
                  setLoading(false);
                }
                return;
              }
            }
          } catch (modelError) {
            console.debug(
              `[MinecraftCSSBlock] Could not load block model for ${assetId}`,
              modelError,
            );
          }
        }

        // Fallback: create simple cube with single texture
        if (elements.length === 0) {
          const textureUrl = await loadTextureUrl(normalizedAssetId);
          textureUrls.set(normalizedAssetId, textureUrl);
          textures = { all: normalizedAssetId };
          elements = createDefaultElement(textures);
        }

        // Process elements into renderable faces
        const rendered = processElements(
          elements,
          textures,
          textureUrls,
          scale,
        );

        if (mounted) {
          setFallbackTextureUrl(null);
          setRenderedElements(rendered);
          setError(false);
          setLoading(false);
        }
      } catch (err) {
        console.warn(
          `[MinecraftCSSBlock] Failed to load block for ${assetId}:`,
          err,
        );
        if (mounted) {
          setError(true);
          setLoading(false);
          onError?.();
        }
      }
    };

    loadBlockData();

    return () => {
      mounted = false;
    };
  }, [assetId, packId, pack, packsDir, scale, onError]);

  // Collect and sort all faces by z-index for proper depth rendering
  const sortedFaces = useMemo(() => {
    const allFaces: RenderedFace[] = [];
    for (const element of renderedElements) {
      allFaces.push(...element.faces);
    }
    return allFaces.sort((a, b) => a.zIndex - b.zIndex);
  }, [renderedElements]);

  if (loading) {
    return (
      <div className={s.blockContainer} style={{ width: size, height: size }}>
        <div className={s.loading} />
      </div>
    );
  }

  if (error) {
    return null;
  }

  // Render 2D fallback for cross/plant blocks
  if (fallbackTextureUrl) {
    return (
      <div className={s.blockContainer} style={{ width: size, height: size }}>
        <img
          src={fallbackTextureUrl}
          alt={alt}
          className={s.fallbackTexture}
          onError={() => {
            setError(true);
            onError?.();
          }}
          draggable={false}
        />
      </div>
    );
  }

  if (sortedFaces.length === 0) {
    return null;
  }

  return (
    <div className={s.blockContainer} style={{ width: size, height: size }}>
      <div className={s.blockScene}>
        {sortedFaces.map((face, index) => (
          <div
            key={index}
            className={`${s.face} ${s[`face${face.type.charAt(0).toUpperCase()}${face.type.slice(1)}`]}`}
            style={
              {
                "--face-x": `${face.x}px`,
                "--face-y": `${face.y}px`,
                "--face-z": `${face.z}px`,
                "--face-width": `${face.width}px`,
                "--face-height": `${face.height}px`,
                "--face-brightness": face.brightness,
                "--uv-x": face.uv.u1,
                "--uv-y": face.uv.v1,
                "--uv-width": face.uv.u2 - face.uv.u1,
                "--uv-height": face.uv.v2 - face.uv.v1,
                zIndex: face.zIndex,
              } as React.CSSProperties
            }
          >
            <img
              src={face.textureUrl}
              alt={`${alt} ${face.type}`}
              onError={() => {
                setError(true);
                onError?.();
              }}
              draggable={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
