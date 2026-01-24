import { useEffect, useState, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ItemDisplayMode } from "@lib/itemDisplayModes";
import { generateItemGeometryFromImageFrame } from "@lib/three/itemGeometryGenerator";
import {
  buildAnimationTimeline,
  loadAnimationMetadata,
} from "@lib/utils/animationTexture";

interface AnimationState {
  frameCount: number;
  frames: number[];
  frameTimesMs: number[];
  sequenceIndex: number;
  lastUpdateTime: number;
}

// Helper functions for useFrame animation logic
function applyRotation(mesh: THREE.Mesh, delta: number) {
  // Minecraft items rotate at about 1 revolution per 4 seconds (90 degrees/sec = π/2 rad/sec)
  mesh.rotation.y += delta * (Math.PI / 2);
}

function applyBobbing(mesh: THREE.Mesh, elapsedTime: number) {
  // Bobbing animation - items float up and down slightly
  const bobSpeed = 2; // Radians per second (full cycle in ~3.14 seconds)
  const bobAmplitude = 0.05; // Small vertical movement
  // Base position is -0.25 (lowered by 50%) plus bobbing offset
  mesh.position.y = -0.25 + Math.sin(elapsedTime * bobSpeed) * bobAmplitude;
}

function computeNextFrame(
  animation: AnimationState,
  animateTextures: boolean,
  selectedFrame: number
): number {
  const { frameCount, frames } = animation;
  const shouldAnimate = animateTextures && frameCount > 1;

  if (shouldAnimate && frames.length > 0) {
    const now = performance.now();
    const frameTimeMs = animation.frameTimesMs[animation.sequenceIndex] ?? 50;
    if (now - animation.lastUpdateTime >= frameTimeMs) {
      animation.sequenceIndex = (animation.sequenceIndex + 1) % frames.length;
      animation.lastUpdateTime = now;
    }
    return frames[animation.sequenceIndex] ?? frames[0] ?? 0;
  }

  const nextFrame = selectedFrame >= 0 ? Math.min(selectedFrame, frameCount - 1) : 0;
  if (frames.length > 0) {
    const targetIndex = frames.indexOf(nextFrame);
    animation.sequenceIndex = targetIndex >= 0 ? targetIndex : 0;
  }
  return nextFrame;
}

function updateTextureAndGeometry(
  nextFrame: number,
  activeFrameRef: React.MutableRefObject<number>,
  currentTexture: THREE.Texture,
  geometriesRef: React.MutableRefObject<THREE.BufferGeometry[]>,
  meshRef: React.MutableRefObject<THREE.Mesh | null>,
  setGeometry: (g: THREE.BufferGeometry) => void,
  frameCount: number
) {
  if (nextFrame === activeFrameRef.current) return;

  activeFrameRef.current = nextFrame;
  const offset = (frameCount - 1 - nextFrame) / frameCount;
  currentTexture.offset.set(0, offset);
  currentTexture.needsUpdate = true;

  const nextGeometry = geometriesRef.current[nextFrame];
  if (nextGeometry && meshRef.current) {
    meshRef.current.geometry = nextGeometry;
    setGeometry(nextGeometry);
  }
}

export interface ItemMeshProps {
  texturePath: string;
  rotate: boolean;
  hover: boolean;
  displayMode: ItemDisplayMode;
  animateTextures: boolean;
  selectedFrame: number;
  onFrameCountChange: (count: number) => void;
  onFrameSelect: (frame: number) => void;
}

/**
 * ItemMesh - Renders a 3D item with the texture applied
 * Emulates Minecraft's dropped item rendering with proper thickness effect
 */
