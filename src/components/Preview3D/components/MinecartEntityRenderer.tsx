/**
 * Renders entities with minecart composites
 */

import BlockModel from "../BlockModel";
import EntityModel from "../EntityModel";
import type { MinecartCompositeSpec } from "@lib/minecartComposite";
import type { BlockEntitySpec } from "@lib/blockEntityResolver";

interface MinecartEntityRendererProps {
  entityAssetId: string;
  minecartCompositeSpec: MinecartCompositeSpec;
  blockEntitySpec: BlockEntitySpec | null;
  effectiveBiomeColor: { r: number; g: number; b: number } | null | undefined;
  seed: number;
}

export function MinecartEntityRenderer({
  entityAssetId,
  minecartCompositeSpec,
  blockEntitySpec,
  effectiveBiomeColor,
  seed,
}: MinecartEntityRendererProps) {
  return (
    <>
      <EntityModel
        assetId={entityAssetId}
        entityTypeOverride={minecartCompositeSpec.entityTypeOverride}
        parentEntityOverride={blockEntitySpec?.parentEntityOverride}
      />
      {minecartCompositeSpec.cargo && (
        <group position={[0, 0.1, 0]} scale={[0.75, 0.75, 0.75]}>
          {minecartCompositeSpec.cargo.kind === "entity" ? (
            <EntityModel
              assetId={minecartCompositeSpec.cargo.assetId}
              entityTypeOverride={minecartCompositeSpec.cargo.entityTypeOverride}
              parentEntityOverride={minecartCompositeSpec.cargo.parentEntityOverride}
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
  );
}
