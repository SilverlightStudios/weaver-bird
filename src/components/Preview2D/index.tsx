/**
 * Preview2D Component - Displays 2D textures (GUI, particles, entities, etc.)
 *
 * Uses Three.js to render a flat sprite with zoom/pan controls
 * Consistent with Preview3D but optimized for 2D textures
 */
import { useState } from "react";
import { isSignTexture, isHangingSign } from "@lib/assetUtils";
import { useSelectWinner, useSelectPack } from "@state/selectors";
import { useStore } from "@state/store";
import { isEntityTexture } from "@lib/emf";
import {
  Preview2DPlaceholder,
  Preview2DError,
  Preview2DLoading,
  Preview2DCanvas,
} from "./components";
import { useTextureLoader, useEntityModelLoader } from "./components/hooks";
import s from "./styles.module.scss";

interface Props {
  assetId?: string;
}


export default function Preview2D({ assetId }: Props) {
  const showUVWrap = useStore((state) => state.canvas2DShowUVWrap);
  const showPixelGrid = useStore((state) => state.canvas2DShowPixelGrid);
  const signText = useStore((state) => state.signText ?? ["", "", "", ""]);
  const [textureWidth, setTextureWidth] = useState(0);
  const [textureHeight, setTextureHeight] = useState(0);
  const [aspectRatio, setAspectRatio] = useState(1);
  const [tooltip, setTooltip] = useState<{
    label: string;
    x: number;
    y: number;
  } | null>(null);

  const winnerPackId = useSelectWinner(assetId ?? "");
  const winnerPack = useSelectPack(winnerPackId ?? "");

  const isSign = assetId ? isSignTexture(assetId) : false;
  const isHangingSignTexture = assetId ? isHangingSign(assetId) : false;
  const isEntity = assetId ? isEntityTexture(assetId) : false;

  const { texturePath, error } = useTextureLoader(assetId, winnerPackId, winnerPack);
  const entityModel = useEntityModelLoader(isEntity, showUVWrap, assetId, winnerPack);

  const handleTextureLoaded = (width: number, height: number) => {
    setTextureWidth(width);
    setTextureHeight(height);
    setAspectRatio(width / height);
  };

  const handleUVHover = (label: string | null, x: number, y: number) => {
    if (label) {
      setTooltip({ label, x, y });
    } else {
      setTooltip(null);
    }
  };

  if (!assetId) return <Preview2DPlaceholder />;
  if (error) return <Preview2DError />;
  if (!texturePath) return <Preview2DLoading />;

  return (
    <div className={s.root}>
      <Preview2DCanvas
        texturePath={texturePath}
        isSign={isSign}
        isHangingSignTexture={isHangingSignTexture}
        signText={signText}
        aspectRatio={aspectRatio}
        showPixelGrid={showPixelGrid}
        textureWidth={textureWidth}
        textureHeight={textureHeight}
        showUVWrap={showUVWrap}
        entityModel={entityModel}
        onTextureLoaded={handleTextureLoaded}
        onUVHover={handleUVHover}
      />

      {tooltip && (
        <div
          className={s.uvTooltip}
          style={{
            left: `${tooltip.x + 10}px`,
            top: `${tooltip.y + 10}px`,
          }}
        >
          {tooltip.label}
        </div>
      )}

      <div className={s.info}>
        <span className={s.infoText}>Scroll to zoom • Drag to pan</span>
      </div>
    </div>
  );
}
