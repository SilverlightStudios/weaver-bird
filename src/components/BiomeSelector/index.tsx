import { Select } from "@/ui/components/Select/Select";
import { BIOMES } from "@components/BiomeColorPicker/biomeData";
import { useStore } from "@state/store";
import { biomeToCoordinates } from "@lib/colormapManager";
import s from "./styles.module.scss";

/**
 * Biome selector for controlling foliage/grass colors globally
 * Sets colormap coordinates based on selected biome
 */
export default function BiomeSelector() {
  const selectedBiomeId = useStore((state) => state.selectedBiomeId);
  const setColormapCoordinates = useStore(
    (state) => state.setColormapCoordinates,
  );

  const biomeOptions = BIOMES.map((biome) => ({
    value: biome.id,
    label: biome.name,
  }));

  const handleBiomeChange = (biomeId: string) => {
    console.log("[BiomeSelector] Biome selected:", biomeId);

    // Get coordinates for this biome and update global state
    const coords = biomeToCoordinates(biomeId);
    if (coords) {
      setColormapCoordinates(coords);
      console.log("[BiomeSelector] Set coordinates:", coords);
    } else {
      console.warn(
        "[BiomeSelector] Could not find coordinates for biome:",
        biomeId,
      );
    }
  };

  return (
    <div className={s.container}>
      <label className={s.label}>Biome:</label>
      <Select
        options={biomeOptions}
        value={selectedBiomeId || "plains"}
        onValueChange={handleBiomeChange}
        placeholder="Select biome"
        className={s.trigger}
      />
    </div>
  );
}
