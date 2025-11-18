import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Combobox, type ComboboxOption } from "./Combobox";
import Button from "../buttons/Button/Button";

const meta = {
  title: "Components/Combobox",
  component: Combobox,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    placeholder: {
      control: "text",
      description: "Placeholder text for the combobox trigger",
    },
    searchPlaceholder: {
      control: "text",
      description: "Placeholder text for the search input",
    },
    emptyMessage: {
      control: "text",
      description: "Message to display when no results are found",
    },
  },
} satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryObj<typeof meta>;

const frameworks: ComboboxOption[] = [
  { value: "next", label: "Next.js" },
  { value: "sveltekit", label: "SvelteKit" },
  { value: "nuxt", label: "Nuxt.js" },
  { value: "remix", label: "Remix" },
  { value: "astro", label: "Astro" },
  { value: "gatsby", label: "Gatsby" },
];

const minecraftBlocks: ComboboxOption[] = [
  { value: "stone", label: "Stone" },
  { value: "grass_block", label: "Grass Block" },
  { value: "dirt", label: "Dirt" },
  { value: "cobblestone", label: "Cobblestone" },
  { value: "oak_planks", label: "Oak Planks" },
  { value: "oak_log", label: "Oak Log" },
  { value: "glass", label: "Glass" },
  { value: "diamond_ore", label: "Diamond Ore" },
  { value: "gold_ore", label: "Gold Ore" },
  { value: "iron_ore", label: "Iron Ore" },
  { value: "coal_ore", label: "Coal Ore" },
  { value: "bedrock", label: "Bedrock" },
];

const biomes: ComboboxOption[] = [
  { value: "plains", label: "Plains" },
  { value: "desert", label: "Desert" },
  { value: "forest", label: "Forest" },
  { value: "taiga", label: "Taiga" },
  { value: "swamp", label: "Swamp" },
  { value: "mountains", label: "Mountains" },
  { value: "ocean", label: "Ocean" },
  { value: "nether", label: "Nether", disabled: true },
  { value: "end", label: "The End", disabled: true },
];

// Playground story with working controls
const PlaygroundComponent = (args: {
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
}) => {
  const [value, setValue] = useState("");

  return (
    <div style={{ minWidth: "300px" }}>
      <Combobox
        options={frameworks}
        value={value}
        onValueChange={setValue}
        placeholder={args.placeholder}
        searchPlaceholder={args.searchPlaceholder}
        emptyMessage={args.emptyMessage}
      />
      <p style={{ marginTop: "1rem", fontSize: "0.875rem", opacity: 0.7 }}>
        Selected: {value || "none"}
      </p>
    </div>
  );
};

export const Playground: Story = {
  args: {
    placeholder: "Select framework...",
    searchPlaceholder: "Search frameworks...",
    emptyMessage: "No framework found.",
  },
  render: (args) => <PlaygroundComponent {...args} />,
};

const DefaultComponent = () => {
  const [value, setValue] = useState("");

  return (
    <div style={{ minWidth: "300px" }}>
      <Combobox
        options={frameworks}
        value={value}
        onValueChange={setValue}
        placeholder="Select framework..."
        searchPlaceholder="Search frameworks..."
      />
      <p style={{ marginTop: "1rem", fontSize: "0.875rem", opacity: 0.7 }}>
        Selected: {value || "none"}
      </p>
    </div>
  );
};

export const Default: Story = {
  render: () => <DefaultComponent />,
};

const MinecraftBlocksComponent = () => {
  const [value, setValue] = useState("");

  return (
    <div style={{ minWidth: "300px" }}>
      <Combobox
        options={minecraftBlocks}
        value={value}
        onValueChange={setValue}
        placeholder="Select block..."
        searchPlaceholder="Search blocks..."
        emptyMessage="No blocks found."
      />
      <p style={{ marginTop: "1rem", fontSize: "0.875rem", opacity: 0.7 }}>
        Selected: {value || "none"}
      </p>
    </div>
  );
};

export const MinecraftBlocks: Story = {
  render: () => <MinecraftBlocksComponent />,
};

