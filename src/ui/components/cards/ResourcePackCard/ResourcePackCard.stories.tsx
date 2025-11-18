import type { Meta, StoryObj } from "@storybook/react";
import ResourcePackCard from "./ResourcePackCard";

const meta: Meta<typeof ResourcePackCard> = {
  component: ResourcePackCard,
  title: "Components/ResourcePackCard",
  tags: ["autodocs"],
  args: {
    name: "Lapis Dreams",
    description:
      "A vibrant pack that drenches your overworld in lapis blues and warm gold trim.",
    iconSrc:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAQAAAB8c7QfAAAAI0lEQVRIie3MMQEAAAwCoNm/9C1hBZQM5xjWQYMGDRo0aNBg/QAstgQwLHXACc8AAAAASUVORK5CYII=",
    metadata: [
      { label: "Size", value: "42 MB" },
      { label: "Version", value: "1.21" },
    ],
    badges: ["64x", "Stylized"],
  },
};

export default meta;
type Story = StoryObj<typeof ResourcePackCard>;

export const Default: Story = {};

export const WithLongDescription: Story = {
  args: {
    name: "Nether Noir",
    accent: "berry",
    description:
      "Wraps your world in brutalist obsidian palettes with ember gradients and chunky UI chrome. Perfect for late-night base builds.",
    metadata: [
      { label: "Size", value: "108 MB" },
      { label: "Version", value: "1.20" },
    ],
  },
};

export const DraggingState: Story = {
  args: {
    name: "Emerald Bloom",
    accent: "emerald",
    isDragging: true,
    metadata: [{ label: "Size", value: "12 MB" }],
  },
};

export const NoIcon: Story = {
  args: {
    name: "Vanilla Tweaks",
    accent: "gold",
    badges: ["16x", "Minimal"],
    metadata: [{ label: "Size", value: "4 MB" }],
    iconSrc: undefined,
  },
};
