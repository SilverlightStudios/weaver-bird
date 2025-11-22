import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  PerspectiveCamera,
  ContactShadows,
} from "@react-three/drei";
import * as THREE from "three";
import BlockModel from "@components/Preview3D/BlockModel";
import GridFloor from "@components/Preview3D/GridFloor";
import s from "./styles.module.scss";

export interface DecoratedPotSides {
  north: string;
  south: string;
  east: string;
  west: string;
}

interface Props {
  sides?: DecoratedPotSides;
  singleShard?: string; // For pottery shard items, show this on all sides
  entityTexture?: string; // For entity decorated pot textures
}

export default function DecoratedPotBlockView({ sides, singleShard, entityTexture }: Props) {
  // Determine which decorated pot asset to show
  // For now, we'll use the basic decorated_pot block
  const decoratedPotAssetId = "minecraft:block/decorated_pot";

  return (
    <div className={s.root}>
      <div className={s.header}>
        <span className={s.title}>Decorated Pot Preview</span>
        {singleShard && (
          <p className={s.description}>
            Preview of this pottery shard on a decorated pot
          </p>
        )}
        {entityTexture && (
          <p className={s.description}>
            Preview of this pattern on a decorated pot
          </p>
        )}
        {sides && (
          <p className={s.description}>
            Preview of configured decorated pot
          </p>
        )}
      </div>

      <div className={s.canvas}>
        <Canvas
          onCreated={({ gl, scene }) => {
            // Disable tone mapping for accurate Minecraft colors
            gl.toneMapping = THREE.NoToneMapping;
            // Set background to light gray/white
            scene.background = new THREE.Color(0xf0f0f0);
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
            minDistance={1.5}
            maxDistance={5}
            target={[0, 0.5, 0]}
          />

          {/* Minecraft-style lighting */}
          <ambientLight intensity={1.0} />
          <directionalLight position={[3, 10, 5]} intensity={2.0} />
          <directionalLight position={[-5, 5, -5]} intensity={0.4} />
          <pointLight position={[0, -5, 0]} intensity={0.5} color="#ffffff" />

          {/* Decorated pot model */}
          <BlockModel
            assetId={decoratedPotAssetId}
            blockProps={{}}
            seed={0}
          />

          {/* Grid floor */}
          <GridFloor
            position={[0, 0, 0]}
            size={20}
            gridSize={1}
            lineWidth={0.02}
            dashLength={0.1}
            gapLength={0.1}
            lineColor="#666666"
            fadeStart={2}
            fadeEnd={8}
          />

          {/* Soft contact shadow */}
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
        </Canvas>
      </div>

      {/* Info section */}
      <div className={s.info}>
        <p className={s.infoText}>
          {singleShard
            ? "This pottery shard pattern would appear on each side of a decorated pot."
            : entityTexture
            ? "This pattern would appear on the side of a decorated pot. Rotate the view to see all sides."
            : "Rotate the view to see all sides of the decorated pot."}
        </p>
        {!singleShard && sides && (
          <div className={s.sidesList}>
            <div className={s.sidesGrid}>
              {Object.entries(sides).map(([side, shardId]) => {
                const shardName = shardId
                  .split("/")
                  .pop()
                  ?.replace("pottery_shard_", "")
                  ?.replace("_", " ")
                  ?.split(" ")
                  .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(" ") || "Brick";
                return (
                  <div key={side} className={s.sideInfo}>
                    <span className={s.sideName}>
                      {side.charAt(0).toUpperCase() + side.slice(1)}:
                    </span>
                    <span className={s.shardName}>{shardName}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
