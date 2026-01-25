import type { Meta, StoryObj } from "@storybook/react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from './index';

const meta = {
  title: "Components/Resizable",
  component: ResizablePanelGroup,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    direction: {
      control: "select",
      options: ["horizontal", "vertical"],
      description: "Direction of panel resizing",
    },
  },
} satisfies Meta<typeof ResizablePanelGroup>;

export default meta;
type Story = Omit<StoryObj<typeof meta>, "args">;

const PanelContent = ({
  children,
  color = "var(--color-block)",
}: {
  children: React.ReactNode;
  color?: string;
}) => (
  <div
    style={{
      width: "100%",
      height: "100%",
      padding: "1.5rem",
      background: color,
      border: "3px solid var(--color-ink)",
      boxSizing: "border-box",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-family)",
      fontSize: "0.875rem",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
    }}
  >
    {children}
  </div>
);

export const Horizontal: Story = {
  render: () => (
    <div style={{ padding: "2rem" }}>
      <div style={{ height: "400px" }}>
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={50}>
            <PanelContent>Left Panel</PanelContent>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={50}>
            <PanelContent>Right Panel</PanelContent>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div style={{ padding: "2rem" }}>
      <div style={{ height: "400px" }}>
        <ResizablePanelGroup direction="vertical">
          <ResizablePanel defaultSize={50}>
            <PanelContent>Top Panel</PanelContent>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={50}>
            <PanelContent>Bottom Panel</PanelContent>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  ),
};

export const WithHandle: Story = {
  render: () => (
    <div style={{ padding: "2rem" }}>
      <div style={{ height: "400px" }}>
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={50}>
            <PanelContent>Panel with visible handle</PanelContent>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50}>
            <PanelContent>Drag the handle to resize</PanelContent>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  ),
};

export const ThreePanels: Story = {
  render: () => (
    <div style={{ padding: "2rem" }}>
      <div style={{ height: "400px" }}>
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={25}>
            <PanelContent color="rgb(255 200 200 / 40%)">Sidebar</PanelContent>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50}>
            <PanelContent>Main Content</PanelContent>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={25}>
            <PanelContent color="rgb(200 220 255 / 40%)">
              Side Info
            </PanelContent>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  ),
};

export const NestedPanels: Story = {
  render: () => (
    <div style={{ padding: "2rem" }}>
      <div style={{ height: "500px" }}>
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={30}>
            <PanelContent color="rgb(255 200 200 / 40%)">Sidebar</PanelContent>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={70}>
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={60}>
                <PanelContent>Main Content Area</PanelContent>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={40}>
                <PanelContent color="rgb(200 255 200 / 40%)">
                  Console / Terminal
                </PanelContent>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  ),
};

export const IDELayout: Story = {
  render: () => (
    <div style={{ padding: "2rem" }}>
      <div style={{ height: "600px" }}>
        <ResizablePanelGroup direction="vertical">
          {/* Top bar */}
          <ResizablePanel defaultSize={10} minSize={5} maxSize={15}>
            <PanelContent color="rgb(50 50 50 / 90%)">
              <span style={{ color: "white" }}>Menu Bar</span>
            </PanelContent>
          </ResizablePanel>
          <ResizableHandle />

          {/* Main content area */}
          <ResizablePanel defaultSize={75}>
            <ResizablePanelGroup direction="horizontal">
              {/* File explorer */}
              <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
                <PanelContent color="rgb(255 240 220 / 60%)">
                  📁 Files
                </PanelContent>
              </ResizablePanel>
              <ResizableHandle withHandle />

              {/* Editor */}
              <ResizablePanel defaultSize={60}>
                <PanelContent>📝 Editor</PanelContent>
              </ResizablePanel>
              <ResizableHandle withHandle />

              {/* Properties panel */}
              <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
                <PanelContent color="rgb(220 220 255 / 60%)">
                  ⚙️ Properties
                </PanelContent>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
          <ResizableHandle />

          {/* Bottom panel */}
          <ResizablePanel defaultSize={15} minSize={10} maxSize={30}>
            <PanelContent color="rgb(220 255 220 / 60%)">
              💻 Console
            </PanelContent>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  ),
};

export const MinMaxSizes: Story = {
  render: () => (
    <div style={{ padding: "2rem" }}>
      <div style={{ height: "400px" }}>
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
            <PanelContent color="rgb(255 200 200 / 40%)">
              Min: 20%, Max: 40%
            </PanelContent>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={70}>
            <PanelContent>Flexible Panel</PanelContent>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  ),
};

export const CollapsiblePanel: Story = {
  render: () => (
    <div style={{ padding: "2rem" }}>
      <div style={{ height: "400px" }}>
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={25} collapsible minSize={10}>
            <PanelContent color="rgb(255 200 200 / 40%)">
              Try collapsing me!
            </PanelContent>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={75}>
            <PanelContent>Main Content</PanelContent>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  ),
};
