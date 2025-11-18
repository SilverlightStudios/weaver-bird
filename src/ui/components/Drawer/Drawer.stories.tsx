import type { Meta, StoryObj } from "@storybook/react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./Drawer";
import Button from "../buttons/Button/Button";
import { useState } from "react";

const meta = {
  title: "Components/Drawer",
  component: Drawer,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Drawer>;

export default meta;
type Story = Omit<StoryObj<typeof meta>, "args">;

// Wrapper component for all stories to center the trigger button
const StoryWrapper = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      padding: "2rem",
      minHeight: "100vh",
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
      <Drawer>
        <DrawerTrigger asChild>
          <Button variant="primary">Open Drawer</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Drawer Title</DrawerTitle>
            <DrawerDescription>
              This is a drawer component with anti-design styling.
            </DrawerDescription>
          </DrawerHeader>
          <div style={{ padding: "0 1.5rem 1.5rem" }}>
            <p
              style={{
                fontSize: "0.875rem",
                lineHeight: "1.6",
                opacity: 0.8,
              }}
            >
              The drawer slides up from the bottom of the screen. You can drag
              it down to close, or use the cancel button below.
            </p>
          </div>
          <DrawerFooter>
            <Button variant="primary">Submit</Button>
            <DrawerClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </StoryWrapper>
  ),
};

