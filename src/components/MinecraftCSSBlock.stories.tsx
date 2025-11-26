import type { Meta, StoryObj } from "@storybook/react";
import { useMemo } from "react";
import s from "../components/MinecraftCSSBlock/styles.module.scss";

// Simplified version of the component for Storybook that doesn't require Tauri/store
// Uses direct texture URLs instead of loading from file system

interface RenderedFace {
  type: "top" | "left" | "right";
  textureUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  uv: { u1: number; v1: number; u2: number; v2: number };
  zIndex: number;
  brightness: number;
}

interface StoryBlockProps {
  /** Size of the block in pixels */
  size?: number;
  /** URL for the top face texture */
  topTextureUrl?: string;
  /** URL for the left (south) face texture */
  leftTextureUrl?: string;
  /** URL for the right (east) face texture */
  rightTextureUrl?: string;
  /** Alt text */
  alt?: string;
}

// Stay True crafting table textures (from __mocks__/resourcepacks/Stay True/)
const CRAFTING_TABLE_TOP =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAwUExURSgfFCshFUEjDksrGFU4JHM5IJ5ZMq5pPLyYYgAAAAAAAAAAAAAAAAAAAAAAAAAAALfgPuMAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABwSURBVBjTYxBgUA0NDWJgZOBoSi8vL9NoYOBQLweCokYGphITF2NjdwUGtZJ09+Jy9ySG8JJyMyC7FMhwdjFxBjPK3YEImVFs7AyRKk43TwaJALWbF6cDtTMBdbm4AA2UgFjRwCABsbSRgQHsDEYGAIENKQ1p78VIAAAAAElFTkSuQmCC";
const CRAFTING_TABLE_FRONT =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAABpUExURTInGraTW8GcYcKeZTghFnM5IEsrGLiVXqmGUpF2TZl+TygfFK+MWKKCT5N4TH5iN5Z0QWdQLCYaD0EjDqyNWUs0GKSFVCgeCzgnFpJzR5Z4S7W1tXNZM////9jY2IZuRI1wRDMnGikgFdin6e4AAAAJcEhZcwAADsAAAA7AAWrWiQkAAAC8SURBVChTNY/RbsMgDEWdmMYuxRCatLClcbf9/0fuJlL9gKwjfHQv0TAyh8s0XQIzj0QkqtcYpimoisQbUUrJkoWQs1lK+FHKPJd6v5e6LEsB4BW3/Hjwsw1tJbqJLFFj7/rVWhOAbM3Mek/f27ZlnNTSTkd97e6ng9swnA6AI4e6u2jvUd/uESBtvufcu9nP7keO+skxl5dXgBVdxhEOXp87Hw40iHCIKGoBoEMyOPBgiH5LqdAcXbDUv39PFQ0b1SEwwQAAAABJRU5ErkJggg==";
const CRAFTING_TABLE_SIDE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAABaUExURTInGraTW8GcYcKeZTghFnM5IEsrGLiVXqmGUpF2TZl+TygfFK+MWKKCTyseEZN4TH5iN5Z0QWdQLCYaD6yNWUs0GEEjDjgnFigeC9jY2LW1tX9oQjMnGikgFf2j+KEAAAAJcEhZcwAADsAAAA7AAWrWiQkAAACtSURBVChTNY+NDoMgDIQrVcuQSsEfpm7v/5o7jKMJTS69L3dEnWPuh3EcemZ2RCTev0I/jr33ImEiijFq1HlOSTVGXJjlbGVZrFgpBoFXeHnbAOi6lWgS2cMeam0IEQhJ35hagdKUYClmR2NgW74ZfHTHzXhyeDnl9LUGjwkQol7pSrVqQ7Qc5Z8jG4JAWNHFucZY2fHNkBDAEPGoBQEdooKBD4/o05yWny7l+wN3OgtUgnXiLQAAAABJRU5ErkJggg==";

/**
 * Storybook-compatible MinecraftCSSBlock that uses direct texture URLs
 */
