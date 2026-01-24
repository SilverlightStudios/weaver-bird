import { Text } from "@react-three/drei";

export interface SignTextProps {
  lines: string[];
  aspectRatio: number;
  isHanging: boolean;
}

/**
 * SignText - Renders text overlay on sign textures
 */
export function SignText({ lines, aspectRatio, isHanging }: SignTextProps) {
  const width = aspectRatio >= 1 ? aspectRatio * 2 : 2;
  const height = aspectRatio >= 1 ? 2 : 2 / aspectRatio;

  // Font size adjustments - signs use smaller text
  const fontSize = height * 0.08; // Smaller font relative to sign height

  // Line spacing
  const lineSpacing = fontSize * 1.3; // Space between lines

  // Sign text positioning differs between regular and hanging signs
  // Regular signs: text is centered in the middle section of the sign
  // Hanging signs: text should be centered on the visible sign board portion
  let startY: number;
  if (isHanging) {
    // Hanging signs: center text on the lower sign board area
    const totalTextHeight = lineSpacing * 3; // 4 lines = 3 gaps
    startY = totalTextHeight / 2 - height * 0.15; // Slightly below center
  } else {
    // Regular signs: center the text block
    const totalTextHeight = lineSpacing * 3; // 4 lines = 3 gaps
    startY = totalTextHeight / 2; // Center the text block
  }

  return (
    <group position={[0, 0, 0.01]}>
      {/* Slightly in front of texture */}
      {lines.map((line, index) => {
        if (!line) return null; // Skip empty lines

        const yPos = startY - index * lineSpacing;

        return (
          <Text
            key={index}
            position={[0, yPos, 0]}
            fontSize={fontSize}
            color="black"
            anchorX="center"
            anchorY="middle"
            font="/src/assets/fonts/mac's Minecraft.ttf"
            maxWidth={width * 0.8}
          >
            {line}
          </Text>
        );
      })}
    </group>
  );
}
