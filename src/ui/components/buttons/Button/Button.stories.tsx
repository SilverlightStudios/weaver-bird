import type { Meta, StoryObj } from "@storybook/react";
import Button from "./Button";

const DiamondIcon = () => (
  <span aria-hidden="true" style={{ display: "inline-block" }}>
    ◆
  </span>
);

const meta: Meta<typeof Button> = {
  component: Button,
  title: "Components/Button",
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  args: {
    children: "Spawn Builder",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "ghost"],
      description: "Button visual style variant",
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "Button size",
    },
    disabled: {
      control: "boolean",
      description: "Disable the button",
    },
    fullWidth: {
      control: "boolean",
      description: "Make button take full width of container",
    },
    iconLocation: {
      control: "select",
      options: ["leading", "following", "above", "below"],
      description: "Position of icon relative to text",
    },
    color: {
      control: "color",
      description: "Custom accent color",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    variant: "primary",
  },
};

export const SecondaryWithIcon: Story = {
  args: {
    variant: "secondary",
    renderIcon: () => <DiamondIcon />,
    iconLocation: "leading",
    children: "Scan Packs",
  },
};

export const GhostStacked: Story = {
  args: {
    variant: "ghost",
    size: "lg",
    renderIcon: () => <DiamondIcon />,
    iconLocation: "above",
    children: "Browse",
  },
};

export const IconBelow: Story = {
  args: {
    variant: "primary",
    size: "lg",
    renderIcon: () => <DiamondIcon />,
    iconLocation: "below",
    children: "Upload",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    fullWidth: true,
    renderIcon: () => <DiamondIcon />,
    iconLocation: "following",
    children: "Exporting...",
  },
};

export const CustomAccent: Story = {
  args: {
    variant: "secondary",
    children: "Scan Emeralds",
    color: "#11c46b",
    size: "lg",
  },
};
