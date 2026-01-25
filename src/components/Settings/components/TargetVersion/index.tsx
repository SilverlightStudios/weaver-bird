import { useEffect, useState } from "react";
import { useStore } from "@state";
import { getAllMinecraftVersions, getLatestMinecraftVersion } from "@lib/packFormatCompatibility";
import { getCachedVanillaVersion } from "@lib/tauri";
import s from "./styles.module.scss";

export const TargetVersion = () => {
  const targetMinecraftVersion = useStore((state) => state.targetMinecraftVersion);
  const setTargetMinecraftVersion = useStore((state) => state.setTargetMinecraftVersion);
  const [vanillaVersion, setVanillaVersion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Get all available Minecraft versions
  const versions = getAllMinecraftVersions();
  const latestVersion = getLatestMinecraftVersion();

  // Load current vanilla version on mount
  useEffect(() => {
    const loadVanillaVersion = async () => {
      try {
        setLoading(true);
        const cached = await getCachedVanillaVersion();
        setVanillaVersion(cached ?? latestVersion);

        // If no target version is set, default to vanilla version
        if (targetMinecraftVersion === null && cached) {
          setTargetMinecraftVersion(cached);
        }
      } catch (err) {
        console.error("[TargetVersion] Failed to load vanilla version:", err);
        setVanillaVersion(latestVersion);
      } finally {
        setLoading(false);
      }
    };
    void loadVanillaVersion();
  }, [latestVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle version change
  const handleVersionChange = (version: string) => {
    // "auto" means use current vanilla version
    if (version === "auto") {
      setTargetMinecraftVersion(null);
    } else {
      setTargetMinecraftVersion(version);
    }
  };

  const effectiveVersion = targetMinecraftVersion ?? vanillaVersion ?? latestVersion;

  return (
    <div className={s.root}>
      <div className={s.header}>
        <h3>Target Minecraft Version</h3>
        <p>
          Select which Minecraft version you're targeting for pack compatibility.
          This affects entity model selection when packs have version-specific variants.
        </p>
      </div>

      {loading ? (
        <div className={s.loading}>Loading versions...</div>
      ) : (
        <div className={s.versionSelector}>
          <label htmlFor="target-version-select">Target Version:</label>
          <select
            id="target-version-select"
            value={targetMinecraftVersion ?? "auto"}
            onChange={(e) => handleVersionChange(e.target.value)}
            className={s.versionDropdown}
          >
            <option value="auto">
              Auto (Current Vanilla: {vanillaVersion ?? latestVersion})
            </option>
            <optgroup label="Minecraft Versions">
              {versions.reverse().map((version) => (
                <option key={version} value={version}>
                  {version}
                </option>
              ))}
            </optgroup>
          </select>

          <div className={s.currentVersionInfo}>
            Currently targeting: <strong>{effectiveVersion}</strong>
            {targetMinecraftVersion === null && (
              <span> (auto-detected from vanilla textures)</span>
            )}
          </div>

          <div className={s.infoBox}>
            <p>
              <strong>Why set a target version?</strong>
            </p>
            <p>
              Some entities (like cows) have different models in different Minecraft versions.
              When resource packs provide version-specific models, Weaverbird will automatically
              choose the correct one based on your target version.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
