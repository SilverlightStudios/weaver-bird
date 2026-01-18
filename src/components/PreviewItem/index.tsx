/**
 * PreviewItem Component - Wrapper for item previews
 *
 * Renders items in two modes:
 * - Block items (asset ID contains "block"): Uses BlockModel with 30% scale
 * - Regular items: Uses flat 3D item mesh
 */
import { useEffect, useState, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  PerspectiveCamera,
  ContactShadows,
} from "@react-three/drei";
import * as THREE from "three";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getVanillaTexturePath, getPackTexturePath } from "@lib/tauri";
import { normalizeAssetId } from "@lib/assetUtils";
import { useSelectWinner, useSelectPack } from "@state/selectors";
import { useStore } from "@state/store";
import type { ItemDisplayMode } from "@lib/itemDisplayModes";
import { generateItemGeometryFromImageFrame } from "@lib/three/itemGeometryGenerator";
import {
  buildAnimationTimeline,
  loadAnimationMetadata,
} from "@lib/utils/animationTexture";
import BlockModel from "@components/Preview3D/BlockModel";
import GridFloor from "@components/Preview3D/GridFloor";
import s from "./styles.module.scss";

interface Props {
  assetId?: string;
  displayMode?: ItemDisplayMode;
}

interface ItemMeshProps {
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
function ItemMesh({
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
          const {width} = loadedTexture.image;
          const {height} = loadedTexture.image;
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
          const offset =
            (frameCount - 1 - initialFrame) / frameCount;
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
        // Minecraft items rotate at about 1 revolution per 4 seconds (90 degrees/sec = π/2 rad/sec)
        meshRef.current.rotation.y += delta * (Math.PI / 2);
      }

      if (hover) {
        // Bobbing animation - items float up and down slightly
        // Using a slow sine wave with small amplitude (0.05 units)
        // Period of ~3 seconds matches Minecraft's gentle bobbing
        const bobSpeed = 2; // Radians per second (full cycle in ~3.14 seconds)
        const bobAmplitude = 0.05; // Small vertical movement
        // Base position is -0.25 (lowered by 50%) plus bobbing offset
        meshRef.current.position.y =
          -0.25 + Math.sin(state.clock.elapsedTime * bobSpeed) * bobAmplitude;
      } else {
        // Reset position when hover is disabled - lowered by 50%
        meshRef.current.position.y = -0.25;
      }
    }

