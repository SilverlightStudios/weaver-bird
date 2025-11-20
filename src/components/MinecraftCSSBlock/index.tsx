import { useEffect, useState, useMemo } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getVanillaTexturePath, getPackTexturePath } from "@lib/tauri";
import {
  resolveBlockState,
  loadModelJson,
  BlockModel,
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
  textures: Record<string, string>
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
 * Converts 3D Minecraft coordinates to 2D isometric screen coordinates
 * Minecraft: X=east/west, Y=up/down, Z=north/south
 * Isometric view: looking from south-east, above
 */
function toIsometric(
  x: number,
  y: number,
  z: number,
  scale: number
): { screenX: number; screenY: number } {
  // Isometric projection angles (30 degrees)
  const cos30 = 0.866;
  const sin30 = 0.5;

  // Convert to isometric 2D
  // X goes right+down, Z goes left+down, Y goes up
  const screenX = (x - z) * cos30 * scale;
  const screenY = ((x + z) * sin30 - y) * scale;

  return { screenX, screenY };
}

/**
 * Processes block model elements into renderable face data
 */
function processElements(
  elements: ModelElement[],
  textures: Record<string, string>,
  textureUrls: Map<string, string>,
  scale: number
): RenderedElement[] {
  const renderedElements: RenderedElement[] = [];

  for (const element of elements) {
    const faces: RenderedFace[] = [];
    const [x1, y1, z1] = element.from;
    const [x2, y2, z2] = element.to;

    // Element dimensions in Minecraft units
    const width = x2 - x1;
    const height = y2 - y1;
    const depth = z2 - z1;

    // Calculate isometric position of element origin (front-bottom-left corner)
    // We use the center-bottom of the element for positioning
    const centerX = (x1 + x2) / 2;
    const centerZ = (z1 + z2) / 2;

    // Process each visible face
    // Top face (up) - always visible from above
    if (element.faces.up) {
      const face = element.faces.up;
      const textureId = resolveTextureRef(face.texture, textures);
      const textureUrl = textureId ? textureUrls.get(textureId) : null;

      if (textureUrl) {
        // Top face position: at the top of the element
        const pos = toIsometric(centerX, y2, centerZ, scale);

        faces.push({
          type: "top",
          textureUrl,
          x: pos.screenX,
          y: pos.screenY,
          width: width * scale,
          height: depth * scale,
          uv: normalizeUV(face.uv),
          zIndex: Math.round(y2 * 10 + centerX + centerZ),
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
        // South face: front of the element
        const pos = toIsometric(centerX, y1 + height / 2, z2, scale);

        faces.push({
          type: "left",
          textureUrl,
          x: pos.screenX,
          y: pos.screenY,
          width: width * scale,
          height: height * scale,
          uv: normalizeUV(face.uv),
          zIndex: Math.round(z2 * 10 + centerX + y1),
          brightness: 0.85,
        });
      }
    }

    // East face (front-right in isometric view)
    if (element.faces.east) {
      const face = element.faces.east;
      const textureId = resolveTextureRef(face.texture, textures);
      const textureUrl = textureId ? textureUrls.get(textureId) : null;

      if (textureUrl) {
        // East face: right side of the element
        const pos = toIsometric(x2, y1 + height / 2, centerZ, scale);

        faces.push({
          type: "right",
          textureUrl,
          x: pos.screenX,
          y: pos.screenY,
          width: depth * scale,
          height: height * scale,
          uv: normalizeUV(face.uv),
          zIndex: Math.round(x2 * 10 + centerZ + y1),
          brightness: 0.7,
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
 * Creates a default full-block element for simple blocks without elements array
 */
function createDefaultElement(textures: Record<string, string>): ModelElement[] {
  // Resolve default textures for each face
  const allTexture = textures.all || textures.particle || Object.values(textures)[0] || "";
  const topTexture = textures.up || textures.top || textures.end || allTexture;
  const southTexture = textures.south || textures.north || textures.side || allTexture;
  const eastTexture = textures.east || textures.west || textures.side || allTexture;

  return [{
    from: [0, 0, 0],
    to: [16, 16, 16],
    faces: {
      up: { texture: topTexture.startsWith("#") ? topTexture : `#${Object.keys(textures).find(k => textures[k] === topTexture) || "all"}` },
      south: { texture: southTexture.startsWith("#") ? southTexture : `#${Object.keys(textures).find(k => textures[k] === southTexture) || "all"}` },
      east: { texture: eastTexture.startsWith("#") ? eastTexture : `#${Object.keys(textures).find(k => textures[k] === eastTexture) || "all"}` },
    },
  }];
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
  const [renderedElements, setRenderedElements] = useState<RenderedElement[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  // Get pack info from store
  const packs = useStore((state) => state.packs);
  const packsDir = useStore((state) => state.packsDir);
  const pack = packId ? packs.find((p) => p.id === packId) : null;

  // Scale factor: convert 16-unit Minecraft space to pixel size
  const scale = useMemo(() => (size * 0.6) / 16, [size]);

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
                pack.is_zip
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
              packsDir
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
            }
          } catch (modelError) {
            console.debug(
              `[MinecraftCSSBlock] Could not load block model for ${assetId}`,
              modelError
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
        const rendered = processElements(elements, textures, textureUrls, scale);

        if (mounted) {
          setRenderedElements(rendered);
          setError(false);
          setLoading(false);
        }
      } catch (err) {
        console.warn(
          `[MinecraftCSSBlock] Failed to load block for ${assetId}:`,
          err
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

  if (error || sortedFaces.length === 0) {
    return null;
  }

  return (
    <div
      className={s.blockContainer}
      style={{ width: size, height: size }}
    >
      <div className={s.blockScene}>
        {sortedFaces.map((face, index) => (
          <div
            key={index}
            className={`${s.face} ${s[`face${face.type.charAt(0).toUpperCase()}${face.type.slice(1)}`]}`}
            style={{
              '--face-x': `${face.x}px`,
              '--face-y': `${face.y}px`,
              '--face-width': `${face.width}px`,
              '--face-height': `${face.height}px`,
              '--face-brightness': face.brightness,
              '--uv-x': face.uv.u1,
              '--uv-y': face.uv.v1,
              '--uv-width': face.uv.u2 - face.uv.u1,
              '--uv-height': face.uv.v2 - face.uv.v1,
              zIndex: face.zIndex,
            } as React.CSSProperties}
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