function StoryMinecraftCSSBlock({
  size = 128,
  topTextureUrl = CRAFTING_TABLE_TOP,
  leftTextureUrl = CRAFTING_TABLE_FRONT,
  rightTextureUrl = CRAFTING_TABLE_SIDE,
  alt = "Block",
}: StoryBlockProps) {
  // Scale factor: convert 16-unit Minecraft space to pixel size
  const scale = useMemo(() => (size * 0.6) / 16, [size]);

  // Create faces for a full cube
  const faces: RenderedFace[] = useMemo(() => {
    const width = 16;
    const height = 16;
    const depth = 16;

    // Tan(30°) ≈ 0.577
    const tan30 = 0.577;

    // Top face visual height
    const topVisualHeight = Math.max(width, depth) * scale * tan30;

    // Positions (element centered at 8,8,8, so relY = 0)
    const topY = -(height / 2) * scale - topVisualHeight / 2;
    const leftX = -(width / 2) * scale;
    const leftY = 0;
    const rightX = (depth / 2) * scale;
    const rightY = 0;

    return [
      {
        type: "top" as const,
        textureUrl: topTextureUrl,
        x: 0,
        y: topY,
        width: width * scale,
        height: depth * scale,
        uv: { u1: 0, v1: 0, u2: 1, v2: 1 },
        zIndex: 180,
        brightness: 1.0,
      },
      {
        type: "left" as const,
        textureUrl: leftTextureUrl,
        x: leftX,
        y: leftY,
        width: width * scale,
        height: height * scale,
        uv: { u1: 0, v1: 0, u2: 1, v2: 1 },
        zIndex: 130,
        brightness: 0.8,
      },
      {
        type: "right" as const,
        textureUrl: rightTextureUrl,
        x: rightX,
        y: rightY,
        width: depth * scale,
        height: height * scale,
        uv: { u1: 0, v1: 0, u2: 1, v2: 1 },
        zIndex: 80,
        brightness: 0.6,
      },
    ];
  }, [scale, topTextureUrl, leftTextureUrl, rightTextureUrl]);

  const sortedFaces = useMemo(
    () => [...faces].sort((a, b) => a.zIndex - b.zIndex),
    [faces],
  );

  return (
    <div className={s.blockContainer} style={{ width: size, height: size }}>
      <div className={s.blockScene}>
        {sortedFaces.map((face, index) => (
          <div
            key={index}
            className={`${s.face} ${s[`face${face.type.charAt(0).toUpperCase()}${face.type.slice(1)}`]}`}
            style={
              {
                "--face-x": `${face.x}px`,
                "--face-y": `${face.y}px`,
                "--face-width": `${face.width}px`,
                "--face-height": `${face.height}px`,
                "--face-brightness": face.brightness,
                "--uv-x": face.uv.u1,
                "--uv-y": face.uv.v1,
                "--uv-width": face.uv.u2 - face.uv.u1,
                "--uv-height": face.uv.v2 - face.uv.v1,
                zIndex: face.zIndex,
              } as React.CSSProperties
            }
          >
            <img
              src={face.textureUrl}
              alt={`${alt} ${face.type}`}
              draggable={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const meta: Meta<typeof StoryMinecraftCSSBlock> = {
  component: StoryMinecraftCSSBlock,
  title: "App/MinecraftCSSBlock",
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    backgrounds: {
      default: "checkered",
      values: [
        {
          name: "checkered",
          value:
            "repeating-conic-gradient(#808080 0% 25%, #a0a0a0 0% 50%) 50% / 20px 20px",
        },
        { name: "dark", value: "#1a1a1a" },
        { name: "light", value: "#f0f0f0" },
      ],
    },
  },
  argTypes: {
    size: {
      control: { type: "range", min: 32, max: 256, step: 8 },
      description: "Size of the block in pixels",
    },
    topTextureUrl: {
      control: "text",
      description: "URL for the top face texture",
    },
    leftTextureUrl: {
      control: "text",
      description: "URL for the left (south) face texture",
    },
    rightTextureUrl: {
      control: "text",
      description: "URL for the right (east) face texture",
    },
  },
};

export default meta;
type Story = StoryObj<typeof StoryMinecraftCSSBlock>;

export const Default: Story = {
  args: {
    size: 128,
    topTextureUrl: CRAFTING_TABLE_TOP,
    leftTextureUrl: CRAFTING_TABLE_FRONT,
    rightTextureUrl: CRAFTING_TABLE_SIDE,
  },
};

export const Small: Story = {
  args: {
    size: 64,
    topTextureUrl: CRAFTING_TABLE_TOP,
    leftTextureUrl: CRAFTING_TABLE_FRONT,
    rightTextureUrl: CRAFTING_TABLE_SIDE,
  },
};

export const Large: Story = {
  args: {
    size: 200,
    topTextureUrl: CRAFTING_TABLE_TOP,
    leftTextureUrl: CRAFTING_TABLE_FRONT,
    rightTextureUrl: CRAFTING_TABLE_SIDE,
  },
};

export const MultipleBlocks: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
      <StoryMinecraftCSSBlock size={80} />
      <StoryMinecraftCSSBlock size={100} />
      <StoryMinecraftCSSBlock size={120} />
      <StoryMinecraftCSSBlock size={140} />
    </div>
  ),
};
