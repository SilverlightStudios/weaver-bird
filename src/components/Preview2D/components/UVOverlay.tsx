import type { ParsedEntityModel } from "@lib/emf";
import { UVBox } from "./UVBox";

export interface UVOverlayProps {
  entityModel: ParsedEntityModel;
  textureWidth: number;
  textureHeight: number;
  aspectRatio: number;
  onHover: (label: string | null, x: number, y: number) => void;
}

/**
 * UV Overlay - Renders colored boxes showing where each JEM part maps its UVs
 */
export function UVOverlay({
  entityModel,
  textureWidth,
  textureHeight,
  aspectRatio,
  onHover,
}: UVOverlayProps) {
  // Color palette for different parts
  const colors = [
    0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xff8800,
    0x88ff00, 0x0088ff, 0xff0088, 0x8800ff, 0x00ff88,
  ];

  const boxes: JSX.Element[] = [];
  let colorIndex = 0;

  // Iterate through all parts and their boxes
  entityModel.parts.forEach((part) => {
    const partColor = colors[colorIndex % colors.length];
    colorIndex++;

    part.boxes.forEach((box, boxIndex) => {
      // Draw rectangles for each face's UV coordinates
      Object.entries(box.uv).forEach(([faceName, uvCoords]) => {
        if (!uvCoords || uvCoords.every((v) => v === 0)) return;

        const [u1, v1, u2, v2] = uvCoords;

        // Convert UV pixel coordinates to normalized 0-1 space
        const x1 = u1 / textureWidth;
        const y1 = v1 / textureHeight;
        const x2 = u2 / textureWidth;
        const y2 = v2 / textureHeight;

        // Convert to sprite space (-1 to 1, flipped Y)
        const spriteX1 = (x1 - 0.5) * 2;
        const spriteY1 = (0.5 - y1) * 2; // Flip Y
        const spriteX2 = (x2 - 0.5) * 2;
        const spriteY2 = (0.5 - y2) * 2; // Flip Y

        const width = Math.abs(spriteX2 - spriteX1);
        const height = Math.abs(spriteY2 - spriteY1);
        const centerX = (spriteX1 + spriteX2) / 2;
        const centerY = (spriteY1 + spriteY2) / 2;

        // Scale by aspect ratio
        const scaledCenterX = centerX * aspectRatio;
        const scaledWidth = width * aspectRatio;

        const key = `${part.name}-${boxIndex}-${faceName}`;
        const label = `${part.name} - ${faceName}`;

        boxes.push(
          <UVBox
            key={key}
            position={[scaledCenterX, centerY, 0.01]}
            size={[scaledWidth, height]}
            color={partColor}
            label={label}
            faceName={faceName}
            onHover={onHover}
          />,
        );
      });
    });
  });

  return <group>{boxes}</group>;
}