const WithDisabledOptionsComponent = () => {
  const [value, setValue] = useState("");

  return (
    <div style={{ minWidth: "300px" }}>
      <Combobox
        options={biomes}
        value={value}
        onValueChange={setValue}
        placeholder="Select biome..."
        searchPlaceholder="Search biomes..."
        emptyMessage="No biomes found."
      />
      <p style={{ marginTop: "1rem", fontSize: "0.875rem", opacity: 0.7 }}>
        Selected: {value || "none"}
      </p>
      <p style={{ marginTop: "0.5rem", fontSize: "0.75rem", opacity: 0.5 }}>
        Note: Nether and End are disabled
      </p>
    </div>
  );
};

export const WithDisabledOptions: Story = {
  render: () => <WithDisabledOptionsComponent />,
};

const CustomTriggerComponent = () => {
  const [value, setValue] = useState("");

  return (
    <div style={{ minWidth: "300px" }}>
      <Combobox
        options={frameworks}
        value={value}
        onValueChange={setValue}
        placeholder="Select framework..."
        searchPlaceholder="Search frameworks..."
        renderTrigger={({ selectedLabel, placeholder, isOpen }) => (
          <Button variant="primary" style={{ width: "100%" }}>
            {selectedLabel || placeholder} {isOpen ? "▲" : "▼"}
          </Button>
        )}
      />
      <p style={{ marginTop: "1rem", fontSize: "0.875rem", opacity: 0.7 }}>
        Selected: {value || "none"}
      </p>
    </div>
  );
};

export const CustomTrigger: Story = {
  render: () => <CustomTriggerComponent />,
};

const PreselectedComponent = () => {
  const [value, setValue] = useState("grass_block");

  return (
    <div style={{ minWidth: "300px" }}>
      <Combobox
        options={minecraftBlocks}
        value={value}
        onValueChange={setValue}
        placeholder="Select block..."
        searchPlaceholder="Search blocks..."
      />
      <p style={{ marginTop: "1rem", fontSize: "0.875rem", opacity: 0.7 }}>
        Selected: {value || "none"}
      </p>
    </div>
  );
};

export const Preselected: Story = {
  render: () => <PreselectedComponent />,
};

const LongListComponent = () => {
  const [value, setValue] = useState("");

  const longList: ComboboxOption[] = Array.from({ length: 50 }, (_, i) => ({
    value: `item-${i + 1}`,
    label: `Item ${i + 1}`,
  }));

  return (
    <div style={{ minWidth: "300px" }}>
      <Combobox
        options={longList}
        value={value}
        onValueChange={setValue}
        placeholder="Select item..."
        searchPlaceholder="Search items..."
      />
      <p style={{ marginTop: "1rem", fontSize: "0.875rem", opacity: 0.7 }}>
        Selected: {value || "none"}
      </p>
    </div>
  );
};

export const LongList: Story = {
  render: () => <LongListComponent />,
};

const InFormComponent = () => {
  const [framework, setFramework] = useState("");
  const [block, setBlock] = useState("stone");
  const [biome, setBiome] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(
      `Submitted:\nFramework: ${framework}\nBlock: ${block}\nBiome: ${biome}`,
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        minWidth: "300px",
      }}
    >
      <div>
        <label
          style={{
            display: "block",
            marginBottom: "0.5rem",
            fontSize: "0.875rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Framework
        </label>
        <Combobox
          options={frameworks}
          value={framework}
          onValueChange={setFramework}
          placeholder="Select framework..."
          searchPlaceholder="Search..."
        />
      </div>

      <div>
        <label
          style={{
            display: "block",
            marginBottom: "0.5rem",
            fontSize: "0.875rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Block Type
        </label>
        <Combobox
          options={minecraftBlocks}
          value={block}
          onValueChange={setBlock}
          placeholder="Select block..."
          searchPlaceholder="Search..."
        />
      </div>

      <div>
        <label
          style={{
            display: "block",
            marginBottom: "0.5rem",
            fontSize: "0.875rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Biome
        </label>
        <Combobox
          options={biomes}
          value={biome}
          onValueChange={setBiome}
          placeholder="Select biome..."
          searchPlaceholder="Search..."
        />
      </div>

      <Button type="submit" variant="primary">
        Submit Form
      </Button>
    </form>
  );
};

export const InForm: Story = {
  render: () => <InFormComponent />,
};
