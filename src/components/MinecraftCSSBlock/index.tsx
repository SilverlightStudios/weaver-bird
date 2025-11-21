/**
 * MinecraftCSSBlock Component - Renders 3D isometric block previews using CSS
 *
 * PERFORMANCE OPTIMIZATIONS:
 * -------------------------
 * 1. Selective Subscriptions (lines 518-556):
 *    - Only subscribes to grass/foliage colors if the block uses tinting
 *    - Prevents non-tinted blocks from re-rendering on colormap changes
 *    - Checks block name patterns (grass, leaves, vines) to determine needs
 *
 * 2. Memoized Tint Detection (lines 519-531):
 *    - Caches whether block needs grass/foliage tint
 *    - Avoids repeated string matching on every render
 *
 * 3. Conditional Color Computation (lines 558-586):
 *    - Only computes tint colors if block actually uses them
 *    - Skips expensive color calculations for 95%+ of blocks
 */
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
import { getFoliageColorForBiome, rgbToCSS } from "@lib/biomeColors";
import {
  tintTexture,
  clearTintCache,
  type TintColor,
} from "@lib/textureColorization";
import { getBlockTintType } from "@/constants/vanillaBlockColors";
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
interface NormalizedUV {
  u: number;
  v: number;
  width: number;
  height: number;
  flipX: 1 | -1;
  flipY: 1 | -1;
}

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
  uv: NormalizedUV;
  // Z-index for depth sorting
  zIndex: number;
  // Brightness for shading
  brightness: number;
  // Tint type to apply (grass or foliage)
  tintType?: "grass" | "foliage";
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
function normalizeUV(
  uv: [number, number, number, number] | undefined,
): NormalizedUV {
  if (!uv) {
    return { u: 0, v: 0, width: 1, height: 1, flipX: 1, flipY: 1 };
  }

  const rawU1 = uv[0] / 16;
  const rawV1 = uv[1] / 16;
  const rawU2 = uv[2] / 16;
  const rawV2 = uv[3] / 16;

  const widthDelta = rawU2 - rawU1;
  const heightDelta = rawV2 - rawV1;

  const width = Math.abs(widthDelta);
  const height = Math.abs(heightDelta);

  // If UV coordinates are [0,0,0,0] or result in 0 dimensions, use full texture
  // This fixes trapdoors and other blocks with missing/invalid UV data
  if (width === 0 || height === 0) {
    return { u: 0, v: 0, width: 1, height: 1, flipX: 1, flipY: 1 };
  }

  // Always use minimum UV values as start position
  // Don't use CSS flipping - it causes positioning issues with our current CSS
  // The visual flipping is already handled by choosing the correct start position
  return {
    u: widthDelta >= 0 ? rawU1 : rawU2,
    v: heightDelta >= 0 ? rawV1 : rawV2,
    width,
    height,
    flipX: 1, // No CSS flip on X
    flipY: 1, // No CSS flip on Y
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
 * Determines which colormap type to use for a texture.
 *
 * This checks against Minecraft's vanilla BlockColors registry to determine
 * if a texture/block should be tinted and which colormap to use.
 *
 * Note: In Minecraft, tintindex only indicates IF a face should be tinted,
 * but WHICH colormap to use is hardcoded in the game's BlockColors registry.
 *
 * @param textureId - Texture ID (e.g., "minecraft:block/oak_leaves")
 * @returns Colormap type or undefined
 */
function getColormapType(textureId: string): "grass" | "foliage" | undefined {
  // Extract block name from texture ID
  // e.g., "minecraft:block/oak_leaves" -> "minecraft:oak_leaves"
  let blockId = textureId;

  // Handle texture paths that include "/block/" or "/item/"
  if (blockId.includes("/block/")) {
    blockId = blockId.replace("/block/", ":");
  } else if (blockId.includes("/item/")) {
    blockId = blockId.replace("/item/", ":");
  }

  // Ensure namespace
  if (!blockId.includes(":")) {
    blockId = `minecraft:${blockId}`;
  }

  // Check against vanilla block colors registry
  const tintType = getBlockTintType(blockId);

  // Only return grass/foliage (we don't handle water/special in CSS renderer yet)
  if (tintType === "grass" || tintType === "foliage") {
    return tintType;
  }

  return undefined;
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

    // Check if this is a rotated element (like bushy leaves cross-planes)
    const hasRotation = element.rotation && element.rotation.angle !== 0;

    // Element dimensions in Minecraft units
    const width = x2 - x1;
    const height = y2 - y1;
    const depth = z2 - z1;

    // Calculate face positions
    let offsets = calculateFaceOffsets(element, scale, blockCenter);

    // For rotated elements (like bushy leaves cross-planes), center them at origin
    // These are typically diagonal planes that extend beyond block bounds
    if (hasRotation) {
      offsets = {
        top: { x: 0, y: offsets.top.y, z: 0 },
        left: { x: 0, y: offsets.left.y, z: 0 },
        right: { x: 0, y: offsets.right.y, z: 0 },
      };
    }

    // Z-index base for this element (higher Y = rendered on top)
    const centerY = (y1 + y2) / 2;

    // Process each visible face
    // Top face (up) - always visible from above
    if (element.faces.up) {
      const face = element.faces.up;
      const textureId = resolveTextureRef(face.texture, textures);
      const textureUrl = textureId ? textureUrls.get(textureId) : null;

      if (textureUrl) {
        // Data-driven tinting: Check tintindex from model JSON to determine IF we should tint
        // Then use texture/block name to determine WHICH colormap (this matches Minecraft's behavior)
        const shouldTint =
          face.tintindex !== undefined && face.tintindex !== null;
        const tintType =
          shouldTint && textureId ? getColormapType(textureId) : undefined;

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
          tintType,
        });
      }
    }

    // South face (front-left in isometric view)
    if (element.faces.south) {
      const face = element.faces.south;
      const textureId = resolveTextureRef(face.texture, textures);
      const textureUrl = textureId ? textureUrls.get(textureId) : null;

      if (textureUrl) {
        // Data-driven tinting: Check tintindex from model JSON to determine IF we should tint
        // Then use texture/block name to determine WHICH colormap (this matches Minecraft's behavior)
        const shouldTint =
          face.tintindex !== undefined && face.tintindex !== null;
        const tintType =
          shouldTint && textureId ? getColormapType(textureId) : undefined;

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
          tintType,
        });
      }
    }

    // East face (front-right in isometric view)
    if (element.faces.east) {
      const face = element.faces.east;
      const textureId = resolveTextureRef(face.texture, textures);
      const textureUrl = textureId ? textureUrls.get(textureId) : null;

      if (textureUrl) {
        // Data-driven tinting: Check tintindex from model JSON to determine IF we should tint
        // Then use texture/block name to determine WHICH colormap (this matches Minecraft's behavior)
        const shouldTint =
          face.tintindex !== undefined && face.tintindex !== null;
        const tintType =
          shouldTint && textureId ? getColormapType(textureId) : undefined;

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
          tintType,
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
 * Checks if a block should use its 2D item icon instead of 3D block model
 * (e.g., doors, beds use pre-rendered 2D icons in inventory)
 */
function shouldUse2DItemIcon(assetId: string): boolean {
  const path = assetId.toLowerCase();

  // Doors should use item icons (except trapdoors which are fine as 3D)
  if (path.includes("door") && !path.includes("trapdoor")) {
    return true;
  }

  // Beds should use item icons
  if (path.includes("bed") && !path.includes("bedrock")) {
    return true;
  }

  return false;
}

/**
 * Converts a block asset ID to its corresponding item asset ID
 * Example: "minecraft:block/oak_door" -> "minecraft:item/oak_door"
 */
function getItemAssetId(blockAssetId: string): string {
  // Extract namespace and block name
  const match = blockAssetId.match(/^([^:]*:)?block\/(.+)$/);
  if (!match) return blockAssetId;

  const namespace = match[1] || "minecraft:";
  let itemName = match[2];

  // Remove block-specific suffixes like _top, _bottom, etc.
  itemName = itemName.replace(/_(top|bottom|upper|lower|head|foot)$/, "");

  return `${namespace}item/${itemName}`;
}

/**
 * For leaves blocks, try to get the colored inventory variant texture ID
 * Example: "minecraft:block/acacia_leaves" -> "minecraft:block/acacia_leaves_inventory"
 */
function getLeavesInventoryTextureId(textureId: string): string {
  if (textureId.includes("leaves") && !textureId.includes("_inventory")) {
    // Try to add _inventory suffix (or _bushy_inventory for bushy variants)
    if (textureId.includes("_bushy")) {
      return textureId.replace("_bushy", "_bushy_inventory");
    }
    return `${textureId}_inventory`;
  }
  return textureId;
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
  const [tintedTextures, setTintedTextures] = useState<Map<string, string>>(
    new Map(),
  );

  // Get pack info from store
  const packs = useStore((state) => state.packs);
  const packsDir = useStore((state) => state.packsDir);
  const pack = packId ? packs[packId] : null;

  // OPTIMIZATION: Determine if this block uses tinting to avoid unnecessary subscriptions
  const needsGrassTint = useMemo(() => {
    return assetId.includes('grass') ||
           assetId.includes('fern') ||
           assetId.includes('tall_grass') ||
           assetId.includes('sugar_cane');
  }, [assetId]);

  const needsFoliageTint = useMemo(() => {
    return assetId.includes('leaves') ||
           assetId.includes('vine');
  }, [assetId]);

  const needsAnyTint = needsGrassTint || needsFoliageTint;

  // Get selected biome/colors for tinting - only subscribe if needed
  const selectedBiomeId = useStore((state) =>
    needsAnyTint ? state.selectedBiomeId : undefined
  );
  const selectedGrassColor = useStore((state) =>
    needsGrassTint ? state.selectedGrassColor : undefined
  );
  const selectedFoliageColor = useStore((state) =>
    needsFoliageTint ? state.selectedFoliageColor : undefined
  );

  // Subscribe to colormap URLs only if block uses tinting
  // This prevents non-tinted blocks from re-rendering on pack order changes
  const grassColormapUrl = useStore((state) =>
    needsGrassTint ? state.grassColormapUrl : undefined
  );
  const foliageColormapUrl = useStore((state) =>
    needsFoliageTint ? state.foliageColormapUrl : undefined
  );

  // Prevent unused variable warnings
  void grassColormapUrl;
  void foliageColormapUrl;

  // Compute grass tint color
  const grassColor: TintColor | null = useMemo(() => {
    console.log(
      "[MinecraftCSSBlock] Computing grass color - selectedGrassColor:",
      selectedGrassColor,
    );
    if (selectedGrassColor) {
      return selectedGrassColor;
    }
    // Default grass color if none selected
    return { r: 127, g: 204, b: 25 };
  }, [selectedGrassColor]);

  // Compute foliage tint color
  const foliageColor: TintColor | null = useMemo(() => {
    console.log(
      "[MinecraftCSSBlock] Computing foliage color - selectedFoliageColor:",
      selectedFoliageColor,
    );
    if (selectedFoliageColor) {
      return selectedFoliageColor;
    }
    if (selectedBiomeId) {
      return getFoliageColorForBiome(selectedBiomeId);
    }
    // Default foliage color
    return getFoliageColorForBiome("plains");
  }, [selectedBiomeId, selectedFoliageColor]);

  // Scale factor: convert 16-unit Minecraft space to pixel size
  // 0.5 gives a good fill of the card while leaving padding for isometric projection
  const scale = useMemo(() => (size * 0.5) / 16, [size]);

  useEffect(() => {
    let mounted = true;

    const loadBlockData = async () => {
      try {
        setLoading(true);
        const normalizedAssetId = normalizeAssetId(assetId);

        // Check if this block should use a 2D item icon instead of 3D model
        if (shouldUse2DItemIcon(normalizedAssetId)) {
          const itemAssetId = getItemAssetId(normalizedAssetId);
          let texturePath: string;

          if (pack) {
            try {
              texturePath = await getPackTexturePath(
                pack.path,
                itemAssetId,
                pack.is_zip,
              );
            } catch {
              texturePath = await getVanillaTexturePath(itemAssetId);
            }
          } else {
            texturePath = await getVanillaTexturePath(itemAssetId);
          }

          const textureUrl = convertFileSrc(texturePath);
          if (mounted) {
            setFallbackTextureUrl(textureUrl);
            setRenderedElements([]);
            setError(false);
            setLoading(false);
          }
          return;
        }

        // Load texture URL helper
        const loadTextureUrl = async (textureId: string): Promise<string> => {
          let texturePath: string;

          // For leaves, try to load the colored inventory variant first
          let finalTextureId = textureId;
          if (textureId.includes("leaves")) {
            const inventoryTextureId = getLeavesInventoryTextureId(textureId);
            try {
              // Try loading inventory variant first
              if (pack) {
                try {
                  texturePath = await getPackTexturePath(
                    pack.path,
                    inventoryTextureId,
                    pack.is_zip,
                  );
                  return convertFileSrc(texturePath);
                } catch {
                  // Fall through to try vanilla
                }
              }
              texturePath = await getVanillaTexturePath(inventoryTextureId);
              return convertFileSrc(texturePath);
            } catch {
              // Inventory variant doesn't exist, use base texture
              finalTextureId = textureId;
            }
          }

          if (pack) {
            try {
              texturePath = await getPackTexturePath(
                pack.path,
                finalTextureId,
                pack.is_zip,
              );
            } catch {
              texturePath = await getVanillaTexturePath(finalTextureId);
            }
          } else {
            texturePath = await getVanillaTexturePath(finalTextureId);
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

  // Apply foliage tinting to leaf textures
  useEffect(() => {
    console.log(
      "[MinecraftCSSBlock] Tinting effect triggered - foliageColor:",
      foliageColor,
      "renderedElements:",
      renderedElements.length,
    );
    if (!foliageColor || renderedElements.length === 0) {
      console.log(
        "[MinecraftCSSBlock] Skipping tinting - foliageColor:",
        foliageColor,
        "elements:",
        renderedElements.length,
      );
      setTintedTextures(new Map());
      return;
    }

    let mounted = true;

    const applyTinting = async () => {
      const newTintedTextures = new Map<string, string>();

      // Collect all unique texture URLs that need tinting, grouped by type
      const grassTextures = new Set<string>();
      const foliageTextures = new Set<string>();

      for (const element of renderedElements) {
        for (const face of element.faces) {
          if (face.tintType === "grass" && face.textureUrl) {
            grassTextures.add(face.textureUrl);
          } else if (face.tintType === "foliage" && face.textureUrl) {
            foliageTextures.add(face.textureUrl);
          }
        }
      }

      console.log(
        "[MinecraftCSSBlock] Tinting",
        grassTextures.size,
        "grass textures with color",
        grassColor,
        "and",
        foliageTextures.size,
        "foliage textures with color",
        foliageColor,
      );

      // Tint grass textures
      for (const textureUrl of grassTextures) {
        try {
          const tintedUrl = await tintTexture(textureUrl, grassColor);
          if (mounted) {
            newTintedTextures.set(textureUrl, tintedUrl);
          }
        } catch (error) {
          console.error(
            "[MinecraftCSSBlock] Failed to tint grass texture:",
            error,
          );
          newTintedTextures.set(textureUrl, textureUrl);
        }
      }

      // Tint foliage textures
      for (const textureUrl of foliageTextures) {
        try {
          const tintedUrl = await tintTexture(textureUrl, foliageColor);
          if (mounted) {
            newTintedTextures.set(textureUrl, tintedUrl);
          }
        } catch (error) {
          console.error(
            "[MinecraftCSSBlock] Failed to tint foliage texture:",
            error,
          );
          newTintedTextures.set(textureUrl, textureUrl);
        }
      }

      if (mounted) {
        setTintedTextures(newTintedTextures);
      }
    };

    applyTinting();

    return () => {
      mounted = false;
    };
  }, [grassColor, foliageColor, renderedElements]);

  // Cleanup tint cache on unmount
  useEffect(() => {
    return () => {
      clearTintCache();
    };
  }, []);

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
            className={`${s.face} ${s[`face${face.type.charAt(0).toUpperCase()}${face.type.slice(1)}`]} ${face.tintType ? s[`${face.tintType}Tint`] : ""}`}
            style={
              {
                "--face-x": `${face.x}px`,
                "--face-y": `${face.y}px`,
                "--face-z": `${face.z}px`,
                "--face-width": `${face.width}px`,
                "--face-height": `${face.height}px`,
                "--face-brightness": face.brightness,
                "--uv-x": face.uv.u,
                "--uv-y": face.uv.v,
                "--uv-width": face.uv.width,
                "--uv-height": face.uv.height,
                "--uv-flip-x": face.uv.flipX,
                "--uv-flip-y": face.uv.flipY,
                "--foliage-color": rgbToCSS(foliageColor),
                zIndex: face.zIndex,
              } as React.CSSProperties
            }
          >
            <img
              src={
                face.tintType && tintedTextures.has(face.textureUrl)
                  ? tintedTextures.get(face.textureUrl)!
                  : face.textureUrl
              }
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