const WithFormComponent = () => {
  const [goal, setGoal] = useState(350);

  return (
    <StoryWrapper>
      <Drawer>
        <DrawerTrigger asChild>
          <Button variant="primary">Set Goal</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Mining Goal</DrawerTitle>
            <DrawerDescription>
              Set your daily diamond mining goal.
            </DrawerDescription>
          </DrawerHeader>
          <div
            style={{
              padding: "1rem 1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
              }}
            >
              <label
                htmlFor="goal-input"
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Diamonds per day:
              </label>
              <input
                id="goal-input"
                type="number"
                value={goal}
                onChange={(e) => setGoal(parseInt(e.target.value))}
                style={{
                  width: "6rem",
                  padding: "0.5rem",
                  border: "3px solid var(--color-ink)",
                  borderRadius: "0.4rem",
                  fontFamily: "var(--font-family)",
                  fontSize: "1rem",
                  textAlign: "center",
                }}
              />
            </div>
            <div
              style={{
                padding: "1rem",
                background: "rgb(0 0 0 / 5%)",
                border: "3px solid var(--color-ink)",
                borderRadius: "0.5rem",
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Current goal: {goal} diamonds/day
            </div>
          </div>
          <DrawerFooter>
            <Button
              variant="primary"
              onClick={() => alert(`Goal set to ${goal}`)}
            >
              Save Goal
            </Button>
            <DrawerClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </StoryWrapper>
  );
};

export const WithForm: Story = {
  render: () => <WithFormComponent />,
};

export const LongContent: Story = {
  render: () => (
    <StoryWrapper>
      <Drawer>
        <DrawerTrigger asChild>
          <Button variant="primary">View Changelog</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Version History</DrawerTitle>
            <DrawerDescription>Recent updates and changes</DrawerDescription>
          </DrawerHeader>
          <div
            style={{
              padding: "0 1.5rem 1rem",
              maxHeight: "60vh",
              overflowY: "auto",
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((version) => (
              <div
                key={version}
                style={{
                  marginBottom: "1rem",
                  padding: "1rem",
                  background: "rgb(255 255 255 / 60%)",
                  border: "3px solid var(--color-ink)",
                  borderRadius: "0.5rem",
                }}
              >
                <h3
                  style={{
                    fontSize: "1rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: "0.5rem",
                  }}
                >
                  Version 1.{version}.0
                </h3>
                <p
                  style={{
                    fontSize: "0.75rem",
                    lineHeight: "1.5",
                    opacity: 0.7,
                  }}
                >
                  Fixed various bugs and improved performance. Added new
                  features and optimizations.
                </p>
              </div>
            ))}
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="primary">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </StoryWrapper>
  ),
};

export const ConfirmAction: Story = {
  render: () => (
    <StoryWrapper>
      <Drawer>
        <DrawerTrigger asChild>
          <Button variant="primary">Delete Item</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Confirm Deletion</DrawerTitle>
            <DrawerDescription>This action cannot be undone.</DrawerDescription>
          </DrawerHeader>
          <div style={{ padding: "1rem 1.5rem" }}>
            <p
              style={{
                fontSize: "0.875rem",
                lineHeight: "1.6",
                opacity: 0.8,
              }}
            >
              Are you sure you want to delete this resource pack? All associated
              files and configurations will be permanently removed.
            </p>
          </div>
          <DrawerFooter>
            <Button
              variant="primary"
              onClick={() => alert("Item deleted!")}
              style={{
                background: "var(--color-danger, #cc0022)",
              }}
            >
              Delete Permanently
            </Button>
            <DrawerClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </StoryWrapper>
  ),
};

export const MinimalContent: Story = {
  render: () => (
    <StoryWrapper>
      <Drawer>
        <DrawerTrigger asChild>
          <Button variant="primary">Quick Info</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Tip of the Day</DrawerTitle>
          </DrawerHeader>
          <div style={{ padding: "0 1.5rem 1.5rem" }}>
            <p
              style={{
                fontSize: "0.875rem",
                lineHeight: "1.6",
                opacity: 0.8,
              }}
            >
              Press F3 + G to show chunk boundaries in Minecraft!
            </p>
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="primary">Got it!</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </StoryWrapper>
  ),
};

export const MultipleActions: Story = {
  render: () => (
    <StoryWrapper>
      <Drawer>
        <DrawerTrigger asChild>
          <Button variant="primary">Export Options</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Export Resource Pack</DrawerTitle>
            <DrawerDescription>
              Choose your export format and options
            </DrawerDescription>
          </DrawerHeader>
          <div
            style={{
              padding: "1rem 1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <button
              style={{
                padding: "0.75rem",
                background: "rgb(255 255 255 / 60%)",
                border: "3px solid var(--color-ink)",
                borderRadius: "0.5rem",
                fontFamily: "var(--font-family)",
                fontSize: "0.875rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                cursor: "pointer",
              }}
              onClick={() => alert("Exporting as ZIP...")}
            >
              📦 Export as ZIP
            </button>
            <button
              style={{
                padding: "0.75rem",
                background: "rgb(255 255 255 / 60%)",
                border: "3px solid var(--color-ink)",
                borderRadius: "0.5rem",
                fontFamily: "var(--font-family)",
                fontSize: "0.875rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                cursor: "pointer",
              }}
              onClick={() => alert("Exporting as Folder...")}
            >
              📁 Export as Folder
            </button>
            <button
              style={{
                padding: "0.75rem",
                background: "rgb(255 255 255 / 60%)",
                border: "3px solid var(--color-ink)",
                borderRadius: "0.5rem",
                fontFamily: "var(--font-family)",
                fontSize: "0.875rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                cursor: "pointer",
              }}
              onClick={() => alert("Sharing link generated!")}
            >
              🔗 Generate Share Link
            </button>
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </StoryWrapper>
  ),
};

// Position Stories
export const PositionBottom: Story = {
  render: () => (
    <StoryWrapper>
      <Drawer position="bottom">
        <DrawerTrigger asChild>
          <Button variant="primary">Sheet from Bottom</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Bottom Sheet</DrawerTitle>
            <DrawerDescription>
              Slides up from the bottom of the screen
            </DrawerDescription>
          </DrawerHeader>
          <div style={{ padding: "1rem 1.5rem" }}>
            <p style={{ fontSize: "0.875rem", opacity: 0.8 }}>
              This is the default position. Perfect for mobile-friendly actions
              and forms.
            </p>
          </div>
          <DrawerFooter>
            <Button variant="primary">Confirm</Button>
            <DrawerClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </StoryWrapper>
  ),
};

export const PositionTop: Story = {
  render: () => (
    <StoryWrapper>
      <Drawer position="top">
        <DrawerTrigger asChild>
          <Button variant="primary">Sheet from Top</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Top Sheet</DrawerTitle>
            <DrawerDescription>
              Slides down from the top of the screen
            </DrawerDescription>
          </DrawerHeader>
          <div style={{ padding: "1rem 1.5rem" }}>
            <p style={{ fontSize: "0.875rem", opacity: 0.8 }}>
              Great for notifications, alerts, or quick actions from the top.
            </p>
          </div>
          <DrawerFooter>
            <Button variant="primary">Confirm</Button>
            <DrawerClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </StoryWrapper>
  ),
};

export const PositionLeft: Story = {
  render: () => (
    <StoryWrapper>
      <Drawer position="left">
        <DrawerTrigger asChild>
          <Button variant="primary">Sheet from Left</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Left Side Sheet</DrawerTitle>
            <DrawerDescription>Slides in from the left side</DrawerDescription>
          </DrawerHeader>
          <div style={{ padding: "1rem 1.5rem" }}>
            <p
              style={{ fontSize: "0.875rem", lineHeight: "1.6", opacity: 0.8 }}
            >
              Perfect for navigation menus, sidebars, or settings panels.
            </p>
            <div style={{ marginTop: "1rem" }}>
              <h4
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  marginBottom: "0.5rem",
                }}
              >
                Navigation
              </h4>
              <ul
                style={{
                  fontSize: "0.875rem",
                  opacity: 0.8,
                  paddingLeft: "1.5rem",
                }}
              >
                <li>Home</li>
                <li>Settings</li>
                <li>Profile</li>
                <li>Logout</li>
              </ul>
            </div>
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="primary">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </StoryWrapper>
  ),
};

export const PositionRight: Story = {
  render: () => (
    <StoryWrapper>
      <Drawer position="right">
        <DrawerTrigger asChild>
          <Button variant="primary">Sheet from Right</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Right Side Sheet</DrawerTitle>
            <DrawerDescription>Slides in from the right side</DrawerDescription>
          </DrawerHeader>
          <div style={{ padding: "1rem 1.5rem" }}>
            <p
              style={{ fontSize: "0.875rem", lineHeight: "1.6", opacity: 0.8 }}
            >
              Ideal for shopping carts, detail panels, or secondary navigation.
            </p>
            <div
              style={{
                marginTop: "1rem",
                padding: "1rem",
                background: "rgb(0 0 0 / 5%)",
                borderRadius: "0.5rem",
              }}
            >
              <h4
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  marginBottom: "0.5rem",
                }}
              >
                Cart Items
              </h4>
              <p style={{ fontSize: "0.75rem", opacity: 0.7 }}>
                Your cart is empty
              </p>
            </div>
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="primary">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </StoryWrapper>
  ),
};

export const PositionCenter: Story = {
  render: () => (
    <StoryWrapper>
      <Drawer position="center">
        <DrawerTrigger asChild>
          <Button variant="primary">Center Dialog</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Centered Dialog</DrawerTitle>
            <DrawerDescription>
              Opens in the center of the screen
            </DrawerDescription>
          </DrawerHeader>
          <div style={{ padding: "1rem 1.5rem" }}>
            <p
              style={{ fontSize: "0.875rem", lineHeight: "1.6", opacity: 0.8 }}
            >
              This position works like a traditional modal dialog. Perfect for
              important messages, confirmations, or forms that need focus.
            </p>
          </div>
          <DrawerFooter>
            <Button variant="primary">Confirm</Button>
            <DrawerClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </StoryWrapper>
  ),
};

export const AllPositions: Story = {
  render: () => (
    <StoryWrapper>
      <div
        style={{
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <Drawer position="bottom">
          <DrawerTrigger asChild>
            <Button variant="primary">Bottom</Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Bottom Sheet</DrawerTitle>
            </DrawerHeader>
            <div style={{ padding: "1rem 1.5rem" }}>
              <p style={{ fontSize: "0.875rem", opacity: 0.8 }}>From bottom</p>
            </div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="primary">Close</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

        <Drawer position="top">
          <DrawerTrigger asChild>
            <Button variant="primary">Top</Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Top Sheet</DrawerTitle>
            </DrawerHeader>
            <div style={{ padding: "1rem 1.5rem" }}>
              <p style={{ fontSize: "0.875rem", opacity: 0.8 }}>From top</p>
            </div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="primary">Close</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

        <Drawer position="left">
          <DrawerTrigger asChild>
            <Button variant="primary">Left</Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Left Sheet</DrawerTitle>
            </DrawerHeader>
            <div style={{ padding: "1rem 1.5rem" }}>
              <p style={{ fontSize: "0.875rem", opacity: 0.8 }}>From left</p>
            </div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="primary">Close</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

        <Drawer position="right">
          <DrawerTrigger asChild>
            <Button variant="primary">Right</Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Right Sheet</DrawerTitle>
            </DrawerHeader>
            <div style={{ padding: "1rem 1.5rem" }}>
              <p style={{ fontSize: "0.875rem", opacity: 0.8 }}>From right</p>
            </div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="primary">Close</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

        <Drawer position="center">
          <DrawerTrigger asChild>
            <Button variant="primary">Center</Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Center Dialog</DrawerTitle>
            </DrawerHeader>
            <div style={{ padding: "1rem 1.5rem" }}>
              <p style={{ fontSize: "0.875rem", opacity: 0.8 }}>
                Centered modal
              </p>
            </div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="primary">Close</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
    </StoryWrapper>
  ),
};
