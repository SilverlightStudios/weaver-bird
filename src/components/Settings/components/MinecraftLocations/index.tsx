import { useCallback, useEffect, useState } from "react";
import {
  detectLaunchers,
  identifyLauncher,
  openFolderDialog,
  formatError,
  type LauncherInfo,
} from "@lib/tauri";
import { convertFileSrc } from "@tauri-apps/api/core";
import s from "./styles.module.scss";

export const MinecraftLocations = () => {
  const [launchers, setLaunchers] = useState<LauncherInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  // Detect launchers on mount
  useEffect(() => {
    const detect = async () => {
      try {
        setLoading(true);
        const detected = await detectLaunchers();
        setLaunchers(detected);
        setError(undefined);
      } catch (err) {
        setError(formatError(err));
      } finally {
        setLoading(false);
      }
    };
    void detect();
  }, []);

  // Handle browse for a specific launcher
  const handleBrowse = useCallback(async (index: number) => {
    try {
      const selected = await openFolderDialog();
      if (!selected) return;

      // Identify what launcher this is
      const identified = await identifyLauncher(selected);

      // Update the launcher in the list
      setLaunchers((prev) => {
        const updated = [...prev];
        updated[index] = identified;
        return updated;
      });

      setError(undefined);
    } catch (err) {
      setError(formatError(err));
    }
  }, []);

  // Handle adding a new custom launcher
  const handleAddCustom = useCallback(async () => {
    try {
      const selected = await openFolderDialog();
      if (!selected) return;

      // Identify what launcher this is
      const identified = await identifyLauncher(selected);

      // Add to the list
      setLaunchers((prev) => [...prev, identified]);
      setError(undefined);
    } catch (err) {
      setError(formatError(err));
    }
  }, []);

  return (
    <div className={s.root}>
      <div className={s.instructions}>
        <h3>Minecraft Installation Locations</h3>
        <p>
          Select your Minecraft installation directory. Look for folders
          containing:
        </p>
        <ul>
          <li>
            <strong>versions</strong> folder (Official Launcher)
          </li>
          <li>
            <strong>instances</strong> folder (Prism, MultiMC, etc.)
          </li>
          <li>
            <strong>profiles</strong> folder (Modrinth App)
          </li>
        </ul>
      </div>

      {error && <div className={s.error}>{error}</div>}

      {loading ? (
        <div className={s.loading}>Detecting launchers...</div>
      ) : (
        <>
          <div className={s.launchers}>
            {launchers.length === 0 ? (
              <div className={s.emptyState}>
                No Minecraft launchers detected. Click "Add Custom Location"
                below to add one manually.
              </div>
            ) : (
              launchers.map((launcher, index) => (
                <div
                  key={`${launcher.launcher_type}-${index}`}
                  className={s.launcher}
                >
                  <div className={s.launcherIcon}>
                    {launcher.icon_path && (
                      <img
                        src={convertFileSrc(launcher.icon_path)}
                        alt={`${launcher.name} icon`}
                      />
                    )}
                  </div>
                  <div className={s.launcherInfo}>
                    <div className={s.launcherName}>{launcher.name}</div>
                    <div className={s.launcherPath}>
                      <input
                        type="text"
                        value={launcher.minecraft_dir}
                        readOnly
                        className={s.pathInput}
                      />
                    </div>
                  </div>
                  <button
                    className={s.browseButton}
                    onClick={() => handleBrowse(index)}
                  >
                    Browse
                  </button>
                </div>
              ))
            )}
          </div>

          <button className={s.addButton} onClick={handleAddCustom}>
            + Add Custom Location
          </button>
        </>
      )}
    </div>
  );
}
