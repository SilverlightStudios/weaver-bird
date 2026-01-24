/**
 * Hook that handles initialization effects for the MainRoute component.
 * - Launcher detection on startup
 * - Menu event listeners (macOS)
 * - Vanilla texture initialization
 * - Search query page reset
 */
import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { initializeVanillaTextures, detectLaunchers } from "@lib/tauri";
import type { LauncherInfo } from "@lib/tauri";

interface UseMainRouteEffectsProps {
  setAvailableLaunchers: (launchers: LauncherInfo[]) => void;
  setSelectedLauncher: (launcher: LauncherInfo) => void;
  setSettingsOpen: (open: boolean) => void;
  setCurrentPage: (page: number) => void;
  searchQuery: string;
}

export function useMainRouteEffects({
  setAvailableLaunchers,
  setSelectedLauncher,
  setSettingsOpen,
  setCurrentPage,
  searchQuery,
}: UseMainRouteEffectsProps): void {
  // Detect launchers on startup
  useEffect(() => {
    const loadLaunchers = async () => {
      try {
        const launchers = await detectLaunchers();
        setAvailableLaunchers(launchers);

        // Auto-select the first found launcher
        const firstFound = launchers.find((l) => l.found);
        if (firstFound) {
          setSelectedLauncher(firstFound);
        }
      } catch (error) {
        console.warn("Failed to detect launchers:", error);
      }
    };
    void loadLaunchers();
  }, [setAvailableLaunchers, setSelectedLauncher]);

  // Listen for menu events (macOS)
  useEffect(() => {
    void listen("open-settings", () => {
      setSettingsOpen(true);
    });
  }, [setSettingsOpen]);

  // Initialize vanilla textures on startup
  useEffect(() => {
    let cancelled = false;

    const initVanillaTextures = async () => {
      if (cancelled) return;

      try {
        await initializeVanillaTextures();
        console.log("Vanilla textures initialized");
      } catch (error) {
        console.warn("Could not auto-initialize vanilla textures:", error);
      }
    };
    void initVanillaTextures();

    return () => {
      cancelled = true;
    };
  }, []);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, setCurrentPage]);
}