    const animation = animationRef.current;
    if (animation && texture) {
      const {frameCount} = animation;
      const shouldAnimate = animateTextures && frameCount > 1;

      let nextFrame = activeFrameRef.current;

      if (shouldAnimate && animation.frames.length > 0) {
        const now = performance.now();
        const frameTimeMs =
          animation.frameTimesMs[animation.sequenceIndex] ?? 50;
        if (now - animation.lastUpdateTime >= frameTimeMs) {
          animation.sequenceIndex =
            (animation.sequenceIndex + 1) % animation.frames.length;
          animation.lastUpdateTime = now;
        }
        nextFrame =
          animation.frames[animation.sequenceIndex] ?? animation.frames[0] ?? 0;
      } else {
        nextFrame =
          selectedFrame >= 0
            ? Math.min(selectedFrame, frameCount - 1)
            : 0;
        if (animation.frames.length > 0) {
          const targetIndex = animation.frames.indexOf(nextFrame);
          if (targetIndex >= 0) {
            animation.sequenceIndex = targetIndex;
          } else {
            animation.sequenceIndex = 0;
          }
        }
      }

      if (nextFrame !== activeFrameRef.current) {
        activeFrameRef.current = nextFrame;
        const offset = (frameCount - 1 - nextFrame) / frameCount;
        texture.offset.set(0, offset);
        texture.needsUpdate = true;

        const nextGeometry = geometriesRef.current[nextFrame];
        if (nextGeometry && meshRef.current) {
          meshRef.current.geometry = nextGeometry;
          setGeometry(nextGeometry);
        }
      }
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

/**
 * BlockItemModel - Renders a block at 30% scale with animations
 */
interface BlockItemModelProps {
  assetId: string;
  rotate: boolean;
  hover: boolean;
}

function BlockItemModel({ assetId, rotate, hover }: BlockItemModelProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Rotation and bobbing animation for dropped block items
  useFrame((state, delta) => {
    if (groupRef.current) {
      if (rotate) {
        // Minecraft items rotate at about 1 revolution per 4 seconds
        groupRef.current.rotation.y += delta * (Math.PI / 2);
      }

      if (hover) {
        // Bobbing animation
        const bobSpeed = 2;
        const bobAmplitude = 0.05;
        // Base position is -0.25 (lowered by 50%) plus bobbing offset
        groupRef.current.position.y =
          -0.25 + Math.sin(state.clock.elapsedTime * bobSpeed) * bobAmplitude;
      } else {
        // Reset position when hover is disabled - lowered by 50%
        groupRef.current.position.y = -0.25;
      }
    }
  });

  return (
    <group ref={groupRef} scale={0.3}>
      <BlockModel assetId={assetId} />
    </group>
  );
}

export default function PreviewItem({
  assetId,
  displayMode = "ground",
}: Props) {
  const [texturePath, setTexturePath] = useState<string | null>(null);
  const [error, setError] = useState(false);

  // Read rotation, hover, and grid settings from global state
  const rotate = useStore((state) => state.canvasItemRotate);
  const hover = useStore((state) => state.canvasItemHover);
  const showGrid = useStore((state) => state.canvasItemShowGrid);
  const animateTextures = useStore((state) => state.canvasItemAnimate);
  const selectedFrame = useStore((state) => state.canvasItemAnimationFrame);
  const setAnimationFrameCount = useStore(
    (state) => state.setCanvasItemAnimationFrameCount,
  );
  const setAnimationFrame = useStore(
    (state) => state.setCanvasItemAnimationFrame,
  );

  // Get the winning pack for this asset
  const winnerPackId = useSelectWinner(assetId || "");
  const winnerPack = useSelectPack(winnerPackId || "");

  // Determine if this is a block item (contains "block" in asset ID)
  const isBlockItem = assetId ? assetId.includes("block") : false;

  useEffect(() => {
    if (!assetId || isBlockItem) {
      setAnimationFrameCount(0);
    }
  }, [assetId, isBlockItem, setAnimationFrameCount]);

  useEffect(() => {
    if (!assetId || isBlockItem) {
      // Don't load texture for block items - they use BlockModel
      setTexturePath(null);
      return;
    }

    let mounted = true;

    const loadTexture = async () => {
      try {
        const normalizedAssetId = normalizeAssetId(assetId);
        let path: string;

        // Try to load from winning pack first, fall back to vanilla
        if (winnerPackId && winnerPack) {
          try {
            path = await getPackTexturePath(
              winnerPack.path,
              normalizedAssetId,
              winnerPack.is_zip,
            );
          } catch {
            console.warn(
              `[PreviewItem] Pack texture not found for ${normalizedAssetId}, using vanilla`,
            );
            path = await getVanillaTexturePath(normalizedAssetId);
          }
        } else {
          path = await getVanillaTexturePath(normalizedAssetId);
        }

        if (mounted) {
          const assetUrl = convertFileSrc(path);
          setTexturePath(assetUrl);
          setError(false);
        }
      } catch (err) {
        console.error("[PreviewItem] Failed to load texture:", err);
        if (mounted) {
          setError(true);
        }
      }
    };

    loadTexture();

    return () => {
      mounted = false;
    };
  }, [assetId, winnerPackId, winnerPack, isBlockItem]);

  if (!assetId) {
    return (
      <div className={s.root}>
        <div className={s.placeholder}>Select an item to preview</div>
      </div>
    );
  }

  if (!isBlockItem && error) {
    return (
      <div className={s.root}>
        <div className={s.error}>Failed to load item texture</div>
      </div>
    );
  }

  if (!isBlockItem && !texturePath) {
    return (
      <div className={s.root}>
        <div className={s.loading}>Loading item...</div>
      </div>
    );
  }

  return (
    <div className={s.root}>
      <Canvas
        shadows
        onCreated={({ gl, scene }) => {
          console.log("[PreviewItem] Canvas created successfully");
          // Disable tone mapping for accurate Minecraft colors
          gl.toneMapping = THREE.NoToneMapping;
          // Set background to light gray/white - same as Preview3D
          scene.background = new THREE.Color(0xf0f0f0);
        }}
        gl={{
          antialias: false, // Keep it pixelated
          alpha: true,
          toneMapping: THREE.NoToneMapping,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        resize={{ scroll: false, debounce: { scroll: 0, resize: 0 } }}
      >
        <PerspectiveCamera
          makeDefault
          position={[2, 1.5, 2]}
          fov={50}
          near={0.01}
          far={100}
        />

        <OrbitControls
          enablePan={false}
          minDistance={0.75}
          maxDistance={10}
          target={[0, 0, 0]}
        />

        {/* Minecraft-style lighting - same as Preview3D */}
        <ambientLight intensity={1.0} />
        <directionalLight position={[3, 10, 5]} intensity={2.0} />
        <directionalLight position={[-5, 5, -5]} intensity={0.4} />
        <pointLight position={[0, -5, 0]} intensity={0.5} color="#ffffff" />

        {/* Render block items with BlockModel, regular items with ItemMesh */}
        {isBlockItem ? (
          <BlockItemModel assetId={assetId} rotate={rotate} hover={hover} />
        ) : texturePath ? (
          <ItemMesh
            texturePath={texturePath}
            rotate={rotate}
            hover={hover}
            displayMode={displayMode}
            animateTextures={animateTextures}
            selectedFrame={selectedFrame}
            onFrameCountChange={setAnimationFrameCount}
            onFrameSelect={setAnimationFrame}
          />
        ) : null}

        {/* Grid floor with dashed lines - at ground level where shadow is cast */}
        {showGrid && (
          <GridFloor
            position={[0.5, -0.5, 0.5]}
            size={20}
            gridSize={1}
            lineWidth={0.02}
            dashLength={0.1}
            gapLength={0.1}
            lineColor="#666666"
            fadeStart={2}
            fadeEnd={8}
          />
        )}

        {/* Soft contact shadow - positioned below item with subtle blur */}
        {/* frames={Infinity} ensures shadow updates continuously, preventing load order issues */}
        <ContactShadows
          position={[0, -0.5, 0]}
          opacity={0.5}
          scale={2.5}
          blur={2.0}
          far={1.0}
          resolution={512}
          frames={Infinity}
          color="#000000"
        />
      </Canvas>

      <div className={s.info}>
        <span className={s.infoText}>
          {rotate && hover && displayMode === "ground"
            ? "Rotating • Hovering • Drag to orbit • Scroll to zoom"
            : rotate && displayMode === "ground"
              ? "Rotating • Drag to orbit • Scroll to zoom"
              : hover && displayMode === "ground"
                ? "Hovering • Drag to orbit • Scroll to zoom"
                : "Drag to orbit • Scroll to zoom"}
        </span>
      </div>
    </div>
  );
}
