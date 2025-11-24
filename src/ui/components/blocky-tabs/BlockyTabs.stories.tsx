import type { Meta, StoryObj } from "@storybook/react";
import { BlockyTabs } from "./BlockyTabs";
import type { TabItem, ZoneId } from "./types";
import swordImg from "@/assets/textures/sword.png";
import pickaxeImg from "@/assets/textures/pickaxe.png";
import cobbleImg from "@/assets/textures/cobblestone.png";
import dirtImg from "@/assets/textures/dirt.png";
import logImg from "@/assets/textures/log.png";

const meta: Meta<typeof BlockyTabs> = {
  title: "UI/BlockyTabs",
  component: BlockyTabs,
  parameters: {
    layout: "fullscreen",
  },
  argTypes: {
    showZones: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof BlockyTabs>;

const createTab = (
  id: string,
  label: string,
  color: string,
  icon?: string,
): TabItem => ({
  id,
  label,
  color,
  icon,
  content: (
    <div style={{ padding: 20 }}>
      <h2>{label} Content</h2>
      <p>This is the content for {label}.</p>
      <div
        style={{
          width: 100,
          height: 100,
          backgroundColor: color,
          marginTop: 20,
          border: "4px solid rgba(0,0,0,0.2)",
        }}
      />
    </div>
  ),
});

const initialTabs: Record<ZoneId, TabItem[]> = {
  top: [
    createTab("t1", "Bricks", "#A95A53", cobbleImg),
    createTab("t2", "Plants", "#4E7C38", dirtImg),
  ],
  left: [
    createTab("l1", "Tools", "#555555", pickaxeImg),
    createTab("l2", "Combat", "#9B2D28", swordImg),
  ],
  right: [createTab("r1", "Food", "#B5651D", logImg)],
  bottom: [
    createTab("b1", "Redstone", "#FF0000"),
    createTab("b2", "Transport", "#D4AF37"),
    createTab("b3", "Misc", "#C71585"),
  ],
};

export const Default: Story = {
  args: {
    initialTabs,
    showZones: true,
  },
};
