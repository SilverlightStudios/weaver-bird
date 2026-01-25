/**
 * Handler for browsing and loading resource packs folder
 */

import type { PackMeta } from "@state";
import { openFolderDialog, scanPacksFolder, getEntityVersionVariants, formatError } from "@lib/tauri";

export async function browsePacksFolder(params: {
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
    console.log("[browsePacksFolder] Opening folder dialog...");
    const selected = await openFolderDialog();
    if (!selected) return;

    console.log("[browsePacksFolder] Folder selected:", selected);
    setPacksDir(selected);
    setPacksDirInStore(selected);
    setErrorMessage(undefined);

    console.log("[browsePacksFolder] Scanning packs folder...");
    const result = await scanPacksFolder(selected);
    console.log(
      "[browsePacksFolder] Scan complete. Packs:",
      result.packs.length,
      "Assets:",
      result.assets.length,
    );

    console.log("[browsePacksFolder] Ingesting packs...");
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

    console.log("[browsePacksFolder] Ingesting assets...");
    ingestAssets(result.assets);

    console.log("[browsePacksFolder] Ingesting providers (batch)...");
    ingestAllProviders(result.providers);
    console.log("[browsePacksFolder] Providers ingested");

    // Load entity version variants
    console.log("[browsePacksFolder] Loading entity version variants...");
    try {
      const variants = await getEntityVersionVariants(selected);
      setEntityVersionVariants(variants);
      console.log("[browsePacksFolder] Entity version variants loaded:", variants);
    } catch (err) {
      console.warn("[browsePacksFolder] Failed to load entity version variants:", err);
      setEntityVersionVariants({});
    }

    // Set pack order to scan order
    if (result.packs.length > 0) {
      console.log("[browsePacksFolder] Setting pack order...");
      setPackOrder(result.packs.map((p: PackMeta) => p.id));
    }

    console.log("[browsePacksFolder] All done! Setting success message...");
    setSuccessMessage(`Loaded ${result.packs.length} resource pack(s)`);
    console.log("[browsePacksFolder] Complete!");
  } catch (error) {
    const msg = formatError(error);
    setErrorMessage(msg);
  }
}
