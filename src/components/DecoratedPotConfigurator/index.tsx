import { useState, useMemo, useEffect } from "react";
import { Combobox, type ComboboxOption } from "@/ui/components/Combobox/Combobox";
import s from "./styles.module.scss";

interface Props {
  assetId?: string;
  allAssets: Array<{ id: string; name: string }>;
}

export interface DecoratedPotConfig {
  north: string;
  south: string;
  east: string;
  west: string;
}

const DEFAULT_SHARD = "minecraft:item/brick"; // Default to brick texture

export default function DecoratedPotConfigurator({
  assetId,
  allAssets,
}: Props) {
  // State for each side of the pot
  const [sides, setSides] = useState<DecoratedPotConfig>({
    north: DEFAULT_SHARD,
    south: DEFAULT_SHARD,
    east: DEFAULT_SHARD,
    west: DEFAULT_SHARD,
  });

  // Filter all assets to only pottery shards and create options
  const shardOptions: ComboboxOption[] = useMemo(() => {
    const shards = allAssets
      .filter((asset) => {
        const path = asset.id.includes(":") ? asset.id.split(":")[1] : asset.id;
        return path.startsWith("item/pottery_shard_");
      })
      .map((asset) => {
        // Extract just the shard type without the "item/pottery_shard_" prefix
        const path = asset.id.includes(":") ? asset.id.split(":")[1] : asset.id;
        const shardType = path.replace("item/pottery_shard_", "");
        // Capitalize and format the name (e.g., "arms_up" -> "Arms Up")
        const formattedName = shardType
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
        return {
          value: asset.id,
          label: formattedName,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));

    // Add "Blank (Brick)" option at the beginning
    return [
      { value: DEFAULT_SHARD, label: "Blank (Brick)" },
      ...shards,
    ];
  }, [allAssets]);

  // Reset sides when asset changes
  useEffect(() => {
    setSides({
      north: DEFAULT_SHARD,
      south: DEFAULT_SHARD,
      east: DEFAULT_SHARD,
      west: DEFAULT_SHARD,
    });
  }, [assetId]);

  const handleSideChange = (side: keyof DecoratedPotConfig, value: string) => {
    setSides((prev) => ({ ...prev, [side]: value }));
  };

  if (shardOptions.length <= 1) {
    return (
      <div className={s.root}>
        <p className={s.noShards}>
          No pottery shards found in the loaded resource packs.
        </p>
      </div>
    );
  }

  return (
    <div className={s.root}>
      <div className={s.header}>
        <h3 className={s.title}>Decorated Pot Configuration</h3>
        <p className={s.description}>
          Select pottery shards for each side of the decorated pot
        </p>
      </div>

      <div className={s.sides}>
        {(["north", "south", "east", "west"] as const).map((side) => (
          <div key={side} className={s.sideControl}>
            <label className={s.label} htmlFor={`${side}-shard-select`}>
              {side.charAt(0).toUpperCase() + side.slice(1)} Side
            </label>
            <Combobox
              options={shardOptions}
              value={sides[side]}
              onValueChange={(value) => handleSideChange(side, value)}
              placeholder="Select a shard..."
              searchPlaceholder="Search shards..."
              emptyMessage="No shards found"
              className={s.combobox}
            />
          </div>
        ))}
      </div>

      <div className={s.hint}>
        {shardOptions.length - 1} pottery shard{shardOptions.length - 1 !== 1 ? "s" : ""} available
      </div>
    </div>
  );
}
