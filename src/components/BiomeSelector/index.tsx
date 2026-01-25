import { useMemo } from "react";
import { Combobox } from "@/ui/components/Combobox/Combobox";
import { BIOMES } from "@/components/BiomeColorCard/biomeData";
import { useStore } from "@state/store";
import { handleBiomeSelection } from "./utilities";
import s from "./styles.module.scss";

/**
 * Biome selector for controlling foliage/grass colors globally
 * Sets colormap coordinates based on selected biome, or uses hex colors for noise biomes
 */
export const BiomeSelector = () => {
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

  const biomeOptions = useMemo(
    () =>
      BIOMES.map((biome) => ({
        value: biome.id,
        label: biome.name,
      })),
    [],
  );

  const handleBiomeChange = (biomeId: string) => {
    handleBiomeSelection(
      biomeId,
      setSelectedBiomeId,
      setColormapCoordinates,
      setSelectedGrassColor,
      setSelectedFoliageColor,
    );
  };

  return (
    <div className={s.container}>
      <label className={s.label}>Biome:</label>
      <Combobox
        options={biomeOptions}
        value={selectedBiomeId ?? "plains"}
        onValueChange={handleBiomeChange}
        placeholder="Select biome..."
        searchPlaceholder="Search biomes..."
        emptyMessage="No biomes found"
        className={s.trigger}
      />
    </div>
  );
};
