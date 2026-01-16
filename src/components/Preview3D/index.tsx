import { useEffect, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  PerspectiveCamera,
  ContactShadows,
} from "@react-three/drei";
import * as THREE from "three";
import { useStore } from "@state/store";
import BlockModel from "./BlockModel";
import EntityModel, { isEntityAsset } from "./EntityModel";
import GridFloor from "./GridFloor";
import { ParticleWrapper } from "./ParticleWrapper";
import {
  isBiomeColormapAsset,
  isPottedPlant,
  getVariantGroupKey,
  groupAssetsByVariant,
} from "@lib/assetUtils";
import { resolveBlockEntityRenderSpec } from "@lib/blockEntityResolver";
import { getMultiBlockParts, type MultiBlockPart } from "@lib/multiBlockConfig";
import { updateAnimatedTextures } from "@lib/three/textureLoader";
import { resolveMinecartCompositeSpec } from "@lib/minecartComposite";
import s from "./styles.module.scss";

/**
 * Component that updates animated textures every frame
 */
function AnimationUpdater() {
  useFrame(() => {
    updateAnimatedTextures(performance.now());
  });
  return null;
}

interface Props {
  assetId?: string;
  sourceAssetId?: string;
  biomeColor?: { r: number; g: number; b: number } | null;
  onTintDetected?: (info: {
    hasTint: boolean;
    tintType?: "grass" | "foliage";
  }) => void;
  showPot: boolean;
  blockProps?: Record<string, string>;
  particleConditionOverrides?: Record<string, string>;
  seed?: number;
  allAssetIds?: string[];
}

