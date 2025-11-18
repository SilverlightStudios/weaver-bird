import type { Meta, StoryObj } from "@storybook/react";
import { Spinner } from "./Spinner";

const meta = {
  title: "Components/Spinner",
  component: Spinner,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg", "xl"],
    },
  },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    size: "md",
  },
};

export const AllSizes: Story = {
  render: () => (
    <div
      style={{
        display: "flex",
        gap: "2rem",
        alignItems: "center",
        padding: "2rem",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <Spinner size="sm" />
        <p style={{ marginTop: "0.5rem", fontSize: "0.75rem", opacity: 0.7 }}>
          Small
        </p>
      </div>
      <div style={{ textAlign: "center" }}>
        <Spinner size="md" />
        <p style={{ marginTop: "0.5rem", fontSize: "0.75rem", opacity: 0.7 }}>
          Medium
        </p>
      </div>
      <div style={{ textAlign: "center" }}>
        <Spinner size="lg" />
        <p style={{ marginTop: "0.5rem", fontSize: "0.75rem", opacity: 0.7 }}>
          Large
        </p>
      </div>
      <div style={{ textAlign: "center" }}>
        <Spinner size="xl" />
        <p style={{ marginTop: "0.5rem", fontSize: "0.75rem", opacity: 0.7 }}>
          Extra Large
        </p>
      </div>
    </div>
  ),
};

export const InButton: Story = {
  render: () => (
    <button
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.5rem 1rem",
        border: "3px solid var(--color-ink)",
        borderRadius: "0.5rem",
        background: "var(--color-primary)",
        color: "white",
        fontFamily: "var(--font-family)",
        fontSize: "0.875rem",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        cursor: "not-allowed",
        opacity: 0.7,
      }}
      disabled
    >
      <Spinner size="sm" style={{ filter: "brightness(0) invert(1)" }} />
      Loading...
    </button>
  ),
};

export const Centered: Story = {
  render: () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "200px",
        border: "3px solid var(--color-ink)",
        borderRadius: "0.5rem",
        background: "var(--color-block)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <Spinner size="lg" />
        <p
          style={{
            marginTop: "1rem",
            fontFamily: "var(--font-family)",
            fontSize: "0.875rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            opacity: 0.7,
          }}
        >
          Loading content...
        </p>
      </div>
    </div>
  ),
};
