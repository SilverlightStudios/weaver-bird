/**
 * Web Worker for Block Geometry Processing
 *
 * This worker handles the CPU-intensive task of processing Minecraft block models
 * into renderable face geometry. By running in a separate thread, it prevents
 * blocking the main UI thread during 2D→3D transitions.
 *
 * RESPONSIBILITIES:
 * - Process block model elements into face data
 * - Calculate face positions, UVs, z-index
 * - Determine tint types for colormaps
 * - Return lightweight geometry data to main thread
 */

// Import only the types and pure functions (no DOM dependencies)
import {
  processElements,
  type RenderedElement,
} from "./blockGeometry.processing";

// Types for worker communication
export interface WorkerRequest {
  id: string;
  elements: ModelElement[];
  textures: Record<string, string>;
  textureUrls: Record<string, string>; // Serialized as plain object
  scale: number;
  animationInfo?: Record<string, { frameCount: number }>; // Texture URL -> animation info
}

export interface WorkerResponse {
  id: string;
  renderedElements: RenderedElement[];
}

// Worker message handler
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, elements, textures, textureUrls, scale, animationInfo } =
    event.data;

  try {
    // Convert serialized object back to Map
    const textureUrlsMap = new Map(Object.entries(textureUrls));

    // Process elements (CPU-intensive work)
    const renderedElements = processElements(
      elements,
      textures,
      textureUrlsMap,
      scale,
      animationInfo,
    );

    // Send result back to main thread
    const response: WorkerResponse = {
      id,
      renderedElements,
    };

    self.postMessage(response);
  } catch (error) {
    console.error("[BlockGeometryWorker] Error processing elements:", error);
    // Send empty result on error
    self.postMessage({
      id,
      renderedElements: [],
    });
  }
};
