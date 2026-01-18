import type { ParsedEntityModel } from "@lib/emf/jemLoader";
import UVBox from "./UVBox";

export default function UVOverlay({
  entityModel,
  textureWidth,
  textureHeight,
  aspectRatio,
  onHover,
}: {
  entityModel: ParsedEntityModel;
  textureWidth: number;
  textureHeight: number;
  aspectRatio: number;
  onHover: (label: string | null, x: number, y: number) => void;
}) {
  const colors = [0xff5c5c, 0x5ce1e6, 0x8b5cf6, 0xf59e0b, 0x22c55e, 0xec4899];
  const boxes: JSX.Element[] = [];
  let colorIndex = 0;

  entityModel.parts.forEach((part) => {
    const partColor = colors[colorIndex % colors.length];
    colorIndex++;

    part.boxes.forEach((box, boxIndex) => {
      Object.entries(box.uv).forEach(([faceName, uvCoords]) => {
        if (!uvCoords || uvCoords.every((v) => v === 0)) return;
        const [u1, v1, u2, v2] = uvCoords;

        const x1 = u1 / textureWidth;
        const y1 = v1 / textureHeight;
        const x2 = u2 / textureWidth;
        const y2 = v2 / textureHeight;

        const spriteX1 = (x1 - 0.5) * 2;
        const spriteY1 = (0.5 - y1) * 2;
        const spriteX2 = (x2 - 0.5) * 2;
        const spriteY2 = (0.5 - y2) * 2;

        const width = Math.abs(spriteX2 - spriteX1);
        const height = Math.abs(spriteY2 - spriteY1);
        const centerX = (spriteX1 + spriteX2) / 2;
        const centerY = (spriteY1 + spriteY2) / 2;

        const scaledCenterX = centerX * aspectRatio;
        const scaledWidth = width * aspectRatio;

        boxes.push(
          <UVBox
            key={`${part.name}-${boxIndex}-${faceName}`}
            position={[scaledCenterX, centerY, 0.01]}
            size={[scaledWidth, height]}
            color={partColor}
            label={`${part.name} → ${faceName}`}
            faceName={faceName}
            onHover={onHover}
          />,
        );
      });
    });
  });

  return <group>{boxes}</group>;
}
