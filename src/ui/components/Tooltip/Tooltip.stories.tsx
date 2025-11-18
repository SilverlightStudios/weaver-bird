import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./Tooltip";
import Button from "../buttons/Button/Button";

const meta = {
  title: "Components/Tooltip",
  component: Tooltip,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    delayDuration: {
      control: "number",
      description: "Delay in milliseconds before tooltip appears",
    },
  },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

// Playground story with working controls
export const Playground: Story = {
  args: {
    delayDuration: 700,
  },
  render: (args) => (
    <div style={{ padding: "4rem", minHeight: "300px", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <TooltipProvider>
        <Tooltip delayDuration={args.delayDuration}>
          <TooltipTrigger asChild>
            <Button variant="primary">Hover me</Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Delay: {args.delayDuration}ms - Adjust in controls panel!</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  ),
};

const StoryWrapper = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      padding: "4rem",
      minHeight: "300px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    {children}
  </div>
);

export const Default: Story = {
  render: () => (
    <StoryWrapper>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="primary">Hover me</Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>This is a tooltip with anti-design styling!</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </StoryWrapper>
  ),
};

export const Sides: Story = {
  render: () => (
    <StoryWrapper>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "3rem",
        }}
      >
        <Tooltip defaultOpen>
          <TooltipTrigger asChild>
            <Button variant="primary">Top</Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Tooltip on top</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip defaultOpen>
          <TooltipTrigger asChild>
            <Button variant="primary">Right</Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Tooltip on right</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip defaultOpen>
          <TooltipTrigger asChild>
            <Button variant="primary">Left</Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Tooltip on left</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip defaultOpen>
          <TooltipTrigger asChild>
            <Button variant="primary">Bottom</Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Tooltip on bottom</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </StoryWrapper>
  ),
};

export const Alignment: Story = {
  render: () => (
    <StoryWrapper>
      <div style={{ display: "flex", gap: "2rem", flexDirection: "column" }}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="primary">Align Start</Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="start">
            <p>Aligned to start</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="primary">Align Center</Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            <p>Aligned to center</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="primary">Align End</Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="end">
            <p>Aligned to end</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </StoryWrapper>
  ),
};

export const LongContent: Story = {
  render: () => (
    <StoryWrapper>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="primary">Long tooltip</Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            This is a longer tooltip with multiple lines of text to demonstrate
            how the tooltip handles longer content. It should wrap nicely and
            maintain readability.
          </p>
        </TooltipContent>
      </Tooltip>
    </StoryWrapper>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <StoryWrapper>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            style={{
              width: "2.5rem",
              height: "2.5rem",
              border: "3px solid var(--color-ink)",
              borderRadius: "0.5rem",
              background: "var(--color-block)",
              fontFamily: "var(--font-family)",
              fontSize: "1.25rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ?
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Help information appears here</p>
        </TooltipContent>
      </Tooltip>
    </StoryWrapper>
  ),
};

export const InstantTooltip: Story = {
  render: () => (
    <StoryWrapper>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button variant="primary">Instant tooltip</Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>No delay! Appears instantly on hover.</p>
        </TooltipContent>
      </Tooltip>
    </StoryWrapper>
  ),
};

export const MultipleTooltips: Story = {
  render: () => (
    <StoryWrapper>
      <TooltipProvider>
        <div style={{ display: "flex", gap: "1rem" }}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="primary">Save</Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Save your changes</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="secondary">Cancel</Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Discard changes</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost">Delete</Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Delete permanently</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </StoryWrapper>
  ),
};
