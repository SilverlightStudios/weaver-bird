import { useMemo } from "react";
import * as THREE from "three";

// Vertex shader - passes UV and world position to fragment shader
const vertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment shader - draws dashed grid with distance fade
const fragmentShader = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  uniform float gridSize;
  uniform float lineWidth;
  uniform float dashLength;
  uniform float gapLength;
  uniform vec3 lineColor;
  uniform float fadeStart;
  uniform float fadeEnd;
  uniform float planeSize;

  void main() {
    // Convert UV to world-space grid coordinates
    vec2 worldCoord = (vUv - 0.5) * planeSize;

    // Calculate distance from center for fade effect
    float distFromCenter = length(worldCoord);

    // Fade factor - smooth fade from fadeStart to fadeEnd
    float fadeFactor = 1.0 - smoothstep(fadeStart, fadeEnd, distFromCenter);

    // Grid cell coordinates
    vec2 gridCoord = worldCoord / gridSize;

    // Fractional position within each grid cell
    vec2 cellFrac = fract(gridCoord);

    // Distance to nearest grid line (both X and Y axes)
    float distToLineX = min(cellFrac.x, 1.0 - cellFrac.x) * gridSize;
    float distToLineY = min(cellFrac.y, 1.0 - cellFrac.y) * gridSize;

    // Check if we're on a grid line
    float onLineX = step(distToLineY, lineWidth * 0.5);
    float onLineY = step(distToLineX, lineWidth * 0.5);

    // Dashed pattern along each axis
    float dashPattern = dashLength + gapLength;

    // For horizontal lines (along X), use X coordinate for dash pattern
    float dashX = mod(worldCoord.x, dashPattern);
    float isDashX = step(dashX, dashLength);

    // For vertical lines (along Y), use Y coordinate for dash pattern
    float dashY = mod(worldCoord.y, dashPattern);
    float isDashY = step(dashY, dashLength);

    // Combine line detection with dash pattern
    float lineAlpha = max(onLineX * isDashX, onLineY * isDashY);

    // Apply fade and base opacity
    float finalAlpha = lineAlpha * fadeFactor * 0.5;

    // Discard fully transparent pixels
    if (finalAlpha < 0.01) discard;

    gl_FragColor = vec4(lineColor, finalAlpha);
  }
`;

interface GridFloorProps {
  size?: number;
  gridSize?: number;
  lineWidth?: number;
  dashLength?: number;
  gapLength?: number;
  lineColor?: string;
  fadeStart?: number;
  fadeEnd?: number;
  position?: [number, number, number];
}

export default function GridFloor({
  size = 20,
  gridSize = 1, // 1 Minecraft block
  lineWidth = 0.02,
  dashLength = 0.1,
  gapLength = 0.1,
  lineColor = "#888888",
  fadeStart = 2,
  fadeEnd = 8,
  position = [0, 0, 0],
}: GridFloorProps) {
  const shaderMaterial = useMemo(() => {
    const color = new THREE.Color(lineColor);

    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        gridSize: { value: gridSize },
        lineWidth: { value: lineWidth },
        dashLength: { value: dashLength },
        gapLength: { value: gapLength },
        lineColor: { value: new THREE.Vector3(color.r, color.g, color.b) },
        fadeStart: { value: fadeStart },
        fadeEnd: { value: fadeEnd },
        planeSize: { value: size },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }, [gridSize, lineWidth, dashLength, gapLength, lineColor, fadeStart, fadeEnd, size]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={position}>
      <planeGeometry args={[size, size]} />
      <primitive object={shaderMaterial} attach="material" />
    </mesh>
  );
}
