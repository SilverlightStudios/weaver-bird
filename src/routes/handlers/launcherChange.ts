/**
 * Handler for launcher selection change
 */

import type { PackMeta } from "@state";
import type { LauncherInfo } from "@lib/tauri";
import { getLauncherResourcepacksDir, scanPacksFolder, getEntityVersionVariants, formatError } from "@lib/tauri";

export async function handleLauncherChangeLogic(params: {
  launcher: LauncherInfo;
  packsDir: string;
  packsLength: number;
  setSelectedLauncher: (launcher: LauncherInfo) => void;
  setPacksDir: (dir: string) => void;
  setPacksDirInStore: (dir: string) => void;
  setErrorMessage: (msg: string | undefined) => void;
  setSuccessMessage: (msg: string) => void;
  ingestPacks: (packs: PackMeta[]) => void;
  setPackFormats: (formats: Record<string, number>) => void;
  ingestAssets: (assets: unknown[]) => void;
  ingestAllProviders: (providers: unknown) => void;
  setEntityVersionVariants: (variants: Record<string, string[]>) => void;
  setPackOrder: (order: string[]) => void;
}): Promise<void> {
  const {
    launcher,
    packsDir,
    packsLength,
    setSelectedLauncher,
    setPacksDir,
    setPacksDirInStore,
    setErrorMessage,
    setSuccessMessage,
    ingestPacks,
    setPackFormats,
    ingestAssets,
    ingestAllProviders,
    setEntityVersionVariants,
    setPackOrder,
  } = params;

  try {
    setSelectedLauncher(launcher);

    // Get the resourcepacks directory for this launcher
    const resourcepacksDir = await getLauncherResourcepacksDir(launcher);

    // Check if we should auto-switch to resourcepacks folder
    // Auto-switch if: current folder is empty, has no packs, or is not set
    const shouldAutoSwitch = !packsDir || packsLength === 0;

    if (!shouldAutoSwitch) {
      setSuccessMessage(`Selected launcher: ${launcher.name}`);
      return;
    }

    setPacksDir(resourcepacksDir);
    setPacksDirInStore(resourcepacksDir);
    setErrorMessage(undefined);

    // Scan the resourcepacks folder
    const result = await scanPacksFolder(resourcepacksDir);
    ingestPacks(result.packs);

    // Extract pack formats from packs
    const packFormats = result.packs.reduce(
      (acc: Record<string, number>, pack: PackMeta) => {
        if (pack.pack_format !== undefined) {
          acc[pack.id] = pack.pack_format;
        }
        return acc;
      },
      {},
    );
    setPackFormats(packFormats);

    ingestAssets(result.assets);
    ingestAllProviders(result.providers);

    // Load entity version variants
    try {
      const variants = await getEntityVersionVariants(resourcepacksDir);
      setEntityVersionVariants(variants);
      console.log("[Auto-scan] Entity version variants loaded:", variants);
    } catch (err) {
      console.warn("[Auto-scan] Failed to load entity version variants:", err);
      setEntityVersionVariants({});
    }

    // Set pack order to scan order
    if (result.packs.length > 0) {
      setPackOrder(result.packs.map((p: PackMeta) => p.id));
    }

    setSuccessMessage(
      `Switched to ${launcher.name} - Loaded ${result.packs.length} resource pack(s)`,
    );
  } catch (error) {
    const msg = formatError(error);
    setErrorMessage(`Failed to switch launcher: ${msg}`);
  }
}
