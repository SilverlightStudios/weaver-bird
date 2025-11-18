import { useEffect, useState } from "react";
import {
  getBlockStateSchema,
  type BlockStateSchema,
  type BlockPropertySchema,
} from "@lib/tauri/blockModels";
import { getBlockStateIdFromAssetId } from "@lib/assetUtils";
import { useSelectWinner, useSelectPacksDir } from "@state/selectors";
import s from "./BlockStatePanel.module.scss";

interface Props {
  assetId: string;
  blockProps: Record<string, string>;
  onBlockPropsChange: (props: Record<string, string>) => void;
  seed: number;
  onSeedChange: (seed: number) => void;
}

export default function BlockStatePanel({
  assetId,
  blockProps,
  onBlockPropsChange,
  seed,
  onSeedChange,
}: Props) {
  const [schema, setSchema] = useState<BlockStateSchema | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const winnerPackId = useSelectWinner(assetId);
  const packsDir = useSelectPacksDir();
  const blockStateAssetId = getBlockStateIdFromAssetId(assetId);
  const isMinecraftNamespace = assetId.startsWith("minecraft:");

  // Load schema when asset changes
  useEffect(() => {
    const targetPackId =
      winnerPackId ?? (isMinecraftNamespace ? "minecraft:vanilla" : undefined);
    if (!targetPackId || !packsDir || !blockStateAssetId) {
      setSchema(null);
      return;
    }

    const packIdForSchema: string = targetPackId;
    const targetBlockStateId = blockStateAssetId;

    let cancelled = false;

    async function loadSchema() {
      setLoading(true);
      setError(null);

      try {
        console.log("[BlockStatePanel] Loading schema for:", assetId);

        const schemaData = await getBlockStateSchema(
          packIdForSchema,
          targetBlockStateId,
          packsDir!,
        );
        console.log("[BlockStatePanel] Schema loaded:", schemaData);

        if (cancelled) return;

        setSchema(schemaData);
        // Initialize with default state if no props set
        if (Object.keys(blockProps).length === 0) {
          onBlockPropsChange(schemaData.defaultState);
        }
        setLoading(false);
      } catch (err) {
        console.error("[BlockStatePanel] Error loading schema:", err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setSchema(null);
          setLoading(false);
        }
      }
    }

    loadSchema();

    return () => {
      cancelled = true;
    };
  }, [
    assetId,
    blockStateAssetId,
    winnerPackId,
    packsDir,
    isMinecraftNamespace,
    blockProps,
    onBlockPropsChange,
  ]);

  // Render property control based on type
  const renderPropertyControl = (prop: BlockPropertySchema) => {
    // Safety check: ensure blockProps is defined
    if (!blockProps) {
      console.warn(
        "[BlockStatePanel] blockProps is undefined for property:",
        prop.name,
      );
      return null;
    }

    const currentValue = blockProps[prop.name] ?? prop.default;

    const handleChange = (newValue: string) => {
      // Safety check before spreading
      if (!blockProps) {
        console.error(
          "[BlockStatePanel] Cannot update props - blockProps is undefined",
        );
        return;
      }

      onBlockPropsChange({
        ...blockProps,
        [prop.name]: newValue,
      });
    };

    switch (prop.type) {
      case "boolean":
        return (
          <label key={prop.name} className={s.property}>
            <span className={s.propertyName}>{prop.name}</span>
            <input
              type="checkbox"
              checked={currentValue === "true"}
              onChange={(e) =>
                handleChange(e.target.checked ? "true" : "false")
              }
              className={s.checkbox}
            />
          </label>
        );

      case "enum":
        return (
          <label key={prop.name} className={s.property}>
            <span className={s.propertyName}>{prop.name}</span>
            <select
              value={currentValue}
              onChange={(e) => handleChange(e.target.value)}
              className={s.select}
            >
              {prop.values?.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        );

      case "int":
        return (
          <label key={prop.name} className={s.property}>
            <span className={s.propertyName}>{prop.name}</span>
            <input
              type="number"
              value={currentValue}
              onChange={(e) => handleChange(e.target.value)}
              min={prop.min}
              max={prop.max}
              className={s.numberInput}
            />
          </label>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className={s.root}>
        <div className={s.header}>Block State</div>
        <div className={s.loading}>Loading...</div>
      </div>
    );
  }

  if (error || !schema) {
    // Don't show panel if there's no schema (simple blocks with no properties)
    return null;
  }

  if (schema.properties.length === 0) {
    // No properties to configure
    return null;
  }

  return (
    <div className={s.root}>
      <div className={s.header}>Block State</div>
      <div className={s.description}>
        Configure how this block appears in-game. Block state properties control
        orientation, connection states, and visual variants.
      </div>
      <div className={s.properties}>
        {schema.properties.map(renderPropertyControl)}
      </div>
      <div className={s.seedControl}>
        <div className={s.seedDescription}>
          <strong>Random Seed:</strong> Controls which texture variant is
          selected when multiple variants exist. Change the seed to see
          different random variations of this block.
        </div>
        <label className={s.property}>
          <span className={s.propertyName}>Seed Value</span>
          <input
            type="number"
            value={seed}
            onChange={(e) => onSeedChange(parseInt(e.target.value) || 0)}
            className={s.numberInput}
            min={0}
            step={1}
          />
        </label>
        <button
          onClick={() => onSeedChange(Math.floor(Math.random() * 1000000))}
          className={s.randomButton}
        >
          Randomize
        </button>
      </div>
    </div>
  );
}
