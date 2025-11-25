import { Combobox } from "@/ui/components/Combobox/Combobox";
import { BIOMES, getBiome } from "@components/BiomeColorPicker/biomeData";
import { useStore } from "@state/store";
import { getBiomeColors } from "@lib/colormapManager";
import { hexToRgb } from "@/constants/biomeCoordinates";
import s from "./styles.module.scss";

/**
 * Biome selector for controlling foliage/grass colors globally
 * Sets colormap coordinates based on selected biome, or uses hex colors for noise biomes
 */
export default function BiomeSelector() {
  const selectedBiomeId = useStore((state) => state.selectedBiomeId);
  const setSelectedBiomeId = useStore((state) => state.setSelectedBiomeId);
  const setColormapCoordinates = useStore(
    (state) => state.setColormapCoordinates,
  );
  const setSelectedGrassColor = useStore(
    (state) => state.setSelectedGrassColor,
  );
  const setSelectedFoliageColor = useStore(
    (state) => state.setSelectedFoliageColor,
  );

  const biomeOptions = BIOMES.map((biome) => ({
    value: biome.id,
    label: biome.name,
  }));

  const handleBiomeChange = (biomeId: string) => {
    if (!biomeId) return; // Handle empty selection
    console.log("[BiomeSelector] Biome selected:", biomeId);

    const biome = getBiome(biomeId);
    if (!biome) {
      console.warn("[BiomeSelector] Biome not found:", biomeId);
      return;
    }

    // Store the user's exact biome selection
    setSelectedBiomeId(biomeId);

    // Handle coordinate-based biomes
    if (biome.coords) {
      setColormapCoordinates(biome.coords);
      setSelectedGrassColor(undefined);
      setSelectedFoliageColor(undefined);
      console.log("[BiomeSelector] Set coordinates:", biome.coords);
    }
    // Handle noise biomes with hex colors
    else if (biome.grassHexColor || biome.foliageHexColor) {
      setColormapCoordinates(undefined);

      if (biome.grassHexColor) {
        const grassRgb = hexToRgb(biome.grassHexColor);
        if (grassRgb) {
          setSelectedGrassColor(grassRgb);
          console.log("[BiomeSelector] Set grass color from hex:", grassRgb);
        }
      }

      if (biome.foliageHexColor) {
        const foliageRgb = hexToRgb(biome.foliageHexColor);
        if (foliageRgb) {
          setSelectedFoliageColor(foliageRgb);
          console.log(
            "[BiomeSelector] Set foliage color from hex:",
            foliageRgb,
          );
        }
      }

      console.log("[BiomeSelector] Using hex colors for noise biome:", biomeId);
    } else {
      console.warn(
        "[BiomeSelector] No coordinate or hex color data for biome:",
        biomeId,
      );
    }
  };

  return (
    <div className={s.container}>
      <label className={s.label}>Biome:</label>
      <Combobox
        options={biomeOptions}
        value={selectedBiomeId || "plains"}
        onValueChange={handleBiomeChange}
        placeholder="Select biome..."
        searchPlaceholder="Search biomes..."
        emptyMessage="No biomes found"
        className={s.trigger}
      />
    </div>
  );
}
