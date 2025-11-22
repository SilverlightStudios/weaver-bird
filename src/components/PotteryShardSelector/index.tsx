import { useMemo } from "react";
import { Combobox, type ComboboxOption } from "@/ui/components/Combobox/Combobox";
import s from "./styles.module.scss";

interface Props {
  assetId?: string;
  allAssets: Array<{ id: string; name: string }>;
  onSelectShard: (shardId: string) => void;
  includeItems?: boolean; // Include item/pottery_shard_* assets
  includeEntity?: boolean; // Include entity/decorated_pot/* assets
}

export default function PotteryShardSelector({
  assetId,
  allAssets,
  onSelectShard,
  includeItems = true,
  includeEntity = true,
}: Props) {
  // Filter all assets to pottery shards and entity decorated pot textures
  const shardOptions: ComboboxOption[] = useMemo(() => {
    const options = allAssets
      .filter((asset) => {
        const path = asset.id.includes(":") ? asset.id.split(":")[1] : asset.id;

        // Include pottery shard items
        if (includeItems && path.startsWith("item/pottery_shard_")) {
          return true;
        }

        // Include entity decorated pot textures
        if (includeEntity && path.startsWith("entity/decorated_pot/")) {
          return true;
        }

        return false;
      })
      .map((asset) => {
        const path = asset.id.includes(":") ? asset.id.split(":")[1] : asset.id;

        let shardName: string;
        let prefix: string;

        if (path.startsWith("item/pottery_shard_")) {
          // Extract pottery shard type from item path
          shardName = path.replace("item/pottery_shard_", "");
          prefix = "Item: ";
        } else {
          // Extract pattern name from entity path
          shardName = path.replace("entity/decorated_pot/", "").replace(/\.png$/, "");
          prefix = "Pattern: ";
        }

        // Capitalize and format the name
        const formattedName = shardName
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

        return {
          value: asset.id,
          label: `${prefix}${formattedName}`,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));

    return options;
  }, [allAssets, includeItems, includeEntity]);

  // Don't render if no shard options are available
  if (shardOptions.length === 0) {
    return null;
  }

  return (
    <div className={s.root}>
      <label className={s.label} htmlFor="pottery-shard-select">
        Pottery Shard Type
      </label>
      <Combobox
        options={shardOptions}
        value={assetId}
        onValueChange={onSelectShard}
        placeholder="Select a pottery shard..."
        searchPlaceholder="Search pottery shards..."
        emptyMessage="No pottery shards found"
        className={s.combobox}
      />
      <div className={s.hint}>
        {shardOptions.length} pottery shard{shardOptions.length !== 1 ? "s" : ""} available
      </div>
    </div>
  );
}
