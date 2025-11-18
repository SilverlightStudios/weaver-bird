import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Slider } from "./Slider";

const meta = {
  title: "Components/Slider",
  component: Slider,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    min: { control: "number" },
    max: { control: "number" },
    step: { control: "number" },
    disabled: { control: "boolean" },
    orientation: {
      control: "select",
      options: ["horizontal", "vertical"],
    },
  },
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

// Playground story with working controls
const PlaygroundComponent = (args: {
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  orientation?: "horizontal" | "vertical";
}) => {
  const [value, setValue] = useState([50]);

  return (
    <div style={{ padding: "3rem", minWidth: args.orientation === "vertical" ? "100px" : "400px", minHeight: args.orientation === "vertical" ? "200px" : "auto" }}>
      <Slider
        value={value}
        onValueChange={setValue}
        min={args.min}
        max={args.max}
        step={args.step}
        disabled={args.disabled}
        orientation={args.orientation}
      />
      <p style={{
        marginTop: "1rem",
        fontFamily: "var(--font-family)",
        fontSize: "0.875rem",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        opacity: 0.7,
      }}>
        Value: {value[0]}
      </p>
    </div>
  );
};

export const Playground: Story = {
  args: {
    min: 0,
    max: 100,
    step: 1,
    disabled: false,
    orientation: "horizontal",
  },
  render: (args) => <PlaygroundComponent {...args} />,
};

const StoryWrapper = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      padding: "3rem",
      minWidth: "400px",
    }}
  >
    {children}
  </div>
);

const DefaultComponent = () => {
  const [value, setValue] = useState([50]);

  return (
    <StoryWrapper>
      <div>
        <Slider value={value} onValueChange={setValue} />
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
          Value: {value[0]}
        </p>
      </div>
    </StoryWrapper>
  );
};

export const Default: Story = {
  render: () => <DefaultComponent />,
};

const WithRangeComponent = () => {
  const [value, setValue] = useState([25, 75]);

  return (
    <StoryWrapper>
      <div>
        <Slider value={value} onValueChange={setValue} />
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
          Range: {value[0]} - {value[1]}
        </p>
      </div>
    </StoryWrapper>
  );
};

export const WithRange: Story = {
  render: () => <WithRangeComponent />,
};

const VolumeControlComponent = () => {
  const [volume, setVolume] = useState([70]);

  return (
    <StoryWrapper>
      <div
        style={{
          padding: "1.5rem",
          border: "3px solid var(--color-ink)",
          borderRadius: "0.75rem",
          background: "var(--color-block)",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-family)",
            fontSize: "1rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "1rem",
          }}
        >
          🔊 Volume Control
        </h3>
        <Slider value={volume} onValueChange={setVolume} />
        <p
          style={{
            marginTop: "0.75rem",
            fontFamily: "var(--font-family)",
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            opacity: 0.6,
          }}
        >
          {volume[0]}%
        </p>
      </div>
    </StoryWrapper>
  );
};

export const VolumeControl: Story = {
  render: () => <VolumeControlComponent />,
};

const PriceRangeComponent = () => {
  const [priceRange, setPriceRange] = useState([20, 80]);

  return (
    <StoryWrapper>
      <div
        style={{
          padding: "1.5rem",
          border: "3px solid var(--color-ink)",
          borderRadius: "0.75rem",
          background: "var(--color-block)",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-family)",
            fontSize: "1rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "1rem",
          }}
        >
          💰 Price Range
        </h3>
        <Slider
          value={priceRange}
          onValueChange={setPriceRange}
          min={0}
          max={100}
          step={5}
        />
        <p
          style={{
            marginTop: "0.75rem",
            fontFamily: "var(--font-family)",
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            opacity: 0.6,
          }}
        >
          ${priceRange[0]} - ${priceRange[1]}
        </p>
      </div>
    </StoryWrapper>
  );
};

export const PriceRange: Story = {
  render: () => <PriceRangeComponent />,
};
