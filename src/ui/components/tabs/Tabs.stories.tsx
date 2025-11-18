import type { Meta, StoryObj } from "@storybook/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./Tabs";

const meta = {
  title: "Components/Tabs",
  component: Tabs,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    orientation: {
      control: "select",
      options: ["horizontal", "vertical"],
      description: "Orientation of the tabs list",
    },
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Playground story with working controls
 */
export const Playground: Story = {
  args: {
    orientation: "horizontal",
  },
  render: (args) => (
    <div style={{ display: "flex", gap: "1rem", maxWidth: "600px" }}>
      <Tabs defaultValue="tab1" className="w-full max-w-md" orientation={args.orientation}>
        <TabsList style={{ flexDirection: args.orientation === "vertical" ? "column" : "row", gap: "0.5rem" }}>
          <TabsTrigger value="tab1">Tab One</TabsTrigger>
          <TabsTrigger value="tab2">Tab Two</TabsTrigger>
          <TabsTrigger value="tab3">Tab Three</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">
          <div style={{ padding: "1rem" }}>
            <h3 style={{ marginTop: 0 }}>Tab One Content</h3>
            <p>This is the content for the first tab. Use the controls to change orientation.</p>
          </div>
        </TabsContent>
        <TabsContent value="tab2">
          <div style={{ padding: "1rem" }}>
            <h3 style={{ marginTop: 0 }}>Tab Two Content</h3>
            <p>This is the content for the second tab.</p>
          </div>
        </TabsContent>
        <TabsContent value="tab3">
          <div style={{ padding: "1rem" }}>
            <h3 style={{ marginTop: 0 }}>Tab Three Content</h3>
            <p>This is the content for the third tab.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  ),
};

/**
 * Basic tabs component with three tabs
 */
export const Default: Story = {
  render: () => (
    <Tabs defaultValue="block-state" className="w-full max-w-md">
      <TabsList>
        <TabsTrigger value="block-state">Block State</TabsTrigger>
        <TabsTrigger value="materials">Materials</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="block-state">
        <div style={{ padding: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>Block State Properties</h3>
          <p>
            Configure the block's state properties like rotation, axis alignment,
            and other variations here.
          </p>
          <ul>
            <li>Rotation: North</li>
            <li>Half: Bottom</li>
            <li>Shape: Straight</li>
          </ul>
        </div>
      </TabsContent>
      <TabsContent value="materials">
        <div style={{ padding: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>Material Settings</h3>
          <p>Configure material properties and textures for this block.</p>
          <ul>
            <li>Texture: oak_wood.png</li>
            <li>Color: #8B4513</li>
            <li>Reflectance: 0.2</li>
          </ul>
        </div>
      </TabsContent>
      <TabsContent value="settings">
        <div style={{ padding: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>Preview Settings</h3>
          <p>Adjust how this block is displayed in the preview.</p>
          <ul>
            <li>Show Grid: On</li>
            <li>Lighting: Minecraft</li>
            <li>Background: Gray</li>
          </ul>
        </div>
      </TabsContent>
    </Tabs>
  ),
};

/**
 * Tabs with many triggers (wrapping behavior)
 */
export const ManyTabs: Story = {
  render: () => (
    <Tabs defaultValue="tab1" className="w-full max-w-2xl">
      <TabsList>
        <TabsTrigger value="tab1">Option 1</TabsTrigger>
        <TabsTrigger value="tab2">Option 2</TabsTrigger>
        <TabsTrigger value="tab3">Option 3</TabsTrigger>
        <TabsTrigger value="tab4">Option 4</TabsTrigger>
        <TabsTrigger value="tab5">Option 5</TabsTrigger>
        <TabsTrigger value="tab6">Option 6</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">Content for Tab 1</TabsContent>
      <TabsContent value="tab2">Content for Tab 2</TabsContent>
      <TabsContent value="tab3">Content for Tab 3</TabsContent>
      <TabsContent value="tab4">Content for Tab 4</TabsContent>
      <TabsContent value="tab5">Content for Tab 5</TabsContent>
      <TabsContent value="tab6">Content for Tab 6</TabsContent>
    </Tabs>
  ),
};

/**
 * Tabs with rich content in panels
 */
export const RichContent: Story = {
  render: () => (
    <Tabs defaultValue="overview" className="w-full max-w-2xl">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="advanced">Advanced</TabsTrigger>
        <TabsTrigger value="debug">Debug</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <div style={{ padding: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>Block Overview</h3>
          <p>
            This is a detailed preview of your currently selected block. The
            3D model appears in the preview window above, and you can interact
            with it using your mouse.
          </p>
          <h4>Quick Actions</h4>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              style={{
                padding: "0.5rem 1rem",
                background: "#ff3344",
                color: "white",
                border: "3px solid #0a0a0a",
                borderRadius: "0.4rem 1rem 0.4rem 0.4rem",
                cursor: "pointer",
                fontWeight: "bold",
                textTransform: "uppercase",
                fontSize: "0.75rem",
              }}
            >
              Export
            </button>
            <button
              style={{
                padding: "0.5rem 1rem",
                background: "#e8e8e8",
                color: "#0a0a0a",
                border: "3px solid #0a0a0a",
                borderRadius: "1rem 0.4rem 1.2rem 0.4rem",
                cursor: "pointer",
                fontWeight: "bold",
                textTransform: "uppercase",
                fontSize: "0.75rem",
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </TabsContent>
      <TabsContent value="advanced">
        <div style={{ padding: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>Advanced Properties</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #0a0a0a" }}>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>
                  Property
                </th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>
                  Value
                </th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #ccc" }}>
                <td style={{ padding: "0.5rem" }}>Model Rotation X</td>
                <td style={{ padding: "0.5rem" }}>0°</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #ccc" }}>
                <td style={{ padding: "0.5rem" }}>Model Rotation Y</td>
                <td style={{ padding: "0.5rem" }}>0°</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #ccc" }}>
                <td style={{ padding: "0.5rem" }}>Scale Factor</td>
                <td style={{ padding: "0.5rem" }}>1.0</td>
              </tr>
            </tbody>
          </table>
        </div>
      </TabsContent>
      <TabsContent value="debug">
        <div style={{ padding: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>Debug Information</h3>
          <pre
            style={{
              background: "#f5f5f5",
              padding: "1rem",
              borderRadius: "0.5rem",
              overflow: "auto",
              fontSize: "0.8rem",
            }}
          >
            {`{
  "assetId": "oak_log",
  "blockProps": {
    "axis": "y",
    "stripped": false
  },
  "seed": 12345,
  "timestamp": "2024-11-16T12:00:00Z"
}`}
          </pre>
        </div>
      </TabsContent>
    </Tabs>
  ),
};

/**
 * Vertical layout variant (for sidebar use)
 */
export const VerticalLayout: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "1rem", maxWidth: "600px" }}>
      <Tabs defaultValue="props" className="flex-1" orientation="vertical">
        <TabsList style={{ flexDirection: "column", gap: "0.5rem" }}>
          <TabsTrigger value="props">Block Props</TabsTrigger>
          <TabsTrigger value="texture">Textures</TabsTrigger>
          <TabsTrigger value="anim">Animations</TabsTrigger>
        </TabsList>
        <div style={{ flex: 1 }}>
          <TabsContent value="props">Block properties content</TabsContent>
          <TabsContent value="texture">Texture settings content</TabsContent>
          <TabsContent value="anim">Animation settings content</TabsContent>
        </div>
      </Tabs>
    </div>
  ),
};

/**
 * Disabled tab example
 */
export const WithDisabled: Story = {
  render: () => (
    <Tabs defaultValue="available" className="w-full max-w-md">
      <TabsList>
        <TabsTrigger value="available">Available</TabsTrigger>
        <TabsTrigger value="locked" disabled>
          Locked Feature
        </TabsTrigger>
        <TabsTrigger value="beta">Beta Features</TabsTrigger>
      </TabsList>
      <TabsContent value="available">
        <div style={{ padding: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>Available Options</h3>
          <p>All these features are fully functional and ready to use.</p>
        </div>
      </TabsContent>
      <TabsContent value="locked">
        <div style={{ padding: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>Locked</h3>
          <p>This feature is not yet available.</p>
        </div>
      </TabsContent>
      <TabsContent value="beta">
        <div style={{ padding: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>Beta Features</h3>
          <p>These features are experimental and may change.</p>
        </div>
      </TabsContent>
    </Tabs>
  ),
};
