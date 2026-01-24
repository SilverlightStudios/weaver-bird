import type { TabItem } from "@/ui/components/blocky-tabs/types";
import { BiomeSelector } from "@components/BiomeSelector";
import { BiomeColorCard } from "@components/BiomeColorCard";
import logImg from "@/assets/textures/log.png";

export function createBiomeColormapsTab(): TabItem {
  return {
    id: "biome-colormaps",
    label: "Biome & Colormaps",
    icon: logImg,
    color: "#8BC34A",
    defaultDrawerSize: 30,
    content: (
      <div
        style={{
          padding: "var(--spacing-md)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--spacing-lg)",
        }}
      >
        <div>
          <h3 style={{ marginTop: 0, marginBottom: "var(--spacing-md)" }}>
            Select Biome
          </h3>
          <BiomeSelector />
          <p
            style={{
              fontSize: "0.85rem",
              color: "#888",
              marginTop: "0.5rem",
            }}
          >
            Choose a biome to automatically set grass and foliage colors,
            or click directly on the colormaps below.
          </p>
        </div>

        <div>
          <h3 style={{ marginTop: 0, marginBottom: "var(--spacing-md)" }}>
            Grass Colormap
          </h3>
          <BiomeColorCard
            assetId="minecraft:colormap/grass"
            type="grass"
            showSourceSelector={true}
            updateGlobalState={true}
          />
        </div>
        <div>
          <h3 style={{ marginTop: 0, marginBottom: "var(--spacing-md)" }}>
            Foliage Colormap
          </h3>
          <BiomeColorCard
            assetId="minecraft:colormap/foliage"
            type="foliage"
            showSourceSelector={true}
            updateGlobalState={true}
          />
        </div>
      </div>
    ),
  };
}
