import { useEffect, useState } from "react";
import {
  getBlockStateSchema,
  type BlockStateSchema,
  type BlockPropertySchema,
} from "@lib/tauri/blockModels";
import {
  applyNaturalBlockStateDefaults,
  getBlockStateIdFromAssetId,
} from "@lib/assetUtils";
import { useSelectWinner, useSelectPacksDir } from "@state/selectors";
import { Select, type SelectOption } from "@/ui/components/Select/Select";
import { NumberInput } from "@/ui/components/NumberInput";
import { Slider } from "@/ui/components/Slider/Slider";
import s from "./BlockStatePanel.module.scss";

// Property descriptions for common block state properties
const PROPERTY_DESCRIPTIONS: Record<string, string> = {
  distance:
    "Distance from nearest log (1-7). Leaves with distance 7 will decay unless persistent.",
  persistent: "Player-placed leaves that won't decay naturally.",
  waterlogged: "Whether this block contains water.",
  facing: "Direction the block faces.",
  axis: "Orientation axis of the block.",
  half: "Upper or lower half of a two-block-tall structure.",
  type: "Variant type of this block.",
  age: "Growth stage of crops or plants.",
  level: "Fluid level or fill amount.",
  power: "Redstone signal strength (0-15).",
  lit: "Whether this block is currently lit/active.",
  open: "Whether this block is in an open state.",
  powered: "Whether this block is receiving redstone power.",
  snowy: "Whether the block has snow on top.",
  candles: "Number of candles placed on this block (1-4).",
  pickles: "Number of sea pickles in this block (1-4).",
  eggs: "Number of turtle eggs in this nest (1-4).",
  layers: "Number of snow layers (1-8).",
};

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
  // Local state for slider preview (updates during drag without triggering 3D re-render)
  const [sliderPreviewValues, setSliderPreviewValues] = useState<
    Record<string, string>
  >({});

  const winnerPackId = useSelectWinner(assetId);
  const packsDir = useSelectPacksDir();
  const blockStateAssetId = getBlockStateIdFromAssetId(assetId);
  const isMinecraftNamespace = assetId.startsWith("minecraft:");

  // Reset slider preview values when blockProps change externally
  useEffect(() => {
    setSliderPreviewValues({});
  }, [blockProps]);

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
        console.log(
          "[BlockStatePanel.loadSchema] Loading schema for:",
          assetId,
        );

        const schemaData = await getBlockStateSchema(
          packIdForSchema,
          targetBlockStateId,
          packsDir!,
        );
        console.log(
          "[BlockStatePanel.loadSchema] Schema loaded, defaultState:",
          schemaData.defaultState,
        );

        if (cancelled) return;

        setSchema(schemaData);

        // Initialize with default state synchronously when schema loads
        // This ensures blockProps are set BEFORE BlockModel tries to render
        if (
          Object.keys(schemaData.defaultState).length > 0 &&
          Object.keys(blockProps).length === 0
        ) {
          console.log(
            "[BlockStatePanel.loadSchema] Setting default state:",
            schemaData.defaultState,
          );
          const naturalDefaults = applyNaturalBlockStateDefaults(
            schemaData.defaultState,
            assetId,
          );
          onBlockPropsChange(naturalDefaults);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    assetId,
    blockStateAssetId,
    winnerPackId,
    packsDir,
    isMinecraftNamespace,
    // IMPORTANT: Do NOT include blockProps or onBlockPropsChange in deps
    // This effect should only run when the asset changes, not when props change
    // We call onBlockPropsChange inside but it's intentionally not in deps
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
      case "boolean": {
        const ripeDisabled =
          prop.name === "ripe" &&
          maxAge !== undefined &&
          Number.isFinite(currentAge) &&
          currentAge < maxAge;
        return (
          <label key={prop.name} className={s.property}>
            <span className={s.propertyName}>{prop.name}</span>
            <input
              type="checkbox"
              checked={currentValue === "true"}
              disabled={ripeDisabled}
              onChange={(e) =>
                handleChange(e.target.checked ? "true" : "false")
              }
              className={s.checkbox}
            />
          </label>
        );
      }

      case "enum": {
        const options: SelectOption[] = (prop.values || []).map((value) => ({
          value,
          label: value,
        }));
        return (
          <div key={prop.name} className={s.property}>
            <span className={s.propertyName}>{prop.name}</span>
            <Select
              options={options}
              value={currentValue}
              onValueChange={handleChange}
              placeholder="Select..."
              emptyMessage="No options"
              className={s.select}
            />
          </div>
        );
      }

      case "int": {
        const min = prop.min ?? 0;
        const max = prop.max ?? 100;
        const range = max - min;
        const useSlider = range <= 15 && range > 0; // Use slider for small ranges
        const description = PROPERTY_DESCRIPTIONS[prop.name];

        // Use preview value during drag, actual value otherwise
        const displayValue = sliderPreviewValues[prop.name] ?? currentValue;

        return (
          <div key={prop.name} className={s.propertyWithDescription}>
            {description && (
              <div className={s.propertyDescription}>{description}</div>
            )}
            <div className={s.property}>
              <span className={s.propertyName}>{prop.name}</span>
              {useSlider ? (
                <div className={s.sliderControl}>
                  <Slider
                    min={min}
                    max={max}
                    step={1}
                    value={[parseInt(displayValue) || min]}
                    onValueChange={(values) => {
                      // Update preview value during drag (visual feedback only)
                      setSliderPreviewValues({
                        ...sliderPreviewValues,
                        [prop.name]: String(values[0]),
                      });
                    }}
                    onValueCommit={(values) => {
                      // Update actual block props when drag ends (triggers 3D update)
                      const newValue = String(values[0]);
                      const newPreviewValues = { ...sliderPreviewValues };
                      delete newPreviewValues[prop.name];
                      setSliderPreviewValues(newPreviewValues);
                      handleChange(newValue);
                    }}
                    className={s.slider}
                  />
                  <span className={s.sliderValue}>{displayValue}</span>
                </div>
              ) : (
                <NumberInput
                  value={currentValue}
                  onChange={(e) => handleChange(e.target.value)}
                  min={min}
                  max={max}
                  size="sm"
                />
              )}
            </div>
          </div>
        );
      }

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

  const ageProp = schema.properties.find((prop) => prop.name === "age");
  const maxAge = ageProp?.max;
  const currentAge = parseInt(
    blockProps?.age ?? ageProp?.default ?? "0",
    10,
  );

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
        <div className={s.property}>
          <span className={s.propertyName}>Seed Value</span>
          <NumberInput
            value={seed}
            onChange={(e) => onSeedChange(parseInt(e.target.value) || 0)}
            min={0}
            step={1}
            size="sm"
          />
        </div>
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
