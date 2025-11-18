import type { Meta, StoryObj } from "@storybook/react";
import { Separator } from "./Separator";

const meta = {
  title: "Components/Separator",
  component: Separator,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    orientation: {
      control: "select",
      options: ["horizontal", "vertical"],
    },
    decorative: {
      control: "boolean",
    },
  },
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    orientation: "horizontal",
  },
};

export const ContentSeparation: Story = {
  render: () => (
    <div style={{ width: "400px" }}>
      <div style={{ padding: "1rem 0" }}>
        <h4
          style={{
            fontSize: "1rem",
            fontFamily: "var(--font-family)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: "0.5rem",
            fontWeight: "bold",
          }}
        >
          Resource Packs
        </h4>
        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--color-text-light)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            lineHeight: 1.5,
          }}
        >
          Drag and drop to reorder your pack priority. Higher packs override
          lower ones.
        </p>
      </div>
      <Separator className="my-4" />
      <div style={{ padding: "1rem 0" }}>
        <h4
          style={{
            fontSize: "1rem",
            fontFamily: "var(--font-family)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: "0.5rem",
            fontWeight: "bold",
          }}
        >
          Asset Override
        </h4>
        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--color-text-light)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            lineHeight: 1.5,
          }}
        >
          Select which pack to use for individual assets.
        </p>
      </div>
      <Separator />
      <div
        style={{
          display: "flex",
          gap: "1rem",
          padding: "1rem 0",
          fontSize: "0.75rem",
          fontFamily: "var(--font-family)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        <div>Help</div>
        <Separator orientation="vertical" />
        <div>Settings</div>
        <Separator orientation="vertical" />
        <div>About</div>
      </div>
    </div>
  ),
};

export const InCard: Story = {
  render: () => (
    <div
      style={{
        width: "350px",
        padding: "1.5rem",
        border: "3px solid var(--color-border)",
        borderRadius: "1.6rem 1.6rem 2.3rem 0.4rem",
        background: "var(--color-block)",
        boxShadow: "10px 10px 0 var(--color-ink)",
      }}
    >
      <div style={{ marginBottom: "1rem" }}>
        <h3
          style={{
            fontSize: "1.25rem",
            fontFamily: "var(--font-family)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: "0.5rem",
            fontWeight: "bold",
          }}
        >
          Pack Details
        </h3>
        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--color-text-light)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Default Minecraft Textures
        </p>
      </div>
      <Separator />
      <div
        style={{
          marginTop: "1rem",
          display: "grid",
          gap: "0.75rem",
          fontSize: "0.75rem",
          fontFamily: "var(--font-family)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ opacity: 0.7 }}>Format:</span>
          <span style={{ fontWeight: "bold" }}>Pack 8</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ opacity: 0.7 }}>Assets:</span>
          <span style={{ fontWeight: "bold" }}>1,247</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ opacity: 0.7 }}>Size:</span>
          <span style={{ fontWeight: "bold" }}>15.3 MB</span>
        </div>
      </div>
    </div>
  ),
};

export const NavMenu: Story = {
  render: () => (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "1rem",
        background: "var(--color-block)",
        border: "3px solid var(--color-border)",
        borderRadius: "0.4rem 1rem 0.4rem 0.4rem",
        fontFamily: "var(--font-family)",
        fontSize: "0.75rem",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
      }}
    >
      <a href="#" style={{ padding: "0.25rem 0.5rem", fontWeight: "bold" }}>
        Home
      </a>
      <Separator orientation="vertical" style={{ height: "20px" }} />
      <a href="#" style={{ padding: "0.25rem 0.5rem" }}>
        Packs
      </a>
      <Separator orientation="vertical" style={{ height: "20px" }} />
      <a href="#" style={{ padding: "0.25rem 0.5rem" }}>
        Assets
      </a>
      <Separator orientation="vertical" style={{ height: "20px" }} />
      <a href="#" style={{ padding: "0.25rem 0.5rem" }}>
        Settings
      </a>
    </nav>
  ),
};

export const ListDivider: Story = {
  render: () => (
    <div style={{ width: "300px" }}>
      {[
        "Default Textures",
        "Faithful 32x",
        "Pixel Perfection",
        "Vanilla Tweaks",
      ].map((item, index, arr) => (
        <div key={item}>
          <div
            style={{
              padding: "0.75rem",
              fontFamily: "var(--font-family)",
              fontSize: "0.875rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {item}
          </div>
          {index < arr.length - 1 && <Separator />}
        </div>
      ))}
    </div>
  ),
};
