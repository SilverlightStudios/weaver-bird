/**
 * Block geometry processing functions
 */

import type { ModelElement } from "@lib/tauri/blockModels";
import {
  resolveTextureRef,
  normalizeUV,
  resolveFaceUV,
  calculateFaceOffsets,
  getColormapType,
  generateFaceTransform,
  shouldRenderFace,
  type NormalizedUV,
} from "./blockGeometry.utils";

export interface RenderedFace {
  type: "top" | "left" | "right";
  textureUrl: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  uv: NormalizedUV;
  zIndex: number;
  brightness: number;
  tintType?: "grass" | "foliage";
  transform: string;
}

export interface RenderedElement {
  faces: RenderedFace[];
}

type FaceConfig = {
  faceKey: "up" | "down" | "south" | "north" | "east" | "west";
  type: "top" | "left" | "right";
  offset: { x: number; y: number; z: number };
  zIndex: number;
  brightness: number;
  negateY?: boolean;
};

function processCubeFace(
  faceConfig: FaceConfig,
  element: ModelElement,
  textures: Record<string, string>,
  textureUrls: Map<string, string>,
  scale: number,
  animationInfo?: Record<string, { frameCount: number }>,
): RenderedFace | null {
  const { faceKey, type, offset, zIndex, brightness, negateY } = faceConfig;
  const face = element.faces[faceKey];

  if (!face || !shouldRenderFace(faceKey)) return null;

  const textureId = resolveTextureRef(face.texture, textures);
  const textureUrl = textureId ? textureUrls.get(textureId) : null;

  if (!textureUrl) return null;

  const shouldTint = face.tintindex !== undefined && face.tintindex !== null;
  const tintType = shouldTint && textureId ? getColormapType(textureId) : undefined;
  const frameCount = animationInfo?.[textureUrl]?.frameCount ?? 1;
  const UNIT = 16;

  const y = negateY ? -offset.y : offset.y;

  return {
    type,
    textureUrl,
    x: offset.x,
    y,
    z: offset.z,
    width: UNIT * scale,
    height: UNIT * scale,
    uv: normalizeUV(resolveFaceUV(faceKey, face, element.from, element.to), frameCount),
    zIndex,
    brightness,
    tintType,
    transform: generateFaceTransform(type, offset.x, y, offset.z),
  };
}

/**
 * Fast path for processing simple full cubes (16x16x16 blocks with no rotation)
 */
export function processSimpleCube(
  element: ModelElement,
  textures: Record<string, string>,
  textureUrls: Map<string, string>,
  scale: number,
  animationInfo?: Record<string, { frameCount: number }>,
): RenderedElement[] {
  const faces: RenderedFace[] = [];

  const faceConfigs: FaceConfig[] = [
    { faceKey: "up", type: "top", offset: { x: 0, y: -8 * scale, z: 0 }, zIndex: 180, brightness: 1.0 },
    { faceKey: "down", type: "top", offset: { x: 0, y: 8 * scale, z: 0 }, zIndex: -20, brightness: 0.5, negateY: true },
    { faceKey: "south", type: "left", offset: { x: 0, y: 0, z: 8 * scale }, zIndex: 80, brightness: 0.8 },
    { faceKey: "north", type: "left", offset: { x: 0, y: 0, z: -8 * scale }, zIndex: 70, brightness: 0.8 },
    { faceKey: "east", type: "right", offset: { x: 8 * scale, y: 0, z: 0 }, zIndex: 81, brightness: 0.6 },
    { faceKey: "west", type: "right", offset: { x: -8 * scale, y: 0, z: 0 }, zIndex: 71, brightness: 0.6 },
  ];

  for (const config of faceConfigs) {
    const face = processCubeFace(config, element, textures, textureUrls, scale, animationInfo);
    if (face) faces.push(face);
  }

  return [{ faces }];
}

/**
 * Processes block model elements into renderable face data
 */
