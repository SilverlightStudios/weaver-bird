import { useCallback, useEffect, useState } from "react";
import {
  listAvailableMinecraftVersions,
  getCachedVanillaVersion,
  setVanillaTextureVersion,
  formatError,
  type MinecraftVersion,
} from "@lib/tauri";
import s from "./styles.module.scss";

export const VanillaTextureVersion = () => {
  const [versions, setVersions] = useState<MinecraftVersion[]>([]);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string>();

  // Load versions and current version on mount
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [availableVersions, cached] = await Promise.all([
          listAvailableMinecraftVersions(),
          getCachedVanillaVersion(),
        ]);

        setVersions(availableVersions);
        setCurrentVersion(cached);
        setSelectedVersion(cached ?? availableVersions[0]?.version ?? "");
        setError(undefined);
      } catch (err) {
        setError(formatError(err));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  // Handle version change
  const handleVersionChange = useCallback(async (version: string) => {
    if (!version || version === currentVersion) return;

    try {
      setSwitching(true);
      setError(undefined);
      await setVanillaTextureVersion(version);
      setCurrentVersion(version);
      setSelectedVersion(version);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSwitching(false);
    }
  }, [currentVersion]);

  return (
    <div className={s.root}>
      <div className={s.header}>
        <h3>Vanilla Texture Version</h3>
        <p>
          Select which Minecraft version to use for vanilla textures, models, and blockstates.
        </p>
      </div>

      {error && <div className={s.error}>{error}</div>}

      {loading ? (
        <div className={s.loading}>Loading available versions...</div>
      ) : versions.length === 0 ? (
        <div className={s.emptyState}>
          No Minecraft versions found. Please ensure Minecraft is installed.
        </div>
      ) : (
        <div className={s.versionSelector}>
          <label htmlFor="version-select">Minecraft Version:</label>
          <select
            id="version-select"
            value={selectedVersion}
            onChange={(e) => handleVersionChange(e.target.value)}
            disabled={switching}
            className={s.versionDropdown}
          >
            {versions.map((version) => (
              <option key={version.version} value={version.version}>
                {version.version}
                {version.version === currentVersion ? " (current)" : ""}
              </option>
            ))}
          </select>

          {switching && (
            <div className={s.switchingMessage}>
              Extracting textures for version {selectedVersion}...
            </div>
          )}

          {currentVersion && !switching && (
            <div className={s.currentVersionInfo}>
              Currently using: <strong>{currentVersion}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
