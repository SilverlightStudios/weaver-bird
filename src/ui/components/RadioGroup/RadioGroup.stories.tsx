import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "./RadioGroup";

const meta = {
  title: "Components/RadioGroup",
  component: RadioGroup,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    disabled: {
      control: "boolean",
    },
  },
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

// Label component for stories
const Label = ({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) => (
  <label
    htmlFor={htmlFor}
    style={{
      fontFamily: "var(--font-family)",
      fontSize: "0.875rem",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      cursor: "pointer",
      userSelect: "none",
    }}
  >
    {children}
  </label>
);

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState("comfortable");

    return (
      <RadioGroup value={value} onValueChange={setValue}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <RadioGroupItem value="default" id="r1" />
          <Label htmlFor="r1">Default</Label>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <RadioGroupItem value="comfortable" id="r2" />
          <Label htmlFor="r2">Comfortable</Label>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <RadioGroupItem value="compact" id="r3" />
          <Label htmlFor="r3">Compact</Label>
        </div>
      </RadioGroup>
    );
  },
};

export const PackFormat: Story = {
  render: () => {
    const [format, setFormat] = useState("pack8");

    return (
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
        <h3
          style={{
            fontFamily: "var(--font-family)",
            fontSize: "1rem",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: "1rem",
            fontWeight: "bold",
          }}
        >
          Select Pack Format
        </h3>
        <RadioGroup value={format} onValueChange={setFormat}>
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <RadioGroupItem value="pack7" id="pack7" />
            <Label htmlFor="pack7">Pack Format 7 (1.18 - 1.19.2)</Label>
          </div>
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <RadioGroupItem value="pack8" id="pack8" />
            <Label htmlFor="pack8">Pack Format 8 (1.19.3 - 1.19.4)</Label>
          </div>
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <RadioGroupItem value="pack9" id="pack9" />
            <Label htmlFor="pack9">Pack Format 9 (1.20+)</Label>
          </div>
        </RadioGroup>
        <p
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            background: "rgb(255 255 255 / 40%)",
            border: "2px solid var(--color-border)",
            borderRadius: "0.4rem",
            fontSize: "0.75rem",
            fontFamily: "var(--font-family)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--color-text-light)",
          }}
        >
          Selected: {format}
        </p>
      </div>
    );
  },
};

export const Disabled: Story = {
  render: () => (
    <RadioGroup defaultValue="option2" disabled>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <RadioGroupItem value="option1" id="d1" />
        <Label htmlFor="d1">Option 1 (Disabled)</Label>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <RadioGroupItem value="option2" id="d2" />
        <Label htmlFor="d2">Option 2 (Disabled)</Label>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <RadioGroupItem value="option3" id="d3" />
        <Label htmlFor="d3">Option 3 (Disabled)</Label>
      </div>
    </RadioGroup>
  ),
};

export const SingleItemDisabled: Story = {
  render: () => {
    const [value, setValue] = useState("option2");

    return (
      <RadioGroup value={value} onValueChange={setValue}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <RadioGroupItem value="option1" id="s1" disabled />
          <Label htmlFor="s1">
            Option 1 (Disabled){" "}
            <span style={{ opacity: 0.5, fontSize: "0.7rem" }}>
              (Not available)
            </span>
          </Label>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <RadioGroupItem value="option2" id="s2" />
          <Label htmlFor="s2">Option 2</Label>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <RadioGroupItem value="option3" id="s3" />
          <Label htmlFor="s3">Option 3</Label>
        </div>
      </RadioGroup>
    );
  },
};

export const Horizontal: Story = {
  render: () => {
    const [view, setView] = useState("grid");

    return (
      <div>
        <h4
          style={{
            fontFamily: "var(--font-family)",
            fontSize: "0.875rem",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "1rem",
          }}
        >
          View Mode
        </h4>
        <RadioGroup
          value={view}
          onValueChange={setView}
          style={{ display: "flex", gap: "1.5rem" }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <RadioGroupItem value="list" id="view-list" />
            <Label htmlFor="view-list">List</Label>
          </div>
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <RadioGroupItem value="grid" id="view-grid" />
            <Label htmlFor="view-grid">Grid</Label>
          </div>
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <RadioGroupItem value="compact" id="view-compact" />
            <Label htmlFor="view-compact">Compact</Label>
          </div>
        </RadioGroup>
      </div>
    );
  },
};

export const WithDescriptions: Story = {
  render: () => {
    const [priority, setPriority] = useState("medium");

    return (
      <div style={{ width: "400px" }}>
        <h3
          style={{
            fontFamily: "var(--font-family)",
            fontSize: "1rem",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: "1rem",
            fontWeight: "bold",
          }}
        >
          Override Priority
        </h3>
        <RadioGroup value={priority} onValueChange={setPriority}>
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              padding: "0.75rem",
              background: priority === "high" ? "rgb(255 51 68 / 10%)" : "transparent",
              borderRadius: "0.4rem",
            }}
          >
            <RadioGroupItem value="high" id="priority-high" />
            <div style={{ flex: 1 }}>
              <Label htmlFor="priority-high">High Priority</Label>
              <p
                style={{
                  marginTop: "0.25rem",
                  fontSize: "0.7rem",
                  opacity: 0.7,
                  lineHeight: 1.4,
                }}
              >
                Always use this pack for assets
              </p>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              padding: "0.75rem",
              background: priority === "medium" ? "rgb(255 51 68 / 10%)" : "transparent",
              borderRadius: "0.4rem",
            }}
          >
            <RadioGroupItem value="medium" id="priority-medium" />
            <div style={{ flex: 1 }}>
              <Label htmlFor="priority-medium">Medium Priority</Label>
              <p
                style={{
                  marginTop: "0.25rem",
                  fontSize: "0.7rem",
                  opacity: 0.7,
                  lineHeight: 1.4,
                }}
              >
                Use when higher priority unavailable
              </p>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              padding: "0.75rem",
              background: priority === "low" ? "rgb(255 51 68 / 10%)" : "transparent",
              borderRadius: "0.4rem",
            }}
          >
            <RadioGroupItem value="low" id="priority-low" />
            <div style={{ flex: 1 }}>
              <Label htmlFor="priority-low">Low Priority</Label>
              <p
                style={{
                  marginTop: "0.25rem",
                  fontSize: "0.7rem",
                  opacity: 0.7,
                  lineHeight: 1.4,
                }}
              >
                Use as fallback only
              </p>
            </div>
          </div>
        </RadioGroup>
      </div>
    );
  },
};
