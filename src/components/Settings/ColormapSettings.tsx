import BiomeColorCard from "@app/BiomeColorCard";
import s from "./ColormapSettings.module.scss";

/**
 * Colormap settings panel
 * Allows users to select which resource pack's grass and foliage colormaps to use
 */
export default function ColormapSettings() {
  const handleGrassColorSelect = (color: {
    r: number;
    g: number;
    b: number;
  }) => {
    // Not used directly, but required by BiomeColorCard
    // The card will update global state through its own handlers
    console.log("[ColormapSettings] Grass color selected:", color);
  };

  const handleFoliageColorSelect = (color: {
    r: number;
    g: number;
    b: number;
  }) => {
    // Not used directly, but required by BiomeColorCard
    // The card will update global state through its own handlers
    console.log("[ColormapSettings] Foliage color selected:", color);
  };

  return (
    <div className={s.container}>
      <div className={s.header}>
        <h2 className={s.title}>Colormap Settings</h2>
        <p className={s.description}>
          Select which resource pack's colormaps to use for grass and foliage
          tinting. These affect how leaves and grass appear in different biomes.
        </p>
      </div>

      <div className={s.colormaps}>
        <div className={s.colormapSection}>
          <h3 className={s.sectionTitle}>Foliage Colormap</h3>
          <p className={s.sectionDescription}>
            Controls the color of leaves in different biomes
          </p>
          <BiomeColorCard
            assetId="minecraft:colormap/foliage"
            type="foliage"
            onColorSelect={handleFoliageColorSelect}
            showSourceSelector={true}
            accent="emerald"
          />
        </div>

        <div className={s.colormapSection}>
          <h3 className={s.sectionTitle}>Grass Colormap</h3>
          <p className={s.sectionDescription}>
            Controls the color of grass blocks and grass in different biomes
          </p>
          <BiomeColorCard
            assetId="minecraft:colormap/grass"
            type="grass"
            onColorSelect={handleGrassColorSelect}
            showSourceSelector={true}
            accent="emerald"
          />
        </div>
      </div>

      <div className={s.info}>
        <p className={s.infoText}>
          💡 <strong>Tip:</strong> Click a biome marker to see how that biome's
          color looks, or click anywhere on the colormap to select a custom
          color. Use the dropdown to switch between different resource packs'
          colormaps.
        </p>
      </div>
    </div>
  );
}
