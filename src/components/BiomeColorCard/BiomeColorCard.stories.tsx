import type { Meta, StoryObj } from "@storybook/react";
import BiomeColorCard from "./index";

const meta: Meta<typeof BiomeColorCard> = {
  component: BiomeColorCard,
  title: "App/BiomeColorCard",
  tags: ["autodocs"],
  args: {
    assetId: "minecraft:textures/colormap/grass",
    type: "grass",
    onColorSelect: (color) => {
      console.log("Color selected:", color);
    },
    showSourceSelector: true,
    readOnly: false,
    accent: "emerald",
  },
  argTypes: {
    type: {
      control: "select",
      options: ["grass", "foliage"],
    },
    accent: {
      control: "select",
      options: ["emerald", "gold", "berry"],
    },
    onColorSelect: {
      action: "colorSelected",
    },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "320px", padding: "1rem" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof BiomeColorCard>;

export const Grass: Story = {
  args: {
    assetId: "minecraft:textures/colormap/grass",
    type: "grass",
    accent: "emerald",
  },
};

export const Foliage: Story = {
  args: {
    assetId: "minecraft:textures/colormap/foliage",
    type: "foliage",
    accent: "gold",
  },
};

export const BerryAccent: Story = {
  args: {
    assetId: "minecraft:textures/colormap/grass",
    type: "grass",
    accent: "berry",
  },
};

export const ReadOnly: Story = {
  args: {
    assetId: "minecraft:textures/colormap/grass",
    type: "grass",
    readOnly: true,
  },
};

export const NoSourceSelector: Story = {
  args: {
    assetId: "minecraft:textures/colormap/foliage",
    type: "foliage",
    showSourceSelector: false,
  },
};