export function processElements(
  elements: ModelElement[],
  textures: Record<string, string>,
  textureUrls: Map<string, string>,
  scale: number,
  animationInfo?: Record<string, { frameCount: number }>,
): RenderedElement[] {
  const renderedElements: RenderedElement[] = [];
  const blockCenter = { x: 8, y: 8, z: 8 };

  // Fast path for simple single-element blocks without rotation
  if (elements.length === 1) {
    const element = elements[0];
    const hasRotation = element.rotation && element.rotation.angle !== 0;

    if (!hasRotation) {
      const [x1, y1, z1] = element.from;
      const [x2, y2, z2] = element.to;
      const isFullCube =
        x1 === 0 && y1 === 0 && z1 === 0 && x2 === 16 && y2 === 16 && z2 === 16;

      if (isFullCube) {
        return processSimpleCube(element, textures, textureUrls, scale, animationInfo);
      }
    }
  }

  // Standard processing path for complex models
  for (const element of elements) {
    const faces: RenderedFace[] = [];
    const [x1, y1, z1] = element.from;
    const [x2, y2, z2] = element.to;

    const hasRotation = element.rotation && element.rotation.angle !== 0;

    const width = x2 - x1;
    const height = y2 - y1;
    const depth = z2 - z1;

    let offsets = calculateFaceOffsets(element, scale, blockCenter);

    if (hasRotation) {
      offsets = {
        top: { x: 0, y: offsets.top.y, z: 0 },
        left: { x: 0, y: offsets.left.y, z: 0 },
        right: { x: 0, y: offsets.right.y, z: 0 },
      };
    }

    const centerX = (x1 + x2) / 2 - blockCenter.x;
    const centerY = (y1 + y2) / 2 - blockCenter.y;
    const centerZ = (z1 + z2) / 2 - blockCenter.z;

    // Process all faces using configuration-driven approach
    const processComplexFace = (
      faceKey: "up" | "down" | "south" | "north" | "east" | "west",
      config: {
        type: "top" | "left" | "right";
        getOffset: () => { x: number; y: number; z: number };
        getWidth: () => number;
        getHeight: () => number;
        zIndexOffset: number;
        brightness: number;
      },
    ) => {
      const face = element.faces[faceKey];
      if (!face || !shouldRenderFace(faceKey)) return;

      const textureId = resolveTextureRef(face.texture, textures);
      const textureUrl = textureId ? textureUrls.get(textureId) : null;
      if (!textureUrl) return;

      const shouldTint = face.tintindex !== undefined && face.tintindex !== null;
      const tintType = shouldTint && textureId ? getColormapType(textureId) : undefined;
      const offset = config.getOffset();

      faces.push({
        type: config.type,
        textureUrl,
        x: offset.x,
        y: offset.y,
        z: offset.z,
        width: config.getWidth(),
        height: config.getHeight(),
        uv: normalizeUV(
          resolveFaceUV(faceKey, face, element.from, element.to),
          animationInfo?.[textureUrl]?.frameCount ?? 1,
        ),
        zIndex: Math.round(centerY * 10 + config.zIndexOffset),
        brightness: config.brightness,
        tintType,
        transform: generateFaceTransform(config.type, offset.x, offset.y, offset.z),
      });
    };

    processComplexFace("up", {
      type: "top",
      getOffset: () => offsets.top,
      getWidth: () => width * scale,
      getHeight: () => depth * scale,
      zIndexOffset: 100,
      brightness: 1.0,
    });

    processComplexFace("south", {
      type: "left",
      getOffset: () => offsets.left,
      getWidth: () => width * scale,
      getHeight: () => height * scale,
      zIndexOffset: 50,
      brightness: 0.8,
    });

    processComplexFace("north", {
      type: "left",
      getOffset: () => ({
        x: centerX * scale,
        y: offsets.left.y,
        z: (centerZ - depth / 2) * scale,
      }),
      getWidth: () => width * scale,
      getHeight: () => height * scale,
      zIndexOffset: 40,
      brightness: 0.8,
    });

    processComplexFace("east", {
      type: "right",
      getOffset: () => offsets.right,
      getWidth: () => depth * scale,
      getHeight: () => height * scale,
      zIndexOffset: 0,
      brightness: 0.6,
    });

    processComplexFace("west", {
      type: "right",
      getOffset: () => ({
        x: (centerX - width / 2) * scale,
        y: offsets.right.y,
        z: centerZ * scale,
      }),
      getWidth: () => depth * scale,
      getHeight: () => height * scale,
      zIndexOffset: -10,
      brightness: 0.6,
    });

    processComplexFace("down", {
      type: "top",
      getOffset: () => {
        const bottomY = (centerY - height / 2) * scale;
        return {
          x: centerX * scale,
          y: -bottomY,
          z: centerZ * scale,
        };
      },
      getWidth: () => width * scale,
      getHeight: () => depth * scale,
      zIndexOffset: -100 - (height / 2) * 10,
      brightness: 0.5,
    });

    if (faces.length > 0) {
      renderedElements.push({ faces });
    }
  }

  return renderedElements;
}
