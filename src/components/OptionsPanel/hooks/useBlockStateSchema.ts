import { useState, useEffect } from "react";
import {
  getBlockStateSchema,
  type BlockStateSchema,
} from "@lib/tauri/blockModels";

export const useBlockStateSchema = (
  assetId: string | null | undefined,
  blockStateAssetId: string | null,
  winnerPackId: string | null,
  packsDir: string | null,
  isColormapSelection: boolean,
  isMinecraftNamespace: boolean,
) => {
  const [schema, setSchema] = useState<BlockStateSchema | null>(null);

  useEffect(() => {
    const isGUITexture = assetId?.includes("gui/");
    const isEntityTexture = assetId?.includes("entity/");

    if (
      !assetId ||
      isColormapSelection ||
      !packsDir ||
      !blockStateAssetId ||
      isGUITexture ||
      isEntityTexture
    ) {
      setSchema(null);
      return;
    }

    const targetPackId =
      winnerPackId ?? (isMinecraftNamespace ? "minecraft:vanilla" : null);

    if (!targetPackId) {
      setSchema(null);
      return;
    }

    let cancelled = false;

    async function loadSchema() {
      try {
        const schemaData = await getBlockStateSchema(
          targetPackId!,
          blockStateAssetId!,
          packsDir!,
        );
        if (!cancelled) {
          setSchema(schemaData);
        }
      } catch (err) {
        console.error("[OptionsPanel] Error loading schema:", err);
        if (!cancelled) {
          setSchema(null);
        }
      }
    }
    void loadSchema();

    return () => {
      cancelled = true;
    };
  }, [
    assetId,
    blockStateAssetId,
    winnerPackId,
    packsDir,
    isColormapSelection,
    isMinecraftNamespace,
  ]);

  return schema;
};