export function ItemMesh({
  texturePath,
  rotate,
  hover,
  displayMode,
  animateTextures,
  selectedFrame,
  onFrameCountChange,
  onFrameSelect,
}: ItemMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const geometriesRef = useRef<THREE.BufferGeometry[]>([]);
  const activeFrameRef = useRef(0);
  const textureRef = useRef<THREE.Texture | null>(null);
  const selectedFrameRef = useRef(selectedFrame);
  const animationRef = useRef<{
    frameCount: number;
    frames: number[];
    frameTimesMs: number[];
    sequenceIndex: number;
    lastUpdateTime: number;
  } | null>(null);
  const loadIdRef = useRef(0);

  useEffect(() => {
    selectedFrameRef.current = selectedFrame;
  }, [selectedFrame]);

  useEffect(() => {
    const loader = new THREE.TextureLoader();

    animationRef.current = null;
    loadIdRef.current += 1;
    const loadId = loadIdRef.current;

    geometriesRef.current.forEach((entry) => entry.dispose());
    geometriesRef.current = [];

    loader.load(
      texturePath,
      (loadedTexture) => {
        // Configure texture for pixelated Minecraft look
        loadedTexture.magFilter = THREE.NearestFilter;
        loadedTexture.minFilter = THREE.NearestFilter;
        loadedTexture.colorSpace = THREE.SRGBColorSpace;
        loadedTexture.wrapS = THREE.ClampToEdgeWrapping;
        loadedTexture.wrapT = THREE.ClampToEdgeWrapping;

        let frameCount = 1;
        let frameSize = 0;

        if (loadedTexture.image) {
          const { width } = loadedTexture.image;
          const { height } = loadedTexture.image;
          const isAnimated = height > width && height % width === 0;

          frameCount = isAnimated ? height / width : 1;
          frameSize = isAnimated ? width : height;

          if (isAnimated) {
            loadedTexture.repeat.set(1, 1 / frameCount);
            loadedTexture.offset.set(0, (frameCount - 1) / frameCount);
          } else {
            loadedTexture.repeat.set(1, 1);
            loadedTexture.offset.set(0, 0);
          }
          loadedTexture.needsUpdate = true;

          const defaultTimeline = buildAnimationTimeline(frameCount, null);
          animationRef.current = {
            frameCount,
            frames: defaultTimeline.frames,
            frameTimesMs: defaultTimeline.frameTimesMs,
            sequenceIndex: 0,
            lastUpdateTime: performance.now(),
          };
        }

        onFrameCountChange(frameCount);

        if (frameCount > 0 && selectedFrameRef.current >= frameCount) {
          onFrameSelect(frameCount - 1);
        }

        textureRef.current = loadedTexture;
        setTexture(loadedTexture);

        if (loadedTexture.image) {
          try {
            const frameGeometries = Array.from(
              { length: frameCount },
              (_, frameIndex) =>
                generateItemGeometryFromImageFrame(
                  loadedTexture.image,
                  frameIndex,
                  0.0625,
                ),
            );
            geometriesRef.current = frameGeometries;
            const initialFrame =
              selectedFrameRef.current >= 0
                ? Math.min(selectedFrameRef.current, frameCount - 1)
                : 0;
            activeFrameRef.current = initialFrame;
            setGeometry(frameGeometries[initialFrame]);

            console.log(
              `[PreviewItem] Loaded texture: ${loadedTexture.image.width}x${loadedTexture.image.height}`,
            );
            console.log(
              `[PreviewItem] Generated geometry with ${frameGeometries[initialFrame].attributes.position.count} vertices`,
            );
          } catch (error) {
            console.error("[PreviewItem] Failed to generate geometry:", error);
            const fallbackGeometry = new THREE.BoxGeometry(1, 1, 0.0625);
            geometriesRef.current = [fallbackGeometry];
            activeFrameRef.current = 0;
            setGeometry(fallbackGeometry);
          }
        } else {
          const fallbackGeometry = new THREE.BoxGeometry(1, 1, 0.0625);
          geometriesRef.current = [fallbackGeometry];
          activeFrameRef.current = 0;
          setGeometry(fallbackGeometry);
        }

        if (frameCount > 1 && frameSize > 0) {
          const initialFrame =
            selectedFrameRef.current >= 0
              ? Math.min(selectedFrameRef.current, frameCount - 1)
              : 0;
          const offset = (frameCount - 1 - initialFrame) / frameCount;
          loadedTexture.offset.set(0, offset);
          loadedTexture.needsUpdate = true;
        }

        if (frameCount > 1) {
          void (async () => {
            const metadata = await loadAnimationMetadata(texturePath);
            if (loadIdRef.current !== loadId) return;
            const timeline = buildAnimationTimeline(frameCount, metadata);
            const initialSequenceIndex = Math.max(
              0,
              timeline.frames.indexOf(
                selectedFrameRef.current >= 0
                  ? Math.min(selectedFrameRef.current, frameCount - 1)
                  : timeline.frames[0] ?? 0,
              ),
            );
            animationRef.current = {
              frameCount,
              frames: timeline.frames,
              frameTimesMs: timeline.frameTimesMs,
              sequenceIndex: initialSequenceIndex,
              lastUpdateTime: performance.now(),
            };
          })();
        }
      },
      undefined,
      (error) => {
        console.error("[PreviewItem] Failed to load texture:", error);
      },
    );

    return () => {
      textureRef.current?.dispose();
      textureRef.current = null;
      geometriesRef.current.forEach((entry) => entry.dispose());
      geometriesRef.current = [];
    };
  }, [texturePath, onFrameCountChange, onFrameSelect]);

  // Rotation and bobbing animation for dropped items
  useFrame((state, delta) => {
    if (meshRef.current && displayMode === "ground") {
      if (rotate) {
        applyRotation(meshRef.current, delta);
      }

      if (hover) {
        applyBobbing(meshRef.current, state.clock.elapsedTime);
      } else {
        // Reset position when hover is disabled - lowered by 50%
        meshRef.current.position.y = -0.25;
      }
    }

    const animation = animationRef.current;
    const currentTexture = textureRef.current;
    if (animation && currentTexture) {
      const nextFrame = computeNextFrame(animation, animateTextures, selectedFrame);
      updateTextureAndGeometry(
        nextFrame,
        activeFrameRef,
        currentTexture,
        geometriesRef,
        meshRef,
        setGeometry,
        animation.frameCount
      );
    }
  });

  if (!texture || !geometry) {
    return null;
  }

  // Calculate rotation and position based on display mode
  const getTransform = () => {
    switch (displayMode) {
      case "ground":
      case "ground_fixed":
        // Dropped items are vertical (no tilt) like in Minecraft
        return {
          rotation: [0, 0, 0] as [number, number, number],
          position: [0, 0, 0] as [number, number, number],
        };
      case "gui":
        return {
          rotation: [0, 0, 0] as [number, number, number],
          position: [0, 0, 0] as [number, number, number],
        };
      default:
        return {
          rotation: [0, 0, 0] as [number, number, number],
          position: [0, 0, 0] as [number, number, number],
        };
    }
  };

  const transform = getTransform();

  // Render with custom geometry that follows the texture shape
  // Front/back faces show full texture, edges show 1-pixel texture slices
  return (
    <mesh
      ref={meshRef as React.RefObject<THREE.Mesh>}
      rotation={transform.rotation}
      position={transform.position}
      geometry={geometry}
    >
      <meshStandardMaterial
        map={texture}
        transparent
        alphaTest={0.01}
        side={THREE.DoubleSide}
        flatShading={false}
      />
    </mesh>
  );
}
