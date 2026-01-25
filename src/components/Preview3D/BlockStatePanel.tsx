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
import {
  BooleanPropertyControl,
  EnumPropertyControl,
  IntPropertyControl,
} from "./BlockStatePanel/PropertyControls";
import { NumberInput } from "@/ui/components/NumberInput";
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
          const defaultState = { ...schemaData.defaultState };
          if (assetId.includes("campfire") && defaultState.lit === "false") {
            defaultState.lit = "true";
          }
          const naturalDefaults = applyNaturalBlockStateDefaults(
            defaultState,
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

    void loadSchema();

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
    if (!blockProps) {
      console.warn("[BlockStatePanel] blockProps is undefined for property:", prop.name);
      return null;
    }

    const currentValue = blockProps[prop.name] ?? prop.default;

    const handleChange = (newValue: string) => {
      if (!blockProps) {
        console.error("[BlockStatePanel] Cannot update props - blockProps is undefined");
        return;
      }

      const updatedProps = { ...blockProps, [prop.name]: newValue };
      console.log(`[BlockStatePanel] Updating ${prop.name} from ${blockProps[prop.name]} to ${newValue}`);
      console.log(`[BlockStatePanel] New blockProps:`, updatedProps);
      onBlockPropsChange(updatedProps);
    };

    const handleSliderPreviewChange = (propName: string, value: string | null) => {
      if (value === null) {
        const newPreviewValues = { ...sliderPreviewValues };
        delete newPreviewValues[propName];
        setSliderPreviewValues(newPreviewValues);
      } else {
        setSliderPreviewValues({ ...sliderPreviewValues, [propName]: value });
      }
    };

    switch (prop.type) {
      case "boolean":
        return (
          <BooleanPropertyControl
            key={prop.name}
            prop={prop}
            currentValue={currentValue}
            onValueChange={handleChange}
            maxAge={maxAge}
            currentAge={currentAge}
          />
        );

      case "enum":
        return (
          <EnumPropertyControl
            key={prop.name}
            prop={prop}
            currentValue={currentValue}
            blockProps={blockProps}
            onValueChange={handleChange}
          />
        );

      case "int":
        return (
          <IntPropertyControl
            key={prop.name}
            prop={prop}
            currentValue={currentValue}
            onValueChange={handleChange}
            sliderPreviewValues={sliderPreviewValues}
            onSliderPreviewChange={handleSliderPreviewChange}
          />
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