export default function Preview3D({
  assetId,
  sourceAssetId,
  biomeColor,
  onTintDetected,
  showPot,
  blockProps = {},
  particleConditionOverrides = {},
  seed = 0,
  allAssetIds = [],
}: Props) {
  // Read grid visibility from global state
  const showGrid = useStore((state) => state.canvas3DShowGrid);
  const showBlockParticles = useStore((state) => state.showBlockParticles);

  const [tintInfo, setTintInfo] = useState<{
    hasTint: boolean;
    tintType?: "grass" | "foliage";
  }>({ hasTint: false });
  const isPlantPotted = assetId ? isPottedPlant(assetId) : false;
  const isColormapAsset = assetId ? isBiomeColormapAsset(assetId) : false;

  // Calculate redstone wire color based on power level
  // Overrides biomeColor when this is a redstone wire block
  const effectiveBiomeColor = useMemo(() => {
    if (!assetId) return biomeColor;

    // Check if this is redstone wire by looking for redstone_dust in the asset ID
    const isRedstoneWire =
      assetId.includes("redstone_dust") || assetId.includes("redstone_wire");

    if (isRedstoneWire) {
      // Extract power level from blockProps (defaults to 15 if not set)
      const powerStr = blockProps.power ?? "15";
      const power = parseInt(powerStr, 10);

      if (!isNaN(power) && power >= 0 && power <= 15) {
        // Apply the exact Minecraft redstone color formula
        // From RedStoneWireBlock.java (Minecraft 1.21.11)
        const powerRatio = power / 15.0;
        const r = powerRatio * 0.6 + (powerRatio > 0.0 ? 0.4 : 0.3);
        const g = Math.max(0.0, Math.min(1.0, powerRatio * powerRatio * 0.7 - 0.5));
        const b = Math.max(0.0, Math.min(1.0, powerRatio * powerRatio * 0.6 - 0.7));

        // Convert to RGB (0-255) format expected by BlockModel
        const rgb = {
          r: Math.round(r * 255),
          g: Math.round(g * 255),
          b: Math.round(b * 255),
        };
        console.log(`[Preview3D] Redstone wire power=${power}, color=RGB(${rgb.r}, ${rgb.g}, ${rgb.b})`);
        return rgb;
      }
    }

    // For non-redstone blocks, use the provided biomeColor
    return biomeColor;
  }, [assetId, biomeColor, blockProps.power]);

  // Check if this asset can be potted (a potted version exists in the same variant group)
  const canBePotted = useMemo(() => {
    if (!assetId || isPlantPotted || allAssetIds.length === 0) return false;

    // Find the variant group for this asset
    const groupKey = getVariantGroupKey(assetId);
    const groups = groupAssetsByVariant(allAssetIds);
    const group = groups.find((g) => g.baseId === groupKey);

    if (!group) return false;

    // Check if any variant in the group is a potted version
    return group.variantIds.some((id) => isPottedPlant(id));
  }, [assetId, isPlantPotted, allAssetIds]);

  // Colormap assets are now handled in the dedicated "Biome & Colormaps" tab
  // If someone tries to preview them here, just show nothing
  const previewAssetId = assetId && !isColormapAsset ? assetId : undefined;
  const minecartCompositeSpec = useMemo(
    () =>
      resolveMinecartCompositeSpec(
        sourceAssetId ?? previewAssetId,
        allAssetIds,
      ),
    [sourceAssetId, previewAssetId, allAssetIds],
  );
  const multiBlockParts: MultiBlockPart[] | null = previewAssetId
    ? getMultiBlockParts(previewAssetId, blockProps)
    : null;
  const blockEntitySpec = useMemo(
    () =>
      previewAssetId
        ? resolveBlockEntityRenderSpec(previewAssetId, allAssetIds)
        : null,
    [previewAssetId, allAssetIds],
  );
  const directEntityAssetId =
    previewAssetId && isEntityAsset(previewAssetId) ? previewAssetId : undefined;
  const entityAssetId = blockEntitySpec?.assetId ?? directEntityAssetId;
  const isMinecartEntity =
    entityAssetId?.replace(/^minecraft:/, "").startsWith("entity/minecart") ??
    false;
  const particleStateProps = useMemo(
    () => ({ ...blockProps, ...particleConditionOverrides }),
    [blockProps, particleConditionOverrides],
  );

  // Determine if block should have contact shadows
  // Transparent/flat blocks like redstone wire, glass, etc. shouldn't cast shadows
  const shouldHaveShadow = useMemo(() => {
    if (!previewAssetId) return true;

    const normalizedId = previewAssetId.toLowerCase();

    // Pattern-based checks for block families (avoids listing every color variant)
    if (normalizedId.includes('glass')) return false; // glass, stained_glass, glass_pane
    if (normalizedId.includes('redstone_wire') || normalizedId.includes('redstone_dust')) return false;
    if (normalizedId.includes('torch')) return false; // torch, wall_torch, soul_torch, redstone_torch

    // Explicit flat/transparent blocks
    const noShadowBlocks = [
      'tripwire', 'string', 'scaffolding', 'ladder',
      'vine', 'glow_lichen', 'sculk_vein',
    ];

    return !noShadowBlocks.some((block) => normalizedId.includes(block));
  }, [previewAssetId]);

  useEffect(() => {
    console.log(
      `[Preview3D.useEffect] asset=${assetId} effectiveBiomeColor=${effectiveBiomeColor ? "set" : "none"}`,
    );
  }, [assetId, effectiveBiomeColor]);

  // Forward tint detection to parent if callback provided
  useEffect(() => {
    if (onTintDetected) {
      onTintDetected(tintInfo);
    }
  }, [tintInfo, onTintDetected]);

  useEffect(() => {
    if (isColormapAsset) {
      setTintInfo({ hasTint: false, tintType: undefined });
    }
  }, [isColormapAsset, assetId]);

  const handleTintDetected = (info: {
    hasTint: boolean;
    tintType?: "grass" | "foliage";
  }) => {
    if (isColormapAsset) {
      setTintInfo({ hasTint: false, tintType: undefined });
      return;
    }
    setTintInfo(info);
  };

  return (
    <div className={s.root}>
      <div className={s.canvas}>
        {/* Always keep Canvas mounted to prevent context loss - NO Suspense wrapper here! */}
        <Canvas
          onCreated={({ gl, scene }) => {
            // Disable tone mapping for accurate Minecraft colors
            gl.toneMapping = THREE.NoToneMapping;
            // Set background to light gray/white
            scene.background = new THREE.Color(0xf0f0f0);
          }}
          onError={(error) => console.error("[Preview3D] Canvas error:", error)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
          }}
          gl={{
            toneMapping: THREE.NoToneMapping,
            outputColorSpace: THREE.SRGBColorSpace,
          }}
          resize={{ scroll: false, debounce: { scroll: 0, resize: 0 } }}
        >
          <PerspectiveCamera makeDefault position={[2, 2, 2]} fov={50} />
          <OrbitControls
            enablePan={false}
            minDistance={0.75}
            maxDistance={10}
            target={[0, 0, 0]}
          />

          {/* Update animated textures every frame */}
          <AnimationUpdater />

          {/* Minecraft-style lighting - ambient + directional for face differentiation */}
          <ambientLight intensity={1.0} />
          <directionalLight position={[3, 10, 5]} intensity={2.0} />
          <directionalLight position={[-5, 5, -5]} intensity={0.4} />
          <pointLight position={[0, -5, 0]} intensity={0.5} color="#ffffff" />

          {/* Model rendering - use EntityModel for entities, BlockModel for blocks */}
          {previewAssetId &&
            (entityAssetId ? (
              isMinecartEntity ? (
                <>
                  <EntityModel
                    assetId={entityAssetId}
                    entityTypeOverride={minecartCompositeSpec?.entityTypeOverride}
                    parentEntityOverride={blockEntitySpec?.parentEntityOverride}
                  />
                  {minecartCompositeSpec?.cargo && (
                    <group position={[0, 0.1, 0]} scale={[0.75, 0.75, 0.75]}>
                      {minecartCompositeSpec.cargo.kind === "entity" ? (
                        <EntityModel
                          assetId={minecartCompositeSpec.cargo.assetId}
                          entityTypeOverride={
                            minecartCompositeSpec.cargo.entityTypeOverride
                          }
                          parentEntityOverride={
                            minecartCompositeSpec.cargo.parentEntityOverride
                          }
                        />
                      ) : (
                        <BlockModel
                          assetId={minecartCompositeSpec.cargo.assetId}
                          biomeColor={effectiveBiomeColor}
                          showPot={false}
                          isPotted={false}
                          blockProps={minecartCompositeSpec.cargo.blockProps ?? {}}
                          seed={seed}
                        />
                      )}
                    </group>
                  )}
                </>
              ) : blockEntitySpec?.renderBoth ? (
                // Composite rendering: both block model AND entity model (e.g., bells)
                // Block model renders the frame/structure, entity model renders the dynamic part
                <>
                  <BlockModel
                    assetId={previewAssetId}
                    biomeColor={effectiveBiomeColor}
                    onTintDetected={handleTintDetected}
                    showPot={showPot && !isColormapAsset}
                    isPotted={(isPlantPotted || canBePotted) && !isColormapAsset}
                    blockProps={blockProps}
                    seed={seed}
                  />
                  <EntityModel
                    assetId={entityAssetId}
                    entityTypeOverride={blockEntitySpec?.entityTypeOverride}
                    parentEntityOverride={blockEntitySpec?.parentEntityOverride}
                  />
                </>
              ) : (
                // Entity-only rendering (chests, shulker boxes, signs, etc.)
                // Block model is empty, only entity model has geometry
                <EntityModel
                  assetId={entityAssetId}
                  entityTypeOverride={blockEntitySpec?.entityTypeOverride}
                  parentEntityOverride={blockEntitySpec?.parentEntityOverride}
                />
              )
            ) : multiBlockParts ? (
              // Multi-part block model
              multiBlockParts.map((part, index) => (
                <BlockModel
                  key={`${part.assetId ?? previewAssetId}-${index}`}
                  assetId={part.assetId ?? previewAssetId}
                  biomeColor={effectiveBiomeColor}
                  onTintDetected={index === 0 ? handleTintDetected : undefined}
                  showPot={showPot && !isColormapAsset}
                  isPotted={(isPlantPotted || canBePotted) && !isColormapAsset}
                  blockProps={{
                    ...blockProps,
                    ...(part.overrides ?? {}),
                  }}
                  seed={seed}
                  positionOffset={part.offset}
                />
              ))
            ) : (
              // Standard block model
              <BlockModel
                assetId={previewAssetId}
                biomeColor={effectiveBiomeColor}
                onTintDetected={handleTintDetected}
                showPot={showPot && !isColormapAsset}
                isPotted={(isPlantPotted || canBePotted) && !isColormapAsset}
                blockProps={blockProps}
                seed={seed}
              />
            ))}

          {/* Particle emissions (blocks and entities) */}
          {previewAssetId && showBlockParticles && (
            <ParticleWrapper
              assetId={previewAssetId}
              stateProps={particleStateProps}
              enabled={showBlockParticles}
            />
          )}

          {/* Grid floor with dashed lines - 1 Minecraft block spacing */}
          {/* Grid offset by 0.5 units so lines pass through block centers, not edges */}
          {showGrid && (
            <GridFloor
              position={[0.5, 0, 0.5]}
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

          {/* Soft contact shadow - tight under the block */}
          {/* Don't render shadows for transparent blocks like redstone wire, glass, etc. */}
          {shouldHaveShadow && (
            <ContactShadows
              position={[0, 0, 0]}
              opacity={0.7}
              scale={12.0}
              blur={1.5}
              far={0.5}
              resolution={256}
              frames={1}
              color="#000000"
            />
          )}
        </Canvas>
      </div>
    </div>
  );
}
