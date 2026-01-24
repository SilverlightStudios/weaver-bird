import type { JEMModelPart, AnimationLayer } from "./jemLoader";
import { invoke } from "@tauri-apps/api/core";

/**
 * JPM (JSON Part Model) file format.
 * Used by OptiFine/EMF for external model references.
 */
export type JPMFile = Omit<JEMModelPart, "part" | "id" | "animations"> & {
  credit?: string;
  animations?: AnimationLayer[];
};

/**
 * Load a JPM file from the resource pack.
 * Returns null if missing or invalid.
 */
export async function loadJpmFile(
  jpmFileName: string,
  packPath: string,
  isZip: boolean,
  jemDir: string,
): Promise<JPMFile | null> {
  try {
    const ref = jpmFileName.replace(/\\/g, "/");
    const resolved =
      ref.startsWith("assets/") || ref.startsWith("minecraft/")
        ? ref.startsWith("assets/")
          ? ref
          : `assets/${ref}`
        : `${jemDir}${ref}`;
    const jpmPath = resolved;
    console.log(`[EMF] Loading JPM file: ${jpmPath}`);

    const jpmContent = await invoke<string>("read_pack_file", {
      packPath,
      filePath: jpmPath,
      isZip,
    });

    return JSON.parse(jpmContent) as JPMFile;
  } catch (error) {
    console.log(`[EMF] Failed to load JPM file ${jpmFileName}:`, error);
    return null;
  }
}
